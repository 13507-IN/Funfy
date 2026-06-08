"use client";

import { useRef } from "react";
import { Palette, Type, Image as ImageIcon, Shapes, Download, ShoppingCart, Trash2 } from "lucide-react";
import StickerCanvas from "../components/StickerCanvas";
import { useStickerStore } from "../store/useStickerStore";
import * as fabric from "fabric";

export default function Home() {
  const { canvas, cartItems } = useStickerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText("Your Text", {
      left: 200,
      top: 200,
      fontFamily: "Arial",
      fill: "#f43f5e",
      fontSize: 40,
      fontWeight: "bold",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addShape = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      radius: 50,
      fill: "#3b82f6",
      left: 200,
      top: 200,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  const clearCanvas = () => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (f) => {
      const data = f.target?.result;
      if (typeof data !== "string") return;

      const imgElement = new window.Image();
      imgElement.src = data;
      imgElement.onload = () => {
        const image = new fabric.Image(imgElement, {
          left: 100,
          top: 100,
        });
        // Scale down if image is too large
        if (image.width && image.width > 300) {
          image.scaleToWidth(300);
        }
        canvas.add(image);
        canvas.setActiveObject(image);
        canvas.renderAll();
      };
    };

    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col flex-1 h-screen bg-slate-50 overflow-hidden">
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl">F</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 tracking-tight">Funfy</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100 text-slate-700 font-medium transition-colors">
            <Download size={18} />
            Export PNG
          </button>
          <button className="flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-md shadow-slate-200 hover:shadow-lg">
            <ShoppingCart size={18} />
            Cart
            <span className="bg-fuchsia-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{cartItems}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex flex-1 overflow-hidden relative">
        
        {/* Left Sidebar - Tools */}
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 shrink-0 z-10 shadow-sm">
          <ToolButton icon={<ImageIcon size={24} />} label="Images" onClick={() => fileInputRef.current?.click()} />
          <ToolButton icon={<Type size={24} />} label="Text" onClick={addText} />
          <ToolButton icon={<Shapes size={24} />} label="Shapes" onClick={addShape} />
          <ToolButton icon={<Palette size={24} />} label="Colors" onClick={() => {}} />
          
          <div className="mt-auto flex flex-col items-center gap-6">
            <ToolButton icon={<Trash2 size={24} className="text-rose-500" />} label="Clear" onClick={clearCanvas} />
          </div>
        </aside>

        {/* Center - Canvas Area */}
        <section className="flex-1 bg-slate-100/50 flex flex-col items-center justify-center p-8 overflow-auto pattern-dots">
          <StickerCanvas />
        </section>

      </main>
    </div>
  );
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group w-full px-2 py-3 hover:bg-fuchsia-50 rounded-xl transition-all relative">
      <div className="text-slate-500 group-hover:text-fuchsia-600 transition-colors group-hover:scale-110 duration-200">
        {icon}
      </div>
      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-fuchsia-600 uppercase tracking-wider">{label}</span>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-fuchsia-500 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

