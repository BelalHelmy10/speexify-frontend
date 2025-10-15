export default function Spinner({ label = "Loading…" }) {
  return (
    <div style={{ padding: "32px", textAlign: "center", opacity: 0.7 }}>
      <div
        style={{
          width: 22,
          height: 22,
          border: "3px solid #ddd",
          borderTopColor: "#0ea5e9",
          borderRadius: "50%",
          margin: "0 auto 12px",
          animation: "spxspin 0.8s linear infinite",
        }}
      />
      <div>{label}</div>
      <style jsx>{`
        @keyframes spxspin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
