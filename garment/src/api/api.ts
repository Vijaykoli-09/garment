import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, AppUser } from '../context/AppContext';

export const BASE_URL = 'https://garment-1-1v21.onrender.com/api';
// export const BASE_URL = 'http://192.168.1.16:8080/api';

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
// BROKER SESSION HELPERS
// ════════════════════════════════════════════════════════════════════
// Broker (Agent) login is phone-only, no password/JWT — so this is a
// separate lightweight session, independent of SessionStorage above.
// Keeping it separate means broker sessions can't collide with, or get
// wiped by, customer/party auth logic (e.g. the 401 interceptor above).
const BROKER_STORAGE_KEY = 'broker_session';

export const BrokerSessionStorage = {
  saveBroker: (agent: object) =>
    AsyncStorage.setItem(BROKER_STORAGE_KEY, JSON.stringify(agent)),

  getBroker: async () => {
    const raw = await AsyncStorage.getItem(BROKER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  clear: () =>
    AsyncStorage.removeItem(BROKER_STORAGE_KEY),
};

// ════════════════════════════════════════════════════════════════════
// AUTH API
// ════════════════════════════════════════════════════════════════════
export const authApi = {

  // ── Customer signup (existing) ──────────────────────────────────
  signup: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    customerType?: string;
    deliveryAddress: string;
    gstNo?: string;
    brokerName?: string;
    brokerPhone?: string;
  }) => api.post('/customer/auth/signup', data),

  // ── Customer login (existing) ───────────────────────────────────
  // Works for BOTH regular customers AND party users (same endpoint,
  // same JWT flow — party user's phone + password hits /customer/auth/login)
  login: (phone: string, password: string) =>
    api.post('/customer/auth/login', { phone, password }),

  // ── Profile refresh (existing) ──────────────────────────────────
  getProfile: () =>
    api.get('/customer/auth/profile'),

  // ══════════════════════════════════════════════════════════════════
  // PARTY GST LOGIN — 2 new methods
  // ══════════════════════════════════════════════════════════════════

  /**
   * Step 1: Verify GST number against the party table.
   *
   * POST /api/party/auth/verify-gst
   * Body: { gstNo: "27AABCU9603R1ZX" }
   *
   * Success 200:
   *   { partyId: 5, partyName: "Ravi Traders", phone: "9876543210" }
   *
   * Errors:
   *   404 { code: "GST_NOT_FOUND",       error: "..." }
   *   409 { code: "ALREADY_REGISTERED",  error: "..." }  ← party already has credentials
   */
  verifyPartyGst: (gstNo: string) =>
    api.post('/party/auth/verify-gst', { gstNo }),

  /**
   * Step 2: Set password for the party.
   * Phone is already known (from verify-gst step), no need to send it again.
   *
   * POST /api/party/auth/set-password
   * Body: { partyId: 5, password: "secret123" }
   *
   * Success 200:
   *   { message: "Password set. You can now login." }
   *
   * Errors:
   *   404 { code: "PARTY_NOT_FOUND",     error: "..." }
   *   409 { code: "ALREADY_REGISTERED",  error: "..." }
   */
setPartyPassword: (data: { partyId: number; phone: string; password: string }) =>
      api.post('/party/auth/set-password', data),

};

// ════════════════════════════════════════════════════════════════════
// PARTY API (broker-scoped)
// ════════════════════════════════════════════════════════════════════
export interface PartyDto {
  id:                  number;
  serialNumber?:        string;
  partyName:            string;
  address?:             string;
  mobileNo?:            string;
  gstNo?:               string;
  openingBalance?:      number;
  openingBalanceType?:  string;
  stateName?:           string;
  stateCode?:           string;
  station?:             string;
  creditDays?:          number;
  creditAmount?:        number;
  customerType?:        string;
}

export const partyApi = {
  /**
   * Parties linked to a specific broker (Agent), with optional search
   * across name / mobile / GST no.
   * GET /api/party/by-agent/{serialNo}?search=...
   */
  getByAgent: (agentSerialNo: string, search?: string) =>
    api.get<PartyDto[]>(`/party/by-agent/${agentSerialNo}`, {
      params: search ? { search } : {},
    }),
};

