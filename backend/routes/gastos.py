from flask import Blueprint, request, jsonify
from db import Database
from utils.token import TokenHelper
from utils.filters import FiltersBuilder

gastos_bp = Blueprint("gastos", __name__)


class GastosService:
    """CRUD de registros de gastos del usuario."""

    @staticmethod
    def listar(user_id: int, periodo=None, categoria_id=None, fecha_inicio=None, fecha_fin=None) -> list:
        # FiltersBuilder construye el WHERE dinámico según los filtros activos
        where, extra = FiltersBuilder.build(periodo, categoria_id, fecha_inicio, fecha_fin)
        params       = [user_id] + extra

        with Database.connect() as (cur, _):
            # f-string solo para el WHERE generado por FiltersBuilder (seguro, no viene del usuario)
            # los valores reales van en params como parámetros para evitar SQL injection
            cur.execute(f"""
                SELECT g.id, c.nombre, g.motivo, g.monto, g.fecha
                FROM gastos g
                JOIN categorias c ON c.id = g.categoria_id
                WHERE g.usuario_id = %s {where}
                ORDER BY g.fecha DESC, g.id DESC;
            """, tuple(params))
            rows = cur.fetchall()

        return [
            {"id": r[0], "categoria": r[1], "motivo": r[2], "monto": float(r[3]), "fecha": str(r[4])}
            for r in rows
        ]

    @staticmethod
    def crear(user_id: int, categoria_id, motivo: str, monto, fecha: str) -> int:
        with Database.connect() as (cur, _):
            cur.execute("""
                INSERT INTO gastos (usuario_id, categoria_id, motivo, monto, fecha)
                VALUES (%s, %s, %s, %s, %s) RETURNING id;
            """, (user_id, categoria_id, motivo, monto, fecha))
            return cur.fetchone()[0]

    @staticmethod
    def editar(user_id: int, gasto_id: int, categoria_id, motivo: str, monto, fecha: str) -> None:
        # el AND usuario_id=%s asegura que un usuario no pueda editar gastos de otro
        with Database.connect() as (cur, _):
            cur.execute("""
                UPDATE gastos SET categoria_id=%s, motivo=%s, monto=%s, fecha=%s
                WHERE id=%s AND usuario_id=%s;
            """, (categoria_id, motivo, monto, fecha, gasto_id, user_id))

    @staticmethod
    def eliminar(user_id: int, gasto_id: int) -> None:
        # el AND usuario_id=%s evita que un usuario borre gastos ajenos
        with Database.connect() as (cur, _):
            cur.execute(
                "DELETE FROM gastos WHERE id = %s AND usuario_id = %s;",
                (gasto_id, user_id),
            )


# ── Routes ────────────────────────────────────────────────────────────────────

@gastos_bp.route("/gastos", methods=["GET"])
def listar_gastos():
    user_id = TokenHelper.get_user_id(request)
    return jsonify(GastosService.listar(
        user_id,
        periodo      = request.args.get("periodo"),
        categoria_id = request.args.get("categoria_id"),
        fecha_inicio = request.args.get("fecha_inicio"),
        fecha_fin    = request.args.get("fecha_fin"),
    ))


@gastos_bp.route("/gastos", methods=["POST"])
def crear_gasto():
    user_id      = TokenHelper.get_user_id(request)
    data         = request.get_json() or {}
    categoria_id = data.get("categoria_id")
    motivo       = data.get("motivo")
    monto        = data.get("monto")
    fecha        = data.get("fecha")

    if not all([categoria_id, motivo, monto, fecha]):
        return jsonify({"error": "Faltan campos obligatorios."}), 400

    new_id = GastosService.crear(user_id, categoria_id, motivo, monto, fecha)
    return jsonify({"message": "Gasto creado.", "id": new_id}), 201


@gastos_bp.route("/gastos/<int:gasto_id>", methods=["PUT"])
def editar_gasto(gasto_id):
    user_id      = TokenHelper.get_user_id(request)
    data         = request.get_json() or {}
    categoria_id = data.get("categoria_id")
    motivo       = data.get("motivo")
    monto        = data.get("monto")
    fecha        = data.get("fecha")

    if not all([categoria_id, motivo, monto, fecha]):
        return jsonify({"error": "Faltan campos."}), 400

    GastosService.editar(user_id, gasto_id, categoria_id, motivo, monto, fecha)
    return jsonify({"message": "Gasto actualizado."})


@gastos_bp.route("/gastos/<int:gasto_id>", methods=["DELETE"])
def eliminar_gasto(gasto_id):
    user_id = TokenHelper.get_user_id(request)
    GastosService.eliminar(user_id, gasto_id)
    return jsonify({"message": "Gasto eliminado."})
