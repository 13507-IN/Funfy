import { create } from 'zustand';
import { Canvas, FabricObject } from 'fabric';

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  dataUrl: string;
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
  closeAllPanels: () => void;
  dissectionSourceImage: string | null;
  setDissectionSourceImage: (src: string | null) => void;
  guideState: {
    ruleOfThirds: boolean;
    gridSnapping: boolean;
  };
  setGuideState: (state: Partial<StickerState['guideState']>) => void;
}

export const useStickerStore = create<StickerState>((set) => ({
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),
  activeObject: null,
  setActiveObject: (obj) => set({ activeObject: obj }),
  cartItems: 0,
  cart: [],
  addToCart: (item) => set((state) => ({ 
    cart: [...state.cart, { ...item, id: Math.random().toString(36).slice(2) }],
    cartItems: state.cartItems + item.quantity
  })),
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
        const newQty = Math.max(10, item.quantity + delta);
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
  closeAllPanels: () => set({
    isCartOpen: false,
    isGuideOpen: false,
    isLayersOpen: false,
    isStickersOpen: false,
    isDissectOpen: false,
  }),
  dissectionSourceImage: null,
  setDissectionSourceImage: (src) => set({ dissectionSourceImage: src }),
  guideState: {
    ruleOfThirds: false,
    gridSnapping: false,
  },
  setGuideState: (newState) => set((state) => ({ 
    guideState: { ...state.guideState, ...newState } 
  })),
}));
