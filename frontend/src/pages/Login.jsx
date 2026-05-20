import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import logo from "../assets/logo.png";

export default function Login() {
  // estados para guardar lo que escribe el usuario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    // esto evita que la página se recargue sola al enviar el formulario
    e.preventDefault();
    try {
      const res = await API.post("/login", { email, password });
      // guardo el token y el nombre en localStorage para usarlos después en otras páginas
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("nombre", res.data.nombre);
      navigate("/dashboard");
    } catch {
      setError("Credenciales incorrectas.");
    }
  }

  return (
    <div style={s.page}>
      {/* panel izquierdo con el nombre de la app, solo decorativo */}
      <div style={s.left}>
        <div style={s.brand}>
          <img src={logo} alt="StatKash" style={s.logoImg} />
        </div>
        <p style={s.tagline}>Toma el control de tus finanzas personales con inteligencia.</p>
      </div>

      {/* panel derecho donde está el formulario de verdad */}
      <div style={s.right}>
        <div style={s.card}>
          <h2 style={s.title}>Bienvenido de nuevo</h2>
          <p style={s.subtitle}>Inicia sesión para continuar</p>

          {/* solo muestro el error si hay algo, si no no aparece nada */}
          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleLogin} style={s.form}>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button style={s.btn} type="submit">Iniciar sesión</button>
          </form>

          <p style={s.footer}>
            ¿No tienes cuenta?{" "}
            <Link to="/register">Regístrate gratis</Link>
          </p>
          <p style={s.footer}>
            <Link to="/reset-password">¿Olvidaste tu contraseña?</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// puse los estilos acá abajo para no mezclarlos con el HTML y que sea más fácil de editar
const s = {
  page: { display: "flex", minHeight: "100vh" },
  left: {
    flex: 1,
    background: "radial-gradient(ellipse at 30% 70%, #1a1200 0%, #0e0900 40%, #080808 100%)",
    display: "flex", flexDirection: "column", justifyContent: "center",
    padding: "60px",
    borderRight: "1px solid rgba(245,197,24,0.06)",
    position: "relative", overflow: "hidden",
  },
  brand: { marginBottom: "36px", position: "relative", zIndex: 1 },
  logoImg: { width: "210px", height: "auto", filter: "drop-shadow(0 0 24px rgba(245,197,24,0.2))" },
  tagline: {
    fontSize: "1.15rem", color: "#7a6a30",
    lineHeight: "1.8", maxWidth: "360px",
    position: "relative", zIndex: 1, letterSpacing: "0.1px",
  },
  right: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    background: "#080808", padding: "40px",
  },
  card: { width: "100%", maxWidth: "400px" },
  title: {
    fontSize: "2rem", fontWeight: "800", color: "#ffffff",
    marginBottom: "6px", letterSpacing: "-0.5px",
  },
  subtitle: { color: "#333", marginBottom: "36px", fontSize: "0.9rem" },
  form: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "0.78rem", color: "#444", marginTop: "10px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px" },
  input: {
    padding: "14px 16px", borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.06)",
    background: "#0e0e0e", color: "#e0e0e0",
    fontSize: "0.95rem", outline: "none",
  },
  btn: {
    marginTop: "24px", padding: "15px", borderRadius: "12px", border: "none",
    background: "linear-gradient(135deg, #f5c518 0%, #d4a800 100%)",
    color: "#0a0a0a", fontWeight: "800", fontSize: "1rem",
    cursor: "pointer", letterSpacing: "0.3px",
    boxShadow: "0 6px 24px rgba(245,197,24,0.3)",
  },
  error: {
    background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
    color: "#f87171", padding: "12px 16px", borderRadius: "10px",
    marginBottom: "16px", fontSize: "0.88rem",
  },
  footer: { textAlign: "center", marginTop: "28px", color: "#333", fontSize: "0.88rem" },
};
