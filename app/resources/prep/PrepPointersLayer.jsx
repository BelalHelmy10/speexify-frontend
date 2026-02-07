// app/resources/prep/PrepPointersLayer.jsx

export default function PrepPointersLayer({
  menusOpen,
  teacherPointer,
  learnerPointers,
  colorForId,
}) {
  return (
    <>
      {!menusOpen && teacherPointer && (
        <svg
          style={{
            position: "absolute",
            left: `${teacherPointer.x * 100}%`,
            top: `${teacherPointer.y * 100}%`,
            transform: "translate(-100%, -50%)",
            pointerEvents: "none",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
            animation: "blink 1s ease-in-out infinite",
            zIndex: 9999,
          }}
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M4 12H17M17 12L12 7M17 12L12 17"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {!menusOpen &&
        Object.entries(learnerPointers).map(([uid, pos]) => {
          const pointerColor = colorForId(uid);
          return (
            <div
              key={uid}
              style={{
                position: "absolute",
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: "translate(-100%, -50%)",
                pointerEvents: "none",
                zIndex: 9998,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <svg
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                }}
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M4 12H17M17 12L12 7M17 12L12 17"
                  stroke={pointerColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {pos.displayName && (
                <span
                  className="prep-cursor-label"
                  style={{
                    background: pointerColor,
                    color: "white",
                    fontSize: "10px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "8px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  {pos.displayName}
                </span>
              )}
            </div>
          );
        })}
    </>
  );
}
