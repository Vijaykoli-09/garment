import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, AppUser } from '../context/AppContext';

// export const BASE_URL = 'https://garment-1-1v21.onrender.com/api';
export const BASE_URL = 'http://192.168.1.24:8080/api';

// ════════════════════════════════════════════════════════════════════
// AXIOS INSTANCE
// ════════════════════════════════════════════════════════════════════
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// ── Auto-attach JWT token to every request ───────────────────────────
// Only fills in Authorization if the call hasn't already set one itself
// (see withBrokerAuth() below) — this is what lets broker-scoped calls
// attach the broker's own token without the customer token overwriting it.
api.interceptors.request.use(
  async config => {
    config.headers = config.headers ?? {};
    if (!config.headers['Authorization']) {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
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
const BROKER_STORAGE_KEY       = 'broker_session';
const BROKER_TOKEN_STORAGE_KEY = 'broker_auth_token';

export const BrokerSessionStorage = {
  saveBroker: (agent: object) =>
    AsyncStorage.setItem(BROKER_STORAGE_KEY, JSON.stringify(agent)),

  getBroker: async () => {
    const raw = await AsyncStorage.getItem(BROKER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  saveToken: (token: string) =>
    AsyncStorage.setItem(BROKER_TOKEN_STORAGE_KEY, token),

  getToken: () =>
    AsyncStorage.getItem(BROKER_TOKEN_STORAGE_KEY),

  clear: () =>
    Promise.all([
      AsyncStorage.removeItem(BROKER_STORAGE_KEY),
      AsyncStorage.removeItem(BROKER_TOKEN_STORAGE_KEY),
    ]),
};

// Attach the broker's own JWT to a single request, e.g.:
//   api.get(url, await withBrokerAuth())
// Use this for every broker-scoped call (partyApi.getByAgent and any
// future broker screens) instead of relying on the global interceptor,
// since some endpoints (e.g. /party/{id}/orders) are shared with the
// customer flow and must not silently pick up the wrong token.
export const withBrokerAuth = async () => {
  const token = await BrokerSessionStorage.getToken();
  return { headers: { Authorization: token ? `Bearer ${token}` : '' } };
};

// ════════════════════════════════════════════════════════════════════
// AUTH API
// ════════════════════════════════════════════════════════════════════
export const authApi = {

  // ── Customer signup (existing) ──────────────────────────────────
  signup: (data: {
    fullName: string;
    email?: string;
    phone: string;
    extraPhoneNumbers?: string[]; // NEW — any of these can also be used to login
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
  getByAgent: async (agentSerialNo: string, search?: string) =>
    api.get<PartyDto[]>(`/party/by-agent/${agentSerialNo}`, {
      params: search ? { search } : {},
      ...(await withBrokerAuth()),
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
   * Step 1 — does this phone belong to a broker, and have they already
   * set up a PIN? This endpoint is intentionally lightweight: it never
   * returns the agent record or any token — it only tells the UI which
   * screen to route to next. Actual authentication happens in
   * setPin/verifyPin below.
   *
   * GET /api/agent/check-phone/{contactNo}
   *   -> { exists: true,  hasPinSet: true }   -> route to PIN login
   *   -> { exists: true,  hasPinSet: false }  -> route to PIN setup
   *   -> { exists: false }                    -> "no broker found"
   */
  checkPhone: (contactNo: string) =>
    api.get<{ exists: boolean; hasPinSet?: boolean }>(`/agent/check-phone/${contactNo}`),

  /**
   * Step 2a — FIRST TIME ONLY. Sets the broker's PIN. Backend must
   * reject this if a PIN is already set for that phone (use verify-pin
   * to log in, not this) to stop someone re-registering over an
   * existing broker's PIN.
   *
   * POST /api/agent/set-pin
   * Body: { contactNo, pin }
   * Success 200: { token: string, agent: AgentDto }
   * Errors: 404 AGENT_NOT_FOUND · 409 PIN_ALREADY_SET
   */
  setPin: (contactNo: string, pin: string) =>
    api.post<{ token: string; agent: AgentDto }>('/agent/set-pin', { contactNo, pin }),

  /**
   * Step 2b — RETURNING BROKER. Verifies PIN against the stored hash.
   * Backend enforces attempt-limiting/lockout server-side.
   *
   * POST /api/agent/verify-pin
   * Body: { contactNo, pin }
   * Success 200: { token: string, agent: AgentDto }
   * Errors:
   *   401 { code: 'INVALID_PIN', attemptsRemaining: number }
   *   423 { code: 'PIN_LOCKED', error: '...' }  ← too many failed attempts
   */
  verifyPin: (contactNo: string, pin: string) =>
    api.post<{ token: string; agent: AgentDto }>('/agent/verify-pin', { contactNo, pin }),
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
  getDispatchChallans:       () => api.get<any[]>('/dispatch-challan'),
  getDispatchReturnChallans: () => api.get<any[]>('/dispatch-return-challan'),
  getOtherDispatchChallans:  () => api.get<any[]>('/other-dispatch-challan'),
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