import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Canvas, FabricObject } from 'fabric';

type PersistedStickerCart = Pick<StickerState, 'cart' | 'cartItems'>;

const CART_DATABASE = 'funfy-browser-storage';
const CART_OBJECT_STORE = 'cart';
let cartDatabasePromise: Promise<IDBDatabase> | undefined;

function openCartDatabase() {
  if (!cartDatabasePromise) {
    cartDatabasePromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is unavailable'));
        return;
      }

      const request = indexedDB.open(CART_DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(CART_OBJECT_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return cartDatabasePromise;
}

const cartStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      const database = await openCartDatabase();
      return await new Promise((resolve, reject) => {
        const request = database.transaction(CART_OBJECT_STORE, 'readonly').objectStore(CART_OBJECT_STORE).get(name);
        request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    }
  },
  async setItem(name: string, value: string): Promise<void> {
    try {
      const database = await openCartDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(CART_OBJECT_STORE, 'readwrite');
        transaction.objectStore(CART_OBJECT_STORE).put(value, name);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) {
      try {
        localStorage.setItem(name, value);
      } catch {
        console.warn('Could not persist the Funfy cart in this browser.', error);
      }
    }
  },
  async removeItem(name: string): Promise<void> {
    try {
      const database = await openCartDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(CART_OBJECT_STORE, 'readwrite');
        transaction.objectStore(CART_OBJECT_STORE).delete(name);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        // Storage can be unavailable in strict private-browsing contexts.
      }
    }
  },
};

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  dataUrl: string;
  unitLabel?: string;
  minQuantity?: number;
  details?: string;
}

interface StickerState {
  canvas: Canvas | null;
  setCanvas: (canvas: Canvas | null) => void;
  activeObject: FabricObject | null;
  setActiveObject: (obj: FabricObject | null) => void;
  cartItems: number;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isGuideOpen: boolean;
  setGuideOpen: (open: boolean) => void;
  isLayersOpen: boolean;
  setLayersOpen: (open: boolean) => void;
  isStickersOpen: boolean;
  setStickersOpen: (open: boolean) => void;
  isDissectOpen: boolean;
  setDissectOpen: (open: boolean) => void;
  isEnhancerOpen: boolean;
  setEnhancerOpen: (open: boolean) => void;
  isVideoBgOpen: boolean;
  setVideoBgOpen: (open: boolean) => void;
  closeAllPanels: () => void;
  dissectionSourceImage: string | null;
  setDissectionSourceImage: (src: string | null) => void;
  enhancerSourceImage: string | null;
  setEnhancerSourceImage: (src: string | null) => void;
  guideState: {
    ruleOfThirds: boolean;
    gridSnapping: boolean;
  };
  setGuideState: (state: Partial<StickerState['guideState']>) => void;
}

export const useStickerStore = create<StickerState>()(persist<StickerState, [], [], PersistedStickerCart>((set) => ({
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),
  activeObject: null,
  setActiveObject: (obj) => set({ activeObject: obj }),
  cartItems: 0,
  cart: [],
  addToCart: (item) => set((state) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return {
      cart: [...state.cart, { ...item, id }],
      cartItems: state.cartItems + item.quantity,
    };
  }),
  removeFromCart: (id) => set((state) => {
    const item = state.cart.find((i) => i.id === id);
    const qty = item ? item.quantity : 0;
    return {
      cart: state.cart.filter((i) => i.id !== id),
      cartItems: Math.max(0, state.cartItems - qty)
    };
  }),
  updateCartQuantity: (id, delta) => set((state) => {
    const updated = state.cart.map((item) => {
      if (item.id === id) {
        const newQty = Math.max(item.minQuantity ?? 1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    const totalQty = updated.reduce((sum, i) => sum + i.quantity, 0);
    return { cart: updated, cartItems: totalQty };
  }),
  isCartOpen: false,
  setCartOpen: (open) => set({ isCartOpen: open }),
  isGuideOpen: false,
  setGuideOpen: (open) => set({ isGuideOpen: open }),
  isLayersOpen: false,
  setLayersOpen: (open) => set({ isLayersOpen: open }),
  isStickersOpen: false,
  setStickersOpen: (open) => set({ isStickersOpen: open }),
  isDissectOpen: false,
  setDissectOpen: (open) => set({ isDissectOpen: open }),
  isEnhancerOpen: false,
  setEnhancerOpen: (open) => set({ isEnhancerOpen: open }),
  isVideoBgOpen: false,
  setVideoBgOpen: (open) => set({ isVideoBgOpen: open }),
  closeAllPanels: () => set({
    isCartOpen: false,
    isGuideOpen: false,
    isLayersOpen: false,
    isStickersOpen: false,
    isDissectOpen: false,
    isEnhancerOpen: false,
    isVideoBgOpen: false,
  }),
  dissectionSourceImage: null,
  setDissectionSourceImage: (src) => set({ dissectionSourceImage: src }),
  enhancerSourceImage: null,
  setEnhancerSourceImage: (src) => set({ enhancerSourceImage: src }),
  guideState: {
    ruleOfThirds: false,
    gridSnapping: false,
  },
  setGuideState: (newState) => set((state) => ({ 
    guideState: { ...state.guideState, ...newState } 
  })),
}), {
  name: 'funfy-cart-v1',
  storage: createJSONStorage(() => cartStorage),
  skipHydration: true,
  partialize: (state) => ({
    cart: state.cart,
    cartItems: state.cartItems,
  }),
}));
