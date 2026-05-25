// v4
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from "recharts";
import API from "../api";
import logo from "../assets/logo.png";
import Toast from "../components/Toast";
import { SkeletonCard, SkeletonRow, SkeletonChart } from "../components/Skeleton";
import { jsPDF } from "jspdf";

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
  const [editGasto, setEditGasto] = useState(null); // gasto que se está editando
  const [busqueda, setBusqueda] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cargando, setCargando] = useState(true);
  const isMobile = useIsMobile();
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
  const [formErrors, setFormErrors] = useState({});
  const [exportando, setExportando] = useState(null); // null | "csv" | "pdf"
  const [mostrarSpinner, setMostrarSpinner] = useState(false);
  const exportTimerRef = useRef(null);
  const navigate = useNavigate();
  const nombre = localStorage.getItem("nombre");

  useEffect(() => {
    // paso los valores iniciales explícitamente para evitar closure stale
    Promise.all([
      cargarCategorias(),
      fetchGastos("mensual", "", "", ""),
      cargarAnalisis("mensual", "", "", ""),
      cargarFinanzas(),
      cargarDeudas(),
    ]).finally(() => setCargando(false));
  }, []);

  async function cargarCategorias() {
    const res = await API.get("/categorias");
    setCategorias(res.data);
  }

  // función base que hace el fetch con parámetros explícitos
  async function fetchGastos(p, cat, fi, ff) {
    const params = new URLSearchParams();
    if (p)   params.append("periodo", p);
    if (cat) params.append("categoria_id", cat);
    if (fi)  params.append("fecha_inicio", fi);
    if (ff)  params.append("fecha_fin", ff);
    const res = await API.get(`/gastos?${params.toString()}`);
    setGastos(res.data);
  }

  // función que llama con los estados actuales — siempre pasar valores como args
  async function aplicarFiltros(p, cat, fi, ff) {
    const _p   = p   !== undefined ? p   : periodo;
    const _cat = cat !== undefined ? cat : filtroCategoria;
    const _fi  = fi  !== undefined ? fi  : fechaInicio;
    const _ff  = ff  !== undefined ? ff  : fechaFin;
    await Promise.all([
      fetchGastos(_p, _cat, _fi, _ff),
      cargarAnalisis(_p, _cat, _fi, _ff),
    ]);
    setToast({ message: "Filtros aplicados.", type: "success" });
  }

  async function cargarGastos() {
    await fetchGastos(periodo, filtroCategoria, fechaInicio, fechaFin);
  }

  async function cargarFinanzas() {
    // allSettled no cancela todo si una falla — cada llamada es independiente
    const [resF, resS, resP] = await Promise.allSettled([
      API.get("/finanzas"),
      API.get("/sueldo"),
      API.get("/proyeccion"),
    ]);
    if (resF.status === "fulfilled") setFinanzas(resF.value.data);
    if (resS.status === "fulfilled") setSueldo(resS.value.data.sueldo || "");
    if (resP.status === "fulfilled") setProyeccion(resP.value.data);
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
    await cargarFinanzas();
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
    if (!window.confirm("¿Eliminar esta deuda? Esta acción no se puede deshacer.")) return;
    await API.delete(`/deudas/${id}`);
    cargarDeudas();
    setSnowball(null);
    setToast({ message: "Deuda eliminada.", type: "error" });
  }

  async function calcularSnowball() {
    const res = await API.get("/snowball");
    setSnowball(res.data);
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    await API.put(`/gastos/${editGasto.id}`, {
      categoria_id: Number(editGasto.categoria_id),
      motivo: editGasto.motivo,
      monto: Number(editGasto.monto),
      fecha: editGasto.fecha,
    });
    setEditGasto(null);
    await Promise.all([aplicarFiltros(periodo, filtroCategoria, fechaInicio, fechaFin), cargarFinanzas()]);
    setToast({ message: "Gasto actualizado.", type: "success" });
  }

  async function agregarCategoria(e) {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    try {
      await API.post("/categorias", { nombre: nuevaCategoria.trim() });
      setNuevaCategoria("");
      cargarCategorias();
      setToast({ message: "Categoría creada.", type: "success" });
    } catch {
      setToast({ message: "Ya existe esa categoría.", type: "error" });
    }
  }

  async function eliminarCategoria(id) {
    try {
      await API.delete(`/categorias/${id}`);
      cargarCategorias();
      setToast({ message: "Categoría eliminada.", type: "success" });
    } catch {
      setToast({ message: "No puedes eliminar una categoría con gastos.", type: "error" });
    }
  }

  async function runExport(tipo, fn) {
    setExportando(tipo);
    setMostrarSpinner(true);
    // para CSV (muy rápido) mantenemos el spinner al menos 800ms para que sea visible
    const [result] = await Promise.allSettled([
      fn(),
      new Promise(r => setTimeout(r, tipo === "csv" ? 800 : 0)),
    ]);
    setExportando(null);
    setMostrarSpinner(false);
    if (result.status === "rejected") throw result.reason;
  }

  async function exportarPDF() {
    // aplicar filtros actuales antes de generar para que el PDF refleje lo que se ve en pantalla
    await fetchGastos(periodo, filtroCategoria, fechaInicio, fechaFin);

    let snowballData = snowball;
    if (!snowballData && deudas.length > 0) {
      const res = await API.get("/snowball");
      snowballData = res.data;
      setSnowball(res.data);
    }

    // etiqueta del filtro activo para el encabezado del PDF
    const periodoLabel = {
      "": "Todos los registros", diario: "Hoy", semanal: "Esta semana",
      mensual: "Este mes", trimestral: "Ultimos 3 meses",
      semestral: "Ultimos 6 meses", anual: "Este ano",
    }[periodo] || "Todos los registros";
    const catLabel = filtroCategoria ? (categorias.find(c => String(c.id) === filtroCategoria)?.nombre || "") : "";
    const fechaLabel = fechaInicio && fechaFin ? `${fechaInicio} al ${fechaFin}` : "";
    const filtroActivo = [periodoLabel, catLabel, fechaLabel].filter(Boolean).join(" | ");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const gold=[160,110,0], white=[30,30,30], gray=[100,100,100];
    const red=[180,40,40], green=[30,140,70], orange=[180,90,20];
    const W=210; let y=18;
    const newPage=()=>{ doc.addPage(); doc.setFillColor(8,8,8); doc.rect(0,0,W,297,"F"); y=18; };
    const checkPage=(n=20)=>{ if(y+n>280) newPage(); };
    const line=(color=[200,200,200])=>{ doc.setDrawColor(...color); doc.setLineWidth(0.3); doc.line(15,y,W-15,y); y+=5; };
    const ttl=(t,size=13,color=gold)=>{ doc.setFontSize(size); doc.setTextColor(...color); doc.setFont("helvetica","bold"); doc.text(t,15,y); y+=size*0.5+3; };
    const rw=(t,size=9,color=white,x=15)=>{ doc.setFontSize(size); doc.setTextColor(...color); doc.setFont("helvetica","normal"); const ls=doc.splitTextToSize(String(t),W-x-15); doc.text(ls,x,y); y+=(size*0.45+1.5)*ls.length; };
    const bld=(t,size=9,color=white,x=15)=>{ doc.setFontSize(size); doc.setTextColor(...color); doc.setFont("helvetica","bold"); doc.text(String(t),x,y); y+=size*0.45+1.5; };
    doc.setFillColor(8,8,8); doc.rect(0,0,W,297,"F");
    doc.setFillColor(14,14,14); doc.rect(0,0,W,30,"F");
    ttl("StatKash - Reporte Financiero Personal",15,gold);
    rw("Generado el "+new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"})+"   Usuario: "+nombre,8,gray);
    rw("Filtro aplicado: "+filtroActivo,8,orange);
    y+=3; line(gold);
    if(finanzas&&finanzas.sueldo>0){
      ttl("Resumen Financiero del Mes",12);
      const sMap={excelente:"EXCELENTE",buena:"BUENA",ajustada:"AJUSTADA",deficit:"DEFICIT"};
      const sCol={excelente:green,buena:gold,ajustada:orange,deficit:red};
      bld("Salud financiera: "+(sMap[finanzas.salud]||""),10,(sCol[finanzas.salud]||white));
      rw("Sueldo mensual:     $"+finanzas.sueldo.toLocaleString("es-CO"));
      rw("Gastos este mes:    $"+finanzas.gastos_mes.toLocaleString("es-CO"));
      rw("Pagos de deudas:    $"+finanzas.total_deuda_mensual.toLocaleString("es-CO"));
      bld("Ahorro neto:        $"+finanzas.ahorro.toLocaleString("es-CO")+" ("+finanzas.tasa_ahorro+"%)",9,finanzas.ahorro>=0?green:red);
      y+=3; line();
    }
    if(finanzas&&finanzas.sueldo>0){
      checkPage(35); ttl("Plan de Accion Recomendado",12);
      const m20=finanzas.sueldo*0.20, m10=finanzas.sueldo*0.10;
      if(finanzas.salud==="deficit"){
        bld("ALERTA: Estas en deficit",9,red);
        rw("Gastas $"+Math.abs(finanzas.ahorro).toLocaleString("es-CO")+" mas de lo que ganas. Debes reducir gastos inmediatamente.");
        rw("Necesitas recortar $"+(finanzas.gastos_mes-finanzas.sueldo*0.80).toLocaleString("es-CO")+" para equilibrar tus finanzas.");
        if(finanzas.por_categoria[0]) rw("Mayor gasto: "+finanzas.por_categoria[0].categoria+" ($"+finanzas.por_categoria[0].total.toLocaleString("es-CO")+"). Reducirlo 30% = $"+(finanzas.por_categoria[0].total*0.30).toLocaleString("es-CO")+"/mes de ahorro.");
        rw("Regla 50/30/20: necesidades $"+(finanzas.sueldo*0.50).toLocaleString("es-CO")+" | gustos $"+(finanzas.sueldo*0.30).toLocaleString("es-CO")+" | ahorro $"+m20.toLocaleString("es-CO")+".");
      } else if(finanzas.salud==="ajustada"){
        bld("ATENCION: Finanzas ajustadas",9,orange);
        rw("Ahorras $"+finanzas.ahorro.toLocaleString("es-CO")+"/mes ("+finanzas.tasa_ahorro+"%). Meta minima 10% = $"+m10.toLocaleString("es-CO")+"/mes.");
        rw("Necesitas reducir $"+(m10-finanzas.ahorro).toLocaleString("es-CO")+" en gastos para alcanzar esa meta.");
        if(finanzas.por_categoria[0]) rw("Revisa el gasto en "+finanzas.por_categoria[0].categoria+": "+(finanzas.por_categoria[0].total/finanzas.sueldo*100).toFixed(1)+"% de tu sueldo.");
      } else if(finanzas.salud==="buena"){
        bld("Vas bien - apunta al 20% de ahorro",9,gold);
        rw("Ahorras $"+finanzas.ahorro.toLocaleString("es-CO")+"/mes. En 12 meses acumularias $"+(finanzas.ahorro*12).toLocaleString("es-CO")+".");
        rw("Para llegar al 20% necesitas $"+(m20-finanzas.ahorro).toLocaleString("es-CO")+" mas de ahorro mensual.");
      } else if(finanzas.salud==="excelente"){
        bld("Excelente control financiero",9,green);
        rw("Ahorras el "+finanzas.tasa_ahorro+"% de tu sueldo ($"+finanzas.ahorro.toLocaleString("es-CO")+"/mes). En un ano: $"+(finanzas.ahorro*12).toLocaleString("es-CO")+".");
        rw("Invierte $"+(finanzas.ahorro*0.70).toLocaleString("es-CO")+" y manten $"+(finanzas.ahorro*0.30).toLocaleString("es-CO")+" como fondo de emergencia mensual.");
      }
      y+=3; line();
    }
    if(snowballData&&snowballData.deudas&&snowballData.deudas.length>0){
      checkPage(30); ttl("Plan Bola de Nieve - Deudas",12);
      rw("Dinero extra disponible: $"+snowballData.dinero_extra.toLocaleString("es-CO")+"/mes",9,gold);
      const tt=snowballData.meses_total>=600?"No viable - necesitas aumentar ingresos o reducir gastos":snowballData.meses_total+" meses ("+(snowballData.meses_total/12).toFixed(1)+" anos)";
      bld("Tiempo total libre de deudas: "+tt,9,snowballData.meses_total>=600?red:green);
      y+=3;
      snowballData.deudas.forEach(d=>{
        checkPage(18);
        bld(d.orden+". "+d.nombre,9,gold);
        rw("   Saldo: $"+d.monto_original.toLocaleString("es-CO")+"  |  Pago mensual: $"+d.pago_mensual.toLocaleString("es-CO")+"  |  Meses: "+(d.meses>=600?"No viable":d.meses)+"  |  Interes: $"+d.interes_total.toLocaleString("es-CO"),8,white,18);
      });
      y+=3; line();
    } else if(deudas.length===0){
      checkPage(15); ttl("Deudas",12);
      bld("Sin deudas registradas - excelente!",9,green); y+=3; line();
    }
    checkPage(20); ttl("Transacciones - "+filtroActivo+" ("+gastosFiltrados.length+" registros)",11);
    const colX=[15,62,130,168];
    doc.setFontSize(8); doc.setTextColor(...gray); doc.setFont("helvetica","bold");
    ["Categoria","Motivo","Monto","Fecha"].forEach((h,i)=>doc.text(h,colX[i],y)); y+=5; line([30,30,30]);
    gastosFiltrados.slice(0,80).forEach(g=>{
      checkPage(7); doc.setFontSize(8); doc.setFont("helvetica","normal");
      doc.setTextColor(...white); doc.text(g.categoria.slice(0,14),colX[0],y);
      doc.setTextColor(...white); doc.text(g.motivo.slice(0,30),colX[1],y);
      doc.setTextColor(...gold); doc.text("$"+g.monto.toLocaleString("es-CO"),colX[2],y);
      doc.setTextColor(...gray); doc.text(g.fecha,colX[3],y); y+=5;
    });
    const pages=doc.getNumberOfPages();
    for(let i=1;i<=pages;i++){
      doc.setPage(i); doc.setFillColor(8,8,8); doc.rect(0,288,W,10,"F");
      doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text("StatKash - Reporte confidencial",15,294);
      doc.text("Pag. "+i+" / "+pages,W-22,294);
    }
    doc.save("StatKash_Reporte_"+new Date().toISOString().split("T")[0]+".pdf");
  }

    function exportarCSV() {
    const headers = ["ID", "Categoría", "Motivo", "Monto", "Fecha"];
    const rows = gastos.map(g => [g.id, g.categoria, g.motivo, g.monto, g.fecha]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "statkash_gastos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const gastosFiltrados = gastos.filter(g =>
    g.motivo.toLowerCase().includes(busqueda.toLowerCase()) ||
    g.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function cargarAnalisis(p, cat, fi, ff) {
    const params = new URLSearchParams();
    if (p)   params.append("periodo", p);
    if (cat) params.append("categoria_id", cat);
    if (fi)  params.append("fecha_inicio", fi);
    if (ff)  params.append("fecha_fin", ff);
    const query = params.toString();
    const res = await API.get(`/analisis${query ? "?" + query : ""}`);
    setAnalisis(res.data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = {};
    if (!form.categoria_id)                  errors.categoria_id = "Selecciona una categoría.";
    if (!form.monto || Number(form.monto) <= 0) errors.monto = "Ingresa un monto mayor a 0.";
    if (!form.motivo.trim())                 errors.motivo = "Describe en qué gastaste.";
    if (!form.fecha)                         errors.fecha = "Selecciona una fecha.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setToast({ message: "Completa los campos marcados en rojo.", type: "error" });
      return;
    }
    setFormErrors({});
    await API.post("/gastos", {
      ...form,
      categoria_id: Number(form.categoria_id),
      monto: Number(form.monto),
    });
    setForm({ categoria_id: "", motivo: "", monto: "", fecha: new Date().toISOString().split("T")[0] });
    setFormErrors({});
    await Promise.all([
      fetchGastos(periodo, filtroCategoria, fechaInicio, fechaFin),
      cargarAnalisis(),
      cargarFinanzas(),
    ]);
    setActivePage("overview");
    setToast({ message: "¡Gasto guardado correctamente!", type: "success" });
  }

  async function eliminarGasto(id) {
    if (!window.confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) return;
    await API.delete(`/gastos/${id}`);
    await Promise.all([
      fetchGastos(periodo, filtroCategoria, fechaInicio, fechaFin),
      cargarAnalisis(periodo, filtroCategoria, fechaInicio, fechaFin),
      cargarFinanzas(),
    ]);
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
    { id: "nuevo", icon: "+", label: "Registrar" },
    { id: "finanzas", icon: "◈", label: "Mis Finanzas" },
    { id: "deudas", icon: "◎", label: "Deudas" },
  ];

  return (
    <div style={{ ...s.shell, flexDirection: isMobile ? "column" : "row" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {mostrarSpinner && (
        <div style={s.exportOverlay}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes indeterminate {
              0%   { left: -40%; width: 40%; }
              60%  { left: 100%; width: 40%; }
              100% { left: 100%; width: 40%; }
            }
          `}</style>
          <div style={s.exportBar}>
            <div style={s.exportBarFill} />
          </div>
          <div style={s.exportModal}>
            <div style={s.exportSpinner} />
            <p style={{ color: "#f5c518", fontSize: "0.9rem", margin: 0 }}>
              {exportando === "pdf" ? "Generando PDF…" : "Exportando CSV…"}
            </p>
          </div>
        </div>
      )}

      {/* modal de edición de gasto */}
      {editGasto && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <h3 style={{ color: "#f5c518", margin: "0 0 20px 0" }}>Editar gasto</h3>
            <form onSubmit={guardarEdicion} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <select style={s.ticketInput} value={editGasto.categoria_id} onChange={e => setEditGasto({ ...editGasto, categoria_id: e.target.value })} required>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input style={s.ticketInput} type="text" value={editGasto.motivo} onChange={e => setEditGasto({ ...editGasto, motivo: e.target.value })} required />
              <input style={s.ticketInput} type="number" value={editGasto.monto} onChange={e => setEditGasto({ ...editGasto, monto: e.target.value })} required />
              <input style={s.ticketInput} type="date" value={editGasto.fecha} onChange={e => setEditGasto({ ...editGasto, fecha: e.target.value })} required />
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={s.ticketBtn} type="submit">Guardar</button>
                <button style={{ ...s.ticketBtn, background: "#1a1a1a", color: "#888" }} type="button" onClick={() => setEditGasto(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIDEBAR — solo en desktop */}
      {!isMobile && (
        <aside style={s.sidebar}>
          <div style={s.sideTop}>
            <div style={s.brand}>
              <img src={logo} alt="StatKash" style={s.logoImg} />
            </div>
            <nav style={s.nav}>
              {navItems.map((item) => (
                <button key={item.id} onClick={() => setActivePage(item.id)}
                  style={{ ...s.navItem, ...(activePage === item.id ? s.navItemActive : {}) }}>
                  <span style={s.navIcon}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div style={s.sideBottom}>
            <div style={s.userBox}>
              <div style={s.avatar}>{nombre?.[0]?.toUpperCase()}</div>
              <div>
                <p style={s.userName}>{nombre}</p>
                <p style={s.userRole}>Usuario</p>
              </div>
            </div>
            <button onClick={logout} style={s.logoutBtn}>Cerrar sesión</button>
          </div>
        </aside>
      )}

      {/* TOPBAR — solo en mobile */}
      {isMobile && (
        <div style={s.mobileTopbar}>
          <img src={logo} alt="StatKash" style={{ height: "32px" }} />
          <div style={s.avatar}>{nombre?.[0]?.toUpperCase()}</div>
        </div>
      )}

      {/* contenido principal */}
      <main style={{ ...s.main, marginLeft: isMobile ? 0 : "248px", paddingBottom: isMobile ? "80px" : "32px" }}>
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
            <select style={s.periodoSelect} value={periodo} onChange={(e) => { setPeriodo(e.target.value); setFechaInicio(""); setFechaFin(""); }}>
              <option value="">Todos</option>
              <option value="diario">Hoy</option>
              <option value="semanal">Esta semana</option>
              <option value="mensual">Este mes</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Este año</option>
            </select>

            {/* filtro por categoría */}
            <select style={s.periodoSelect} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            {/* fechas siempre visibles */}
            <input
              style={{ ...s.periodoSelect, color: fechaInicio ? "#f5c518" : "#444" }}
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setPeriodo(""); }}
              title="Desde"
            />
            <input
              style={{ ...s.periodoSelect, color: fechaFin ? "#f5c518" : "#444" }}
              type="date"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setPeriodo(""); }}
              title="Hasta"
            />

            {/* limpiar todos los filtros */}
            {(fechaInicio || fechaFin || filtroCategoria || periodo) && (
              <button
                style={s.clearBtn}
                onClick={async () => {
                  setPeriodo(""); setFiltroCategoria("");
                  setFechaInicio(""); setFechaFin("");
                  await Promise.all([
                    fetchGastos("", "", "", ""),
                    cargarAnalisis("", "", "", ""),
                  ]);
                  setToast({ message: "Filtros limpiados.", type: "success" });
                }}
              >
                ✕ Limpiar
              </button>
            )}

            <button style={s.applyBtn} onClick={() => aplicarFiltros(periodo, filtroCategoria, fechaInicio, fechaFin)}>Aplicar</button>
          </div>
        </div>

        {/* skeleton mientras carga la primera vez */}
        {cargando && activePage === "overview" && (
          <div>
            <div style={s.statsGrid}>
              {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
            <div style={s.chartsRow}>
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <div style={s.tableCard}>
              {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
            </div>
          </div>
        )}

        {/* --- VISTA GENERAL --- muestra todo de un vistazo */}
        {!cargando && activePage === "overview" && (
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
        {cargando && activePage === "gastos" && (
          <div style={s.tableCard}>
            {[1,2,3,4,5,6].map(i => <SkeletonRow key={i} />)}
          </div>
        )}

        {!cargando && activePage === "gastos" && (
          <div style={s.tableCard}>
            {/* barra de búsqueda y exportar */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
              <input
                style={{ ...s.ticketInput, flex: 1, minWidth: "200px" }}
                placeholder="Buscar por motivo o categoría..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <button style={{ ...s.applyBtn, opacity: exportando ? 0.6 : 1 }} disabled={!!exportando} onClick={() => runExport("csv", exportarCSV)}>
                {exportando === "csv" ? <span style={s.btnSpinner} /> : "⬇ CSV"}
              </button>
              <button style={{ ...s.applyBtn, background: "linear-gradient(135deg,#a855f7 0%,#7c3aed 100%)", boxShadow: "0 4px 14px rgba(168,85,247,0.3)", opacity: exportando ? 0.6 : 1 }} disabled={!!exportando} onClick={() => runExport("pdf", exportarPDF)}>
                {exportando === "pdf" ? <span style={s.btnSpinner} /> : "⬇ PDF"}
              </button>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Categoría", "Motivo", "Monto", "Fecha", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gastosFiltrados.map((g) => (
                  <tr key={g.id} style={s.tr}>
                    <td style={s.td}><span style={s.badge}>{g.categoria}</span></td>
                    <td style={s.td}>{g.motivo}</td>
                    <td style={{ ...s.td, color: "#f5c518", fontWeight: "600" }}>${g.monto.toLocaleString("es-CO")}</td>
                    <td style={{ ...s.td, color: "#666" }}>{g.fecha}</td>
                    <td style={s.td}>
                      <button onClick={() => setEditGasto({ ...g, categoria_id: categorias.find(c => c.nombre === g.categoria)?.id || "" })} style={{ ...s.delBtn, color: "#f5c518", marginRight: "8px" }}>✎</button>
                      <button onClick={() => eliminarGasto(g.id)} style={s.delBtn}>✕</button>
                    </td>
                  </tr>
                ))}
                {gastosFiltrados.length === 0 && (
                  <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#444", padding: "32px" }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- REGISTRAR --- ticket + categorías */}
        {activePage === "nuevo" && (
          <div style={s.ticketWrap}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "520px" }}>

              {/* formulario de gasto */}
              <form onSubmit={handleSubmit} style={s.ticket}>
                <div style={s.ticketHeader}>
                  <span style={{ ...s.ticketIcon, ...(formErrors.monto ? { boxShadow: "0 0 0 2px #f87171" } : {}) }}>＄</span>
                  <div style={{ flex: 1 }}>
                    <p style={s.ticketLabel}>¿Cuánto gastaste?</p>
                    <input
                      style={s.montoGrande}
                      type="number" min="0" placeholder="0"
                      value={form.monto}
                      onChange={(e) => { setForm({ ...form, monto: e.target.value }); setFormErrors(p => ({ ...p, monto: "" })); }}
                    />
                    {formErrors.monto && <p style={s.fieldError}>{formErrors.monto}</p>}
                  </div>
                </div>

                <div style={s.ticketDivider} />

                <div style={s.formGroup}>
                  <label style={s.ticketFieldLabel}>Categoría</label>
                  <div style={{ ...s.chipsWrap, ...(formErrors.categoria_id ? { padding: "10px", borderRadius: "12px", border: "1.5px solid #f87171", background: "rgba(248,113,113,0.05)" } : {}) }}>
                    {categorias.map((c) => (
                      <button key={c.id} type="button"
                        onClick={() => { setForm({ ...form, categoria_id: String(c.id) }); setFormErrors(p => ({ ...p, categoria_id: "" })); }}
                        style={{ ...s.chip, ...(form.categoria_id === String(c.id) ? s.chipActive : {}) }}>
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                  {formErrors.categoria_id && (
                    <p style={{ color: "#f87171", fontSize: "0.82rem", margin: "6px 0 0 2px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "1rem" }}>⚠</span> {formErrors.categoria_id}
                    </p>
                  )}
                </div>

                <div style={s.ticketDivider} />

                <div style={s.formGroup}>
                  <label style={s.ticketFieldLabel}>¿En qué gastaste?</label>
                  <input
                    style={{ ...s.ticketInput, ...(formErrors.motivo ? { borderColor: "rgba(248,113,113,0.6)" } : {}) }}
                    type="text" placeholder="Ej: Mercado, Netflix, Gasolina..."
                    value={form.motivo}
                    onChange={(e) => { setForm({ ...form, motivo: e.target.value }); setFormErrors(p => ({ ...p, motivo: "" })); }}
                  />
                  {formErrors.motivo && <p style={s.fieldError}>{formErrors.motivo}</p>}
                </div>

                <div style={s.formGroup}>
                  <label style={s.ticketFieldLabel}>Fecha</label>
                  <input
                    style={{ ...s.ticketInput, ...(formErrors.fecha ? { borderColor: "rgba(248,113,113,0.6)" } : {}) }}
                    type="date"
                    value={form.fecha}
                    onChange={(e) => { setForm({ ...form, fecha: e.target.value }); setFormErrors(p => ({ ...p, fecha: "" })); }}
                  />
                  {formErrors.fecha && <p style={s.fieldError}>{formErrors.fecha}</p>}
                </div>

                <div style={s.ticketDivider} />

                <button style={s.ticketBtn} type="submit">Registrar gasto</button>
              </form>

              {/* gestión de categorías — debajo del formulario */}
              <div style={{ ...s.ticket, gap: "12px" }}>
                <p style={s.ticketFieldLabel}>Gestionar categorías</p>
                <p style={{ color: "#333", fontSize: "0.76rem", margin: "-4px 0 4px 0" }}>
                  Crea una categoría antes de registrar si no la encuentras arriba
                </p>
                <form onSubmit={agregarCategoria} style={{ display: "flex", gap: "8px" }}>
                  <input style={{ ...s.ticketInput, flex: 1 }} placeholder="Nueva categoría..."
                    value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} />
                  <button style={{ ...s.ticketBtn, padding: "10px 16px", fontSize: "0.85rem" }} type="submit">
                    + Agregar
                  </button>
                </form>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  {categorias.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(245,197,24,0.07)", border: "1px solid rgba(245,197,24,0.14)", borderRadius: "20px", padding: "5px 12px" }}>
                      <span style={{ color: "#c9a100", fontSize: "0.8rem" }}>{c.nombre}</span>
                      <button onClick={() => eliminarCategoria(c.id)} style={{ background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
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

      {/* NAV INFERIOR — solo en mobile */}
      {isMobile && (
        <nav style={s.mobileNav}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              style={{ ...s.mobileNavItem, ...(activePage === item.id ? s.mobileNavActive : {}) }}>
              <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
              <span style={{ fontSize: "0.65rem" }}>{item.label.split(" ")[0]}</span>
            </button>
          ))}
          <button onClick={logout} style={s.mobileNavItem}>
            <span style={{ fontSize: "1.2rem" }}>⏻</span>
            <span style={{ fontSize: "0.65rem" }}>Salir</span>
          </button>
        </nav>
      )}
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
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
  fieldError: { color: "#f87171", fontSize: "0.75rem", margin: "4px 0 0 0" },

  exportOverlay: {
    position: "fixed", inset: 0, zIndex: 1000,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
  },
  exportBar: {
    position: "fixed", top: 0, left: 0, right: 0, height: "3px",
    background: "rgba(245,197,24,0.15)", overflow: "hidden",
  },
  exportBarFill: {
    position: "absolute", height: "100%",
    background: "linear-gradient(90deg,#f5c518,#d4a800)",
    animation: "indeterminate 1.5s ease-in-out infinite",
  },
  exportModal: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "20px",
    background: "#111", border: "1px solid rgba(245,197,24,0.2)",
    borderRadius: "20px", padding: "40px 52px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
  },
  exportSpinner: {
    width: "52px", height: "52px", borderRadius: "50%",
    border: "4px solid rgba(245,197,24,0.15)",
    borderTop: "4px solid #f5c518",
    animation: "spin 0.8s linear infinite",
  },
  btnSpinner: {
    display: "inline-block", width: "16px", height: "16px", borderRadius: "50%",
    border: "2px solid rgba(0,0,0,0.3)", borderTop: "2px solid #0a0a0a",
    animation: "spin 0.8s linear infinite", verticalAlign: "middle",
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
  // modal edición
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modal: { background: "#111111", border: "1px solid rgba(245,197,24,0.15)", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
  // mobile
  mobileTopbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "#0e0e0e", borderBottom: "1px solid rgba(245,197,24,0.06)" },
  mobileNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#0e0e0e", borderTop: "1px solid rgba(245,197,24,0.08)", display: "flex", zIndex: 100 },
  mobileNavItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "10px 4px", border: "none", background: "transparent", color: "#444", cursor: "pointer" },
  mobileNavActive: { color: "#f5c518" },
};
