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
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isGuideOpen: boolean;
  setGuideOpen: (open: boolean) => void;
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
  isCartOpen: false,
  setCartOpen: (open) => set({ isCartOpen: open }),
  isGuideOpen: false,
  setGuideOpen: (open) => set({ isGuideOpen: open }),
  guideState: {
    ruleOfThirds: false,
    gridSnapping: false,
  },
  setGuideState: (newState) => set((state) => ({ 
    guideState: { ...state.guideState, ...newState } 
  })),
}));
