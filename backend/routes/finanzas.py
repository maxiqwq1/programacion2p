from flask import Blueprint, request, jsonify
import datetime
from db import Database
from utils.token import TokenHelper

finanzas_bp = Blueprint("finanzas", __name__)


# ── Service: Sueldo y Estadísticas ───────────────────────────────────────────

class FinanzasService:
    """Salary settings and monthly financial statistics."""

    @staticmethod
    def get_sueldo(user_id: int) -> float:
        with Database.connect() as (cur, _):
            cur.execute("SELECT sueldo FROM usuarios WHERE id = %s;", (user_id,))
            row = cur.fetchone()
        return float(row[0]) if row and row[0] else 0

    @staticmethod
    def update_sueldo(user_id: int, sueldo) -> None:
        with Database.connect() as (cur, _):
            cur.execute(
                "UPDATE usuarios SET sueldo = %s WHERE id = %s;",
                (sueldo, user_id),
            )

    @staticmethod
    def get_estadisticas(user_id: int) -> dict:
        with Database.connect() as (cur, _):
            cur.execute("SELECT sueldo FROM usuarios WHERE id = %s;", (user_id,))
            row    = cur.fetchone()
            sueldo = float(row[0]) if row and row[0] else 0

            cur.execute("""
                SELECT COALESCE(SUM(monto), 0) FROM gastos
                WHERE usuario_id = %s
                AND date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE);
            """, (user_id,))
            gastos_mes = float(cur.fetchone()[0])

            cur.execute("""
                SELECT COALESCE(SUM(monto), 0) FROM gastos WHERE usuario_id = %s;
            """, (user_id,))
            gastos_total = float(cur.fetchone()[0])

            cur.execute("""
                SELECT COALESCE(AVG(total_mes), 0) FROM (
                    SELECT SUM(monto) as total_mes
                    FROM gastos WHERE usuario_id = %s
                    GROUP BY date_trunc('month', fecha)
                ) sub;
            """, (user_id,))
            promedio_mensual = float(cur.fetchone()[0])

            cur.execute("""
                SELECT c.nombre, SUM(g.monto) as total
                FROM gastos g JOIN categorias c ON c.id = g.categoria_id
                WHERE g.usuario_id = %s
                AND date_trunc('month', g.fecha) = date_trunc('month', CURRENT_DATE)
                GROUP BY c.nombre ORDER BY total DESC;
            """, (user_id,))
            por_categoria = [{"categoria": r[0], "total": float(r[1])} for r in cur.fetchall()]

            cur.execute("""
                SELECT COALESCE(SUM(pago_minimo), 0), COUNT(*)
                FROM deudas WHERE usuario_id = %s;
            """, (user_id,))
            row_d               = cur.fetchone()
            total_deuda_mensual = float(row_d[0])
            num_deudas          = int(row_d[1])

            cur.execute("""
                SELECT COALESCE(SUM(monto_actual), 0) FROM deudas WHERE usuario_id = %s;
            """, (user_id,))
            total_deuda_saldo = float(cur.fetchone()[0])

        ahorro             = sueldo - gastos_mes - total_deuda_mensual
        tasa_ahorro        = round(ahorro / sueldo * 100, 1) if sueldo > 0 else 0
        porcentaje_gastado = round((gastos_mes + total_deuda_mensual) / sueldo * 100, 1) if sueldo > 0 else 0

        if tasa_ahorro >= 20:
            salud = "excelente"
        elif tasa_ahorro >= 10:
            salud = "buena"
        elif tasa_ahorro >= 0:
            salud = "ajustada"
        else:
            salud = "deficit"

        return {
            "sueldo":              sueldo,
            "gastos_mes":          gastos_mes,
            "gastos_total":        gastos_total,
            "promedio_mensual":    round(promedio_mensual, 2),
            "total_deuda_mensual": round(total_deuda_mensual, 2),
            "total_deuda_saldo":   round(total_deuda_saldo, 2),
            "num_deudas":          num_deudas,
            "ahorro":              round(ahorro, 2),
            "tasa_ahorro":         tasa_ahorro,
            "porcentaje_gastado":  porcentaje_gastado,
            "salud":               salud,
            "por_categoria":       por_categoria,
        }


# ── Service: Deudas CRUD ──────────────────────────────────────────────────────

