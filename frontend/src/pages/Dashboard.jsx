// v2
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

  // solo cargo al montar la página, los filtros se aplican con el botón
  useEffect(() => {
    cargarCategorias();
    aplicarFiltros();
    cargarAnalisis();
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
          <div style={s.filtros}>
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
                      <Pie data={analisis.por_categoria} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} label>
                        {analisis.por_categoria.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `$${v.toLocaleString("es-CO")}`} contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2200", borderRadius: "8px", color: "#f0f0f0" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={s.chartCard}>
                  <h3 style={s.chartTitle}>Por mes</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={analisis.por_mes}>
                      <XAxis dataKey="mes" stroke="#555" tick={{ fill: "#999" }} />
                      <YAxis stroke="#555" tick={{ fill: "#999" }} />
                      <Tooltip formatter={(v) => `$${v.toLocaleString("es-CO")}`} contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2200", borderRadius: "8px", color: "#f0f0f0" }} />
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

        {/* --- NUEVO GASTO --- formulario mejorado */}
        {activePage === "nuevo" && (
          <div style={s.nuevoWrap}>
            <div style={s.nuevoLeft}>
              <h2 style={s.nuevoTitle}>Registra un gasto</h2>
              <p style={s.nuevoSubtitle}>Llena los campos y guarda el gasto en tu historial.</p>
              <div style={s.nuevoHint}>
                <div style={s.hintItem}>💡 Sé específico en el motivo para análisis más precisos</div>
                <div style={s.hintItem}>📅 La fecha se rellena con hoy por defecto</div>
                <div style={s.hintItem}>📊 El gasto aparecerá en tus gráficas de inmediato</div>
              </div>
            </div>

            <div style={s.nuevoRight}>
              <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.formGroup}>
                  <label style={s.labelBig}>Categoría</label>
                  <select style={s.inputBig} value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} required>
                    <option value="">Selecciona una categoría</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                <div style={s.formGroup}>
                  <label style={s.labelBig}>Motivo</label>
                  <input style={s.inputBig} type="text" placeholder="Ej: Mercado, Netflix, Gasolina..." value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} required />
                </div>

                <div style={s.formRow}>
                  <div style={{ ...s.formGroup, flex: 1 }}>
                    <label style={s.labelBig}>Monto ($)</label>
                    <input style={s.inputBig} type="number" min="0" placeholder="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required />
                  </div>
                  <div style={{ ...s.formGroup, flex: 1 }}>
                    <label style={s.labelBig}>Fecha</label>
                    <input style={s.inputBig} type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
                  </div>
                </div>

                <button style={s.submitBtnBig} type="submit">
                  Guardar gasto
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const s = {
  shell: { display: "flex", minHeight: "100vh", background: "#0d0d0d" },
  sidebar: {
    width: "240px", background: "#111111", borderRight: "1px solid #1f1a00",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "24px 16px", position: "fixed", top: 0, left: 0, height: "100vh",
  },
  sideTop: { display: "flex", flexDirection: "column", gap: "32px" },
  brand: { padding: "0 8px", marginBottom: "8px" },
  logoImg: { width: "140px", height: "auto" },
  nav: { display: "flex", flexDirection: "column", gap: "4px" },
  navItem: {
    display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px",
    borderRadius: "10px", border: "none", background: "transparent",
    color: "#666", cursor: "pointer", fontSize: "0.9rem", textAlign: "left",
    transition: "all 0.15s",
  },
  navItemActive: { background: "#1f1a00", color: "#f5c518" },
  navIcon: { fontSize: "1rem", width: "18px", textAlign: "center" },
  sideBottom: { display: "flex", flexDirection: "column", gap: "12px" },
  userBox: { display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "#1a1a1a", borderRadius: "10px" },
  avatar: {
    width: "34px", height: "34px", borderRadius: "50%", background: "#f5c518",
    color: "#0d0d0d", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center",
  },
  userName: { color: "#f0f0f0", fontSize: "0.85rem", fontWeight: "600", margin: 0 },
  userRole: { color: "#555", fontSize: "0.75rem", margin: 0 },
  logoutBtn: {
    padding: "10px", borderRadius: "10px", border: "1px solid #2a1a00",
    background: "transparent", color: "#a06600", cursor: "pointer", fontSize: "0.85rem",
  },
  main: { marginLeft: "240px", flex: 1, padding: "32px 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" },
  filtros: { display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" },
  clearBtn: {
    padding: "10px 14px", borderRadius: "10px", border: "1px solid #5c1a1a",
    background: "#2d0f0f", color: "#f87171", cursor: "pointer", fontSize: "0.85rem",
  },
  applyBtn: {
    padding: "10px 20px", borderRadius: "10px", border: "none",
    background: "#f5c518", color: "#0d0d0d", fontWeight: "700",
    fontSize: "0.9rem", cursor: "pointer",
  },
  pageTitle: { fontSize: "1.6rem", fontWeight: "700", color: "#ffffff", marginBottom: "4px" },
  pageDate: { color: "#444", fontSize: "0.85rem" },
  periodoSelect: {
    padding: "10px 14px", borderRadius: "10px", border: "1px solid #2a2200",
    background: "#1a1a1a", color: "#f0f0f0", fontSize: "0.9rem", cursor: "pointer",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" },
  statCard: { background: "#111111", border: "1px solid #1f1a00", borderRadius: "14px", padding: "20px 24px" },
  statLabel: { color: "#555", fontSize: "0.8rem", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" },
  statValue: { color: "#f5c518", fontSize: "1.6rem", fontWeight: "700" },
  chartsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" },
  chartCard: { background: "#111111", border: "1px solid #1f1a00", borderRadius: "14px", padding: "24px" },
  chartTitle: { color: "#f0f0f0", marginBottom: "16px", fontSize: "1rem", fontWeight: "600" },
  tableCard: { background: "#111111", border: "1px solid #1f1a00", borderRadius: "14px", padding: "24px", marginBottom: "24px" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 16px", color: "#444", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #1a1a1a" },
  tr: { borderBottom: "1px solid #161616" },
  td: { padding: "14px 16px", fontSize: "0.9rem", color: "#ccc" },
  badge: { background: "#1f1a00", color: "#f5c518", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem" },
  delBtn: { background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: "1rem", transition: "color 0.15s" },
  formCard: { background: "#111111", border: "1px solid #1f1a00", borderRadius: "14px", padding: "32px", maxWidth: "600px" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  formRow: { display: "flex", gap: "16px" },
  label: { color: "#666", fontSize: "0.85rem" },
  input: { padding: "13px 16px", borderRadius: "10px", border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#f0f0f0", fontSize: "0.95rem", outline: "none" },
  submitBtn: { padding: "14px", borderRadius: "10px", border: "none", background: "#f5c518", color: "#0d0d0d", fontWeight: "700", fontSize: "1rem", cursor: "pointer", marginTop: "8px" },
  nuevoWrap: { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "32px", alignItems: "start" },
  nuevoLeft: { background: "#111111", border: "1px solid #1f1a00", borderRadius: "14px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" },
  nuevoTitle: { color: "#f5c518", fontSize: "1.4rem", fontWeight: "700", margin: 0 },
  nuevoSubtitle: { color: "#555", fontSize: "0.9rem", margin: 0, lineHeight: "1.6" },
  nuevoHint: { display: "flex", flexDirection: "column", gap: "12px" },
  hintItem: { color: "#666", fontSize: "0.85rem", lineHeight: "1.5", padding: "10px 14px", background: "#1a1a1a", borderRadius: "10px", border: "1px solid #1f1f1f" },
  nuevoRight: { background: "#111111", border: "1px solid #1f1a00", borderRadius: "14px", padding: "32px" },
  labelBig: { color: "#888", fontSize: "0.85rem", fontWeight: "600", letterSpacing: "0.3px" },
  inputBig: { padding: "14px 16px", borderRadius: "10px", border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#f0f0f0", fontSize: "1rem", outline: "none", width: "100%", boxSizing: "border-box" },
  submitBtnBig: { padding: "16px", borderRadius: "12px", border: "none", background: "#f5c518", color: "#0d0d0d", fontWeight: "800", fontSize: "1.05rem", cursor: "pointer", marginTop: "8px", letterSpacing: "0.3px" },
  barWrap: { display: "flex", alignItems: "center", gap: "10px" },
  barFill: { height: "6px", background: "#f5c518", borderRadius: "3px", minWidth: "4px", maxWidth: "200px" },
  barLabel: { color: "#666", fontSize: "0.8rem" },
};
