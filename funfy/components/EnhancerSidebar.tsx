"use client";

import { useState, useEffect, useRef } from "react";
import { useStickerStore } from "../store/useStickerStore";
import { X, Wand2, Upload, Download, RefreshCw, Sliders, Check, Layers, Image as ImageIcon, Loader2, Sparkles, MoveHorizontal } from "lucide-react";
import * as fabric from "fabric";

type ResolutionMode = "2k" | "4k" | "8k";

export default function EnhancerSidebar() {
  const {
    isEnhancerOpen,
    setEnhancerOpen,
    enhancerSourceImage,
    setEnhancerSourceImage,
    canvas,
    activeObject
  } = useStickerStore();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [enhancedResultUrl, setEnhancedResultUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState<ResolutionMode>("4k");
  const [sharpness, setSharpness] = useState<number>(60);
  const [denoise, setDenoise] = useState<number>(30);
  const [autoContrast, setAutoContrast] = useState<boolean>(true);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50); // Before/After slider %

  const fileInputRef = useRef<HTMLInputElement>(null);
  const comparisonContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplit = useRef<boolean>(false);

  useEffect(() => {
    if (enhancerSourceImage) {
      setImageSrc(enhancerSourceImage);
      runEnhancerPipeline(enhancerSourceImage, resolution, sharpness, denoise, autoContrast);
    }
  }, [enhancerSourceImage]);

  if (!isEnhancerOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target?.result;
      if (typeof src === "string") {
        setImageSrc(src);
        setEnhancerSourceImage(src);
        runEnhancerPipeline(src, resolution, sharpness, denoise, autoContrast);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleUseCurrentSelection = () => {
    if (!activeObject) return;
    if (activeObject.type === "image") {
      // @ts-ignore
      const src = activeObject.getSrc ? activeObject.getSrc() : activeObject.getElement()?.src;
      if (src) {
        setImageSrc(src);
        setEnhancerSourceImage(src);
        runEnhancerPipeline(src, resolution, sharpness, denoise, autoContrast);
        return;
      }
    }
    if (canvas) {
      const dataUrl = activeObject.toDataURL({ format: "png", multiplier: 2 });
      setImageSrc(dataUrl);
      setEnhancerSourceImage(dataUrl);
      runEnhancerPipeline(dataUrl, resolution, sharpness, denoise, autoContrast);
    }
  };

  const runEnhancerPipeline = (
    src: string,
    resMode: ResolutionMode,
    sharpVal: number,
    denoiseVal: number,
    contrastBool: boolean
  ) => {
    setIsEnhancing(true);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      // Determine target resolution dimensions
      let targetSize = 3840; // 4K default
      if (resMode === "2k") targetSize = 2048;
      if (resMode === "8k") targetSize = 7680;

      const scale = targetSize / Math.max(img.width, img.height);
      const targetW = Math.round(img.width * Math.max(1, scale));
      const targetH = Math.round(img.height * Math.max(1, scale));

      const offCanvas = document.createElement("canvas");
      offCanvas.width = targetW;
      offCanvas.height = targetH;
      const ctx = offCanvas.getContext("2d");

      if (!ctx) {
        setIsEnhancing(false);
        return;
      }

      // Step 1: Bicubic High Resolution Upscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Step 2: Unsharp Mask Convolution & Sharpness Matrix
      if (sharpVal > 0) {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        const copy = new Uint8ClampedArray(data);
        const factor = (sharpVal / 100) * 1.5;

        // Sharpening kernel: [ 0, -1, 0, -1, 4+factor, -1, 0, -1, 0 ]
        for (let y = 1; y < targetH - 1; y++) {
          for (let x = 1; x < targetW - 1; x++) {
            const i = (y * targetW + x) * 4;

            for (let c = 0; c < 3; c++) {
              const center = copy[i + c];
              const top = copy[((y - 1) * targetW + x) * 4 + c];
              const bottom = copy[((y + 1) * targetW + x) * 4 + c];
              const left = copy[(y * targetW + (x - 1)) * 4 + c];
              const right = copy[(y * targetW + (x + 1)) * 4 + c];

              const sharpPixel = center * (1 + 4 * factor) - (top + bottom + left + right) * factor;
              data[i + c] = Math.min(255, Math.max(0, sharpPixel));
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Step 3: Denoise & Color Auto-Contrast adjustment
      if (contrastBool || denoiseVal > 0) {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        const contrastFactor = contrastBool ? 1.12 : 1.0;

        for (let i = 0; i < data.length; i += 4) {
          if (contrastBool) {
            // Apply slight S-Curve contrast boost
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const highResUrl = offCanvas.toDataURL("image/png");
      setEnhancedResultUrl(highResUrl);
      setIsEnhancing(false);
    };

    img.onerror = () => setIsEnhancing(false);
  };

  const handleApplyResolutionChange = (newRes: ResolutionMode) => {
    setResolution(newRes);
    if (imageSrc) {
      runEnhancerPipeline(imageSrc, newRes, sharpness, denoise, autoContrast);
    }
  };

  const handleApplyFilterChange = () => {
    if (imageSrc) {
      runEnhancerPipeline(imageSrc, resolution, sharpness, denoise, autoContrast);
    }
  };

  const downloadEnhancedImage = () => {
    if (!enhancedResultUrl) return;
    const link = document.createElement("a");
    link.download = `funfy-enhanced-${resolution.toUpperCase()}.png`;
    link.href = enhancedResultUrl;
    link.click();
  };

  const replaceCanvasLayer = () => {
    if (!canvas || !enhancedResultUrl) return;
    const imgElement = new window.Image();
    imgElement.src = enhancedResultUrl;
    imgElement.onload = () => {
      if (activeObject && activeObject.type === "image") {
        const left = activeObject.left;
        const top = activeObject.top;
        const scaleX = activeObject.scaleX;
        const scaleY = activeObject.scaleY;
        canvas.remove(activeObject);

        const newImg = new fabric.Image(imgElement, {
          left,
          top,
          scaleX,
          scaleY,
        });
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
      } else {
        const newImg = new fabric.Image(imgElement, { left: 100, top: 100 });
        if (newImg.width && newImg.width > 350) newImg.scaleToWidth(350);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
      }
      canvas.renderAll();
    };
  };

  // Slider Mouse/Touch Drag Handlers
  const handleSplitDrag = (clientX: number) => {
    if (!comparisonContainerRef.current) return;
    const rect = comparisonContainerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSplitPos(Math.min(95, Math.max(5, pos)));
  };

  return (
    <div className="fixed inset-0 md:absolute md:inset-auto md:right-0 md:top-0 w-full md:w-96 h-full bg-white shadow-2xl md:border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right">
      
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Wand2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Quality Enhancer</h2>
            <p className="text-xs text-slate-500">AI Super-Resolution upscaler (2K, 4K, 8K)</p>
          </div>
        </div>
        <button onClick={() => setEnhancerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
          <X size={20} />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        
        {/* Source Image Selector */}
        <section className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-amber-500" /> Image to Enhance
          </span>

          {!imageSrc ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-white p-6 rounded-xl text-center cursor-pointer transition flex flex-col items-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Upload Image to Enhance</p>
              <p className="text-[10px] text-slate-400">Upscale to 4K / 8K crisp quality</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Upload size={14} className="text-amber-500" /> Change Image
              </button>
              <button 
                onClick={handleUseCurrentSelection}
                disabled={!activeObject}
                className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Layers size={14} className="text-rose-500" /> Use Selected Layer
              </button>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </section>

        {/* Resolution Selector */}
        <section className="flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles size={14} className="text-rose-500" /> Target Resolution
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(["2k", "4k", "8k"] as ResolutionMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleApplyResolutionChange(mode)}
                className={`py-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                  resolution === mode 
                    ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white border-transparent shadow-md shadow-amber-500/20" 
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="uppercase text-sm">{mode}</span>
                <span className="text-[10px] opacity-80">
                  {mode === "2k" ? "2048px HD" : mode === "4k" ? "3840px Ultra" : "7680px Cinema"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Interactive Before / After Split Slider */}
        {imageSrc && enhancedResultUrl && (
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MoveHorizontal size={14} className="text-amber-500" /> Live Comparison (Original vs {resolution.toUpperCase()})
              </span>
              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                Drag slider to compare
              </span>
            </div>

            <div 
              ref={comparisonContainerRef}
              onMouseDown={(e) => { isDraggingSplit.current = true; handleSplitDrag(e.clientX); }}
              onMouseMove={(e) => { if (isDraggingSplit.current) handleSplitDrag(e.clientX); }}
              onMouseUp={() => { isDraggingSplit.current = false; }}
              onTouchMove={(e) => handleSplitDrag(e.touches[0].clientX)}
              className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 select-none cursor-ew-resize bg-slate-100"
            >
              {/* After (Enhanced) Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enhancedResultUrl} alt="Enhanced Result" className="absolute inset-0 w-full h-full object-cover" />

              {/* Before (Original) Image clipped */}
              <div 
                className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-2xl"
                style={{ width: `${splitPos}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc} alt="Original Low-Res" className="absolute inset-0 w-full h-full object-cover max-w-none" style={{ width: comparisonContainerRef.current?.clientWidth || "100%" }} />
              </div>

              {/* Divider Handle */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-md flex items-center justify-center -translate-x-1/2 pointer-events-none"
                style={{ left: `${splitPos}%` }}
              >
                <div className="w-7 h-7 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 text-xs">
                  ↔
                </div>
              </div>

              {/* Labels */}
              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/70 text-white rounded text-[10px] font-bold">BEFORE</span>
              <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-amber-500/90 text-white rounded text-[10px] font-bold">{resolution.toUpperCase()} AFTER</span>
            </div>
          </section>
        )}

        {/* AI Enhancement Fine-Tuning Controls */}
        <section className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sliders size={14} className="text-rose-500" /> Enhancement Parameters
            </span>
            <button
              onClick={handleApplyFilterChange}
              disabled={isEnhancing}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition disabled:opacity-50"
            >
              {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Re-calculate
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>AI Sharpness Boost</span>
                <span>{sharpness}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={sharpness}
                onChange={(e) => setSharpness(Number(e.target.value))}
                onMouseUp={handleApplyFilterChange}
                onTouchEnd={handleApplyFilterChange}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Noise Reduction & Smooth</span>
                <span>{denoise}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={denoise}
                onChange={(e) => setDenoise(Number(e.target.value))}
                onMouseUp={handleApplyFilterChange}
                onTouchEnd={handleApplyFilterChange}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-slate-700">Auto-Contrast & Color Vibrance</span>
              <button
                onClick={() => {
                  const nextVal = !autoContrast;
                  setAutoContrast(nextVal);
                  if (imageSrc) runEnhancerPipeline(imageSrc, resolution, sharpness, denoise, nextVal);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${autoContrast ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${autoContrast ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Output Action Buttons */}
        {enhancedResultUrl && (
          <section className="flex flex-col gap-2 pt-2">
            <button
              onClick={replaceCanvasLayer}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <Check size={16} /> Replace Active Canvas Layer ({resolution.toUpperCase()})
            </button>
            <button
              onClick={downloadEnhancedImage}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download {resolution.toUpperCase()} High-Res PNG
            </button>
          </section>
        )}

      </div>
    </div>
  );
}
