// componente de skeleton loader - muestra una animación mientras cargan los datos
export function SkeletonBox({ width = "100%", height = "20px", borderRadius = "8px", style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: "linear-gradient(90deg, #161616 25%, #1f1f1f 50%, #161616 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: "linear-gradient(145deg,#111 0%,#0f0f0f 100%)", border: "1px solid rgba(245,197,24,0.07)", borderRadius: "16px", padding: "22px 24px" }}>
      <SkeletonBox width="60%" height="12px" style={{ marginBottom: "12px" }} />
      <SkeletonBox width="80%" height="28px" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
      <SkeletonBox width="80px" height="24px" borderRadius="20px" />
      <SkeletonBox width="30%" height="14px" />
      <SkeletonBox width="15%" height="14px" style={{ marginLeft: "auto" }} />
      <SkeletonBox width="12%" height="14px" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div style={{ background: "linear-gradient(145deg,#111 0%,#0f0f0f 100%)", border: "1px solid rgba(245,197,24,0.07)", borderRadius: "16px", padding: "24px" }}>
      <SkeletonBox width="40%" height="14px" style={{ marginBottom: "20px" }} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "180px", padding: "0 8px" }}>
        {[60, 90, 45, 120, 70, 100, 55].map((h, i) => (
          <SkeletonBox key={i} width="100%" height={`${h}px`} borderRadius="6px 6px 0 0" />
        ))}
      </div>
    </div>
  );
}