// ════════════════════════════════════════════════════════════════════
// AGENT (BROKER) API
// ════════════════════════════════════════════════════════════════════
export interface AgentDto {
  serialNo:            string;
  agentName:           string;
  contactNo:            string;
  email?:               string;
  address?:             string;
  city?:                string;
  state?:               string;
  zipCode?:             string;
  openingBalance?:      number;
  openingBalanceType?:  string; // "CR" | "DR"
}

export const agentApi = {
  /**
   * Broker Login — phone-only lookup against the `agents` table.
   * GET /api/agent/check-phone/{contactNo}
   *   -> { exists: true,  agent: AgentDto }
   *   -> { exists: false }
   */
  checkPhone: (contactNo: string) =>
    api.get<{ exists: boolean; agent?: AgentDto }>(`/agent/check-phone/${contactNo}`),
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
    sizes:       {},
    sizesQty:  { [item.selectedSize]: String(item.pcsPerBox) },
    sizesRate: { [item.selectedSize]: String(item.pricePerPc.toFixed(4)) },
  }));

  return {
    orderNo:      '',
    dated,
    deliveryDate: null,
    partyId:      null,
    partyName:    user.name,
    remarks:      `App Order | ${user.phone}`,
    rows,
  };
}

export const saleOrderApi = {
  createFromAppCart: (cart: CartItem[], user: AppUser) =>
    api.post('/sale-orders', buildSaleOrderPayload(cart, user)),
};


// ════════════════════════════════════════════════════════════════════
// ADD THIS TO api.ts
// (paste near partyApi — uses the same `api` axios instance already
// defined at the top of that file)
// ════════════════════════════════════════════════════════════════════

export interface PartyOrderDto {
  id: number;
  source: 'WEB' | 'APP';
  orderNo: string;
  date: string;               // ISO date, e.g. "2026-07-03"
  amount?: number | null;     // WEB: sum(qty*rate) across rows; APP: totalAmount
  status?: string | null;     // null for WEB orders today
  paymentStatus?: string | null;
  totalPeti?: number | null;  // WEB only
  totalPcs?: number | null;   // WEB only
}

export const partyOrderApi = {
  /**
   * All orders (web + app, merged, newest first) for one party.
   * GET /api/party/{partyId}/orders?fromDate=...&toDate=...
   * fromDate/toDate are optional — omit both to get everything.
   */
  getByParty: (partyId: number, fromDate?: string, toDate?: string) =>
    api.get<PartyOrderDto[]>(`/party/${partyId}/orders`, {
      params: {
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
      },
    }),
};

// ════════════════════════════════════════════════════════════════════
// STATEMENT — raw data fetchers (mirrors the web AccountStatement page)
// These return the FULL org-wide list for each doc type — same as the
// web app does — so the statement math can be replicated client-side
// in the RN app. Filtering to one party happens in statementCalculator.
// ════════════════════════════════════════════════════════════════════
export interface AgentRawDto {
  serialNo: string | number;
  agentName: string;
  openingBalance?: number | null;
  openingBalanceType?: 'CR' | 'DR';
}

export interface PartyRawDto {
  id: number;
  partyName: string;
  agent?: { serialNo?: string | number; agentName?: string };
  openingBalance?: number | null;
  openingBalanceType?: 'CR' | 'DR';
}

export const statementRawApi = {
  getAllParties:      () => api.get<PartyRawDto[]>('/party/all'),
  getAllAgents:       () => api.get<AgentRawDto[]>('/agent/list'),
  getDispatchChallans:      () => api.get<any[]>('/dispatch-challan'),
  getOtherDispatchChallans: () => api.get<any[]>('/other-dispatch-challan'),
  getPurchaseOrders:        () => api.get<any[]>('/purchase-orders'),
  getPurchaseEntries:       () => api.get<any[]>('/purchase-entry'),
  getPurchaseReturns:       () => api.get<any[]>('/purchase-returns'),
  getPayments:              () => api.get<any[]>('/payment'),
  getJobOutwardChallans:    () => api.get<any[]>('/job-outward-challan'),
  getJobInwardChallans:     () => api.get<any[]>('/job-inward-challan'),
  // backend has used both spellings historically — try /recipt then /receipt
  getReceipts: async (): Promise<any[]> => {
    try {
      const r1 = await api.get<any[]>('/recipt');
      return Array.isArray(r1.data) ? r1.data : [];
    } catch {
      try {
        const r2 = await api.get<any[]>('/receipt');
        return Array.isArray(r2.data) ? r2.data : [];
      } catch {
        return [];
      }
    }
  },
};

export default api;