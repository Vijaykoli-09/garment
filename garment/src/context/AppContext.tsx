import React, { createContext, useState } from 'react';

export const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: any) => {

  const [customerType, setCustomerType] = useState('wholesaler');
  // possible: wholesaler, distributor, retailer
const [user, setUser] = useState<any>(null);

  const [cart, setCart] = useState<any[]>([]);
const login = (userData: any) => {
  setUser(userData);
};

const logout = () => {
  setUser(null);
};
  const addToCart = (product: any, quantity: number, price: number) => {
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
      const updated = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      setCart(updated);
    } else {
      setCart([...cart, { ...product, quantity, price }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    const updated = cart.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    setCart(updated);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

const totalAmount = cart.reduce(
  (sum, item) => sum + item.quantity * item.price,
  0
);

const gstAmount = totalAmount * 0.18;
const grandTotal = totalAmount + gstAmount;

const creditApproved = user?.creditApproved || false;
const usedCredit = user?.usedCredit || 0;
const duePayments = user?.duePayments || 0;
const creditLimit = user?.creditLimit || 0;

const remainingCredit = creditLimit - grandTotal;

const availableCredit = creditLimit - usedCredit - duePayments;
  return (
    <AppContext.Provider
      value={{
        customerType,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        totalItems,
        totalAmount,
        creditLimit,
        remainingCredit,
        gstAmount,
        grandTotal,
        creditApproved,
        usedCredit,
        duePayments,
        availableCredit,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};