class DeudasService:
    """CRUD operations for debt records."""

    @staticmethod
    def listar(user_id: int) -> list:
        with Database.connect() as (cur, _):
            cur.execute("""
                SELECT id, nombre, monto_actual, interes_mensual, pago_minimo, fecha_inicio
                FROM deudas WHERE usuario_id = %s ORDER BY monto_actual ASC;
            """, (user_id,))
            rows = cur.fetchall()
        return [{
            "id":              r[0],
            "nombre":          r[1],
            "monto_actual":    float(r[2]),
            "interes_mensual": float(r[3]),
            "pago_minimo":     float(r[4]),
            "fecha_inicio":    str(r[5]) if r[5] else None,
        } for r in rows]

    @staticmethod
    def crear(user_id: int, nombre: str, monto_actual, interes_mensual, pago_minimo, fecha_inicio: str) -> int:
        with Database.connect() as (cur, _):
            cur.execute("""
                INSERT INTO deudas (usuario_id, nombre, monto_actual, interes_mensual, pago_minimo, fecha_inicio)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
            """, (user_id, nombre, monto_actual, interes_mensual, pago_minimo, fecha_inicio))
            return cur.fetchone()[0]

    @staticmethod
    def eliminar(user_id: int, deuda_id: int) -> None:
        with Database.connect() as (cur, _):
            cur.execute(
                "DELETE FROM deudas WHERE id = %s AND usuario_id = %s;",
                (deuda_id, user_id),
            )


# ── Service: Snowball y Proyección ────────────────────────────────────────────

class SnowballService:
    """Debt snowball simulation and multi-year financial projection."""

    @staticmethod
    def _fetch_base(cur, user_id: int):
        """Fetch sueldo and average monthly expenses within an active cursor."""
        cur.execute("SELECT sueldo FROM usuarios WHERE id = %s;", (user_id,))
        row    = cur.fetchone()
        sueldo = float(row[0]) if row and row[0] else 0

        cur.execute("""
            SELECT COALESCE(AVG(total_mes), 0) FROM (
                SELECT SUM(monto) as total_mes FROM gastos WHERE usuario_id = %s
                GROUP BY date_trunc('month', fecha)
            ) sub;
        """, (user_id,))
        promedio_gastos = float(cur.fetchone()[0])

        return sueldo, promedio_gastos

    @staticmethod
    def calcular(user_id: int) -> dict:
        with Database.connect() as (cur, _):
            sueldo, promedio_gastos = SnowballService._fetch_base(cur, user_id)

            cur.execute("""
                SELECT id, nombre, monto_actual, interes_mensual, pago_minimo
                FROM deudas WHERE usuario_id = %s ORDER BY monto_actual ASC;
            """, (user_id,))
            rows = cur.fetchall()

        if not rows:
            return {"deudas": [], "meses_total": 0, "dinero_extra": 0, "viable": True}

        deudas = [{
            "nombre":  r[1],
            "saldo":   float(r[2]),
            "interes": float(r[3]) / 100,
            "minimo":  float(r[4]),
        } for r in rows]

        suma_minimos    = sum(d["minimo"] for d in deudas)
        dinero_extra    = max(0, sueldo - promedio_gastos - suma_minimos)
        viable          = (sueldo - promedio_gastos - suma_minimos) >= 0
        resultado       = []
        extra_acumulado = dinero_extra

        for i, deuda in enumerate(deudas):
            saldo              = deuda["saldo"]
            pago               = deuda["minimo"] + extra_acumulado
            meses              = 0
            interes_total      = 0
            interes_primer_mes = saldo * deuda["interes"]

            if pago <= interes_primer_mes and pago > 0:
                meses = 9999
            else:
                while saldo > 0.01 and meses < 600:
                    interes_mes    = saldo * deuda["interes"]
                    interes_total += interes_mes
                    saldo          = saldo + interes_mes - pago
                    if saldo < 0:
                        saldo = 0
                    meses += 1

            resultado.append({
                "nombre":         deuda["nombre"],
                "monto_original": deuda["saldo"],
                "pago_mensual":   round(pago, 2),
                "meses":          meses,
                "interes_total":  round(interes_total, 2),
                "orden":          i + 1,
            })
            extra_acumulado += deuda["minimo"]

        meses_total = max(d["meses"] for d in resultado) if resultado else 0

        return {
            "deudas":       resultado,
            "meses_total":  meses_total,
            "dinero_extra": round(dinero_extra, 2),
            "suma_minimos": round(suma_minimos, 2),
            "viable":       viable,
        }

    @staticmethod
    def proyeccion(user_id: int) -> dict:
        with Database.connect() as (cur, _):
            sueldo, promedio_gastos = SnowballService._fetch_base(cur, user_id)

            cur.execute("""
                SELECT nombre, monto_actual, interes_mensual, pago_minimo
                FROM deudas WHERE usuario_id = %s ORDER BY monto_actual ASC;
            """, (user_id,))
            debt_rows = cur.fetchall()

        if sueldo == 0:
            return {"meses": [], "anios": [], "libre_deudas_mes": None}

        deudas = [{
            "nombre":     r[0],
            "saldo":      float(r[1]),
            "interes":    float(r[2]) / 100,
            "minimo":     float(r[3]),
            "meses_vida": 0,
        } for r in debt_rows]

        suma_minimos = sum(d["minimo"] for d in deudas)
        extra        = max(0, sueldo - promedio_gastos - suma_minimos)

        for d in deudas:
            saldo = d["saldo"]
            pago  = d["minimo"] + extra
            meses = 0
            while saldo > 0.01 and meses < 600:
                saldo = saldo + saldo * d["interes"] - pago
                if saldo < 0:
                    saldo = 0
                meses += 1
            d["meses_vida"] = meses
            extra += d["minimo"]

        now              = datetime.date.today()
        meses_proy       = []
        ahorro_acumulado = 0

        for m in range(60):
            mes_num  = (now.month - 1 + m) % 12 + 1
            anio_num = now.year + (now.month - 1 + m) // 12
            deuda_mes        = sum(d["minimo"] for d in deudas if m < d["meses_vida"])
            ahorro_mes       = sueldo - promedio_gastos - deuda_mes
            ahorro_acumulado += ahorro_mes

            meses_proy.append({
                "mes":       f"{anio_num}-{mes_num:02d}",
                "ingreso":   round(sueldo, 2),
                "gastos":    round(promedio_gastos, 2),
                "deuda":     round(deuda_mes, 2),
                "ahorro":    round(ahorro_mes, 2),
                "acumulado": round(ahorro_acumulado, 2),
            })

        anios = []
        for y in range(5):
            bloque = meses_proy[y * 12:(y + 1) * 12]
            if not bloque:
                break
            anios.append({
                "anio":          now.year + y,
                "ingreso":       round(sum(b["ingreso"] for b in bloque), 2),
                "gastos":        round(sum(b["gastos"] for b in bloque), 2),
                "deuda":         round(sum(b["deuda"] for b in bloque), 2),
                "ahorro":        round(sum(b["ahorro"] for b in bloque), 2),
                "acumulado_fin": bloque[-1]["acumulado"],
            })

        libre_mes = None
        for m_data in meses_proy:
            if m_data["deuda"] == 0 and deudas:
                libre_mes = m_data["mes"]
                break

        return {
            "meses":            meses_proy[:12],
            "meses_36":         meses_proy[:36],
            "anios":            anios,
            "libre_deudas_mes": libre_mes,
        }


