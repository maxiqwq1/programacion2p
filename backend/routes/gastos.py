from flask import Blueprint, request, jsonify
import jwt
from db import get_connection
from config import JWT_SECRET

gastos_bp = Blueprint("gastos", __name__)

def get_user_id(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except:
        return None

@gastos_bp.route("/gastos", methods=["GET"])
def listar_gastos():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401

    periodo     = request.args.get("periodo")
    categoria_id = request.args.get("categoria_id")
    fecha_inicio = request.args.get("fecha_inicio")
    fecha_fin    = request.args.get("fecha_fin")

    filtros = []
    params  = [user_id]

    # filtro por periodo predefinido
    if periodo == "diario":
        filtros.append("AND fecha = CURRENT_DATE")
    elif periodo == "semanal":
        filtros.append("AND fecha >= CURRENT_DATE - INTERVAL '7 days'")
    elif periodo == "mensual":
        filtros.append("AND date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE)")
    elif periodo == "trimestral":
        filtros.append("AND fecha >= CURRENT_DATE - INTERVAL '3 months'")
    elif periodo == "semestral":
        filtros.append("AND fecha >= CURRENT_DATE - INTERVAL '6 months'")
    elif periodo == "anual":
        filtros.append("AND fecha >= CURRENT_DATE - INTERVAL '1 year'")

    # filtro por categoría
    if categoria_id:
        filtros.append("AND g.categoria_id = %s")
        params.append(int(categoria_id))

    # filtro por rango de fechas manual
    if fecha_inicio:
        filtros.append("AND fecha >= %s")
        params.append(fecha_inicio)
    if fecha_fin:
        filtros.append("AND fecha <= %s")
        params.append(fecha_fin)

    where_extra = " ".join(filtros)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(f"""
        SELECT g.id, c.nombre, g.motivo, g.monto, g.fecha
        FROM gastos g
        JOIN categorias c ON c.id = g.categoria_id
        WHERE g.usuario_id = %s {where_extra}
        ORDER BY g.fecha DESC, g.id DESC;
    """, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify([{
        "id": r[0],
        "categoria": r[1],
        "motivo": r[2],
        "monto": float(r[3]),
        "fecha": str(r[4])
    } for r in rows])

@gastos_bp.route("/gastos", methods=["POST"])
def crear_gasto():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401

    data = request.get_json()
    categoria_id = data.get("categoria_id")
    motivo = data.get("motivo")
    monto = data.get("monto")
    fecha = data.get("fecha")

    if not all([categoria_id, motivo, monto, fecha]):
        return jsonify({"error": "Faltan campos obligatorios."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO gastos (usuario_id, categoria_id, motivo, monto, fecha)
        VALUES (%s, %s, %s, %s, %s) RETURNING id;
    """, (user_id, categoria_id, motivo, monto, fecha))
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Gasto creado.", "id": new_id}), 201

@gastos_bp.route("/gastos/<int:gasto_id>", methods=["DELETE"])
def eliminar_gasto(gasto_id):
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM gastos WHERE id = %s AND usuario_id = %s;", (gasto_id, user_id))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Gasto eliminado."})
