"use client";

import { useStickerStore } from "../store/useStickerStore";
import { X, Sticker } from "lucide-react";
import * as fabric from "fabric";

const PREMADE_STICKERS = [
  {
    name: "Heart",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f43f5e" stroke="#000000" stroke-width="1"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
  },
  {
    name: "Star",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" stroke="#000000" stroke-width="1"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
  },
  {
    name: "Lightning",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#eab308" stroke="#000000" stroke-width="1"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
  },
  {
    name: "Crown",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fbbf24" stroke="#000000" stroke-width="1"><path d="M5 16h14l1-10-4 4-4-6-4 6-4-4 1 10zm-1 2h16v2H4v-2z"/></svg>`
  },
  {
    name: "Smile",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fcd34d" stroke="#000000" stroke-width="1"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke-linecap="round"/><circle cx="9" cy="9" r="1" fill="#000000"/><circle cx="15" cy="9" r="1" fill="#000000"/></svg>`
  },
  {
    name: "Fire",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="#000000" stroke-width="1"><path d="M12 2c0 0-4 3.5-4 8 0 3 2.5 5.5 5.5 5.5S19 13 19 10c0-4.5-4-8-4-8s-2 1.5-2 4c0 0-3-1-3-4z"/></svg>`
  }
];

export default function StickerLibrarySidebar() {
  const { isStickersOpen, setStickersOpen, canvas } = useStickerStore();

  if (!isStickersOpen) return null;

  const handleAddSticker = async (svgString: string) => {
    if (!canvas) return;
    try {
      const { objects, options } = await fabric.loadSVGFromString(svgString);
      const validObjects = objects.filter((o): o is fabric.FabricObject => o !== null);
      const obj = fabric.util.groupSVGElements(validObjects, options);
      
      obj.set({
        left: 200,
        top: 200,
        scaleX: 3, // Make them a bit bigger by default
        scaleY: 3
      });

      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
    } catch (e) {
      console.error("Failed to load SVG sticker", e);
    }
  };

  return (
    <div className="fixed inset-0 md:absolute md:inset-auto md:left-20 md:top-0 w-full md:w-80 h-full bg-white shadow-2xl border-r border-slate-200 z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-left">
      <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <Sticker size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Stickers</h2>
        </div>
        <button onClick={() => setStickersOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {PREMADE_STICKERS.map((sticker) => (
            <button
              key={sticker.name}
              onClick={() => handleAddSticker(sticker.svg)}
              className="aspect-square bg-slate-50 rounded-2xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition flex flex-col items-center justify-center p-4 gap-2 group"
            >
              <div 
                className="w-16 h-16 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm"
                dangerouslySetInnerHTML={{ __html: sticker.svg }} 
              />
              <span className="text-xs font-semibold text-slate-500">{sticker.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
