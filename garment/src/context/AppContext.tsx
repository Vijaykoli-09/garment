import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionStorage, authApi, orderApi } from '../api/api';

const CART_STORAGE_KEY = 'app_cart';
const USED_CREDIT_KEY  = 'app_used_credit';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════
export interface AppUser {
  id:              number;
  name:            string;   // matches backend CustomerLoginResponse.name
  phone:           string;
  email:           string;
  type:            'Wholesaler' | 'Semi_Wholesaler' | 'Retailer'; // matches backend .type
  token:           string;
  creditEnabled:   boolean;
  creditLimit:     number;
  advanceOption:   boolean;
  accountApproved: boolean;
}

export interface CartItem {
  productId:    number;
  name:         string;
  selectedSize: string;
  boxes:        number;      // how many boxes ordered
  pcsPerBox:    number;      // pieces per box (product.boxQuantity)
  quantity:     number;      // total pcs = boxes * pcsPerBox
  pricePerBox:  number;      // price for 1 full box (what backend needs to calc subtotal correctly)
  pricePerPc:   number;      // pricePerBox / pcsPerBox — for display only
  images:       string[];
}

interface AppContextType {
  user:          AppUser | null;
  isLoading:     boolean;
  login:         (userData: AppUser) => Promise<void>;
  logout:        () => Promise<void>;
  refreshCredit: () => Promise<void>;   // pull-to-refresh: re-fetches profile + orders

  cart:          CartItem[];
  // BUG FIX 3: new signature — boxes + pcsPerBox + pricePerBox separately
  // OLD: addToCart(product, totalPcs, pricePerPc)
  //   where totalPcs=12, pricePerPc=pricePerBox=₹500
  //   cartTotal = 500 * 12 = ₹6000 ← 12x inflated!
  // NEW: addToCart(product, boxes, pcsPerBox, pricePerBox)
  //   cartTotal = pricePerBox * boxes = 500 * 1 = ₹500 ✓
  addToCart:     (product: any, boxes: number, pcsPerBox: number, pricePerBox: number) => void;
  removeFromCart:(productId: number, size: string) => void;
  updateCartItem:(productId: number, size: string, boxes: number) => void;
  clearCart:     () => void;

  totalItems:        number;   // total boxes
  totalPcs:          number;   // total pieces (display)
  cartTotal:         number;   // before GST  — pricePerBox * boxes
  cartTotalWithGst:  number;   // with 18% GST

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
          // Step 1: Restore cached user immediately (fast, no network)
          // Migrate stale field names from old login (fullName→name, customerType→type)
          const migratedUser: AppUser = {
            ...savedUser,
            name:          savedUser.name || (savedUser as any).fullName || '',
            type:          savedUser.type || (savedUser as any).customerType || '',
            creditEnabled: Boolean(savedUser.creditEnabled),
            creditLimit:   Number(savedUser.creditLimit ?? 0),
            advanceOption: Boolean(savedUser.advanceOption),
          };
          setUser(migratedUser);
          SessionStorage.saveUser(migratedUser);

          if (savedCart.cart.length > 0) {
            setCart(savedCart.cart);
            setUsedCredit(savedCart.usedCredit);
          }

