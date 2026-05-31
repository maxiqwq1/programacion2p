from flask import Blueprint, request, jsonify
from db import Database
from utils.token import TokenHelper
from utils.errors import AppError

categorias_bp = Blueprint("categorias", __name__)


class CategoriasService:
    """Gestión de categorías de gasto: listar, crear y eliminar."""

    @staticmethod
    def listar() -> list:
        # las categorías son globales (no por usuario), todos ven las mismas
        with Database.connect() as (cur, _):
            cur.execute("SELECT id, nombre FROM categorias ORDER BY nombre;")
            rows = cur.fetchall()
        return [{"id": r[0], "nombre": r[1]} for r in rows]

    @staticmethod
    def crear(nombre: str) -> dict:
        with Database.connect() as (cur, _):
            try:
                cur.execute(
                    "INSERT INTO categorias (nombre) VALUES (%s) RETURNING id;",
                    (nombre,),
                )
            except Exception:
                # la tabla tiene un UNIQUE en nombre; psycopg2 lanza IntegrityError
                raise AppError("Ya existe una categoría con ese nombre.", 409)
            new_id = cur.fetchone()[0]
        return {"id": new_id, "nombre": nombre}

    @staticmethod
    def eliminar(cat_id: int) -> None:
        with Database.connect() as (cur, _):
            # verifica que no haya gastos asociados antes de borrar
            cur.execute(
                "SELECT COUNT(*) FROM gastos WHERE categoria_id = %s;",
                (cat_id,),
            )
            if cur.fetchone()[0] > 0:
                raise AppError("No puedes eliminar una categoría que tiene gastos.", 400)
            cur.execute("DELETE FROM categorias WHERE id = %s;", (cat_id,))


# ── Routes ────────────────────────────────────────────────────────────────────

@categorias_bp.route("/categorias", methods=["GET"])
def listar_categorias():
    return jsonify(CategoriasService.listar())


@categorias_bp.route("/categorias", methods=["POST"])
def crear_categoria():
    TokenHelper.get_user_id(request)
    data   = request.get_json() or {}
    nombre = data.get("nombre", "").strip()

    if not nombre:
        return jsonify({"error": "El nombre es obligatorio."}), 400

    resultado = CategoriasService.crear(nombre)
    return jsonify({"message": "Categoría creada.", **resultado}), 201


@categorias_bp.route("/categorias/<int:cat_id>", methods=["DELETE"])
def eliminar_categoria(cat_id):
    TokenHelper.get_user_id(request)
    CategoriasService.eliminar(cat_id)
    return jsonify({"message": "Categoría eliminada."})
