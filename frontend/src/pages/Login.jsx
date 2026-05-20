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
  page: {
    display: "flex",
    minHeight: "100vh",
  },
  left: {
    flex: 1,
    background: "linear-gradient(135deg, #1a1400 0%, #2d2200 50%, #1a1400 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "60px",
    borderRight: "1px solid #2a2200",
  },
  brand: {
    marginBottom: "32px",
  },
  logoImg: {
    width: "200px",
    height: "auto",
  },
  tagline: {
    fontSize: "1.2rem",
    color: "#a08c3a",
    lineHeight: "1.7",
    maxWidth: "380px",
  },
  right: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111111",
    padding: "40px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    color: "#666",
    marginBottom: "32px",
    fontSize: "0.95rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "0.85rem",
    color: "#999",
    marginTop: "8px",
    marginBottom: "4px",
  },
  input: {
    padding: "13px 16px",
    borderRadius: "10px",
    border: "1px solid #2a2a2a",
    background: "#1a1a1a",
    color: "#f0f0f0",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border 0.2s",
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
    letterSpacing: "0.3px",
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
  footer: {
    textAlign: "center",
    marginTop: "24px",
    color: "#555",
    fontSize: "0.9rem",
  },
};
