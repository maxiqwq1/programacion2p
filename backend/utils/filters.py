class FiltersBuilder:
    """Constructs SQL WHERE clauses from the standard set of time/category filters."""

    _PERIODO_SQL = {
        "diario":     "AND fecha = CURRENT_DATE",
        "semanal":    "AND fecha >= CURRENT_DATE - INTERVAL '7 days'",
        "mensual":    "AND date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE)",
        "trimestral": "AND fecha >= CURRENT_DATE - INTERVAL '3 months'",
        "semestral":  "AND fecha >= CURRENT_DATE - INTERVAL '6 months'",
        "anual":      "AND fecha >= CURRENT_DATE - INTERVAL '1 year'",
    }

    @classmethod
    def build(cls, periodo=None, categoria_id=None, fecha_inicio=None, fecha_fin=None):
        """Return (where_clause, extra_params) ready to append to a SQL query."""
        clauses = []
        params  = []

        if periodo in cls._PERIODO_SQL:
            clauses.append(cls._PERIODO_SQL[periodo])

        if categoria_id:
            clauses.append("AND g.categoria_id = %s")
            params.append(int(categoria_id))

        if fecha_inicio:
            clauses.append("AND fecha >= %s")
            params.append(fecha_inicio)

        if fecha_fin:
            clauses.append("AND fecha <= %s")
            params.append(fecha_fin)

        return " ".join(clauses), params
