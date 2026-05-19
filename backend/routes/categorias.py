from flask import Blueprint, jsonify
from db import get_connection

categorias_bp = Blueprint("categorias", __name__)

@categorias_bp.route("/categorias", methods=["GET"])
def listar_categorias():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, nombre FROM categorias ORDER BY nombre;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([{"id": r[0], "nombre": r[1]} for r in rows])
