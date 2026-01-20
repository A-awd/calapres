import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CartItem, CartProduct, ProductVariant } from '@/types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (product: CartProduct, quantity?: number, options?: Partial<CartItem>) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  updateItemOptions: (productId: string, options: Partial<CartItem>, variantId?: string) => void;
  clearCart: () => void;
  isInCart: (productId: string, variantId?: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const total = items.reduce((sum, item) => {
    const basePrice = item.variant?.price || item.product.price;
    const giftWrapPrice = item.giftWrap ? 15 : 0;
    const cardPrice = item.greetingCard ? 10 : 0;
    return sum + (basePrice + giftWrapPrice + cardPrice) * item.quantity;
  }, 0);

  const addItem = useCallback((
    product: CartProduct, 
    quantity = 1, 
    options?: Partial<CartItem>
  ) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && 
        item.variant?.id === options?.variant?.id
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      return [...prev, { product, quantity, ...options }];
    });
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems(prev => prev.filter(
      item => !(item.product.id === productId && item.variant?.id === variantId)
    ));
  }, []);

  const updateQuantity = useCallback((
    productId: string, 
    quantity: number, 
    variantId?: string
  ) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }

    setItems(prev => prev.map(item => {
      if (item.product.id === productId && item.variant?.id === variantId) {
        return { ...item, quantity };
      }
      return item;
    }));
  }, [removeItem]);

  const updateItemOptions = useCallback((
    productId: string, 
    options: Partial<CartItem>,
    variantId?: string
  ) => {
    setItems(prev => prev.map(item => {
      if (item.product.id === productId && item.variant?.id === variantId) {
        return { ...item, ...options };
      }
      return item;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback((productId: string, variantId?: string) => {
    return items.some(
      item => item.product.id === productId && item.variant?.id === variantId
    );
  }, [items]);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      total,
      addItem,
      removeItem,
      updateQuantity,
      updateItemOptions,
      clearCart,
      isInCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
