import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SessionStorage } from '../api/api';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════
export interface AppUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  type: 'Wholesaler' | 'Semi_Wholesaler' | 'Retailer';
  token: string;
  creditEnabled: boolean;
  creditLimit: number;
  advanceOption: boolean;
  accountApproved: boolean;
}

export interface CartItem {
  productId: number;
  name: string;
  selectedSize: string;
  quantity: number;       // total pcs
  pricePerPc: number;
  images: string[];
}

interface AppContextType {
  // Auth
  user: AppUser | null;
  isLoading: boolean;
  login: (userData: AppUser) => Promise<void>;
  logout: () => Promise<void>;

  // Cart
  cart: CartItem[];
  addToCart: (product: any, totalPcs: number, pricePerPc: number) => void;
  removeFromCart: (productId: number, size: string) => void;
  updateCartItem: (productId: number, size: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  cartTotal: number;          // before GST
  cartTotalWithGst: number;   // with 18% GST

  // Credit
  creditLimit: number;
  usedCredit: number;
  duePayments: number;
  availableCredit: number;
  remainingCredit: number;
  creditApproved: boolean;
}

// ════════════════════════════════════════════════════════════════════
// CONTEXT
// ════════════════════════════════════════════════════════════════════
export const AppContext = createContext<AppContextType>({} as AppContextType);

// ════════════════════════════════════════════════════════════════════
// PROVIDER
// ════════════════════════════════════════════════════════════════════
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<AppUser | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [usedCredit, setUsedCredit]   = useState(0);
  const [duePayments]                 = useState(0); // TODO: fetch from orders API

  // ── Restore session on app launch ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [token, savedUser] = await Promise.all([
          SessionStorage.getToken(),
          SessionStorage.getUser(),
        ]);
        if (token && savedUser) setUser(savedUser);
      } catch {
        // fresh start — no saved session
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────
  const login = useCallback(async (userData: AppUser) => {
    await Promise.all([
      SessionStorage.saveToken(userData.token),
      SessionStorage.saveUser(userData),
    ]);
    setUser(userData);
    setCart([]);
    setUsedCredit(0);
  }, []);

  // ── Logout ────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await SessionStorage.clear();
    setUser(null);
    setCart([]);
    setUsedCredit(0);
  }, []);

  // ── Add to cart ───────────────────────────────────────────────────
  const addToCart = useCallback((product: any, totalPcs: number, pricePerPc: number) => {
    setCart(prev => {
      const exists = prev.find(
        i => i.productId === product.id && i.selectedSize === product.selectedSize
      );
      if (exists) {
        return prev.map(i =>
          i.productId === product.id && i.selectedSize === product.selectedSize
            ? { ...i, quantity: i.quantity + totalPcs }
            : i
        );
      }
      return [...prev, {
        productId:    product.id,
        name:         product.name,
        selectedSize: product.selectedSize ?? '',
        quantity:     totalPcs,
        pricePerPc,
        images:       product.images ?? [],
      }];
    });
    setUsedCredit(prev => prev + pricePerPc * totalPcs * 1.18);
  }, []);

  // ── Update cart item quantity ─────────────────────────────────────
  const updateCartItem = useCallback((productId: number, size: string, quantity: number) => {
    setCart(prev =>
      prev.map(i =>
        i.productId === productId && i.selectedSize === size ? { ...i, quantity } : i
      )
    );
  }, []);

  // ── Remove from cart ──────────────────────────────────────────────
  const removeFromCart = useCallback((productId: number, size: string) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId && i.selectedSize === size);
      if (item) setUsedCredit(u => Math.max(0, u - item.pricePerPc * item.quantity * 1.18));
      return prev.filter(i => !(i.productId === productId && i.selectedSize === size));
    });
  }, []);

  // ── Clear cart ────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setCart([]);
    setUsedCredit(0);
  }, []);

  // ── Derived values ────────────────────────────────────────────────
  const creditLimit      = user?.creditLimit ?? 0;
  const creditApproved   = user?.creditEnabled ?? false;
  const availableCredit  = Math.max(0, creditLimit - usedCredit - duePayments);
  const remainingCredit  = availableCredit;
  const totalItems       = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal        = cart.reduce((s, i) => s + i.pricePerPc * i.quantity, 0);
  const cartTotalWithGst = cartTotal * 1.18;

  return (
    <AppContext.Provider value={{
      user, isLoading, login, logout,
      cart, addToCart, removeFromCart, updateCartItem, clearCart,
      totalItems, cartTotal, cartTotalWithGst,
      creditLimit, usedCredit, duePayments,
      availableCredit, remainingCredit, creditApproved,
    }}>
      {children}
    </AppContext.Provider>
  );
}