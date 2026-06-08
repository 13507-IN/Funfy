import { create } from 'zustand';
import { Canvas } from 'fabric';

interface StickerState {
  canvas: Canvas | null;
  setCanvas: (canvas: Canvas) => void;
  cartItems: number;
  addToCart: () => void;
  // We will add more state for active objects, colors, etc.
}

export const useStickerStore = create<StickerState>((set) => ({
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),
  cartItems: 0,
  addToCart: () => set((state) => ({ cartItems: state.cartItems + 1 })),
}));