          // Step 2: Background refresh — get latest profile + real credit usage from orders
          try {
            const [profileRes, ordersRes] = await Promise.allSettled([
              authApi.getProfile(),
              orderApi.getMyOrders(),
            ]);

            if (profileRes.status === 'fulfilled') {
              const fresh = profileRes.value.data;
              const refreshed: AppUser = {
                ...migratedUser,
                name:          fresh.name || fresh.fullName || migratedUser.name,
                type:          fresh.type || fresh.customerType || migratedUser.type,
                creditEnabled: Boolean(fresh.creditEnabled),
                creditLimit:   Number(fresh.creditLimit   ?? 0),
                advanceOption: Boolean(fresh.advanceOption),
              };
              setUser(refreshed);
              SessionStorage.saveUser(refreshed);
            }

            // Real usedCredit = sum of creditAmount on active credit orders
            // This auto-deducts from profile whenever a credit order is placed
            if (ordersRes.status === 'fulfilled') {
              const orders: any[] = ordersRes.value.data ?? [];
              const realUsedCredit = orders
                .filter((o: any) =>
                  o.paymentMethod === 'CREDIT_ORDER' || o.paymentMethod === 'ADVANCE_CREDIT'
                )
                .filter((o: any) =>
                  o.orderStatus !== 'CANCELLED' && o.paymentStatus !== 'FAILED'
                )
                .reduce((sum: number, o: any) => sum + Number(o.creditAmount ?? 0), 0);
              setUsedCredit(realUsedCredit);
            }
          } catch { /* server unreachable — keep cached values */ }
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
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([SessionStorage.clear(), clearCartFromStorage()]);
    setUser(null);
    setCart([]);
    setUsedCredit(0);
  }, []);

  // ── refreshCredit — called by pull-to-refresh on Dashboard ─────────
  // Re-fetches profile (credit limit) and orders (usedCredit) from backend.
  const refreshCredit = useCallback(async () => {
    if (!user) return;
    try {
      const [profileRes, ordersRes] = await Promise.allSettled([
        authApi.getProfile(),
        orderApi.getMyOrders(),
      ]);

      if (profileRes.status === 'fulfilled') {
        const fresh = profileRes.value.data;
        const refreshed: AppUser = {
          ...user,
          name:          fresh.name          ?? fresh.fullName     ?? user.name,
          type:          fresh.type          ?? fresh.customerType ?? user.type,
          creditEnabled: Boolean(fresh.creditEnabled),
          creditLimit:   Number(fresh.creditLimit   ?? 0),
          advanceOption: Boolean(fresh.advanceOption),
        };
        setUser(refreshed);
        SessionStorage.saveUser(refreshed);
      }

      if (ordersRes.status === 'fulfilled') {
        const orders: any[] = ordersRes.value.data ?? [];
        const realUsedCredit = orders
          .filter((o: any) =>
            o.paymentMethod === 'CREDIT_ORDER' || o.paymentMethod === 'ADVANCE_CREDIT'
          )
          .filter((o: any) =>
            o.orderStatus !== 'CANCELLED' && o.paymentStatus !== 'FAILED'
          )
          .reduce((sum: number, o: any) => sum + Number(o.creditAmount ?? 0), 0);
        setUsedCredit(realUsedCredit);
      }
    } catch { /* server unreachable — keep current values */ }
  }, [user]);

  // ── Add to cart ───────────────────────────────────────────────────
  // BUG FIX 3: correct math — cartTotal = pricePerBox * boxes
  const addToCart = useCallback((
    product:     any,
    boxes:       number,   // number of boxes (e.g. 2)
    pcsPerBox:   number,   // pieces per box  (e.g. 12)
    pricePerBox: number,   // price per box   (e.g. ₹500)
  ) => {
    const pricePerPc = pcsPerBox > 0 ? pricePerBox / pcsPerBox : 0;
    const totalPcs   = boxes * pcsPerBox;

    setCart(prev => {
      const exists = prev.find(
        i => i.productId === product.id && i.selectedSize === product.selectedSize
      );
      if (exists) {
        return prev.map(i =>
          i.productId === product.id && i.selectedSize === product.selectedSize
            ? { ...i, boxes: i.boxes + boxes, quantity: i.quantity + totalPcs }
            : i
        );
      }
      return [...prev, {
        productId:    product.id,
        name:         product.name,
        selectedSize: product.selectedSize ?? '',
        boxes,
        pcsPerBox,
        quantity:     totalPcs,
        pricePerBox,
        pricePerPc,
        images:       product.images ?? [],
      }];
    });

    // Track credit usage with correct amount (pricePerBox * boxes)
    setUsedCredit(prev => prev + pricePerBox * boxes * 1.18);
  }, []);

  const updateCartItem = useCallback((productId: number, size: string, boxes: number) => {
    setCart(prev =>
      prev.map(i => {
        if (i.productId === productId && i.selectedSize === size) {
          return { ...i, boxes, quantity: boxes * i.pcsPerBox };
        }
        return i;
      })
    );
  }, []);

  const removeFromCart = useCallback((productId: number, size: string) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId && i.selectedSize === size);
      if (item) {
        setUsedCredit(u => Math.max(0, u - item.pricePerBox * item.boxes * 1.18));
      }
      return prev.filter(i => !(i.productId === productId && i.selectedSize === size));
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setUsedCredit(0);
    clearCartFromStorage();
  }, []);

  // ── Derived values ────────────────────────────────────────────────
  // BUG FIX 3: cartTotal = pricePerBox * boxes  (NOT pricePerBox * totalPcs)
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