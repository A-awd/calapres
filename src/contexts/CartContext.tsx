import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CartItem, CartProduct, ProductVariant } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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

// Debounce function to limit how often we save to DB
const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
      } else {
        setUserId(null);
        setUserEmail(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const total = items.reduce((sum, item) => {
    const basePrice = item.variant?.price || item.product.price;
    const giftWrapPrice = item.giftWrap ? 15 : 0;
    const cardPrice = item.greetingCard ? 10 : 0;
    return sum + (basePrice + giftWrapPrice + cardPrice) * item.quantity;
  }, 0);

  // Save cart to abandoned_carts table (debounced)
  const saveAbandonedCart = useCallback(
    debounce(async (cartItems: CartItem[], cartTotal: number, email: string, uId: string | null) => {
      if (!email || cartItems.length === 0) return;

      try {
        // Prepare cart items for storage
        const cartItemsData = cartItems.map(item => ({
          id: item.product.id,
          name: item.product.name,
          nameAr: item.product.nameAr,
          price: item.variant?.price || item.product.price,
          quantity: item.quantity,
          image: item.product.image,
          variantId: item.variant?.id,
          variantName: item.variant?.name,
        }));

        // Check if there's an existing abandoned cart for this user/email
        const { data: existing } = await supabase
          .from('abandoned_carts')
          .select('id')
          .eq('email', email)
          .eq('converted', false)
          .maybeSingle();

        if (existing) {
          // Update existing cart
          await supabase
            .from('abandoned_carts')
            .update({
              cart_items: cartItemsData,
              cart_total: cartTotal,
              reminder_sent: false, // Reset reminder if cart updated
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // Create new abandoned cart
          await supabase
            .from('abandoned_carts')
            .insert({
              user_id: uId,
              email: email,
              cart_items: cartItemsData,
              cart_total: cartTotal,
            });
        }
      } catch (error) {
        console.error('Error saving abandoned cart:', error);
      }
    }, 3000), // 3 second debounce
    []
  );

  // Save cart when it changes (for logged-in users)
  useEffect(() => {
    if (userEmail && items.length > 0) {
      saveAbandonedCart(items, total, userEmail, userId);
    }
  }, [items, total, userEmail, userId, saveAbandonedCart]);

  // Mark cart as converted when cleared (order placed)
  const markCartConverted = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      await supabase
        .from('abandoned_carts')
        .update({
          converted: true,
          converted_at: new Date().toISOString(),
        })
        .eq('email', userEmail)
        .eq('converted', false);
    } catch (error) {
      console.error('Error marking cart as converted:', error);
    }
  }, [userEmail]);

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
    markCartConverted(); // Mark as converted when order is placed
    setItems([]);
  }, [markCartConverted]);

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
