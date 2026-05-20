from flask import Blueprint, request, jsonify
import jwt
from db import get_connection
from config import JWT_SECRET

finanzas_bp = Blueprint("finanzas", __name__)

def get_user_id(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except:
        return None

# --- SUELDO ---

@finanzas_bp.route("/sueldo", methods=["GET"])
def get_sueldo():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT sueldo FROM usuarios WHERE id = %s;", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return jsonify({"sueldo": float(row[0]) if row and row[0] else 0})

@finanzas_bp.route("/sueldo", methods=["PUT"])
def update_sueldo():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401
    data = request.get_json()
    sueldo = data.get("sueldo", 0)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE usuarios SET sueldo = %s WHERE id = %s;", (sueldo, user_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Sueldo actualizado."})

# --- ESTADÍSTICAS FINANCIERAS ---

@finanzas_bp.route("/finanzas", methods=["GET"])
def estadisticas():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT sueldo FROM usuarios WHERE id = %s;", (user_id,))
    row = cur.fetchone()
    sueldo = float(row[0]) if row and row[0] else 0

    cur.execute("""
        SELECT COALESCE(SUM(monto), 0)
        FROM gastos
        WHERE usuario_id = %s
        AND date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE);
    """, (user_id,))
    gastos_mes = float(cur.fetchone()[0])

    cur.execute("""
        SELECT COALESCE(SUM(monto), 0)
        FROM gastos WHERE usuario_id = %s;
    """, (user_id,))
    gastos_total = float(cur.fetchone()[0])

    # promedio mensual de gastos histórico
    cur.execute("""
        SELECT COALESCE(AVG(total_mes), 0) FROM (
            SELECT SUM(monto) as total_mes
            FROM gastos WHERE usuario_id = %s
            GROUP BY date_trunc('month', fecha)
        ) sub;
    """, (user_id,))
    promedio_mensual = float(cur.fetchone()[0])

    # gastos por categoría este mes
    cur.execute("""
        SELECT c.nombre, SUM(g.monto) as total
        FROM gastos g
        JOIN categorias c ON c.id = g.categoria_id
        WHERE g.usuario_id = %s
        AND date_trunc('month', g.fecha) = date_trunc('month', CURRENT_DATE)
        GROUP BY c.nombre ORDER BY total DESC;
    """, (user_id,))
    por_categoria = [{"categoria": r[0], "total": float(r[1])} for r in cur.fetchall()]

    cur.close()
    conn.close()

    ahorro = sueldo - gastos_mes
    tasa_ahorro = round(ahorro / sueldo * 100, 1) if sueldo > 0 else 0
    porcentaje_gastado = round(gastos_mes / sueldo * 100, 1) if sueldo > 0 else 0

    # semáforo de salud financiera
    if tasa_ahorro >= 20:
        salud = "excelente"
    elif tasa_ahorro >= 10:
        salud = "buena"
    elif tasa_ahorro >= 0:
        salud = "ajustada"
    else:
        salud = "deficit"

    return jsonify({
        "sueldo": sueldo,
        "gastos_mes": gastos_mes,
        "gastos_total": gastos_total,
        "promedio_mensual": round(promedio_mensual, 2),
        "ahorro": round(ahorro, 2),
        "tasa_ahorro": tasa_ahorro,
        "porcentaje_gastado": porcentaje_gastado,
        "salud": salud,
        "por_categoria": por_categoria
    })

# --- DEUDAS ---

@finanzas_bp.route("/deudas", methods=["GET"])
def listar_deudas():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, nombre, monto_actual, interes_mensual, pago_minimo
        FROM deudas WHERE usuario_id = %s ORDER BY monto_actual ASC;
    """, (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([{
        "id": r[0], "nombre": r[1], "monto_actual": float(r[2]),
        "interes_mensual": float(r[3]), "pago_minimo": float(r[4])
    } for r in rows])

@finanzas_bp.route("/deudas", methods=["POST"])
def crear_deuda():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401
    data = request.get_json()
    nombre = data.get("nombre")
    monto_actual = data.get("monto_actual")
    interes_mensual = data.get("interes_mensual", 0)
    pago_minimo = data.get("pago_minimo")
    if not all([nombre, monto_actual, pago_minimo]):
        return jsonify({"error": "Faltan campos."}), 400
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO deudas (usuario_id, nombre, monto_actual, interes_mensual, pago_minimo)
        VALUES (%s, %s, %s, %s, %s) RETURNING id;
    """, (user_id, nombre, monto_actual, interes_mensual, pago_minimo))
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Deuda agregada.", "id": new_id}), 201

@finanzas_bp.route("/deudas/<int:deuda_id>", methods=["DELETE"])
def eliminar_deuda(deuda_id):
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM deudas WHERE id = %s AND usuario_id = %s;", (deuda_id, user_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Deuda eliminada."})

# --- SNOWBALL (bola de nieve) ---

@finanzas_bp.route("/snowball", methods=["GET"])
def calcular_snowball():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT sueldo FROM usuarios WHERE id = %s;", (user_id,))
    row = cur.fetchone()
    sueldo = float(row[0]) if row and row[0] else 0

    cur.execute("""
        SELECT COALESCE(SUM(monto), 0) FROM gastos
        WHERE usuario_id = %s
        AND date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE);
    """, (user_id,))
    gastos_mes = float(cur.fetchone()[0])

    cur.execute("""
        SELECT id, nombre, monto_actual, interes_mensual, pago_minimo
        FROM deudas WHERE usuario_id = %s ORDER BY monto_actual ASC;
    """, (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        return jsonify({"deudas": [], "meses_total": 0, "dinero_extra": 0, "viable": True})

    deudas = [{
        "nombre": r[1],
        "saldo": float(r[2]),
        "interes": float(r[3]) / 100,
        "minimo": float(r[4])
    } for r in rows]

    suma_minimos = sum(d["minimo"] for d in deudas)
    dinero_extra = max(0, sueldo - gastos_mes - suma_minimos)
    viable = dinero_extra >= 0

    resultado = []
    extra_acumulado = dinero_extra

    for i, deuda in enumerate(deudas):
        saldo = deuda["saldo"]
        pago = deuda["minimo"] + extra_acumulado
        interes_mensual = deuda["interes"]
        meses = 0
        interes_total = 0

        # si el pago no cubre ni los intereses, no es viable
        interes_primer_mes = saldo * interes_mensual
        if pago <= interes_primer_mes and pago > 0:
            meses = 9999
        else:
            while saldo > 0.01 and meses < 600:
                interes_mes = saldo * interes_mensual
                interes_total += interes_mes
                saldo = saldo + interes_mes - pago
                if saldo < 0:
                    saldo = 0
                meses += 1

        resultado.append({
            "nombre": deuda["nombre"],
            "monto_original": deuda["saldo"],
            "pago_mensual": round(pago, 2),
            "meses": meses,
            "interes_total": round(interes_total, 2),
            "orden": i + 1
        })

        # el pago mínimo de esta deuda se libera y se suma al extra
        extra_acumulado += deuda["minimo"]

    meses_total = max(d["meses"] for d in resultado) if resultado else 0

    return jsonify({
        "deudas": resultado,
        "meses_total": meses_total,
        "dinero_extra": round(dinero_extra, 2),
        "suma_minimos": round(suma_minimos, 2),
        "viable": viable
    })
