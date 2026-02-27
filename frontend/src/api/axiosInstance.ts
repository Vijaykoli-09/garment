// import axios from "axios";

// const api = axios.create({
//   baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080/api" || "https://garments.ashdipitsolutions.in/backend/api",
//   headers: { "Content-Type": "application/json" },
// });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// export default api;
// src/api/axiosInstance.ts
// src/api/axiosInstance.ts
import axios from "axios";

const hostname = window.location.hostname;

const baseURL =
  hostname === "localhost"
    ? "http://localhost:8080/api"
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





