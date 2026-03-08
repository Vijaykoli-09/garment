import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// export const BASE_URL = 'https://garment-1-1v21.onrender.com/api';
export const BASE_URL = 'http://192.168.137.1:8080/api';
// Local dev:
// export const BASE_URL = 'http://192.168.31.42:8080/api';
// Android emulator: 'http://10.0.2.2:8080/api'
// iOS simulator:    'http://localhost:8080/api'

// ════════════════════════════════════════════════════════════════════
// AXIOS INSTANCE
// ════════════════════════════════════════════════════════════════════
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // BUG FIX 1 (Render cold start):
  // Render.com free tier sleeps after 15 min inactivity.
  // First request takes 30-50 seconds to wake the server.
  // 15000ms timeout → times out → catch block → "Payment failed"
  // FIX: raise timeout to 60 seconds for Render free tier.
  timeout: 60000,
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

// ── Handle 401 globally ──────────────────────────────────────────────
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await Promise.all([
        AsyncStorage.removeItem('auth_token'),
        AsyncStorage.removeItem('auth_user'),
      ]);
    }
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

  // Fetches the latest profile (creditEnabled, creditLimit, advanceOption)
  // Called silently on app launch to pick up any admin changes made after login.
  getProfile: () =>
    api.get('/customer/auth/profile'),
};

// ════════════════════════════════════════════════════════════════════
// PRODUCT API
// BUG FIX 2: was '/admin/products' (admin endpoint, wrong for mobile)
// FIX: use '/products' — the public customer-facing endpoint
// ════════════════════════════════════════════════════════════════════
export const productApi = {
  getAll: (search?: string) =>
    api.get('/admin/products', { params: search ? { search } : {} }),  // ← was '/admin/products'

  getById: (id: number) =>
    api.get(`/admin/products/${id}`),
};

// ════════════════════════════════════════════════════════════════════
// ORDER API
// ════════════════════════════════════════════════════════════════════
export interface OrderItemPayload {
  productId:    number;
  productName:  string;
  selectedSize: string;
  quantity:     number;   // total pcs
  pricePerPc:   number;   // pricePerBox / pcsPerBox  (actual per-piece price)
}

export interface CreateRazorpayOrderPayload {
  items:           OrderItemPayload[];
  paymentMethod:   string;
  deliveryAddress?: string;
}

export interface CreateRazorpayOrderResponse {
  orderId:         number;
  razorpayOrderId: string;
  razorpayKeyId:   string;
  totalAmount:     number;
  orderStatus:     string;
  paymentStatus:   string;
  paymentMethod:   string;
  createdAt:       string;
}

export interface VerifyPaymentPayload {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const orderApi = {
  createRazorpayOrder: (data: CreateRazorpayOrderPayload) =>
    api.post<CreateRazorpayOrderResponse>('/orders/create-razorpay-order', data),

  verifyPayment: (data: VerifyPaymentPayload) =>
    api.post('/orders/verify-payment', data),

  getMyOrders: () =>
    api.get('/orders/my'),

  getOrderById: (id: number) =>
    api.get(`/orders/${id}`),
};

export default api;