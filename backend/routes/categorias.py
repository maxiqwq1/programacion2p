from flask import Blueprint, jsonify, request
import jwt
from db import get_connection
from config import JWT_SECRET

categorias_bp = Blueprint("categorias", __name__)

def get_user_id(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except:
        return None

@categorias_bp.route("/categorias", methods=["GET"])
def listar_categorias():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, nombre FROM categorias ORDER BY nombre;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([{"id": r[0], "nombre": r[1]} for r in rows])

@categorias_bp.route("/categorias", methods=["POST"])
def crear_categoria():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401
    data = request.get_json()
    nombre = data.get("nombre", "").strip()
    if not nombre:
        return jsonify({"error": "El nombre es obligatorio."}), 400
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO categorias (nombre) VALUES (%s) RETURNING id;", (nombre,))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Categoría creada.", "id": new_id, "nombre": nombre}), 201
    except Exception:
        cur.close()
        conn.close()
        return jsonify({"error": "Ya existe una categoría con ese nombre."}), 409

@categorias_bp.route("/categorias/<int:cat_id>", methods=["DELETE"])
def eliminar_categoria(cat_id):
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401
    conn = get_connection()
    cur = conn.cursor()
    # verificar que no tenga gastos asociados
    cur.execute("SELECT COUNT(*) FROM gastos WHERE categoria_id = %s;", (cat_id,))
    count = cur.fetchone()[0]
    if count > 0:
        cur.close()
        conn.close()
        return jsonify({"error": "No puedes eliminar una categoría que tiene gastos."}), 400
    cur.execute("DELETE FROM categorias WHERE id = %s;", (cat_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Categoría eliminada."})
