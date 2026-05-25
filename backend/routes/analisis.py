from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from db import Database
from utils.token import TokenHelper
from utils.filters import FiltersBuilder

analisis_bp = Blueprint("analisis", __name__)


class AnalisisService:
    """Statistical analysis of expense data with optional time/category filters."""

    _EMPTY = {
        "total": 0, "promedio_diario": 0,
        "maximo": 0, "minimo": 0,
        "por_categoria": [], "por_mes": [],
    }

    @staticmethod
    def calcular(user_id: int, periodo=None, categoria_id=None, fecha_inicio=None, fecha_fin=None) -> dict:
        where, extra = FiltersBuilder.build(periodo, categoria_id, fecha_inicio, fecha_fin)
        params       = [user_id] + extra

        with Database.connect() as (cur, _):
            cur.execute(f"""
                SELECT c.nombre, g.monto, g.fecha
                FROM gastos g
                JOIN categorias c ON c.id = g.categoria_id
                WHERE g.usuario_id = %s {where}
                ORDER BY g.fecha;
            """, tuple(params))
            rows = cur.fetchall()

        if not rows:
            return AnalisisService._EMPTY

        df          = pd.DataFrame(rows, columns=["categoria", "monto", "fecha"])
        df["monto"] = df["monto"].astype(float)
        df["fecha"] = pd.to_datetime(df["fecha"])
        df["mes"]   = df["fecha"].dt.to_period("M").astype(str)

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

        return {
            "total":           float(np.sum(df["monto"])),
            "promedio_diario": round(float(np.mean(df.groupby("fecha")["monto"].sum())), 2),
            "maximo":          float(np.max(df["monto"])),
            "minimo":          float(np.min(df["monto"])),
            "por_categoria":   por_categoria,
            "por_mes":         por_mes,
        }


# ── Routes ────────────────────────────────────────────────────────────────────

@analisis_bp.route("/analisis", methods=["GET"])
def analisis():
    user_id = TokenHelper.get_user_id(request)
    return jsonify(AnalisisService.calcular(
        user_id,
        periodo      = request.args.get("periodo"),
        categoria_id = request.args.get("categoria_id"),
        fecha_inicio = request.args.get("fecha_inicio"),
        fecha_fin    = request.args.get("fecha_fin"),
    ))
