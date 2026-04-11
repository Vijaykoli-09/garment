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
  name:            string;
  phone:           string;
  email:           string;
  type:            'Wholesaler' | 'Semi_Wholesaler' | 'Retailer';
  token:           string;
  creditEnabled:   boolean;
  creditLimit:     number;
  advanceOption:   boolean;
  accountApproved: boolean;
  partyId?:        number | null;   // set by admin when they create party record
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
            type:          savedUser.type || (savedUser as any).customerType || '',
            creditEnabled: Boolean(savedUser.creditEnabled),
            creditLimit:   Number(savedUser.creditLimit ?? 0),
            advanceOption: Boolean(savedUser.advanceOption),
            partyId:       savedUser.partyId ?? null,
            deliveryAddress: savedUser.deliveryAddress ?? '',
          };
          setUser(migratedUser);
          SessionStorage.saveUser(migratedUser);

          if (savedCart.cart.length > 0) {
            setCart(savedCart.cart);
            setUsedCredit(savedCart.usedCredit);
          }

          // Background refresh
          try {
            const [profileRes, ordersRes] = await Promise.allSettled([
              authApi.getProfile(),
              orderApi.getMyOrders(),
            ]);

            if (profileRes.status === 'fulfilled') {
              const fresh = profileRes.value.data;
              const refreshed: AppUser = {
                ...migratedUser,
                name:           fresh.name          ?? fresh.fullName     ?? migratedUser.name,
                type:           fresh.type          ?? fresh.customerType ?? migratedUser.type,
                creditEnabled:  Boolean(fresh.creditEnabled),
                creditLimit:    Number(fresh.creditLimit ?? 0),
                advanceOption:  Boolean(fresh.advanceOption),
                partyId:        fresh.partyId        ?? migratedUser.partyId,
                deliveryAddress: fresh.deliveryAddress ?? migratedUser.deliveryAddress,
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
          } catch { /* server unreachable — keep cached */ }
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
          name:           fresh.name          ?? fresh.fullName     ?? user.name,
          type:           fresh.type          ?? fresh.customerType ?? user.type,
          creditEnabled:  Boolean(fresh.creditEnabled),
          creditLimit:    Number(fresh.creditLimit   ?? 0),
          advanceOption:  Boolean(fresh.advanceOption),
          partyId:        fresh.partyId        ?? user.partyId,
          deliveryAddress: fresh.deliveryAddress ?? user.deliveryAddress,
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
    } catch { /* server unreachable */ }
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

    setUsedCredit(prev => prev + pricePerBox * boxes * 1.18);
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
    setCart(prev => {
      const item = prev.find(
        i =>
          i.productId    === productId &&
          i.selectedSize === size &&
          i.shadeCode    === shadeCode
      );
      if (item) {
        setUsedCredit(u => Math.max(0, u - item.pricePerBox * item.boxes * 1.18));
      }
      return prev.filter(
        i => !(
          i.productId    === productId &&
          i.selectedSize === size &&
          i.shadeCode    === shadeCode
        )
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setUsedCredit(0);
    clearCartFromStorage();
  }, []);

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