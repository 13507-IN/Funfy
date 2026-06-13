"use client";

import { useRef, useState, useEffect } from "react";
import { Palette, Type, Image as ImageIcon, Shapes, Download, ShoppingCart, Trash2, ArrowUpToLine, ArrowDownToLine, Trash, Scissors, PlusCircle, Eraser, Loader2, BookOpen, Layers, Sticker, Crop, Check, X as CloseIcon } from "lucide-react";
import StickerCanvas from "../components/StickerCanvas";
import CartSidebar from "../components/CartSidebar";
import GuideSidebar from "../components/GuideSidebar";
import LayersSidebar from "../components/LayersSidebar";
import StickerLibrarySidebar from "../components/StickerLibrarySidebar";
import { useStickerStore } from "../store/useStickerStore";
import * as fabric from "fabric";

export default function Home() {
  const { canvas, cartItems, activeObject, setCartOpen, addToCart, setGuideOpen, setLayersOpen, setStickersOpen } = useStickerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showShapes, setShowShapes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [currentColor, setCurrentColor] = useState("#f43f5e");
  const [currentFont, setCurrentFont] = useState("Arial");
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropBox, setCropBox] = useState<fabric.Rect | null>(null);
  const [erasePaths, setErasePaths] = useState<fabric.Path[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const PRESET_COLORS = ["#f43f5e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#000000", "#ffffff"];

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText("Your Text", {
      left: 200,
      top: 200,
      fontFamily: currentFont,
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
    setIsRemovingBg(true);
    
    // @ts-ignore
    const originalSrc = activeObject.getSrc ? activeObject.getSrc() : activeObject.getElement()?.src;
    
    if (!originalSrc) {
      setIsRemovingBg(false);
      return;
    }

    const worker = new Worker(new URL('../workers/bgRemoval.worker.ts', import.meta.url));

    worker.onmessage = (e) => {
      if (e.data.success) {
        const url = URL.createObjectURL(e.data.blob);
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
          worker.terminate();
        };
      } else {
        console.error("Worker failed to remove background", e.data.error);
        setIsRemovingBg(false);
        worker.terminate();
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error", error);
      setIsRemovingBg(false);
      worker.terminate();
    };

    // Pre-process image if it's too large to send to the worker
    if (originalSrc.length > 5000000) {
        console.warn("Image is quite large, background removal might take a moment...");
    }

    worker.postMessage({ imageUrl: originalSrc });
  };

  const startEraseMode = () => {
    if (!canvas || !activeObject || activeObject.type !== 'image') return;
    setIsErasing(true);
    canvas.isDrawingMode = true;
    const brush = new fabric.PencilBrush(canvas);
    brush.color = 'rgba(255, 0, 0, 0.5)';
    brush.width = 30;
    canvas.freeDrawingBrush = brush;
    setErasePaths([]);
  };

  const cancelEraseMode = () => {
    if (!canvas) return;
    setIsErasing(false);
    canvas.isDrawingMode = false;
    erasePaths.forEach(path => canvas.remove(path));
    setErasePaths([]);
    canvas.renderAll();
  };

  const applyEraseMode = () => {
    if (!canvas || !activeObject || activeObject.type !== 'image') return;
    setIsErasing(false);
    canvas.isDrawingMode = false;
    if (erasePaths.length === 0) return;

    const originalObjects = canvas.getObjects().filter(o => o !== activeObject && !erasePaths.includes(o as fabric.Path));
    const originalVisibilities = originalObjects.map(o => o.visible);
    const originalBg = canvas.backgroundColor;
    
    originalObjects.forEach(o => o.set('visible', false));
    canvas.backgroundColor = ''; // transparent
    
    erasePaths.forEach(path => {
        path.set({ globalCompositeOperation: 'destination-out', stroke: 'black', opacity: 1 });
    });
    
    canvas.renderAll();
    
    const rect = activeObject.getBoundingRect();
    const dataUrl = canvas.toDataURL({
        format: 'png',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        multiplier: 1
    });
    
    originalObjects.forEach((o, i) => o.set('visible', originalVisibilities[i]));
    canvas.backgroundColor = originalBg;
    erasePaths.forEach(path => canvas.remove(path));
    setErasePaths([]);
    
    const oldImage = activeObject;
    const imgElement = new window.Image();
    imgElement.src = dataUrl;
    imgElement.onload = () => {
      const newImage = new fabric.Image(imgElement, {
        left: rect.left,
        top: rect.top,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      });
      canvas.remove(oldImage);
      canvas.add(newImage);
      canvas.setActiveObject(newImage);
      canvas.renderAll();
    };
  };

  const startCropMode = () => {
    if (!canvas || !activeObject || activeObject.type !== 'image') return;
    setIsCropping(true);
    
    const rect = activeObject.getBoundingRect();
    const box = new fabric.Rect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        fill: 'rgba(0,0,0,0.3)',
        stroke: '#3b82f6',
        strokeWidth: 2,
        cornerColor: '#3b82f6',
        transparentCorners: false,
    });
    
    canvas.add(box);
    canvas.setActiveObject(box);
    setCropBox(box);
  };

  const cancelCropMode = () => {
    if (!canvas || !cropBox) return;
    setIsCropping(false);
    canvas.remove(cropBox);
    setCropBox(null);
    if (activeObject) canvas.setActiveObject(activeObject);
    canvas.renderAll();
  };

  const applyCropMode = () => {
    if (!canvas || !cropBox || !activeObject) return;
    
    setIsCropping(false);
    
    const originalObjects = canvas.getObjects().filter(o => o !== activeObject && o !== cropBox);
    const originalVisibilities = originalObjects.map(o => o.visible);
    const originalBg = canvas.backgroundColor;
    
    originalObjects.forEach(o => o.set('visible', false));
    canvas.backgroundColor = ''; // transparent
    cropBox.set('visible', false);
    
    canvas.renderAll();
    
    const rect = cropBox.getBoundingRect();
    const dataUrl = canvas.toDataURL({
        format: 'png',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        multiplier: 1
    });
    
    originalObjects.forEach((o, i) => o.set('visible', originalVisibilities[i]));
    canvas.backgroundColor = originalBg;
    canvas.remove(cropBox);
    setCropBox(null);
    
    const oldImage = activeObject;
    const imgElement = new window.Image();
    imgElement.src = dataUrl;
    imgElement.onload = () => {
      const newImage = new fabric.Image(imgElement, {
        left: rect.left,
        top: rect.top,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      });
      // Important: don't remove oldImage if the activeObject changed, but we assume it didn't
      canvas.remove(oldImage);
      canvas.add(newImage);
      canvas.setActiveObject(newImage);
      canvas.renderAll();
    };
  };

  const deleteActive = () => {
    if (!canvas || !activeObject) return;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const togglePreview = () => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    
    if (isPreviewMode) {
      objects.forEach((obj) => {
        // @ts-ignore
        if (obj.excludeFromExport) return; // don't touch guides if any
        
        obj.set('shadow', null);
        if (obj.type !== 'image') {
          obj.set('stroke', null);
          obj.set('strokeWidth', 1);
        }
      });
      canvas.backgroundColor = "#ffffff";
      setIsPreviewMode(false);
    } else {
      objects.forEach((obj) => {
        // @ts-ignore
        if (obj.excludeFromExport) return;
        
        if (obj.type === 'image') {
          obj.set('shadow', new fabric.Shadow({
            color: '#ffffff',
            blur: 15,
            offsetX: 0,
            offsetY: 0,
          }));
        } else {
          obj.set('stroke', '#ffffff');
          obj.set('strokeWidth', 10);
          obj.set('strokeLineJoin', 'round');
          obj.set('paintFirst', 'stroke');
        }
      });
      canvas.backgroundColor = "#cbd5e1";
      setIsPreviewMode(true);
    }
    
    canvas.discardActiveObject();
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

  useEffect(() => {
    if (!canvas) return;
    const handlePathCreated = (opt: any) => {
      if (isErasing) {
        setErasePaths(prev => [...prev, opt.path]);
      }
    };
    canvas.on('path:created', handlePathCreated);
    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [canvas, isErasing]);

  return (
    <div className="flex flex-col flex-1 h-[100dvh] bg-slate-50 overflow-hidden">
      <CartSidebar />
      <GuideSidebar />
      <LayersSidebar />
      <StickerLibrarySidebar />
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shrink-0">F</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 tracking-tight hidden sm:block">Funfy</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-full font-medium transition-colors text-sm md:text-base ${isPreviewMode ? 'bg-fuchsia-100 text-fuchsia-700 shadow-inner' : 'hover:bg-slate-100 text-slate-700'}`} onClick={togglePreview}>
            {isPreviewMode ? <Check size={18} /> : <Scissors size={18} />}
            <span className="hidden sm:inline">{isPreviewMode ? "Exit Preview" : "Preview"}</span>
          </button>
          <button className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-full hover:bg-slate-100 text-slate-700 font-medium transition-colors text-sm md:text-base" onClick={handleExportPNG}>
            <Download size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button 
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-md shadow-slate-200 hover:shadow-lg text-sm md:text-base"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:inline">Cart</span>
            <span className="bg-fuchsia-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{cartItems}</span>
          </button>
        </div>
      </header>

      <main className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        <section className="flex-1 bg-slate-100/50 flex flex-col items-center justify-center p-4 md:p-8 overflow-auto pattern-dots relative order-1 md:order-2 min-h-0">
          
          {activeObject && (
            <div className="absolute top-4 md:top-8 bg-white px-2 md:px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2 md:gap-4 z-20 animate-in fade-in slide-in-from-top-4 duration-200 flex-wrap justify-center max-w-[90%] md:max-w-none">
              {(activeObject.type === 'i-text' || activeObject.type === 'text') && (
                <>
                  <select 
                    value={(activeObject as fabric.IText).fontFamily}
                    onChange={(e) => {
                      const font = e.target.value;
                      setCurrentFont(font);
                      activeObject.set('fontFamily', font);
                      canvas?.renderAll();
                    }}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-fuchsia-500 focus:border-fuchsia-500 block p-1.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="Arial" style={{fontFamily: 'Arial'}}>Arial</option>
                    <option value="Bangers" style={{fontFamily: 'Bangers'}}>Bangers</option>
                    <option value="Pacifico" style={{fontFamily: 'Pacifico'}}>Pacifico</option>
                    <option value="Fredoka One" style={{fontFamily: 'Fredoka One'}}>Fredoka</option>
                    <option value="Creepster" style={{fontFamily: 'Creepster'}}>Creepster</option>
                  </select>
                  <div className="w-px h-6 bg-slate-200" />
                </>
              )}
              {activeObject.type === 'image' && !isErasing && !isCropping && (
                <>
                  <button onClick={handleRemoveBackground} disabled={isRemovingBg} className="flex items-center gap-2 px-3 py-1 hover:bg-slate-100 rounded-full text-slate-700 font-medium transition disabled:opacity-50" title="Remove Background">
                    {isRemovingBg ? <Loader2 size={18} className="animate-spin text-fuchsia-500" /> : <Eraser size={18} />}
                    <span className="text-sm">{isRemovingBg ? "Removing..." : "Remove BG"}</span>
                  </button>
                  <button onClick={startCropMode} className="flex items-center gap-2 px-3 py-1 hover:bg-slate-100 rounded-full text-slate-700 font-medium transition" title="Crop Image">
                    <Crop size={18} />
                    <span className="text-sm">Crop</span>
                  </button>
                  <button onClick={startEraseMode} className="flex items-center gap-2 px-3 py-1 hover:bg-slate-100 rounded-full text-slate-700 font-medium transition" title="Erase Image">
                    <Scissors size={18} />
                    <span className="text-sm">Erase</span>
                  </button>
                  <div className="w-px h-6 bg-slate-200" />
                </>
              )}
              {isErasing && (
                <>
                  <span className="text-sm font-semibold text-rose-500 flex items-center gap-2"><Eraser size={18} /> Erasing Mode</span>
                  <div className="w-px h-6 bg-slate-200" />
                  <button onClick={applyEraseMode} className="flex items-center gap-1 px-2 md:px-3 py-1 hover:bg-emerald-50 text-emerald-600 rounded-full transition">
                    <Check size={18} /> <span className="hidden sm:inline">Apply</span>
                  </button>
                  <button onClick={cancelEraseMode} className="flex items-center gap-1 px-2 md:px-3 py-1 hover:bg-rose-50 text-rose-600 rounded-full transition">
                    <CloseIcon size={18} /> <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <div className="w-px h-6 bg-slate-200" />
                </>
              )}
              {isCropping && (
                <>
                  <span className="text-sm font-semibold text-blue-500 flex items-center gap-1 md:gap-2"><Crop size={18} /> <span className="hidden sm:inline">Cropping Mode</span></span>
                  <div className="w-px h-6 bg-slate-200" />
                  <button onClick={applyCropMode} className="flex items-center gap-1 px-2 md:px-3 py-1 hover:bg-emerald-50 text-emerald-600 rounded-full transition">
                    <Check size={18} /> <span className="hidden sm:inline">Apply</span>
                  </button>
                  <button onClick={cancelCropMode} className="flex items-center gap-1 px-2 md:px-3 py-1 hover:bg-rose-50 text-rose-600 rounded-full transition">
                    <CloseIcon size={18} /> <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <div className="w-px h-6 bg-slate-200" />
                </>
              )}
              {!isErasing && !isCropping && (
                <>
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
                </>
              )}
            </div>
          )}

          <StickerCanvas />

          <button 
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-bold shadow-lg hover:shadow-xl hover:shadow-fuchsia-500/30 transition-all hover:-translate-y-1 text-sm md:text-base z-40"
            onClick={handleAddToCart}
          >
            <PlusCircle size={20} className="md:w-6 md:h-6" />
            Order Stickers
          </button>
        </section>

        <aside className="w-full md:w-20 h-auto md:h-full bg-white border-t md:border-t-0 md:border-r border-slate-200 flex flex-row md:flex-col items-center py-2 md:py-6 px-2 md:px-0 gap-2 md:gap-6 shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-sm relative order-2 md:order-1 overflow-x-auto md:overflow-y-auto hide-scrollbar">
          <ToolButton icon={<ImageIcon size={24} />} label="Images" onClick={() => fileInputRef.current?.click()} />
          <ToolButton icon={<Sticker size={24} className="text-rose-500" />} label="Stickers" onClick={() => setStickersOpen(true)} />
          <ToolButton icon={<Type size={24} />} label="Text" onClick={addText} />
          
          <div className="relative shrink-0">
            <ToolButton icon={<Shapes size={24} />} label="Shapes" onClick={() => { setShowShapes(!showShapes); if (!showShapes) setShowColors(false); }} />
            {showShapes && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:fixed md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-24 md:translate-x-0 bg-white shadow-xl border border-slate-200 rounded-2xl p-4 flex gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-left-4">
                <button onClick={() => { addShape('circle'); setShowShapes(false); }} className="w-12 h-12 bg-blue-500 rounded-full hover:scale-110 transition-transform shadow-md" title="Circle" />
                <button onClick={() => { addShape('rect'); setShowShapes(false); }} className="w-12 h-12 bg-emerald-500 rounded-lg hover:scale-110 transition-transform shadow-md" title="Square" />
                <button onClick={() => { addShape('triangle'); setShowShapes(false); }} className="w-0 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-b-[40px] border-b-amber-500 hover:scale-110 transition-transform drop-shadow-md" title="Triangle" />
                <button onClick={() => { addShape('star'); setShowShapes(false); }} className="w-12 h-12 text-rose-500 hover:scale-110 transition-transform drop-shadow-md" title="Star">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </button>
                <button onClick={() => setShowShapes(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-md" title="Close">
                  <CloseIcon size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="relative shrink-0">
            <ToolButton icon={<Palette size={24} color={currentColor} />} label="Colors" onClick={() => { setShowColors(!showColors); if (!showColors) setShowShapes(false); }} />
            {showColors && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:fixed md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-24 md:translate-x-0 bg-white shadow-xl border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-left-4 w-48">
                <div className="text-sm font-semibold text-slate-700 mb-1 flex justify-between items-center">
                  Theme Colors
                  <button onClick={() => setShowColors(false)} className="text-slate-400 hover:text-slate-700" title="Close">
                    <CloseIcon size={16} />
                  </button>
                </div>
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
          
          <div className="md:mt-auto flex flex-row md:flex-col items-center gap-2 shrink-0">
            <ToolButton icon={<Layers size={24} className="text-amber-500" />} label="Layers" onClick={() => setLayersOpen(true)} />
            <ToolButton icon={<BookOpen size={24} className="text-indigo-500" />} label="Guide" onClick={() => setGuideOpen(true)} />
            <ToolButton icon={<Trash2 size={24} className="text-rose-500" />} label="Clear" onClick={clearCanvas} />
          </div>
        </aside>

      </main>
    </div>
  );
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1 group w-16 md:w-full px-2 py-2 md:py-3 hover:bg-fuchsia-50 rounded-xl transition-all relative shrink-0">
      <div className="text-slate-500 group-hover:text-fuchsia-600 transition-colors group-hover:scale-110 duration-200">
        {icon}
      </div>
      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-fuchsia-600 uppercase tracking-wider">{label}</span>
      <div className="absolute left-0 md:left-0 bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-full md:w-1 h-1 md:h-8 bg-fuchsia-500 rounded-t-md md:rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