# ── Routes: Sueldo ────────────────────────────────────────────────────────────

@finanzas_bp.route("/sueldo", methods=["GET"])
def get_sueldo():
    user_id = TokenHelper.get_user_id(request)
    return jsonify({"sueldo": FinanzasService.get_sueldo(user_id)})


@finanzas_bp.route("/sueldo", methods=["PUT"])
def update_sueldo():
    user_id = TokenHelper.get_user_id(request)
    sueldo  = request.get_json().get("sueldo", 0)
    FinanzasService.update_sueldo(user_id, sueldo)
    return jsonify({"message": "Sueldo actualizado."})


# ── Routes: Estadísticas ──────────────────────────────────────────────────────

@finanzas_bp.route("/finanzas", methods=["GET"])
def estadisticas():
    user_id = TokenHelper.get_user_id(request)
    return jsonify(FinanzasService.get_estadisticas(user_id))


# ── Routes: Deudas ────────────────────────────────────────────────────────────

@finanzas_bp.route("/deudas", methods=["GET"])
def listar_deudas():
    user_id = TokenHelper.get_user_id(request)
    return jsonify(DeudasService.listar(user_id))


@finanzas_bp.route("/deudas", methods=["POST"])
def crear_deuda():
    user_id         = TokenHelper.get_user_id(request)
    data            = request.get_json()
    nombre          = data.get("nombre")
    monto_actual    = data.get("monto_actual")
    interes_mensual = data.get("interes_mensual", 0)
    pago_minimo     = data.get("pago_minimo")
    fecha_inicio    = data.get("fecha_inicio") or str(datetime.date.today())

    if not all([nombre, monto_actual, pago_minimo]):
        return jsonify({"error": "Faltan campos."}), 400

    new_id = DeudasService.crear(user_id, nombre, monto_actual, interes_mensual, pago_minimo, fecha_inicio)
    return jsonify({"message": "Deuda agregada.", "id": new_id}), 201


@finanzas_bp.route("/deudas/<int:deuda_id>", methods=["DELETE"])
def eliminar_deuda(deuda_id):
    user_id = TokenHelper.get_user_id(request)
    DeudasService.eliminar(user_id, deuda_id)
    return jsonify({"message": "Deuda eliminada."})


# ── Routes: Snowball y Proyección ─────────────────────────────────────────────

@finanzas_bp.route("/snowball", methods=["GET"])
def calcular_snowball():
    user_id = TokenHelper.get_user_id(request)
    return jsonify(SnowballService.calcular(user_id))


@finanzas_bp.route("/proyeccion", methods=["GET"])
def proyeccion():
    user_id = TokenHelper.get_user_id(request)
    return jsonify(SnowballService.proyeccion(user_id))
