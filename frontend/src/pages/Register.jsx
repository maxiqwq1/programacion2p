import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import logo from "../assets/logo.png";
import Toast from "../components/Toast";

export default function Register() {
  // necesito los tres campos para crear el usuario en la base de datos
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const closeToast = useCallback(() => setToast(null), []);

  async function handleRegister(e) {
    e.preventDefault();
    try {
      await API.post("/register", { nombre, email, password });
      setToast({ message: "¡Cuenta creada exitosamente! Redirigiendo...", type: "success" });
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setError("El email ya está registrado.");
      setToast({ message: "El email ya está registrado.", type: "error" });
    }
  }

  return (
    <div style={s.page}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      {/* lado izquierdo, igual que en login, solo cambia el texto del tagline */}
      <div style={s.left}>
        <div style={s.brand}>
          <img src={logo} alt="StatKash" style={s.logoImg} />
        </div>
        <p style={s.tagline}>Registra tus gastos, analiza tus hábitos y toma mejores decisiones financieras.</p>
      </div>

      {/* formulario de registro con tres campos */}
      <div style={s.right}>
        <div style={s.card}>
          <h2 style={s.title}>Crea tu cuenta</h2>
          <p style={s.subtitle}>Es gratis y tarda menos de un minuto</p>

          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleRegister} style={s.form}>
            <label style={s.label}>Nombre</label>
            <input
              style={s.input}
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <label style={s.label}>Correo electrónico</label>
            <input
              style={s.input}
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label style={s.label}>Contraseña</label>
            <input
              style={s.input}
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button style={s.btn} type="submit">Crear cuenta</button>
          </form>

          <p style={s.footer}>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: "flex", minHeight: "100vh" },
  left: {
    flex: 1,
    background: "radial-gradient(ellipse at 30% 70%, #1a1200 0%, #0e0900 40%, #080808 100%)",
    display: "flex", flexDirection: "column", justifyContent: "center",
    padding: "60px", borderRight: "1px solid rgba(245,197,24,0.06)",
  },
  brand: { marginBottom: "36px" },
  logoImg: { width: "210px", height: "auto", filter: "drop-shadow(0 0 24px rgba(245,197,24,0.2))" },
  tagline: { fontSize: "1.15rem", color: "#7a6a30", lineHeight: "1.8", maxWidth: "360px" },
  right: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    background: "#080808", padding: "40px",
  },
  card: { width: "100%", maxWidth: "400px" },
  title: { fontSize: "2rem", fontWeight: "800", color: "#ffffff", marginBottom: "6px", letterSpacing: "-0.5px" },
  subtitle: { color: "#333", marginBottom: "36px", fontSize: "0.9rem" },
  form: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "0.78rem", color: "#444", marginTop: "10px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px" },
  input: {
    padding: "14px 16px", borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.06)",
    background: "#0e0e0e", color: "#e0e0e0", fontSize: "0.95rem", outline: "none",
  },
  btn: {
    marginTop: "24px", padding: "15px", borderRadius: "12px", border: "none",
    background: "linear-gradient(135deg, #f5c518 0%, #d4a800 100%)",
    color: "#0a0a0a", fontWeight: "800", fontSize: "1rem",
    cursor: "pointer", boxShadow: "0 6px 24px rgba(245,197,24,0.3)",
  },
  error: {
    background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
    color: "#f87171", padding: "12px 16px", borderRadius: "10px",
    marginBottom: "16px", fontSize: "0.88rem",
  },
  footer: { textAlign: "center", marginTop: "28px", color: "#333", fontSize: "0.88rem" },
};
