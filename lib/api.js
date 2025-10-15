// src/lib/api.js
import axios from "axios";

// Prefer going through Next.js rewrites to avoid CORS headaches.
// This works in dev, preview, and prod on Vercel.
let baseURL = "/api";

// Optional escape hatch: set NEXT_PUBLIC_DIRECT_BACKEND=1
// to talk to the backend directly (useful if you run the frontend
// without the Next dev server, or for debugging).
if (
  process.env.NEXT_PUBLIC_DIRECT_BACKEND === "1" &&
  process.env.NEXT_PUBLIC_API_URL
) {
  baseURL = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
}

const api = axios.create({
  baseURL,
  withCredentials: true, // keep this if you use cookie-based auth
  // timeout: 15000, // optional: add a timeout if you like
});

// (optional) dev logger
if (process.env.NODE_ENV !== "production") {
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      // eslint-disable-next-line no-console
      console.error(
        "[API error]",
        err?.response?.status,
        err?.response?.data || err?.message
      );
      return Promise.reject(err);
    }
  );
}

export default api;
