
import axios from "axios";

const hostname = window.location.hostname;

const baseURL =
  hostname === "localhost"
    ? "https://shriudaygarments.com/backend/api"
    : hostname === "shriudaygarments.com"
    ? "https://shriudaygarments.com/backend/api"
    : "https://garments.ashdipitsolutions.in/backend/api";

console.log("[axios] baseURL =", baseURL); // <-- debug in browser console

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send cookies (JSESSIONID + XSRF cookie)
});

// attach token & CSRF header automatically
api.interceptors.request.use((config) => {
  // attach JWT
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // attach XSRF token
  const csrf = getCookie("XSRF-TOKEN"); // Spring's default CSRF cookie name
  if (csrf) {
    config.headers = config.headers ?? {};
    config.headers["X-XSRF-TOKEN"] = csrf; // Spring's default CSRF header name
  }

  return config;
});

// helper to read cookie
function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export default api;





