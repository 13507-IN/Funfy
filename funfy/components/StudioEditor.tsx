"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowLeft, Palette, Type, Image as ImageIcon, Shapes, Download, ShoppingCart, Trash2, ArrowUpToLine, ArrowDownToLine, Trash, Scissors, PlusCircle, Eraser, Loader2, BookOpen, Layers, Sticker, Crop, Check, Sparkles, FlipHorizontal, FlipVertical, Copy, Lock, Wand2, Video, X as CloseIcon } from "lucide-react";
import StickerCanvas from "./StickerCanvas";
import CartSidebar from "./CartSidebar";
import GuideSidebar from "./GuideSidebar";
import LayersSidebar from "./LayersSidebar";
import StickerLibrarySidebar from "./StickerLibrarySidebar";
import DissectionSidebar from "./DissectionSidebar";
import EnhancerSidebar from "./EnhancerSidebar";
import VideoBgRemoverSidebar from "./VideoBgRemoverSidebar";
import { useStickerStore } from "../store/useStickerStore";
import * as fabric from "fabric";

function canvasToPng(targetCanvas: fabric.Canvas, multiplier: number) {
  const originalBackground = targetCanvas.backgroundColor;
  try {
    targetCanvas.backgroundColor = "";
    targetCanvas.discardActiveObject();
    targetCanvas.renderAll();
    return targetCanvas.toDataURL({ format: "png", multiplier });
  } finally {
    targetCanvas.backgroundColor = originalBackground;
    targetCanvas.renderAll();
  }
}

