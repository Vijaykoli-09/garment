import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// export const BASE_URL = 'https://garment-1-1v21.onrender.com/api';
export const BASE_URL = 'http://192.168.31.42:8080/api';

// ════════════════════════════════════════════════════════════════════
// AXIOS INSTANCE
// ════════════════════════════════════════════════════════════════════
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
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

  getProfile: () =>
    api.get('/customer/auth/profile'),
};

// ════════════════════════════════════════════════════════════════════
// PRODUCT API
// ════════════════════════════════════════════════════════════════════
export const productApi = {
  getAll: (search?: string) =>
    api.get('/admin/products', { params: search ? { search } : {} }),

  getById: (id: number) =>
    api.get(`/admin/products/${id}`),
};

// ════════════════════════════════════════════════════════════════════
// ORDER API — types
// ════════════════════════════════════════════════════════════════════
export interface OrderItemPayload {
  productId:    number;
  productName:  string;
  selectedSize: string;
  quantity:     number;
  pricePerPc:   number;
}

export interface CreateRazorpayOrderPayload {
  items:            OrderItemPayload[];
  paymentMethod:    string;
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

// ── New: credit payment types ────────────────────────────────────────
export interface CreditPaymentOrderResponse {
  orderId:         number;
  razorpayOrderId: string;
  razorpayKeyId:   string;
  creditAmount:    number;   // exact amount to charge via Razorpay
}

export interface VerifyCreditPaymentPayload {
  orderId:           number;
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyCreditPaymentResponse {
  order: {
    id:             number;
    totalAmount:    number;
    subtotal:       number;
    gstAmount:      number;
    advanceAmount:  number;
    creditAmount:   number;
    orderStatus:    string;
    paymentStatus:  string;
    paymentMethod:  string;
    deliveryAddress:string;
    createdAt:      string;
    paidAt:         string | null;
    items:          any[];
  };
}

// ════════════════════════════════════════════════════════════════════
// ORDER API — methods
// ════════════════════════════════════════════════════════════════════
export const orderApi = {
  // ── Existing ──────────────────────────────────────────────────────
  createRazorpayOrder: (data: CreateRazorpayOrderPayload) =>
    api.post<CreateRazorpayOrderResponse>('/orders/create-razorpay-order', data),

  verifyPayment: (data: VerifyPaymentPayload) =>
    api.post('/orders/verify-payment', data),

  getMyOrders: () =>
    api.get('/orders/my'),

  getOrderById: (id: number) =>
    api.get(`/orders/${id}`),

  // ── New: pay the credit amount on an existing credit order ────────

  // Step 1 — ask backend to create a Razorpay order for the credit amount
  createCreditPaymentOrder: (orderId: number) =>
    api.post<CreditPaymentOrderResponse>(`/orders/${orderId}/pay-credit`),

  // Step 2 — verify Razorpay payment, backend marks order PAID + sets paidAt
  verifyCreditPayment: (data: VerifyCreditPaymentPayload) =>
    api.post<VerifyCreditPaymentResponse>('/orders/verify-credit-payment', data),
};

export default api;