"use client";

import { useRef, useState } from "react";
import { Palette, Type, Image as ImageIcon, Shapes, Download, ShoppingCart, Trash2, ArrowUpToLine, ArrowDownToLine, Trash, Scissors, PlusCircle, Eraser, Loader2, BookOpen } from "lucide-react";
import StickerCanvas from "../components/StickerCanvas";
import CartSidebar from "../components/CartSidebar";
import GuideSidebar from "../components/GuideSidebar";
import { useStickerStore } from "../store/useStickerStore";
import * as fabric from "fabric";
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

export default function Home() {
  const { canvas, cartItems, activeObject, setCartOpen, addToCart, setGuideOpen } = useStickerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showShapes, setShowShapes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [currentColor, setCurrentColor] = useState("#f43f5e");
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const PRESET_COLORS = ["#f43f5e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#000000", "#ffffff"];

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText("Your Text", {
      left: 200,
      top: 200,
      fontFamily: "Arial",
      fill: currentColor,
      fontSize: 40,
      fontWeight: "bold",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addShape = (type: string) => {
    if (!canvas) return;
    let shape: fabric.FabricObject | null = null;
    
    if (type === 'circle') {
      shape = new fabric.Circle({ radius: 50, fill: currentColor, left: 200, top: 200 });
    } else if (type === 'rect') {
      shape = new fabric.Rect({ width: 100, height: 100, fill: currentColor, left: 200, top: 200 });
    } else if (type === 'triangle') {
      shape = new fabric.Triangle({ width: 100, height: 100, fill: currentColor, left: 200, top: 200 });
    } else if (type === 'star') {
      shape = new fabric.Polygon([
        {x: 50, y: 0}, {x: 61, y: 35}, {x: 98, y: 35}, {x: 68, y: 57}, 
        {x: 79, y: 91}, {x: 50, y: 70}, {x: 21, y: 91}, {x: 32, y: 57}, 
        {x: 2, y: 35}, {x: 39, y: 35}
      ], { fill: currentColor, left: 200, top: 200 });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      setShowShapes(false);
    }
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
        if (image.width && image.width > 300) {
          image.scaleToWidth(300);
        }
        canvas.add(image);
        canvas.setActiveObject(image);
        canvas.renderAll();
      };
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const bringForward = () => {
    if (!canvas || !activeObject) return;
    canvas.bringObjectForward(activeObject);
    canvas.renderAll();
  };

  const sendBackward = () => {
    if (!canvas || !activeObject) return;
    canvas.sendObjectBackwards(activeObject);
    canvas.renderAll();
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    if (!canvas || !activeObject) return;
    
    if (activeObject.type === 'image') {
      const filter = new fabric.filters.BlendColor({
        color: color,
        mode: 'tint',
        alpha: 0.5
      });
      // @ts-ignore
      activeObject.filters = [filter];
      // @ts-ignore
      activeObject.applyFilters();
    } else {
      activeObject.set('fill', color);
    }
    canvas.renderAll();
  };

  const handleRemoveBackground = async () => {
    if (!canvas || !activeObject || activeObject.type !== 'image') return;
    try {
      setIsRemovingBg(true);
      // @ts-ignore
      const originalSrc = activeObject.getSrc ? activeObject.getSrc() : activeObject.getElement()?.src;
      if (!originalSrc) {
        setIsRemovingBg(false);
        return;
      }
      const imageBlob = await imglyRemoveBackground(originalSrc);
      const url = URL.createObjectURL(imageBlob);
      const imgElement = new window.Image();
      imgElement.src = url;
      imgElement.onload = () => {
        const newImage = new fabric.Image(imgElement, {
          left: activeObject.left,
          top: activeObject.top,
          scaleX: activeObject.scaleX,
          scaleY: activeObject.scaleY,
          angle: activeObject.angle,
        });
        canvas.remove(activeObject);
        canvas.add(newImage);
        canvas.setActiveObject(newImage);
        canvas.renderAll();
        setIsRemovingBg(false);
      };
    } catch (error) {
      console.error("Failed to remove background", error);
      setIsRemovingBg(false);
    }
  };

  const deleteActive = () => {
    if (!canvas || !activeObject) return;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const addDieCutOutline = () => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      obj.set('shadow', new fabric.Shadow({
        color: '#ffffff',
        blur: 10,
        offsetX: 0,
        offsetY: 0,
        nonScaling: true
      }));
      if (obj.type !== 'image') {
        obj.set('stroke', '#ffffff');
        obj.set('strokeWidth', 8);
      }
    });
    canvas.backgroundColor = "#f1f5f9";
    canvas.renderAll();
  };

  const handleExportPNG = () => {
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
    
    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: 2 // High res export
    });
    
    const link = document.createElement('a');
    link.download = 'funfy-sticker.png';
    link.href = dataUrl;
    link.click();
  };

  const handleAddToCart = () => {
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
    
    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: 2 // High res export
    });

    addToCart({
      name: "Custom Die-Cut Sticker",
      quantity: 50, // default batch
      price: 0.50, // 50 cents per sticker
      dataUrl
    });

    setCartOpen(true);
  };

  return (
    <div className="flex flex-col flex-1 h-screen bg-slate-50 overflow-hidden">
      <CartSidebar />
      <GuideSidebar />
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl">F</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 tracking-tight">Funfy</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100 text-slate-700 font-medium transition-colors" onClick={addDieCutOutline}>
            <Scissors size={18} />
            Preview Die-Cut
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100 text-slate-700 font-medium transition-colors" onClick={handleExportPNG}>
            <Download size={18} />
            Export PNG
          </button>
          <button 
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-md shadow-slate-200 hover:shadow-lg"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart size={18} />
            Cart
            <span className="bg-fuchsia-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{cartItems}</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 shrink-0 z-10 shadow-sm relative">
          <ToolButton icon={<ImageIcon size={24} />} label="Images" onClick={() => fileInputRef.current?.click()} />
          <ToolButton icon={<Type size={24} />} label="Text" onClick={addText} />
          
          <div className="relative w-full">
            <ToolButton icon={<Shapes size={24} />} label="Shapes" onClick={() => setShowShapes(!showShapes)} />
            {showShapes && (
              <div className="absolute left-24 top-0 bg-white shadow-xl border border-slate-200 rounded-2xl p-4 flex gap-4 z-50 animate-in fade-in slide-in-from-left-4">
                <button onClick={() => addShape('circle')} className="w-12 h-12 bg-blue-500 rounded-full hover:scale-110 transition-transform shadow-md" title="Circle" />
                <button onClick={() => addShape('rect')} className="w-12 h-12 bg-emerald-500 rounded-lg hover:scale-110 transition-transform shadow-md" title="Square" />
                <button onClick={() => addShape('triangle')} className="w-0 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-b-[40px] border-b-amber-500 hover:scale-110 transition-transform drop-shadow-md" title="Triangle" />
                <button onClick={() => addShape('star')} className="w-12 h-12 text-rose-500 hover:scale-110 transition-transform drop-shadow-md" title="Star">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </button>
              </div>
            )}
          </div>

          <div className="relative w-full">
            <ToolButton icon={<Palette size={24} color={currentColor} />} label="Colors" onClick={() => setShowColors(!showColors)} />
            {showColors && (
              <div className="absolute left-24 top-0 bg-white shadow-xl border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-left-4 w-48">
                <div className="text-sm font-semibold text-slate-700 mb-1">Theme Colors</div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => handleColorChange(c)} 
                      className={`w-8 h-8 rounded-full border-2 ${currentColor === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-110'} transition-transform shadow-sm`} 
                      style={{backgroundColor: c}}
                      title={c}
                    />
                  ))}
                </div>
                <div className="w-full h-px bg-slate-100 my-1" />
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm shrink-0">
                    <input 
                      type="color" 
                      value={currentColor} 
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                      title="Custom Color"
                    />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">Custom Color</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-auto w-full flex flex-col items-center gap-2">
            <ToolButton icon={<BookOpen size={24} className="text-indigo-500" />} label="Guide" onClick={() => setGuideOpen(true)} />
            <ToolButton icon={<Trash2 size={24} className="text-rose-500" />} label="Clear" onClick={clearCanvas} />
          </div>
        </aside>

        <section className="flex-1 bg-slate-100/50 flex flex-col items-center justify-center p-8 overflow-auto pattern-dots relative">
          
          {activeObject && (
            <div className="absolute top-8 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-4 z-20 animate-in fade-in slide-in-from-top-4 duration-200">
              {activeObject.type === 'image' && (
                <>
                  <button onClick={handleRemoveBackground} disabled={isRemovingBg} className="flex items-center gap-2 px-3 py-1 hover:bg-slate-100 rounded-full text-slate-700 font-medium transition disabled:opacity-50" title="Remove Background">
                    {isRemovingBg ? <Loader2 size={18} className="animate-spin text-fuchsia-500" /> : <Eraser size={18} />}
                    <span className="text-sm">{isRemovingBg ? "Removing..." : "Remove BG"}</span>
                  </button>
                  <div className="w-px h-6 bg-slate-200" />
                </>
              )}
              <button onClick={bringForward} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Bring Forward">
                <ArrowUpToLine size={20} />
              </button>
              <button onClick={sendBackward} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Send Backward">
                <ArrowDownToLine size={20} />
              </button>
              <div className="w-px h-6 bg-slate-200" />
              <button onClick={deleteActive} className="p-2 hover:bg-rose-50 rounded-full text-rose-500 transition" title="Delete">
                <Trash size={20} />
              </button>
            </div>
          )}

          <StickerCanvas />

          <button 
            className="absolute bottom-8 right-8 flex items-center gap-2 px-6 py-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-bold hover:shadow-xl hover:shadow-fuchsia-500/30 transition-all hover:-translate-y-1"
            onClick={handleAddToCart}
          >
            <PlusCircle size={24} />
            Order Stickers
          </button>
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

