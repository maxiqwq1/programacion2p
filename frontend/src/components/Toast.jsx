import { useEffect } from "react";

// componente de notificación reutilizable, recibe tipo "success" o "error"
export default function Toast({ message, type = "success", onClose }) {
  // se cierra solo después de 3 segundos
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === "success" ? "#0f2d1a" : "#2d0f0f";
  const border = type === "success" ? "#1a5c2a" : "#5c1a1a";
  const color = type === "success" ? "#4ade80" : "#f87171";
  const icon = type === "success" ? "✓" : "✕";

  return (
    <div style={{ ...s.toast, background: bg, border: `1px solid ${border}` }}>
      <span style={{ ...s.icon, color }}>{icon}</span>
      <span style={{ ...s.msg, color }}>{message}</span>
      <button onClick={onClose} style={s.close}>✕</button>
    </div>
  );
}

const s = {
  toast: {
    position: "fixed",
    top: "24px",
    right: "24px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px 18px",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    zIndex: 9999,
    minWidth: "280px",
    maxWidth: "400px",
    animation: "slideIn 0.3s ease",
  },
  icon: {
    fontWeight: "700",
    fontSize: "1rem",
  },
  msg: {
    flex: 1,
    fontSize: "0.9rem",
    fontWeight: "500",
  },
  close: {
    background: "transparent",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: "0.9rem",
    padding: "0 4px",
  },
};
