import axios from "axios";

const api = axios.create({
  baseURL: "https://garment-1-1v21.onrender.com/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// attach token & CSRF header automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const csrf = getCookie("XSRF-TOKEN");
  if (csrf) {
    config.headers = config.headers ?? {};
    config.headers["X-XSRF-TOKEN"] = csrf;
  }

  return config;
});

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export default api;