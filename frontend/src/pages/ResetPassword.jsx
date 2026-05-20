import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import logo from "../assets/logo.png";
import Toast from "../components/Toast";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const closeToast = useCallback(() => setToast(null), []);

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setExito("");

    // verifico que las dos contraseñas coincidan antes de mandar al backend
    if (nuevaPassword !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (nuevaPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      await API.post("/reset-password", { email, nueva_password: nuevaPassword });
      setExito("Contraseña actualizada. Redirigiendo al login...");
      setToast({ message: "¡Contraseña actualizada correctamente!", type: "success" });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const msg = err.response?.status === 404
        ? "No existe una cuenta con ese email."
        : "Ocurrió un error. Intenta de nuevo.";
      setError(msg);
      setToast({ message: msg, type: "error" });
    }
  }

  return (
    <div style={s.page}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      {/* panel izquierdo igual que en login y register */}
      <div style={s.left}>
        <div style={s.brand}>
          <img src={logo} alt="StatKash" style={s.logoImg} />
        </div>
        <p style={s.tagline}>Recupera el acceso a tu cuenta en segundos.</p>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <h2 style={s.title}>Recuperar contraseña</h2>
          <p style={s.subtitle}>Ingresa tu email y elige una nueva contraseña</p>

          {error && <div style={s.error}>{error}</div>}
          {exito && <div style={s.success}>{exito}</div>}

          <form onSubmit={handleReset} style={s.form}>
            <label style={s.label}>Correo electrónico</label>
            <input
              style={s.input}
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label style={s.label}>Nueva contraseña</label>
            <input
              style={s.input}
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              required
            />
            <label style={s.label}>Confirmar contraseña</label>
            <input
              style={s.input}
              type="password"
              placeholder="Repite la contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
            <button style={s.btn} type="submit">Actualizar contraseña</button>
          </form>

          <p style={s.footer}>
            <Link to="/login">Volver al inicio de sesión</Link>
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
    background: "linear-gradient(135deg, #1a1400 0%, #2d2200 50%, #1a1400 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "60px",
    borderRight: "1px solid #2a2200",
  },
  brand: { marginBottom: "32px" },
  logoImg: { width: "200px", height: "auto" },
  tagline: { fontSize: "1.2rem", color: "#a08c3a", lineHeight: "1.7", maxWidth: "380px" },
  right: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111111",
    padding: "40px",
  },
  card: { width: "100%", maxWidth: "420px" },
  title: { fontSize: "1.8rem", fontWeight: "700", color: "#ffffff", marginBottom: "8px" },
  subtitle: { color: "#666", marginBottom: "32px", fontSize: "0.95rem" },
  form: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "0.85rem", color: "#999", marginTop: "8px", marginBottom: "4px" },
  input: {
    padding: "13px 16px",
    borderRadius: "10px",
    border: "1px solid #2a2a2a",
    background: "#1a1a1a",
    color: "#f0f0f0",
    fontSize: "0.95rem",
    outline: "none",
  },
  btn: {
    marginTop: "20px",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#f5c518",
    color: "#0d0d0d",
    fontWeight: "700",
    fontSize: "1rem",
    cursor: "pointer",
  },
  error: {
    background: "#2d0f0f",
    border: "1px solid #5c1a1a",
    color: "#f87171",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "0.9rem",
  },
  success: {
    background: "#0f2d1a",
    border: "1px solid #1a5c2a",
    color: "#4ade80",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "0.9rem",
  },
  footer: { textAlign: "center", marginTop: "24px", color: "#555", fontSize: "0.9rem" },
};
