// web/src/components/PageLoader.jsx
export default function PageLoader() {
  return (
    <div
      style={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center",
        fontSize: 14,
        opacity: 0.8,
      }}
    >
      Loading…
    </div>
  );
}
