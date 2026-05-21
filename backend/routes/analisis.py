from flask import Blueprint, request, jsonify
import jwt
import pandas as pd
import numpy as np
from db import get_connection
from config import JWT_SECRET

analisis_bp = Blueprint("analisis", __name__)

def get_user_id(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except:
        return None

@analisis_bp.route("/analisis", methods=["GET"])
def analisis():
    user_id = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado."}), 401

    # acepta los mismos filtros que gastos
    periodo      = request.args.get("periodo")
    categoria_id = request.args.get("categoria_id")
    fecha_inicio = request.args.get("fecha_inicio")
    fecha_fin    = request.args.get("fecha_fin")

    filtros = []
    params  = [user_id]

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

    if categoria_id:
        filtros.append("AND g.categoria_id = %s")
        params.append(int(categoria_id))
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
        SELECT c.nombre, g.monto, g.fecha
        FROM gastos g
        JOIN categorias c ON c.id = g.categoria_id
        WHERE g.usuario_id = %s {where_extra}
        ORDER BY g.fecha;
    """, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        return jsonify({
            "total": 0, "promedio_diario": 0,
            "maximo": 0, "minimo": 0,
            "por_categoria": [], "por_mes": []
        })

    df = pd.DataFrame(rows, columns=["categoria", "monto", "fecha"])
    df["monto"] = df["monto"].astype(float)
    df["fecha"] = pd.to_datetime(df["fecha"])
    df["mes"] = df["fecha"].dt.to_period("M").astype(str)

    total          = float(np.sum(df["monto"]))
    promedio_diario = float(np.mean(df.groupby("fecha")["monto"].sum()))
    maximo         = float(np.max(df["monto"]))
    minimo         = float(np.min(df["monto"]))

    por_categoria = (
        df.groupby("categoria")["monto"].sum()
        .reset_index().rename(columns={"monto": "total"})
        .sort_values("total", ascending=False)
        .to_dict(orient="records")
    )
    por_mes = (
        df.groupby("mes")["monto"].sum()
        .reset_index().rename(columns={"monto": "total"})
        .to_dict(orient="records")
    )

    return jsonify({
        "total": total,
        "promedio_diario": round(promedio_diario, 2),
        "maximo": maximo, "minimo": minimo,
        "por_categoria": por_categoria,
        "por_mes": por_mes
    })