export default function StudioEditor({ onBack }: { onBack: () => void }) {
  const { canvas, cartItems, activeObject, setCartOpen, addToCart, isGuideOpen, setGuideOpen, isLayersOpen, setLayersOpen, isStickersOpen, setStickersOpen, isDissectOpen, setDissectOpen, setDissectionSourceImage, isEnhancerOpen, setEnhancerOpen, setEnhancerSourceImage, isVideoBgOpen, setVideoBgOpen, closeAllPanels } = useStickerStore();
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
  const [isOrderOptionsOpen, setIsOrderOptionsOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(25);
  const [stickerSize, setStickerSize] = useState("3 in");
  const [stickerFinish, setStickerFinish] = useState("Matte");
  const hasDesign = Boolean(canvas?.getObjects().length);

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

  const flipHorizontal = () => {
    if (!canvas || !activeObject) return;
    activeObject.set('flipX', !activeObject.flipX);
    canvas.renderAll();
  };

  const flipVertical = () => {
    if (!canvas || !activeObject) return;
    activeObject.set('flipY', !activeObject.flipY);
    canvas.renderAll();
  };

  const duplicateActive = async () => {
    if (!canvas || !activeObject) return;
    try {
      const cloned = await activeObject.clone();
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    } catch (e) {
      console.error("Failed to duplicate object", e);
    }
  };

  const toggleLockActive = () => {
    if (!canvas || !activeObject) return;
    // @ts-ignore
    const isLocked = activeObject.selectable === false;
    activeObject.set({
      selectable: isLocked,
      evented: isLocked,
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
    });
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
    const dataUrl = canvasToPng(canvas, 2);

    const link = document.createElement('a');
    link.download = 'funfy-sticker.png';
    link.href = dataUrl;
    link.click();
  };

  const handleAddToCart = () => {
    if (!canvas || !hasDesign) return;
    const dataUrl = canvasToPng(canvas, 1);

    addToCart({
      name: "Custom die-cut stickers",
      quantity: orderQuantity,
      price: 0.50,
      dataUrl,
      unitLabel: "stickers",
      minQuantity: 25,
      details: `${stickerSize} · ${stickerFinish} preference`,
    });

    setIsOrderOptionsOpen(false);
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
      <DissectionSidebar />
      <EnhancerSidebar />
      <VideoBgRemoverSidebar />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />

      <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="mr-1 flex items-center gap-2 rounded-full px-3 py-2 text-slate-600 transition hover:bg-slate-100" aria-label="Back to shop">
            <ArrowLeft size={18} />
            <span className="hidden sm:inline text-sm font-semibold">Shop</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shrink-0">F</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 tracking-tight hidden sm:block">Funfy Studio</h1>
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
                  <button
                    onClick={() => {
                      // @ts-ignore
                      const src = activeObject.getSrc ? activeObject.getSrc() : activeObject.getElement()?.src;
                      if (src) {
                        setEnhancerSourceImage(src);
                        setEnhancerOpen(true);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1 hover:bg-amber-50 text-amber-700 font-medium rounded-full transition"
                    title="Enhance Image Quality to 4K/8K"
                  >
                    <Wand2 size={18} className="text-amber-500" />
                    <span className="text-sm font-semibold">Enhance 4K</span>
                  </button>
                  <button
                    onClick={() => {
                      // @ts-ignore
                      const src = activeObject.getSrc ? activeObject.getSrc() : activeObject.getElement()?.src;
                      if (src) {
                        setDissectionSourceImage(src);
                        setDissectOpen(true);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1 hover:bg-slate-100 rounded-full text-slate-700 font-medium transition"
                    title="Dissect Image Components"
                  >
                    <Sparkles size={18} className="text-fuchsia-500" />
                    <span className="text-sm">Dissect</span>
                  </button>
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
                  <button onClick={duplicateActive} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Duplicate Layer (Ctrl+D)">
                    <Copy size={18} />
                  </button>
                  <button onClick={flipHorizontal} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Flip Horizontally">
                    <FlipHorizontal size={18} />
                  </button>
                  <button onClick={flipVertical} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Flip Vertically">
                    <FlipVertical size={18} />
                  </button>
                  <div className="w-px h-6 bg-slate-200" />
                  <button onClick={bringForward} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Bring Forward">
                    <ArrowUpToLine size={18} />
                  </button>
                  <button onClick={sendBackward} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Send Backward">
                    <ArrowDownToLine size={18} />
                  </button>
                  <button onClick={toggleLockActive} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Lock Object">
                    <Lock size={18} />
                  </button>
                  <div className="w-px h-6 bg-slate-200" />
                  <button onClick={deleteActive} className="p-2 hover:bg-rose-50 rounded-full text-rose-500 transition" title="Delete Layer">
                    <Trash size={18} />
                  </button>
                </>
              )}
            </div>
          )}

          <StickerCanvas />

          <button
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-bold shadow-lg hover:shadow-xl hover:shadow-fuchsia-500/30 transition-all hover:-translate-y-1 text-sm md:text-base z-40"
            onClick={() => setIsOrderOptionsOpen(true)}
          >
            <PlusCircle size={20} className="md:w-6 md:h-6" />
            Add to bag
          </button>
        </section>

        <aside className="w-full md:w-20 h-auto md:h-full bg-white border-t md:border-t-0 md:border-r border-slate-200 flex flex-row md:flex-col items-center py-2 md:py-3 px-2 md:px-1.5 gap-1.5 md:gap-2 shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-sm relative order-2 md:order-1 overflow-x-auto md:overflow-y-auto hide-scrollbar">
          <ToolButton icon={<Video size={22} className="text-emerald-500" />} label="Video BG" onClick={() => { if (!isVideoBgOpen) closeAllPanels(); setVideoBgOpen(!isVideoBgOpen); }} isActive={isVideoBgOpen} />
          <ToolButton icon={<Wand2 size={22} className="text-amber-500" />} label="Enhance" onClick={() => { if (!isEnhancerOpen) closeAllPanels(); setEnhancerOpen(!isEnhancerOpen); }} isActive={isEnhancerOpen} />
          <ToolButton icon={<Sparkles size={22} className="text-fuchsia-500" />} label="Dissect" onClick={() => { if (!isDissectOpen) closeAllPanels(); setDissectOpen(!isDissectOpen); }} isActive={isDissectOpen} />
          <ToolButton icon={<ImageIcon size={22} className="text-blue-500" />} label="Images" onClick={() => fileInputRef.current?.click()} />
          <ToolButton icon={<Sticker size={22} className="text-rose-500" />} label="Stickers" onClick={() => { if (!isStickersOpen) closeAllPanels(); setStickersOpen(!isStickersOpen); }} isActive={isStickersOpen} />
          <ToolButton icon={<Type size={22} className="text-violet-500" />} label="Text" onClick={addText} />

          <div className="relative shrink-0 w-full flex justify-center">
            <ToolButton icon={<Shapes size={22} className="text-emerald-500" />} label="Shapes" onClick={() => { setShowShapes(!showShapes); if (!showShapes) setShowColors(false); }} isActive={showShapes} />
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

          <div className="relative shrink-0 w-full flex justify-center">
            <ToolButton icon={<Palette size={22} color={currentColor} />} label="Colors" onClick={() => { setShowColors(!showColors); if (!showColors) setShowShapes(false); }} isActive={showColors} />
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

          <div className="w-full h-px bg-slate-100 my-1 hidden md:block shrink-0" />

          <ToolButton icon={<Layers size={22} className="text-amber-500" />} label="Layers" onClick={() => { if (!isLayersOpen) closeAllPanels(); setLayersOpen(!isLayersOpen); }} isActive={isLayersOpen} />
          <ToolButton icon={<BookOpen size={22} className="text-indigo-500" />} label="Guide" onClick={() => { if (!isGuideOpen) closeAllPanels(); setGuideOpen(!isGuideOpen); }} isActive={isGuideOpen} />
          <ToolButton icon={<Trash2 size={22} className="text-rose-400" />} label="Clear" onClick={clearCanvas} />
        </aside>

      </main>
      {isOrderOptionsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOrderOptionsOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="order-options-title" className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-600">Made by you</p>
                <h2 id="order-options-title" className="text-2xl font-black tracking-tight text-slate-950">Your sticker run</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a quantity and print preference.</p>
              </div>
              <button onClick={() => setIsOrderOptionsOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Close order options">
                <CloseIcon size={20} />
              </button>
            </div>
            {!hasDesign && (
              <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Add an image, shape, or text to your canvas before adding it to your bag.</p>
            )}
            <label className="mb-2 block text-sm font-bold text-slate-700">Quantity</label>
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 p-3">
              <button onClick={() => setOrderQuantity((quantity) => Math.max(25, quantity - 25))} className="h-10 w-10 rounded-xl bg-slate-100 text-lg font-bold text-slate-800 hover:bg-slate-200" aria-label="Decrease quantity">−</button>
              <div className="text-center">
                <span className="block text-xl font-black text-slate-950">{orderQuantity}</span>
                <span className="text-xs text-slate-500">stickers</span>
              </div>
              <button onClick={() => setOrderQuantity((quantity) => Math.min(500, quantity + 25))} className="h-10 w-10 rounded-xl bg-slate-100 text-lg font-bold text-slate-800 hover:bg-slate-200" aria-label="Increase quantity">+</button>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-4">
              <label className="text-sm font-bold text-slate-700">Size preference
                <select value={stickerSize} onChange={(event) => setStickerSize(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium text-slate-800 outline-none focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100">
                  <option>2 in</option><option>3 in</option><option>4 in</option>
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">Finish preference
                <select value={stickerFinish} onChange={(event) => setStickerFinish(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium text-slate-800 outline-none focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100">
                  <option>Matte</option><option>Gloss</option>
                </select>
              </label>
            </div>
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-fuchsia-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-600">$0.50 per sticker</span>
              <span className="text-xl font-black text-fuchsia-700">${(orderQuantity * 0.5).toFixed(2)}</span>
            </div>
            <button onClick={handleAddToCart} disabled={!hasDesign} className="w-full rounded-full bg-slate-950 px-5 py-4 font-bold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-40">
              Add {orderQuantity} to bag
            </button>
            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">Print preferences are saved with your design. Payment and fulfillment setup is needed before real orders can be placed.</p>
          </section>
        </div>
      )}
    </div>
  );
}

function ToolButton({ icon, label, onClick, isActive }: { icon: React.ReactNode, label: string, onClick?: () => void, isActive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 group w-16 md:w-full px-1.5 py-1.5 md:py-2 rounded-xl transition-all relative shrink-0 ${
        isActive ? 'bg-fuchsia-50/90 text-fuchsia-600 shadow-xs' : 'hover:bg-slate-100/80 text-slate-600'
      }`}
    >
      <div className={`transition-transform duration-200 ${isActive ? 'scale-110 text-fuchsia-600' : 'group-hover:scale-110 group-hover:text-fuchsia-600'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-fuchsia-600' : 'text-slate-400 group-hover:text-fuchsia-600'}`}>{label}</span>
      {isActive && (
        <div className="absolute left-0 md:left-0 bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-full md:w-1 h-1 md:h-6 bg-fuchsia-500 rounded-t-md md:rounded-r-md" />
      )}
    </button>
  );
}
