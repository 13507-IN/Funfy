import { create } from 'zustand';
import { Canvas, FabricObject } from 'fabric';

interface StickerState {
  canvas: Canvas | null;
  setCanvas: (canvas: Canvas | null) => void;
  activeObject: FabricObject | null;
  setActiveObject: (obj: FabricObject | null) => void;
  cartItems: number;
  addToCart: () => void;
}

export const useStickerStore = create<StickerState>((set) => ({
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),
  activeObject: null,
  setActiveObject: (obj) => set({ activeObject: obj }),
  cartItems: 0,
  addToCart: () => set((state) => ({ cartItems: state.cartItems + 1 })),
}));
