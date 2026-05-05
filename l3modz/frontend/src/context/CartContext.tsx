import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  slug?: string;
}

type CartContextValue = {
  items: CartItem[];
  isLoaded: boolean;
  addToCart: (product: any, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
};

const CART_STORAGE_KEY = 'l3cart';
const BUY_NOW_STORAGE_KEY = 'l3buyNowItem';
const AUTH_CHANGED_EVENT = 'l3-auth-changed';
const DUPLICATE_ADD_WINDOW_MS = 450;

const CartContext = createContext<CartContextValue | undefined>(undefined);

function readCartFromStorage(storageKey: string) {
  if (typeof window === 'undefined') return [] as CartItem[];

  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function migrateLegacyGuestCart(scopedGuestKey: string) {
  if (typeof window === 'undefined') return;

  try {
    const hasScoped = localStorage.getItem(scopedGuestKey);
    const legacy = localStorage.getItem(CART_STORAGE_KEY);
    if (!hasScoped && legacy) {
      localStorage.setItem(scopedGuestKey, legacy);
    }
  } catch {
    // ignore storage migration failures and continue with empty cart fallback
  }
}

async function resolveCartOwnerKey() {
  if (typeof window === 'undefined') return 'guest';

  try {
    const res = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return 'guest';

    const data = await res.json();
    const userId = String(data?.user?.id || '').trim();
    return userId ? `user:${userId}` : 'guest';
  } catch {
    return 'guest';
  }
}

function readBuyNowFromStorage() {
  if (typeof window === 'undefined') return null as CartItem | null;

  try {
    const saved = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CartItem) : null;
  } catch {
    return null;
  }
}

function writeCartToStorage(storageKey: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, JSON.stringify(items));
}

export function setBuyNowItem(product: any, qty = 1) {
  if (typeof window === 'undefined') return;

  const item: CartItem = {
    id: String(product._id),
    title: product.title,
    price: Number(product.price),
    image: product.images?.[0] || '',
    quantity: qty,
    slug: product.slug,
  };

  sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(item));
}

export function getBuyNowItem() {
  return readBuyNowFromStorage();
}

export function clearBuyNowItem() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storageKey, setStorageKey] = useState(`${CART_STORAGE_KEY}:guest`);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastAddRef = useRef<{ key: string; at: number } | null>(null);
  const storageKeyRef = useRef(storageKey);

  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    async function syncCartBySession() {
      setIsLoaded(false);
      const ownerKey = await resolveCartOwnerKey();
      if (cancelled) return;

      const scopedKey = `${CART_STORAGE_KEY}:${ownerKey}`;
      if (ownerKey === 'guest') {
        migrateLegacyGuestCart(scopedKey);
      }
      setStorageKey(scopedKey);
      storageKeyRef.current = scopedKey;
      setItems(readCartFromStorage(scopedKey));
      setIsLoaded(true);
    }

    syncCartBySession();

    const onFocus = () => {
      void syncCartBySession();
    };

    const onAuthChanged = () => {
      void syncCartBySession();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKeyRef.current) {
        setItems(readCartFromStorage(storageKeyRef.current));
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateCart = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    setItems((current) => {
      const next = updater(current);
      writeCartToStorage(storageKeyRef.current, next);
      return next;
    });
  }, []);

  const addToCart = useCallback((product: any, qty = 1) => {
    const productId = String(product._id);
    const dedupeKey = `${storageKeyRef.current}:${productId}:${qty}`;
    const now = Date.now();
    if (lastAddRef.current && lastAddRef.current.key === dedupeKey && now - lastAddRef.current.at < DUPLICATE_ADD_WINDOW_MS) {
      return;
    }
    lastAddRef.current = { key: dedupeKey, at: now };

    updateCart((current) => {
      const existing = current.find((item) => item.id === productId);

      if (existing) {
        return current.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + qty } : item
        );
      }

      return [
        ...current,
        {
          id: productId,
          title: product.title,
          price: Number(product.price),
          image: product.images?.[0] || '',
          quantity: qty,
          slug: product.slug,
        },
      ];
    });
  }, [updateCart]);

  const removeFromCart = useCallback((id: string) => {
    updateCart((current) => current.filter((item) => item.id !== id));
  }, [updateCart]);

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty < 1) return;

    updateCart((current) => current.map((item) => (item.id === id ? { ...item, quantity: qty } : item)));
  }, [updateCart]);

  const clearCart = useCallback(() => {
    updateCart(() => []);
  }, [updateCart]);

  const getCartTotal = useCallback(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoaded,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
