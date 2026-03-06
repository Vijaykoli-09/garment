import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Change to your production URL ────────────────────────────────────
// export const BASE_URL = 'https://garment-1-1v21.onrender.com/api';
export const BASE_URL = 'http://192.168.31.42:8080/api';
// Android emulator: 'http://10.0.2.2:8080/api'
// iOS simulator:    'http://localhost:8080/api'

// ════════════════════════════════════════════════════════════════════
// AXIOS INSTANCE — import this in every screen
// ════════════════════════════════════════════════════════════════════
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Auto-attach JWT token to every request ───────────────────────────
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// ── Handle 401 globally — clears session ────────────────────────────
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
await Promise.all([
  AsyncStorage.removeItem('auth_token'),
  AsyncStorage.removeItem('auth_user'),
]);    }
    return Promise.reject(error);
  }
);

// ════════════════════════════════════════════════════════════════════
// SESSION HELPERS
// ════════════════════════════════════════════════════════════════════
export const SessionStorage = {
  saveToken: (token: string) =>
    AsyncStorage.setItem('auth_token', token),

  getToken: () =>
    AsyncStorage.getItem('auth_token'),

  saveUser: (user: object) =>
    AsyncStorage.setItem('auth_user', JSON.stringify(user)),

  getUser: async () => {
    const raw = await AsyncStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  },

  clear: () =>
  Promise.all([
    AsyncStorage.removeItem('auth_token'),
    AsyncStorage.removeItem('auth_user'),
  ]),
};

// ════════════════════════════════════════════════════════════════════
// AUTH API
// ════════════════════════════════════════════════════════════════════
export const authApi = {
  signup: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    customerType: string;
    deliveryAddress: string;
    gstNo?: string;
    brokerName?: string;
    brokerPhone?: string;
  }) => api.post('/customer/auth/signup', data),

  login: (phone: string, password: string) =>
    api.post('/customer/auth/login', { phone, password }),
};

// ════════════════════════════════════════════════════════════════════
// PRODUCT API
// ════════════════════════════════════════════════════════════════════
export const productApi = {
  getAll: (search?: string) =>
    api.get('/admin/products', { params: search ? { search } : {} }),

  getById: (id: number) =>
    api.get(`/products/${id}`),
};

// ════════════════════════════════════════════════════════════════════
// ORDER API  (wire up once order backend is ready)
// ════════════════════════════════════════════════════════════════════
export const orderApi = {
  placeOrder: (data: any) =>
    api.post('/orders', data),

  getMyOrders: () =>
    api.get('/orders/my'),

  getOrderById: (id: number) =>
    api.get(`/orders/${id}`),
};

export default api;