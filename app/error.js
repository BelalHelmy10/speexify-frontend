"use client";
export default function GlobalError({ error, reset }) {
  console.error(error);
  return (
    <div className="container" style={{ padding: "4rem 1rem" }}>
      <h1>Something went wrong</h1>
      <p>Try again or come back later.</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
