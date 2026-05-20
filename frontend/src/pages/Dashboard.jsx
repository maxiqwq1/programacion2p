// v3
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from "recharts";
import API from "../api";
import logo from "../assets/logo.png";
import Toast from "../components/Toast";

// usé tonos de amarillo/dorado para que todas las gráficas combinen con el tema
const COLORS = ["#f5c518","#e6a800","#ffd84d","#b38f00","#ffe680","#cc9900","#ffed99","#a37700","#ffc200","#d4a800","#f0b800"];

export default function Dashboard() {
  // todos los datos que necesito para mostrar la página
  const [categorias, setCategorias] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [periodo, setPeriodo] = useState("mensual");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [finanzas, setFinanzas] = useState(null);
  const [sueldo, setSueldo] = useState("");
  const [deudas, setDeudas] = useState([]);
  const [snowball, setSnowball] = useState(null);
  const [proyeccion, setProyeccion] = useState(null);
  const [formDeuda, setFormDeuda] = useState({ nombre: "", monto_actual: "", interes_mensual: "", pago_minimo: "", fecha_inicio: new Date().toISOString().split("T")[0] });
  // esto controla cuál sección del sidebar está activa
  const [activePage, setActivePage] = useState("overview");
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const [form, setForm] = useState({
    categoria_id: "",
    motivo: "",
    monto: "",
    // fecha de hoy por defecto para no tener que escribirla siempre
    fecha: new Date().toISOString().split("T")[0],
  });
  const navigate = useNavigate();
  const nombre = localStorage.getItem("nombre");

  useEffect(() => {
    cargarCategorias();
    aplicarFiltros();
    cargarAnalisis();
    cargarFinanzas();
    cargarDeudas();
  }, []);

  async function cargarCategorias() {
    const res = await API.get("/categorias");
    setCategorias(res.data);
  }

  async function aplicarFiltros(p, cat, fi, ff) {
    // recibo los valores como parámetros para evitar problemas de closure stale
    const _periodo  = p   !== undefined ? p   : periodo;
    const _cat      = cat !== undefined ? cat : filtroCategoria;
    const _fi       = fi  !== undefined ? fi  : fechaInicio;
    const _ff       = ff  !== undefined ? ff  : fechaFin;

    const params = new URLSearchParams();
    if (_periodo) params.append("periodo", _periodo);
    if (_cat)     params.append("categoria_id", _cat);
    if (_fi)      params.append("fecha_inicio", _fi);
    if (_ff)      params.append("fecha_fin", _ff);

    const res = await API.get(`/gastos?${params.toString()}`);
    setGastos(res.data);
    cargarAnalisis();
    setToast({ message: "Filtros aplicados.", type: "success" });
  }

  async function cargarGastos() {
    const res = await API.get("/gastos");
    setGastos(res.data);
  }

  async function cargarFinanzas() {
    try {
      const [resF, resS, resP] = await Promise.all([
        API.get("/finanzas"),
        API.get("/sueldo"),
        API.get("/proyeccion"),
      ]);
      setFinanzas(resF.data);
      setSueldo(resS.data.sueldo || "");
      setProyeccion(resP.data);
    } catch {}
  }

  async function cargarDeudas() {
    try {
      const res = await API.get("/deudas");
      setDeudas(res.data);
    } catch {}
  }

  async function guardarSueldo(e) {
    e.preventDefault();
    await API.put("/sueldo", { sueldo: Number(sueldo) });
    cargarFinanzas();
    setToast({ message: "Sueldo actualizado correctamente.", type: "success" });
  }

  async function agregarDeuda(e) {
    e.preventDefault();
    await API.post("/deudas", {
      ...formDeuda,
      monto_actual: Number(formDeuda.monto_actual),
      interes_mensual: Number(formDeuda.interes_mensual),
      pago_minimo: Number(formDeuda.pago_minimo),
    });
    setFormDeuda({ nombre: "", monto_actual: "", interes_mensual: "", pago_minimo: "", fecha_inicio: new Date().toISOString().split("T")[0] });
    cargarDeudas();
    cargarFinanzas();
    setToast({ message: "Deuda agregada.", type: "success" });
  }

  async function eliminarDeuda(id) {
    await API.delete(`/deudas/${id}`);
    cargarDeudas();
    setSnowball(null);
    setToast({ message: "Deuda eliminada.", type: "error" });
  }

  async function calcularSnowball() {
    const res = await API.get("/snowball");
    setSnowball(res.data);
  }

  async function cargarAnalisis() {
    const res = await API.get("/analisis");
    setAnalisis(res.data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await API.post("/gastos", {
      ...form,
      // el backend espera números, no strings, por eso convierto acá
      categoria_id: Number(form.categoria_id),
      monto: Number(form.monto),
    });
    setForm({ categoria_id: "", motivo: "", monto: "", fecha: new Date().toISOString().split("T")[0] });
    cargarGastos();
    cargarAnalisis();
    setToast({ message: "¡Gasto guardado correctamente!", type: "success" });
  }

  async function eliminarGasto(id) {
    await API.delete(`/gastos/${id}`);
    cargarGastos();
    cargarAnalisis();
    setToast({ message: "Gasto eliminado.", type: "error" });
  }

  function logout() {
    localStorage.clear();
    navigate("/login");
  }

  // opciones del menú lateral, las puse en un array para no repetir tanto código
  const navItems = [
    { id: "overview", icon: "⬡", label: "Vista General" },
    { id: "gastos", icon: "↕", label: "Transacciones" },
    { id: "nuevo", icon: "+", label: "Nuevo Gasto" },
    { id: "finanzas", icon: "◈", label: "Mis Finanzas" },
    { id: "deudas", icon: "◎", label: "Deudas" },
  ];

  return (
    <div style={s.shell}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      {/* barra lateral fija a la izquierda */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.brand}>
            <img src={logo} alt="StatKash" style={s.logoImg} />
          </div>
          {/* genero los botones del nav desde el array de arriba */}
          <nav style={s.nav}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  ...s.navItem,
                  // si este botón es el activo le aplico estilos extra
                  ...(activePage === item.id ? s.navItemActive : {}),
                }}
              >
                <span style={s.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* parte baja del sidebar con info del usuario y botón de salir */}
        <div style={s.sideBottom}>
          <div style={s.userBox}>
            {/* uso la primera letra del nombre como avatar, es lo más simple */}
            <div style={s.avatar}>{nombre?.[0]?.toUpperCase()}</div>
            <div>
              <p style={s.userName}>{nombre}</p>
              <p style={s.userRole}>Usuario</p>
            </div>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Cerrar sesión</button>
        </div>
      </aside>

      {/* contenido principal a la derecha del sidebar */}
      <main style={s.main}>
        {/* encabezado con título y todos los filtros */}
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>
              {navItems.find((n) => n.id === activePage)?.label}
            </h1>
            <p style={s.pageDate}>{new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          {/* los filtros no aplican en nuevo gasto */}
          <div style={{ ...s.filtros, visibility: activePage === "nuevo" ? "hidden" : "visible" }}>
            {/* filtro de periodo */}
            <select style={s.periodoSelect} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="">Todos</option>
              <option value="diario">Hoy</option>
              <option value="semanal">Esta semana</option>
              <option value="mensual">Este mes</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Este año</option>
            </select>

            {/* filtro por categoría */}
            <select style={s.periodoSelect} value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setFechaInicio(""); setFechaFin(""); }}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            {/* rango de fechas — solo visible si se seleccionó una categoría */}
            {filtroCategoria && (
              <>
                <input
                  style={s.periodoSelect}
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  title="Desde"
                />
                <input
                  style={s.periodoSelect}
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  title="Hasta"
                />
                {/* botón para limpiar los filtros de fecha */}
                {(fechaInicio || fechaFin) && (
                  <button
                    style={s.clearBtn}
                    onClick={() => { setFechaInicio(""); setFechaFin(""); }}
                  >
                    ✕ Fechas
                  </button>
                )}
              </>
            )}

            {/* botón principal para aplicar todos los filtros */}
            <button style={s.applyBtn} onClick={aplicarFiltros}>
              Aplicar
            </button>
          </div>
        </div>

        {/* --- VISTA GENERAL --- muestra todo de un vistazo */}
        {activePage === "overview" && (
          <div>
            {/* resumen de deudas si hay alguna */}
            {finanzas && finanzas.num_deudas > 0 && (
              <div style={{ ...s.finCard, marginBottom: "20px", display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <p style={s.finLabel}>Deudas activas</p>
                  <p style={{ color: "#f87171", fontWeight: "700", fontSize: "1.3rem", margin: 0 }}>{finanzas.num_deudas}</p>
                </div>
                <div>
                  <p style={s.finLabel}>Saldo total deudas</p>
                  <p style={{ color: "#f87171", fontWeight: "700", fontSize: "1.3rem", margin: 0 }}>${finanzas.total_deuda_saldo.toLocaleString("es-CO")}</p>
                </div>
                <div>
                  <p style={s.finLabel}>Pago mensual deudas</p>
                  <p style={{ color: "#fb923c", fontWeight: "700", fontSize: "1.3rem", margin: 0 }}>${finanzas.total_deuda_mensual.toLocaleString("es-CO")}/mes</p>
                </div>
                {proyeccion?.libre_deudas_mes && (
                  <div>
                    <p style={s.finLabel}>Libre de deudas estimado</p>
                    <p style={{ color: "#4ade80", fontWeight: "700", fontSize: "1.1rem", margin: 0 }}>{proyeccion.libre_deudas_mes}</p>
                  </div>
                )}
                <button onClick={() => setActivePage("deudas")} style={{ ...s.applyBtn, marginLeft: "auto" }}>Ver plan de pago →</button>
              </div>
            )}

            {/* tarjetas con los números más importantes */}
            {analisis && (
              <div style={s.statsGrid}>
                {[
                  { label: "Total gastado", value: analisis.total },
                  { label: "Promedio diario", value: analisis.promedio_diario },
                  { label: "Gasto máximo", value: analisis.maximo },
                  { label: "Gasto mínimo", value: analisis.minimo },
                ].map((stat) => (
                  <div key={stat.label} style={s.statCard}>
                    <p style={s.statLabel}>{stat.label}</p>
                    <p style={s.statValue}>${stat.value.toLocaleString("es-CO")}</p>
                  </div>
                ))}
              </div>
            )}

            {/* gráficas solo si hay datos, si no no tiene sentido mostrarlas */}
            {analisis && analisis.por_categoria.length > 0 && (
              <div style={s.chartsRow}>
                <div style={s.chartCard}>
                  <h3 style={s.chartTitle}>Por categoría</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={analisis.por_categoria}
                        dataKey="total" nameKey="categoria"
                        cx="50%" cy="50%" outerRadius={90} label
                        style={{ cursor: "pointer" }}
                        onClick={(data) => {
                          // busco el id de la categoría seleccionada
                          const cat = categorias.find(c => c.nombre === data.categoria);
                          if (cat) {
                            setFiltroCategoria(String(cat.id));
                            setPeriodo("");
                            setFechaInicio("");
                            setFechaFin("");
                            aplicarFiltros("", String(cat.id), "", "");
                            setActivePage("gastos");
                            setToast({ message: `Filtrando por ${data.categoria}`, type: "success" });
                          }
                        }}
                      >
                        {analisis.por_categoria.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `$${v.toLocaleString("es-CO")}`} contentStyle={{ background: "#111", border: "1px solid #2a2200", borderRadius: "8px", color: "#f0f0f0" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={s.chartCard}>
                  <h3 style={s.chartTitle}>Por mes <span style={{ color: "#444", fontSize: "0.75rem", fontWeight: "400" }}>— clic para filtrar</span></h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={analisis.por_mes}
                      barSize={48}
                      barCategoryGap="40%"
                      style={{ cursor: "pointer" }}
                      onClick={(data) => {
                        if (!data?.activePayload?.[0]) return;
                        const mes = data.activePayload[0].payload.mes; // ej: "2026-05"
                        const [anio, m] = mes.split("-");
                        const inicio = `${anio}-${m}-01`;
                        // último día del mes
                        const ultimoDia = new Date(Number(anio), Number(m), 0).getDate();
                        const fin = `${anio}-${m}-${String(ultimoDia).padStart(2, "0")}`;
                        setPeriodo("");
                        setFiltroCategoria("");
                        setFechaInicio(inicio);
                        setFechaFin(fin);
                        aplicarFiltros("", "", inicio, fin);
                        setActivePage("gastos");
                        setToast({ message: `Mostrando gastos de ${mes}`, type: "success" });
                      }}
                    >
                      <XAxis dataKey="mes" stroke="#333" tick={{ fill: "#555" }} />
                      <YAxis stroke="#333" tick={{ fill: "#555" }} />
                      <Tooltip formatter={(v) => `$${v.toLocaleString("es-CO")}`} contentStyle={{ background: "#111", border: "1px solid #2a2200", borderRadius: "8px", color: "#f0f0f0" }} />
                      <Bar dataKey="total" fill="#f5c518" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* tabla con los últimos 5 gastos para no mostrar todo de golpe */}
            <div style={s.tableCard}>
              <h3 style={s.chartTitle}>Últimos gastos</h3>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Categoría", "Motivo", "Monto", "Fecha", ""].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gastos.slice(0, 5).map((g) => (
                    <tr key={g.id} style={s.tr}>
                      <td style={s.td}><span style={s.badge}>{g.categoria}</span></td>
                      <td style={s.td}>{g.motivo}</td>
                      <td style={{ ...s.td, color: "#f5c518", fontWeight: "600" }}>${g.monto.toLocaleString("es-CO")}</td>
                      <td style={{ ...s.td, color: "#666" }}>{g.fecha}</td>
                      <td style={s.td}>
                        <button onClick={() => eliminarGasto(g.id)} style={s.delBtn}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {gastos.length === 0 && (
                    <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#444", padding: "32px" }}>Sin gastos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* resumen por categoría con barras de progreso */}
            {analisis && analisis.por_categoria.length > 0 && (
              <div style={s.tableCard}>
                <h3 style={s.chartTitle}>Resumen por categoría</h3>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Categoría", "Total", "% del gasto"].map((h) => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {analisis.por_categoria.map((item, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><span style={s.badge}>{item.categoria}</span></td>
                        <td style={{ ...s.td, color: "#f5c518", fontWeight: "600" }}>${item.total.toLocaleString("es-CO")}</td>
                        <td style={s.td}>
                          <div style={s.barWrap}>
                            <div style={{ ...s.barFill, width: `${(item.total / analisis.total * 100).toFixed(0)}%` }} />
                            <span style={s.barLabel}>{(item.total / analisis.total * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- TRANSACCIONES --- lista completa de todos los gastos */}
        {activePage === "gastos" && (
          <div style={s.tableCard}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Categoría", "Motivo", "Monto", "Fecha", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id} style={s.tr}>
                    <td style={s.td}><span style={s.badge}>{g.categoria}</span></td>
                    <td style={s.td}>{g.motivo}</td>
                    <td style={{ ...s.td, color: "#f5c518", fontWeight: "600" }}>${g.monto.toLocaleString("es-CO")}</td>
                    <td style={{ ...s.td, color: "#666" }}>{g.fecha}</td>
                    <td style={s.td}>
                      <button onClick={() => eliminarGasto(g.id)} style={s.delBtn}>✕</button>
                    </td>
                  </tr>
                ))}
                {gastos.length === 0 && (
                  <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#444", padding: "32px" }}>Sin gastos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- NUEVO GASTO --- diseño tipo recibo */}
        {activePage === "nuevo" && (
          <div style={s.ticketWrap}>
            <form onSubmit={handleSubmit} style={s.ticket}>

              {/* encabezado del recibo */}
              <div style={s.ticketHeader}>
                <span style={s.ticketIcon}>＄</span>
                <div>
                  <p style={s.ticketLabel}>¿Cuánto gastaste?</p>
                  <input
                    style={s.montoGrande}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={s.ticketDivider} />

              {/* selección de categoría como chips */}
              <div style={s.formGroup}>
                <label style={s.ticketFieldLabel}>Categoría</label>
                <div style={s.chipsWrap}>
                  {categorias.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, categoria_id: String(c.id) })}
                      style={{
                        ...s.chip,
                        ...(form.categoria_id === String(c.id) ? s.chipActive : {}),
                      }}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div style={s.ticketDivider} />

              {/* motivo */}
              <div style={s.formGroup}>
                <label style={s.ticketFieldLabel}>¿En qué gastaste?</label>
                <input
                  style={s.ticketInput}
                  type="text"
                  placeholder="Ej: Mercado, Netflix, Gasolina..."
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  required
                />
              </div>

              {/* fecha */}
              <div style={s.formGroup}>
                <label style={s.ticketFieldLabel}>Fecha</label>
                <input
                  style={s.ticketInput}
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  required
                />
              </div>

              <div style={s.ticketDivider} />

              <button style={s.ticketBtn} type="submit">
                Registrar gasto
              </button>
            </form>
          </div>
        )}

        {/* --- MIS FINANZAS --- salud financiera */}
        {activePage === "finanzas" && (
          <div>
            {/* sueldo */}
            <div style={s.finCard}>
              <h3 style={s.finTitle}>💰 Mi sueldo mensual</h3>
              <form onSubmit={guardarSueldo} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <input
                  style={{ ...s.ticketInput, maxWidth: "260px" }}
                  type="number" min="0" placeholder="Ingresa tu sueldo"
                  value={sueldo}
                  onChange={(e) => setSueldo(e.target.value)}
                  required
                />
                <button style={s.applyBtn} type="submit">Guardar</button>
              </form>
            </div>

            {/* estadísticas */}
            {finanzas && finanzas.sueldo > 0 && (
              <>
                {/* semáforo */}
                <div style={{ ...s.finCard, borderColor: saludColor(finanzas.salud) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={s.finLabel}>Salud financiera este mes</p>
                      <p style={{ ...s.finValor, color: saludColor(finanzas.salud), fontSize: "1.3rem" }}>
                        {saludTexto(finanzas.salud)}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={s.finLabel}>Tasa de ahorro</p>
                      <p style={{ ...s.finValor, color: saludColor(finanzas.salud) }}>{finanzas.tasa_ahorro}%</p>
                    </div>
                  </div>
                  <div style={s.progressBar}>
                    <div style={{ ...s.progressFill, width: `${Math.min(finanzas.porcentaje_gastado, 100)}%`, background: saludColor(finanzas.salud) }} />
                  </div>
                  <p style={{ color: "#555", fontSize: "0.8rem", marginTop: "6px" }}>
                    Has gastado el {finanzas.porcentaje_gastado}% de tu sueldo este mes
                  </p>
                </div>

                {/* cards */}
                <div style={s.finGrid}>
                  {[
                    { label: "Sueldo mensual", valor: finanzas.sueldo, color: "#f5c518" },
                    { label: "Gastos este mes", valor: finanzas.gastos_mes, color: "#f87171" },
                    { label: "Ahorro este mes", valor: finanzas.ahorro, color: finanzas.ahorro >= 0 ? "#4ade80" : "#f87171" },
                    { label: "Promedio mensual gasto", valor: finanzas.promedio_mensual, color: "#a78bfa" },
                  ].map((item) => (
                    <div key={item.label} style={s.finStatCard}>
                      <p style={s.finLabel}>{item.label}</p>
                      <p style={{ ...s.finValor, color: item.color }}>${item.valor.toLocaleString("es-CO")}</p>
                    </div>
                  ))}
                </div>

                {/* distribución por categoría */}
                {finanzas.por_categoria.length > 0 && (
                  <div style={s.finCard}>
                    <h3 style={s.finTitle}>Distribución del gasto este mes</h3>
                    {finanzas.por_categoria.map((item, i) => (
                      <div key={i} style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ color: "#ccc", fontSize: "0.9rem" }}>{item.categoria}</span>
                          <span style={{ color: "#f5c518", fontSize: "0.9rem", fontWeight: "600" }}>
                            ${item.total.toLocaleString("es-CO")} ({finanzas.sueldo > 0 ? (item.total / finanzas.sueldo * 100).toFixed(1) : 0}% del sueldo)
                          </span>
                        </div>
                        <div style={s.progressBar}>
                          <div style={{ ...s.progressFill, width: `${Math.min(item.total / finanzas.sueldo * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* plan de acción */}
                <PlanDeAccion finanzas={finanzas} />

                {/* proyección 12 meses */}
                {proyeccion && proyeccion.meses.length > 0 && (
                  <div style={s.finCard}>
                    <h3 style={s.finTitle}>📅 Proyección — próximos 12 meses</h3>
                    {proyeccion.libre_deudas_mes && (
                      <div style={{ background: "#0f2d1a", border: "1px solid #1a5c2a", borderRadius: "10px", padding: "10px 16px", marginBottom: "16px", color: "#4ade80", fontSize: "0.85rem" }}>
                        🎉 Según el plan bola de nieve, quedarás libre de deudas en <b>{proyeccion.libre_deudas_mes}</b>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={proyeccion.meses} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="mes" stroke="#555" tick={{ fill: "#888", fontSize: 11 }} />
                        <YAxis stroke="#555" tick={{ fill: "#888", fontSize: 11 }} />
                        <Tooltip
                          formatter={(v, name) => [`$${Number(v).toLocaleString("es-CO")}`, name]}
                          contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2200", borderRadius: "8px", color: "#f0f0f0" }}
                        />
                        <Legend />
                        <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4,4,0,0]} />
                        <Bar dataKey="deuda" name="Deudas" fill="#fb923c" radius={[4,4,0,0]} />
                        <Bar dataKey="ahorro" name="Ahorro" fill="#4ade80" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* resumen por años */}
                {proyeccion && proyeccion.anios.length > 0 && (
                  <div style={s.finCard}>
                    <h3 style={s.finTitle}>📊 Proyección por año (próximos 5 años)</h3>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {["Año", "Ingresos", "Gastos", "Deudas", "Ahorro neto", "Acumulado"].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {proyeccion.anios.map((a, i) => (
                          <tr key={i} style={s.tr}>
                            <td style={{ ...s.td, fontWeight: "700", color: "#f5c518" }}>{a.anio}</td>
                            <td style={s.td}>${a.ingreso.toLocaleString("es-CO")}</td>
                            <td style={{ ...s.td, color: "#f87171" }}>${a.gastos.toLocaleString("es-CO")}</td>
                            <td style={{ ...s.td, color: "#fb923c" }}>${a.deuda.toLocaleString("es-CO")}</td>
                            <td style={{ ...s.td, color: a.ahorro >= 0 ? "#4ade80" : "#f87171", fontWeight: "600" }}>${a.ahorro.toLocaleString("es-CO")}</td>
                            <td style={{ ...s.td, color: a.acumulado_fin >= 0 ? "#a78bfa" : "#f87171", fontWeight: "600" }}>${a.acumulado_fin.toLocaleString("es-CO")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {finanzas && finanzas.sueldo === 0 && (
              <div style={{ ...s.finCard, textAlign: "center", color: "#555" }}>
                Ingresa tu sueldo para ver tu análisis financiero
              </div>
            )}
          </div>
        )}

        {/* --- DEUDAS --- método bola de nieve */}
        {activePage === "deudas" && (
          <div>
            {/* formulario para agregar deuda */}
            <div style={s.finCard}>
              <h3 style={s.finTitle}>➕ Agregar deuda</h3>
              <form onSubmit={agregarDeuda} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "10px", alignItems: "center" }}>
                  <input style={s.ticketInput} placeholder="Nombre (ej: Tarjeta Visa)" value={formDeuda.nombre} onChange={(e) => setFormDeuda({ ...formDeuda, nombre: e.target.value })} required />
                  <input style={s.ticketInput} type="number" min="0" placeholder="Saldo actual ($)" value={formDeuda.monto_actual} onChange={(e) => setFormDeuda({ ...formDeuda, monto_actual: e.target.value })} required />
                  <input style={s.ticketInput} type="number" min="0" step="0.1" placeholder="Interés mensual (%)" value={formDeuda.interes_mensual} onChange={(e) => setFormDeuda({ ...formDeuda, interes_mensual: e.target.value })} />
                  <input style={s.ticketInput} type="number" min="0" placeholder="Pago mínimo ($)" value={formDeuda.pago_minimo} onChange={(e) => setFormDeuda({ ...formDeuda, pago_minimo: e.target.value })} required />
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ color: "#555", fontSize: "0.75rem" }}>Fecha inicio</span>
                    <input style={s.ticketInput} type="date" value={formDeuda.fecha_inicio} onChange={(e) => setFormDeuda({ ...formDeuda, fecha_inicio: e.target.value })} />
                  </div>
                </div>
                <button style={{ ...s.applyBtn, alignSelf: "flex-start" }} type="submit">Agregar deuda</button>
              </form>
            </div>

            {/* lista de deudas */}
            {deudas.length > 0 && (
              <div style={s.finCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={s.finTitle}>Mis deudas</h3>
                  <button style={s.snowballBtn} onClick={calcularSnowball}>Calcular Bola de Nieve ❄️</button>
                </div>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Deuda", "Saldo", "Interés mensual", "Pago mínimo", "Desde", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {deudas.map((d) => (
                      <tr key={d.id} style={s.tr}>
                        <td style={s.td}><span style={s.badge}>{d.nombre}</span></td>
                        <td style={{ ...s.td, color: "#f87171", fontWeight: "600" }}>${d.monto_actual.toLocaleString("es-CO")}</td>
                        <td style={s.td}>{d.interes_mensual}%</td>
                        <td style={{ ...s.td, color: "#f5c518" }}>${d.pago_minimo.toLocaleString("es-CO")}</td>
                        <td style={{ ...s.td, color: "#666" }}>{d.fecha_inicio || "—"}</td>
                        <td style={s.td}><button onClick={() => eliminarDeuda(d.id)} style={s.delBtn}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* resultado snowball */}
            {snowball && (
              <div style={s.finCard}>
                <h3 style={s.finTitle}>❄️ Plan Bola de Nieve</h3>
                <p style={{ color: "#666", fontSize: "0.85rem", marginBottom: "20px" }}>
                  Paga las deudas de menor a mayor. Al liquidar cada una, su pago se suma a la siguiente — como una bola de nieve que crece.
                </p>

                {!snowball.viable && (
                  <div style={{ background: "#2d0f0f", border: "1px solid #5c1a1a", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#f87171" }}>
                    ⚠️ Tu sueldo no cubre los pagos mínimos más tus gastos. Considera reducir gastos o aumentar ingresos.
                  </div>
                )}

                <div style={{ color: "#555", fontSize: "0.85rem", marginBottom: "16px" }}>
                  Dinero extra disponible para snowball: <span style={{ color: "#f5c518", fontWeight: "600" }}>${snowball.dinero_extra.toLocaleString("es-CO")}/mes</span>
                </div>

                {snowball.deudas.map((d, i) => (
                  <div key={i} style={s.snowballCard}>
                    <div style={s.snowballOrden}>{d.orden}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: "#f0f0f0", fontWeight: "600", marginBottom: "6px" }}>{d.nombre}</p>
                      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                        <span style={{ color: "#888", fontSize: "0.82rem" }}>Saldo: <b style={{ color: "#f87171" }}>${d.monto_original.toLocaleString("es-CO")}</b></span>
                        <span style={{ color: "#888", fontSize: "0.82rem" }}>Pago/mes: <b style={{ color: "#f5c518" }}>${d.pago_mensual.toLocaleString("es-CO")}</b></span>
                        <span style={{ color: "#888", fontSize: "0.82rem" }}>Meses: <b style={{ color: "#4ade80" }}>{d.meses >= 600 ? "∞" : d.meses}</b></span>
                        <span style={{ color: "#888", fontSize: "0.82rem" }}>Interés total: <b style={{ color: "#a78bfa" }}>${d.interes_total.toLocaleString("es-CO")}</b></span>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: "20px", padding: "16px", background: "#1a1a1a", borderRadius: "12px", display: "flex", gap: "32px" }}>
                  <div>
                    <p style={s.finLabel}>Tiempo total para liquidar todo</p>
                    <p style={{ color: "#4ade80", fontWeight: "700", fontSize: "1.2rem" }}>
                      {snowball.meses_total >= 600 ? "No viable" : `${snowball.meses_total} meses (${(snowball.meses_total / 12).toFixed(1)} años)`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deudas.length === 0 && (
              <div style={{ ...s.finCard, textAlign: "center", color: "#555" }}>
                No tienes deudas registradas. ¡Excelente!
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

function saludColor(salud) {
  return { excelente: "#4ade80", buena: "#f5c518", ajustada: "#fb923c", deficit: "#f87171" }[salud] || "#666";
}

function saludTexto(salud) {
  return { excelente: "Excelente ✓", buena: "Buena", ajustada: "Ajustada ⚠️", deficit: "Déficit ✗" }[salud] || "";
}

function PlanDeAccion({ finanzas }) {
  const { sueldo, gastos_mes, ahorro, tasa_ahorro, salud, por_categoria, promedio_mensual } = finanzas;
  const metaAhorro20 = sueldo * 0.20;
  const metaAhorro10 = sueldo * 0.10;
  const recorteNecesario = gastos_mes - (sueldo * 0.80);
  const topCategoria = por_categoria[0];

  const pasos = [];

  if (salud === "deficit") {
    pasos.push({
      icono: "🚨",
      titulo: "Estás en déficit",
      desc: `Gastas $${Math.abs(ahorro).toLocaleString("es-CO")} más de lo que ganas. Para equilibrar tus finanzas necesitas reducir $${recorteNecesario.toLocaleString("es-CO")} en gastos este mes.`,
      color: "#f87171",
    });
    if (topCategoria) {
      const recorteTop = topCategoria.total * 0.30;
      pasos.push({
        icono: "✂️",
        titulo: `Recorta en ${topCategoria.nombre}`,
        desc: `Es tu mayor gasto ($${topCategoria.total.toLocaleString("es-CO")}). Reducirlo un 30% te ahorraría $${recorteTop.toLocaleString("es-CO")} — eso cubre ${((recorteTop / Math.abs(ahorro)) * 100).toFixed(0)}% de tu déficit.`,
        color: "#fb923c",
      });
    }
    pasos.push({
      icono: "📋",
      titulo: "Regla 50/30/20",
      desc: `Con tu sueldo, deberías destinar máximo $${(sueldo * 0.50).toLocaleString("es-CO")} a necesidades, $${(sueldo * 0.30).toLocaleString("es-CO")} a gustos y guardar $${metaAhorro20.toLocaleString("es-CO")} (20%).`,
      color: "#a78bfa",
    });
  } else if (salud === "ajustada") {
    pasos.push({
      icono: "⚠️",
      titulo: "Estás muy ajustado",
      desc: `Solo ahorras $${ahorro.toLocaleString("es-CO")} al mes (${tasa_ahorro}%). La meta recomendada es al menos el 10% — eso sería $${metaAhorro10.toLocaleString("es-CO")}/mes.`,
      color: "#fb923c",
    });
    pasos.push({
      icono: "🎯",
      titulo: "Tu próximo objetivo",
      desc: `Necesitas reducir $${(metaAhorro10 - ahorro).toLocaleString("es-CO")} en gastos para alcanzar el 10% de ahorro. Revisa las categorías no esenciales primero.`,
      color: "#f5c518",
    });
    if (topCategoria) {
      pasos.push({
        icono: "🔍",
        titulo: `Revisa ${topCategoria.nombre}`,
        desc: `Representa el ${(topCategoria.total / sueldo * 100).toFixed(1)}% de tu sueldo. Un recorte del 15% liberaría $${(topCategoria.total * 0.15).toLocaleString("es-CO")} mensuales.`,
        color: "#60a5fa",
      });
    }
  } else if (salud === "buena") {
    pasos.push({
      icono: "👍",
      titulo: "Vas bien — apunta al 20%",
      desc: `Ahorras $${ahorro.toLocaleString("es-CO")} (${tasa_ahorro}%). Para alcanzar el 20% ideal necesitas $${(metaAhorro20 - ahorro).toLocaleString("es-CO")} más de ahorro mensual.`,
      color: "#f5c518",
    });
    pasos.push({
      icono: "📈",
      titulo: "Invierte tu excedente",
      desc: `Con $${ahorro.toLocaleString("es-CO")} mensuales de ahorro, en 12 meses acumularías $${(ahorro * 12).toLocaleString("es-CO")}. Considera fondos de inversión o CDT.`,
      color: "#4ade80",
    });
  } else if (salud === "excelente") {
    pasos.push({
      icono: "🏆",
      titulo: "Excelente control financiero",
      desc: `Ahorras el ${tasa_ahorro}% de tu sueldo ($${ahorro.toLocaleString("es-CO")}/mes). En un año habrás acumulado $${(ahorro * 12).toLocaleString("es-CO")}.`,
      color: "#4ade80",
    });
    pasos.push({
      icono: "🚀",
      titulo: "Haz crecer tu dinero",
      desc: `Con tu disciplina, considera invertir $${(ahorro * 0.7).toLocaleString("es-CO")} y mantener $${(ahorro * 0.3).toLocaleString("es-CO")} como fondo de emergencia mensual.`,
      color: "#a78bfa",
    });
  }

  // alerta si el promedio histórico supera el sueldo
  if (promedio_mensual > sueldo && sueldo > 0) {
    pasos.push({
      icono: "📊",
      titulo: "Patrón histórico preocupante",
      desc: `Tu promedio mensual de gasto ($${promedio_mensual.toLocaleString("es-CO")}) supera tu sueldo. Este no es un problema de un solo mes — revisa tus hábitos.`,
      color: "#f87171",
    });
  }

  return (
    <div style={{ background: "#0d1117", border: "1px solid #1f1a00", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
      <h3 style={{ color: "#f5c518", fontSize: "1rem", fontWeight: "700", margin: "0 0 20px 0" }}>
        💡 Plan de acción — ¿Qué hacer?
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {pasos.map((paso, i) => (
          <div key={i} style={{ display: "flex", gap: "14px", padding: "14px 16px", background: "#111111", borderRadius: "10px", borderLeft: `3px solid ${paso.color}` }}>
            <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{paso.icono}</span>
            <div>
              <p style={{ color: paso.color, fontWeight: "700", fontSize: "0.9rem", margin: "0 0 4px 0" }}>{paso.titulo}</p>
              <p style={{ color: "#888", fontSize: "0.85rem", margin: 0, lineHeight: "1.5" }}>{paso.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  // layout base con gradiente radial sutil
  shell: { display: "flex", minHeight: "100vh", background: "radial-gradient(ellipse at 20% 50%, #0f0c00 0%, #080808 60%, #080808 100%)" },

  // sidebar con sombra lateral y gradiente vertical
  sidebar: {
    width: "248px",
    background: "linear-gradient(180deg, #0e0e0e 0%, #0a0a0a 100%)",
    borderRight: "1px solid rgba(245,197,24,0.07)",
    boxShadow: "6px 0 40px rgba(0,0,0,0.6)",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "28px 16px", position: "fixed", top: 0, left: 0, height: "100vh",
  },
  sideTop: { display: "flex", flexDirection: "column", gap: "36px" },
  brand: { padding: "0 8px", marginBottom: "4px" },
  logoImg: { width: "140px", height: "auto" },
  nav: { display: "flex", flexDirection: "column", gap: "2px" },
  navItem: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "11px 14px", borderRadius: "10px", border: "none",
    background: "transparent", color: "#4a4a4a",
    cursor: "pointer", fontSize: "0.88rem", textAlign: "left",
    transition: "all 0.2s", letterSpacing: "0.2px",
  },
  // nav activo con borde izquierdo dorado + gradiente
  navItemActive: {
    background: "linear-gradient(90deg, rgba(245,197,24,0.14) 0%, rgba(245,197,24,0.03) 100%)",
    color: "#f5c518",
    borderLeft: "2px solid #f5c518",
    paddingLeft: "12px",
  },
  navIcon: { fontSize: "1rem", width: "18px", textAlign: "center" },
  sideBottom: { display: "flex", flexDirection: "column", gap: "10px" },
  userBox: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "12px",
  },
  avatar: {
    width: "36px", height: "36px", borderRadius: "50%",
    background: "linear-gradient(135deg, #f5c518 0%, #d4a800 100%)",
    color: "#0a0a0a", fontWeight: "800", fontSize: "0.95rem",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 12px rgba(245,197,24,0.3)",
  },
  userName: { color: "#e0e0e0", fontSize: "0.85rem", fontWeight: "600", margin: 0 },
  userRole: { color: "#3a3a3a", fontSize: "0.72rem", margin: 0 },
  logoutBtn: {
    padding: "10px", borderRadius: "10px",
    border: "1px solid rgba(245,100,50,0.2)",
    background: "rgba(245,100,50,0.05)", color: "#7a4030",
    cursor: "pointer", fontSize: "0.83rem", transition: "all 0.2s",
  },

  // contenido principal
  main: { marginLeft: "248px", flex: 1, padding: "36px 44px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" },
  filtros: { display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" },
  clearBtn: {
    padding: "10px 14px", borderRadius: "10px",
    border: "1px solid rgba(248,113,113,0.25)",
    background: "rgba(248,113,113,0.06)", color: "#f87171",
    cursor: "pointer", fontSize: "0.83rem",
  },
  applyBtn: {
    padding: "10px 22px", borderRadius: "10px", border: "none",
    background: "linear-gradient(135deg, #f5c518 0%, #d4a800 100%)",
    color: "#0a0a0a", fontWeight: "700", fontSize: "0.88rem",
    cursor: "pointer", boxShadow: "0 4px 14px rgba(245,197,24,0.25)",
  },
  pageTitle: { fontSize: "1.7rem", fontWeight: "800", color: "#ffffff", marginBottom: "4px", letterSpacing: "-0.4px" },
  pageDate: { color: "#333", fontSize: "0.82rem" },
  periodoSelect: {
    padding: "10px 14px", borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#111111", color: "#c0c0c0", fontSize: "0.88rem", cursor: "pointer",
  },

  // stat cards con glow en el valor
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" },
  statCard: {
    background: "linear-gradient(145deg, #111111 0%, #0f0f0f 100%)",
    border: "1px solid rgba(245,197,24,0.08)",
    borderRadius: "16px", padding: "22px 24px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  statLabel: { color: "#3a3a3a", fontSize: "0.75rem", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.8px" },
  statValue: {
    color: "#f5c518", fontSize: "1.7rem", fontWeight: "800",
    textShadow: "0 0 24px rgba(245,197,24,0.2)", letterSpacing: "-0.5px",
  },

  // gráficas
  chartsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" },
  chartCard: {
    background: "linear-gradient(145deg, #111111 0%, #0f0f0f 100%)",
    border: "1px solid rgba(245,197,24,0.07)",
    borderRadius: "16px", padding: "24px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  chartTitle: { color: "#c0c0c0", marginBottom: "18px", fontSize: "0.95rem", fontWeight: "600", letterSpacing: "0.2px" },

  // tablas
  tableCard: {
    background: "linear-gradient(145deg, #111111 0%, #0f0f0f 100%)",
    border: "1px solid rgba(245,197,24,0.07)",
    borderRadius: "16px", padding: "24px", marginBottom: "24px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 16px", color: "#2e2e2e", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.15s" },
  td: { padding: "14px 16px", fontSize: "0.88rem", color: "#aaa" },
  badge: {
    background: "rgba(245,197,24,0.08)",
    color: "#c9a100", padding: "4px 12px",
    borderRadius: "20px", fontSize: "0.78rem",
    border: "1px solid rgba(245,197,24,0.15)",
  },
  delBtn: { background: "transparent", border: "none", color: "#2a2a2a", cursor: "pointer", fontSize: "1rem" },

  // formulario general
  formCard: {
    background: "linear-gradient(145deg, #111111 0%, #0f0f0f 100%)",
    border: "1px solid rgba(245,197,24,0.07)",
    borderRadius: "16px", padding: "32px", maxWidth: "600px",
  },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  formRow: { display: "flex", gap: "16px" },
  label: { color: "#444", fontSize: "0.83rem" },
  input: {
    padding: "13px 16px", borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.06)",
    background: "#0e0e0e", color: "#e0e0e0", fontSize: "0.95rem", outline: "none",
  },
  submitBtn: {
    padding: "14px", borderRadius: "12px", border: "none",
    background: "linear-gradient(135deg, #f5c518 0%, #d4a800 100%)",
    color: "#0a0a0a", fontWeight: "700", fontSize: "1rem",
    cursor: "pointer", marginTop: "8px",
    boxShadow: "0 4px 16px rgba(245,197,24,0.25)",
  },

  // nuevo gasto — ticket style
  ticketWrap: { display: "flex", justifyContent: "center", paddingTop: "16px" },
  ticket: {
    background: "linear-gradient(145deg, #111111 0%, #0d0d0d 100%)",
    border: "1px solid rgba(245,197,24,0.12)",
    borderRadius: "24px", padding: "40px", width: "100%", maxWidth: "520px",
    display: "flex", flexDirection: "column", gap: "24px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
  },
  ticketHeader: { display: "flex", alignItems: "center", gap: "20px" },
  ticketIcon: {
    fontSize: "2rem", color: "#f5c518",
    background: "linear-gradient(135deg, #1f1a00 0%, #2a2200 100%)",
    width: "64px", height: "64px", borderRadius: "18px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    boxShadow: "0 0 20px rgba(245,197,24,0.15)",
  },
  ticketLabel: { color: "#333", fontSize: "0.75rem", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "1.2px" },
  montoGrande: {
    background: "transparent", border: "none", outline: "none",
    color: "#f5c518", fontSize: "2.6rem", fontWeight: "800",
    width: "100%", padding: 0, textShadow: "0 0 30px rgba(245,197,24,0.3)",
  },
  ticketDivider: { height: "1px", background: "rgba(255,255,255,0.04)", borderRadius: "1px" },
  ticketFieldLabel: { color: "#333", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", display: "block" },
  chipsWrap: { display: "flex", flexWrap: "wrap", gap: "8px" },
  chip: {
    padding: "8px 16px", borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.06)",
    background: "#0e0e0e", color: "#555",
    cursor: "pointer", fontSize: "0.84rem", fontWeight: "500",
  },
  chipActive: {
    background: "rgba(245,197,24,0.1)",
    border: "1px solid rgba(245,197,24,0.4)",
    color: "#f5c518",
    boxShadow: "0 0 12px rgba(245,197,24,0.1)",
  },
  ticketInput: {
    width: "100%", padding: "13px 16px", borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.06)",
    background: "#0e0e0e", color: "#e0e0e0", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box",
  },
  ticketBtn: {
    padding: "16px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #f5c518 0%, #d4a800 100%)",
    color: "#0a0a0a", fontWeight: "800", fontSize: "1rem",
    cursor: "pointer", letterSpacing: "0.3px",
    boxShadow: "0 6px 20px rgba(245,197,24,0.3)",
  },

  // barras de progreso
  barWrap: { display: "flex", alignItems: "center", gap: "10px" },
  barFill: {
    height: "6px",
    background: "linear-gradient(90deg, #f5c518 0%, #d4a800 100%)",
    borderRadius: "3px", minWidth: "4px", maxWidth: "200px",
  },
  barLabel: { color: "#444", fontSize: "0.78rem" },

  // finanzas
  finCard: {
    background: "linear-gradient(145deg, #111111 0%, #0f0f0f 100%)",
    border: "1px solid rgba(245,197,24,0.07)",
    borderRadius: "16px", padding: "24px", marginBottom: "20px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  finTitle: { color: "#e0c060", fontSize: "0.95rem", fontWeight: "700", margin: "0 0 16px 0", letterSpacing: "0.2px" },
  finLabel: { color: "#333", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.7px", margin: "0 0 4px 0" },
  finValor: { color: "#e0e0e0", fontSize: "1.4rem", fontWeight: "700", margin: 0 },
  finGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" },
  finStatCard: {
    background: "linear-gradient(145deg, #111111 0%, #0f0f0f 100%)",
    border: "1px solid rgba(245,197,24,0.07)",
    borderRadius: "14px", padding: "18px",
  },
  progressBar: { height: "5px", background: "rgba(255,255,255,0.04)", borderRadius: "3px", overflow: "hidden" },
  progressFill: { height: "100%", background: "#f5c518", borderRadius: "3px", transition: "width 0.5s ease" },
  deudaForm: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "10px", alignItems: "center" },
  snowballBtn: { padding: "10px 18px", borderRadius: "10px", border: "none", background: "#1f1a00", color: "#f5c518", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" },
  snowballCard: { display: "flex", alignItems: "flex-start", gap: "16px", padding: "16px", background: "#1a1a1a", borderRadius: "12px", marginBottom: "10px", border: "1px solid #222" },
  snowballOrden: { width: "32px", height: "32px", borderRadius: "50%", background: "#f5c518", color: "#0d0d0d", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};
