import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionStorage, authApi, orderApi, setUnauthorizedHandler } from '../api/api';

const CART_STORAGE_KEY = 'app_cart';
const USED_CREDIT_KEY  = 'used_credit_v2';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════
export interface AppUser {
  id:              number;
  name:            string;
  phone:           string;
  email:           string;
  type:            'Wholesaler' | 'Semi_Wholesaler' | 'Retailer' | null; // null until admin sets it
  token:           string;
  creditEnabled:   boolean;
  creditLimit:     number;
  advanceOption:   boolean;
  accountApproved: boolean;
  partyId?:        number | null;
  deliveryAddress?: string;
}

export interface CartItem {
  productId:       number;
  name:            string;
  // ── Art fields — needed for sale order creation ───────────────
  artNo:           string;
  artSerialNumber: string;
  artName:         string;
  // ── Shade selected by customer ────────────────────────────────
  shade:           string;   // shadeName e.g. "Red"
  shadeCode:       string;   // shadeCode e.g. "SH001"
  // ── Size & quantity ───────────────────────────────────────────
  selectedSize:    string;
  boxes:           number;
  pcsPerBox:       number;
  quantity:        number;   // total pcs = boxes * pcsPerBox
  pricePerBox:     number;
  pricePerPc:      number;   // pricePerBox / pcsPerBox — display only
  images:          string[];
}

interface AppContextType {
  user:          AppUser | null;
  isLoading:     boolean;
  login:         (userData: AppUser) => Promise<void>;
  logout:        () => Promise<void>;
  refreshCredit: () => Promise<void>;

  cart:            CartItem[];
  addToCart:       (product: any, boxes: number, pcsPerBox: number, pricePerBox: number, shade: { shadeName: string; shadeCode: string }) => void;
  removeFromCart:  (productId: number, size: string, shadeCode: string) => void;
  updateCartItem:  (productId: number, size: string, shadeCode: string, boxes: number) => void;
  clearCart:       () => void;

  totalItems:       number;
  totalPcs:         number;
  cartTotal:        number;
  cartTotalWithGst: number;

  creditLimit:     number;
  usedCredit:      number;
  duePayments:     number;
  availableCredit: number;
  remainingCredit: number;
  creditApproved:  boolean;
}

// ════════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ════════════════════════════════════════════════════════════════════
async function saveCartToStorage(cart: CartItem[], usedCredit: number) {
  try {
    await Promise.all([
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)),
      AsyncStorage.setItem(USED_CREDIT_KEY,  JSON.stringify(usedCredit)),
    ]);
  } catch { /* non-critical */ }
}

async function loadCartFromStorage(): Promise<{ cart: CartItem[]; usedCredit: number }> {
  try {
    const [rawCart, rawCredit] = await Promise.all([
      AsyncStorage.getItem(CART_STORAGE_KEY),
      AsyncStorage.getItem(USED_CREDIT_KEY),
    ]);
    return {
      cart:       rawCart   ? JSON.parse(rawCart)   : [],
      usedCredit: rawCredit ? JSON.parse(rawCredit) : 0,
    };
  } catch {
    return { cart: [], usedCredit: 0 };
  }
}

async function clearCartFromStorage() {
  try {
    await Promise.all([
      AsyncStorage.removeItem(CART_STORAGE_KEY),
      AsyncStorage.removeItem(USED_CREDIT_KEY),
    ]);
  } catch { /* ignore */ }
}

// ════════════════════════════════════════════════════════════════════
// SERVER STATE HELPERS
// ════════════════════════════════════════════════════════════════════
// Used credit = credit part of orders that are not yet fully paid.
// It comes ONLY from real orders. The cart is never added to it —
// screens compare the cart total against availableCredit directly.
function computeUsedCredit(orders: any[]): number {
  return orders
    .filter(o => o.orderStatus !== 'CANCELLED')
    .filter(o =>
      // CREDIT_ORDER: the whole amount is credit until it is paid
      (o.paymentMethod === 'CREDIT_ORDER'   && o.paymentStatus === 'PENDING') ||
      // ADVANCE_CREDIT: the 70% credit part is due once the advance is paid
      (o.paymentMethod === 'ADVANCE_CREDIT' && o.paymentStatus === 'PARTIALLY_PAID')
    )
    .reduce((sum: number, o: any) => sum + Number(o.creditAmount ?? 0), 0);
}

