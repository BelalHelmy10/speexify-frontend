// src/lib/api.js
import axios from "axios";

// Trim trailing slashes; fallback to localhost in dev.
const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:5050";

const api = axios.create({
  baseURL, // every call is relative to your backend
  withCredentials: true, // send/receive auth cookies
});

// (optional) simple dev logger for API errors
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
