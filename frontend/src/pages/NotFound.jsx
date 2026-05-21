import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function NotFound() {
  return (
    <div style={s.page}>
      <img src={logo} alt="StatKash" style={s.logo} />
      <h1 style={s.code}>404</h1>
      <p style={s.msg}>Esta página no existe.</p>
      <Link to="/dashboard" style={s.btn}>Volver al dashboard</Link>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh", background: "#080808",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "16px",
  },
  logo: { width: "120px", opacity: 0.5, marginBottom: "8px" },
  code: { color: "#f5c518", fontSize: "5rem", fontWeight: "900", margin: 0, lineHeight: 1, textShadow: "0 0 40px rgba(245,197,24,0.3)" },
  msg: { color: "#444", fontSize: "1rem", margin: 0 },
  btn: {
    marginTop: "8px", padding: "12px 28px", borderRadius: "12px",
    background: "linear-gradient(135deg, #f5c518 0%, #d4a800 100%)",
    color: "#0a0a0a", fontWeight: "700", textDecoration: "none", fontSize: "0.95rem",
  },
};
