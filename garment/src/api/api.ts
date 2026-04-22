import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, AppUser } from '../context/AppContext';

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
    customerType?: string;   // optional — admin sets this during approval
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

export interface CreditPaymentOrderResponse {
  orderId:         number;
  razorpayOrderId: string;
  razorpayKeyId:   string;
  creditAmount:    number;
}

export interface VerifyCreditPaymentPayload {
  orderId:           number;
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyCreditPaymentResponse {
  order: {
    id:              number;
    totalAmount:     number;
    subtotal:        number;
    gstAmount:       number;
    advanceAmount:   number;
    creditAmount:    number;
    orderStatus:     string;
    paymentStatus:   string;
    paymentMethod:   string;
    deliveryAddress: string;
    createdAt:       string;
    paidAt:          string | null;
    items:           any[];
  };
}

// ════════════════════════════════════════════════════════════════════
// ORDER API — methods
// ════════════════════════════════════════════════════════════════════
export const orderApi = {
  createRazorpayOrder: (data: CreateRazorpayOrderPayload) =>
    api.post<CreateRazorpayOrderResponse>('/orders/create-razorpay-order', data),

  verifyPayment: (data: VerifyPaymentPayload) =>
    api.post('/orders/verify-payment', data),

  getMyOrders: () =>
    api.get('/orders/my'),

  getOrderById: (id: number) =>
    api.get(`/orders/${id}`),

  createCreditPaymentOrder: (orderId: number) =>
    api.post<CreditPaymentOrderResponse>(`/orders/${orderId}/pay-credit`),

  verifyCreditPayment: (data: VerifyCreditPaymentPayload) =>
    api.post<VerifyCreditPaymentResponse>('/orders/verify-credit-payment', data),
};

// ════════════════════════════════════════════════════════════════════
// SALE ORDER API
// ════════════════════════════════════════════════════════════════════
//
// Builds SaleOrderSaveDTO from app cart and posts to /api/sale-orders
//
// Confirmed mapping:
//   CartItem.artSerialNumber  → row.artSerial
//   CartItem.artNo            → row.artNo
//   CartItem.artName          → row.description
//   CartItem.shade            → row.shade  (shadeName, backend resolves shadeCode)
//   CartItem.boxes            → row.peti   ("20")
//   CartItem.pcsPerBox        → row.sizesQty[selectedSize]  ("12")
//   CartItem.pricePerPc       → row.sizesRate[selectedSize] ("20.8333")
//   CartItem.selectedSize     → key in sizesQty + sizesRate maps
//
// One CartItem = one sale order row
// partyName = user.name, partyId = null (app users have no partyId)
// orderNo   = "" → backend auto-generates O/YYYY-NNNN
// dated     = today

function buildSaleOrderPayload(cart: CartItem[], user: AppUser) {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  const dated = `${yyyy}-${mm}-${dd}`;

  const rows = cart.map(item => ({
    artSerial:   item.artSerialNumber ?? '',
    artNo:       item.artNo           ?? '',
    shade:       item.shade           ?? '',
    description: item.artName         ?? '',
    peti:        String(item.boxes),
    remarks:     '',
    sizes:       {},                                                         // legacy — empty
    sizesQty:  { [item.selectedSize]: String(item.pcsPerBox) },             // { "M": "12" }
    sizesRate: { [item.selectedSize]: String(item.pricePerPc.toFixed(4)) }, // { "M": "20.8333" }
  }));

  return {
    orderNo:      '',                                   // blank → backend auto-generates
    dated,                                              // today yyyy-MM-dd
    deliveryDate: null,
    partyId:      null,                                 // app users have no partyId
    partyName:    user.name,                            // shown in admin web
    remarks:      `App Order | ${user.phone}`,          // helps admin identify app orders
    rows,
  };
}

export const saleOrderApi = {
  // Fire-and-forget after payment success.
  // Caller must catch errors — payment is already done, this is just
  // admin notification. Failure here does NOT affect customer.
  createFromAppCart: (cart: CartItem[], user: AppUser) =>
    api.post('/sale-orders', buildSaleOrderPayload(cart, user)),
};

export default api;