// Fetches fresh profile + orders. Never throws; returns whatever succeeded.
async function fetchServerState(base: AppUser): Promise<{ user?: AppUser; usedCredit?: number }> {
  const out: { user?: AppUser; usedCredit?: number } = {};
  try {
    const [profileRes, ordersRes] = await Promise.allSettled([
      authApi.getProfile(),
      orderApi.getMyOrders(),
    ]);

    if (profileRes.status === 'fulfilled') {
      const fresh = profileRes.value.data;
      out.user = {
        ...base,
        name:            fresh.name          ?? fresh.fullName     ?? base.name,
        type:            fresh.type          ?? fresh.customerType ?? base.type ?? null,
        creditEnabled:   Boolean(fresh.creditEnabled),
        creditLimit:     Number(fresh.creditLimit ?? 0),
        advanceOption:   Boolean(fresh.advanceOption),
        partyId:         fresh.partyId        ?? base.partyId,
        deliveryAddress: fresh.deliveryAddress ?? base.deliveryAddress,
      };
    }
    if (ordersRes.status === 'fulfilled') {
      out.usedCredit = computeUsedCredit(ordersRes.value.data ?? []);
    }
  } catch { /* server unreachable */ }
  return out;
}

// ════════════════════════════════════════════════════════════════════
// CONTEXT
// ════════════════════════════════════════════════════════════════════
export const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser]             = useState<AppUser | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [usedCredit, setUsedCredit] = useState(0);
  const [duePayments]               = useState(0);

  // ── Restore session on launch ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [token, savedUser, savedCart] = await Promise.all([
          SessionStorage.getToken(),
          SessionStorage.getUser(),
          loadCartFromStorage(),
        ]);
        if (token && savedUser) {
          const migratedUser: AppUser = {
            ...savedUser,
            name:          savedUser.name || (savedUser as any).fullName || '',
            type:          savedUser.type || (savedUser as any).customerType || null,
            creditEnabled: Boolean(savedUser.creditEnabled),
            creditLimit:   Number(savedUser.creditLimit ?? 0),
            advanceOption: Boolean(savedUser.advanceOption),
            partyId:       savedUser.partyId ?? null,
            deliveryAddress: savedUser.deliveryAddress ?? '',
          };
          setUser(migratedUser);
          SessionStorage.saveUser(migratedUser);

          if (savedCart.cart.length > 0) setCart(savedCart.cart);
          setUsedCredit(savedCart.usedCredit);   // cached real value until refresh

          // Background refresh (profile + real used credit)
          const fresh = await fetchServerState(migratedUser);
          if (fresh.user) {
            setUser(fresh.user);
            SessionStorage.saveUser(fresh.user);
          }
          if (fresh.usedCredit !== undefined) setUsedCredit(fresh.usedCredit);
        }
      } catch { /* fresh start */ }
      finally  { setIsLoading(false); }
    })();
  }, []);

  // ── Auto-save cart ────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    saveCartToStorage(cart, usedCredit);
  }, [cart, usedCredit, isLoading]);

  const login = useCallback(async (userData: AppUser) => {
    await Promise.all([
      SessionStorage.saveToken(userData.token),
      SessionStorage.saveUser(userData),
    ]);
    setUser(userData);
    const saved = await loadCartFromStorage();
    setCart(saved.cart);
    setUsedCredit(saved.usedCredit);

    // The login response has no partyId / deliveryAddress / fresh credit.
    // Load them right away (in the background) so checkout works at once.
    fetchServerState(userData).then(fresh => {
      if (fresh.user) {
        setUser(fresh.user);
        SessionStorage.saveUser(fresh.user);
      }
      if (fresh.usedCredit !== undefined) setUsedCredit(fresh.usedCredit);
    });
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([SessionStorage.clear(), clearCartFromStorage()]);
    setUser(null);
    setCart([]);
    setUsedCredit(0);
  }, []);

  // ── Session expired → api.ts interceptor calls this ───────────────
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      Alert.alert('Session expired', 'Please log in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const refreshCredit = useCallback(async () => {
    if (!user) return;
    const fresh = await fetchServerState(user);
    if (fresh.user) {
      setUser(fresh.user);
      SessionStorage.saveUser(fresh.user);
    }
    if (fresh.usedCredit !== undefined) setUsedCredit(fresh.usedCredit);
  }, [user]);

  // ── Add to cart ───────────────────────────────────────────────────
  // Unique cart key = productId + selectedSize + shadeCode
  // This allows same product in same size but different shade as separate cart rows
  const addToCart = useCallback((
    product:     any,
    boxes:       number,
    pcsPerBox:   number,
    pricePerBox: number,
    shade:       { shadeName: string; shadeCode: string },
  ) => {
    const pricePerPc = pcsPerBox > 0 ? pricePerBox / pcsPerBox : 0;
    const totalPcs   = boxes * pcsPerBox;

    setCart(prev => {
      const exists = prev.find(
        i =>
          i.productId    === product.id &&
          i.selectedSize === product.selectedSize &&
          i.shadeCode    === shade.shadeCode
      );
      if (exists) {
        return prev.map(i =>
          i.productId    === product.id &&
          i.selectedSize === product.selectedSize &&
          i.shadeCode    === shade.shadeCode
            ? { ...i, boxes: i.boxes + boxes, quantity: i.quantity + totalPcs }
            : i
        );
      }
      return [...prev, {
        productId:       product.id,
        name:            product.name,
        artNo:           product.artNo           ?? '',
        artSerialNumber: product.artSerialNumber ?? '',
        artName:         product.artName         ?? '',
        shade:           shade.shadeName,
        shadeCode:       shade.shadeCode,
        selectedSize:    product.selectedSize    ?? '',
        boxes,
        pcsPerBox,
        quantity:        totalPcs,
        pricePerBox,
        pricePerPc,
        images:          product.images          ?? [],
      }];
    });

  }, []);

  // ── Update cart item — now needs shadeCode to uniquely identify row ──
  const updateCartItem = useCallback((
    productId: number,
    size:      string,
    shadeCode: string,
    boxes:     number,
  ) => {
    setCart(prev =>
      prev.map(i => {
        if (
          i.productId    === productId &&
          i.selectedSize === size &&
          i.shadeCode    === shadeCode
        ) {
          return { ...i, boxes, quantity: boxes * i.pcsPerBox };
        }
        return i;
      })
    );
  }, []);

  // ── Remove from cart — now needs shadeCode too ────────────────────
  const removeFromCart = useCallback((
    productId: number,
    size:      string,
    shadeCode: string,
  ) => {
    setCart(prev =>
      prev.filter(
        i => !(
          i.productId    === productId &&
          i.selectedSize === size &&
          i.shadeCode    === shadeCode
        )
      )
    );
  }, []);

  // Called after an order is placed (and by "Clear All"). Re-sync credit
  // from the server so a new credit order is reflected immediately.
  const clearCart = useCallback(() => {
    setCart([]);
    clearCartFromStorage();
    refreshCredit();
  }, [refreshCredit]);

  // ── Derived values ────────────────────────────────────────────────
  const cartTotal        = cart.reduce((s, i) => s + i.pricePerBox * i.boxes, 0);
  const cartTotalWithGst = cartTotal * 1.18;
  const totalItems       = cart.reduce((s, i) => s + i.boxes, 0);
  const totalPcs         = cart.reduce((s, i) => s + i.quantity, 0);
  const creditLimit      = user?.creditLimit   ?? 0;
  const creditApproved   = user?.creditEnabled ?? false;
  const availableCredit  = Math.max(0, creditLimit - usedCredit - duePayments);
  const remainingCredit  = availableCredit;

  return (
    <AppContext.Provider value={{
      user, isLoading, login, logout,
      cart, addToCart, removeFromCart, updateCartItem, clearCart,
      totalItems, totalPcs, cartTotal, cartTotalWithGst,
      creditLimit, usedCredit, duePayments,
      availableCredit, remainingCredit, creditApproved,
      refreshCredit,
    }}>
      {children}
    </AppContext.Provider>
  );
}