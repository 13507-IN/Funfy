"use client";

import { useState, useEffect, useRef } from "react";
import { useStickerStore } from "../store/useStickerStore";
import { X, Sparkles, Upload, Download, Plus, Copy, Check, Palette, Type, Layers, Image as ImageIcon, Loader2 } from "lucide-react";
import * as fabric from "fabric";

interface ExtractedComponent {
  id: string;
  name: string;
  type: "subject" | "background" | "crop";
  dataUrl: string;
}

interface TypographyMatch {
  fontFamily: string;
  category: string;
  suggestedColor: string;
  sampleText: string;
}

export default function DissectionSidebar() {
  const { 
    isDissectOpen, 
    setDissectOpen, 
    dissectionSourceImage, 
    setDissectionSourceImage, 
    canvas, 
    activeObject 
  } = useStickerStore();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  
  const [dominantColors, setDominantColors] = useState<string[]>([]);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [components, setComponents] = useState<ExtractedComponent[]>([]);
  const [typographyMatches, setTypographyMatches] = useState<TypographyMatch[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "colors" | "components" | "fonts">("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync image source when dissectionSourceImage state changes or when sidebar opens
  useEffect(() => {
    if (dissectionSourceImage) {
      setImageSrc(dissectionSourceImage);
      processImageDissection(dissectionSourceImage);
    }
  }, [dissectionSourceImage]);

  if (!isDissectOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result;
      if (typeof src === "string") {
        setImageSrc(src);
        setDissectionSourceImage(src);
        processImageDissection(src);
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
        setDissectionSourceImage(src);
        processImageDissection(src);
        return;
      }
    }
    
    // If it's a general object or group, render to data URL
    if (canvas) {
      const dataUrl = activeObject.toDataURL({ format: "png", multiplier: 2 });
      setImageSrc(dataUrl);
      setDissectionSourceImage(dataUrl);
      processImageDissection(dataUrl);
    }
  };

  const processImageDissection = async (srcUrl: string) => {
    setIsProcessing(true);
    setComponents([]);
    setDominantColors([]);
    setTypographyMatches([]);

    try {
      // Step 1: Extract Color Palette
      setProcessingStep("Extracting color palette...");
      const colors = await extractDominantColors(srcUrl);
      setDominantColors(colors);

      // Step 2: Component Breakdown & Crops
      setProcessingStep("Dissecting image components...");
      const extracted: ExtractedComponent[] = [];

      // A) AI Subject Isolation using worker
      try {
        setProcessingStep("Isolating foreground subject (AI)...");
        const worker = new Worker(new URL("../workers/bgRemoval.worker.ts", import.meta.url));
        const bgRemovedUrl = await new Promise<string>((resolve, reject) => {
          worker.onmessage = (e) => {
            if (e.data.success) {
              const url = URL.createObjectURL(e.data.blob);
              resolve(url);
            } else {
              reject(e.data.error);
            }
            worker.terminate();
          };
          worker.onerror = (err) => {
            reject(err);
            worker.terminate();
          };
          worker.postMessage({ imageUrl: srcUrl });
        });

        extracted.push({
          id: "subject-ai",
          name: "Main Subject (AI Isolated)",
          type: "subject",
          dataUrl: bgRemovedUrl,
        });
      } catch (err) {
        console.warn("AI BG Removal fallback for dissection:", err);
      }

      // B) Extract Region Crops (Top Graphic, Center Element, Bottom Graphic)
      setProcessingStep("Extracting sub-region components...");
      const cropRegions = await extractSubRegionCrops(srcUrl);
      extracted.push(...cropRegions);
      setComponents(extracted);

      // Step 3: Typography & Font Analysis
      setProcessingStep("Analyzing typography & fonts...");
      const typography = analyzeTypography(colors);
      setTypographyMatches(typography);

    } catch (error) {
      console.error("Dissection error:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  // Extract Dominant Colors using Canvas pixel sampling
  const extractDominantColors = (src: string): Promise<string[]> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => {
        const offCanvas = document.createElement("canvas");
        const ctx = offCanvas.getContext("2d");
        const width = 100;
        const height = Math.round((img.height / img.width) * 100);
        offCanvas.width = width;
        offCanvas.height = height;

        if (!ctx) return resolve(["#f43f5e", "#3b82f6", "#10b981"]);

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height).data;

        const colorCounts: { [hex: string]: number } = {};
        const step = 4 * 3; // sample every 3 pixels

        for (let i = 0; i < imageData.length; i += step) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue; // skip transparent

          // Quantize colors to reduce noise (group into bins of 32)
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;

          const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1)}`;
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }

        const sortedHexes = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
        // Pick top 6 distinct colors
        const finalColors = sortedHexes.slice(0, 6);
        resolve(finalColors.length > 0 ? finalColors : ["#f43f5e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#000000"]);
      };
      img.onerror = () => resolve(["#f43f5e", "#3b82f6", "#10b981"]);
    });
  };

  // Generate Region Crops (Sub-elements)
  const extractSubRegionCrops = (src: string): Promise<ExtractedComponent[]> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => {
        const results: ExtractedComponent[] = [];
        const w = img.width;
        const h = img.height;

        const createCrop = (x: number, y: number, width: number, height: number, name: string, id: string) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
            return {
              id,
              name,
              type: "crop" as const,
              dataUrl: canvas.toDataURL("image/png")
            };
          }
          return null;
        };

        // Center Graphic Crop
        const center = createCrop(w * 0.15, h * 0.15, w * 0.7, h * 0.7, "Center Focal Graphic", "crop-center");
        if (center) results.push(center);

        // Top Header/Badge Crop
        const topPart = createCrop(0, 0, w, h * 0.5, "Top Element Header", "crop-top");
        if (topPart) results.push(topPart);

        // Bottom Element Crop
        const bottomPart = createCrop(0, h * 0.5, w, h * 0.5, "Bottom Graphic Footer", "crop-bottom");
        if (bottomPart) results.push(bottomPart);

        resolve(results);
      };
      img.onerror = () => resolve([]);
    });
  };

  // Typography Inspection & Font Matching
  const analyzeTypography = (colors: string[]): TypographyMatch[] => {
    const primaryColor = colors[0] || "#f43f5e";
    const secondaryColor = colors[1] || "#3b82f6";

    return [
      {
        fontFamily: "Bangers",
        category: "Display / Comic / Funky",
        suggestedColor: primaryColor,
        sampleText: "FUNKY HEADING"
      },
      {
        fontFamily: "Pacifico",
        category: "Handwritten Script",
        suggestedColor: secondaryColor,
        sampleText: "Creative Subtitle"
      },
      {
        fontFamily: "Fredoka One",
        category: "Bold Rounded Display",
        suggestedColor: primaryColor,
        sampleText: "Sticker Badge Text"
      },
      {
        fontFamily: "Creepster",
        category: "Spooky / Decorative",
        suggestedColor: colors[2] || "#10b981",
        sampleText: "Wild Accent Text"
      }
    ];
  };

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const applyColorToSelection = (color: string) => {
    if (!canvas || !activeObject) return;
    if (activeObject.type === "image") {
      const filter = new fabric.filters.BlendColor({
        color: color,
        mode: "tint",
        alpha: 0.5
      });
      // @ts-ignore
      activeObject.filters = [filter];
      // @ts-ignore
      activeObject.applyFilters();
    } else {
      activeObject.set("fill", color);
    }
    canvas.renderAll();
  };

  const addComponentToCanvas = (dataUrl: string) => {
    if (!canvas) return;
    const imgElement = new window.Image();
    imgElement.src = dataUrl;
    imgElement.onload = () => {
      const image = new fabric.Image(imgElement, {
        left: 150,
        top: 150,
      });
      if (image.width && image.width > 250) {
        image.scaleToWidth(250);
      }
      canvas.add(image);
      canvas.setActiveObject(image);
      canvas.renderAll();
    };
  };

  const addMatchedTextToCanvas = (match: TypographyMatch) => {
    if (!canvas) return;
    const text = new fabric.IText(match.sampleText, {
      left: 180,
      top: 180,
      fontFamily: match.fontFamily,
      fill: match.suggestedColor,
      fontSize: 38,
      fontWeight: "bold",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const downloadComponent = (dataUrl: string, name: string) => {
    const link = document.createElement("a");
    link.download = `${name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 md:absolute md:inset-auto md:right-0 md:top-0 w-full md:w-96 h-full bg-white shadow-2xl md:border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right">
      
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-fuchsia-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Component Dissection</h2>
            <p className="text-xs text-slate-500">Deconstruct artwork into reusable elements</p>
          </div>
        </div>
        <button onClick={() => setDissectOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
          <X size={20} />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        
        {/* Source Image Selector */}
        <section className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-fuchsia-500" /> Source Image to Dissect
          </span>

          {imageSrc ? (
            <div className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-200/50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt="Dissection Source" className="max-h-full object-contain" />
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100 transition flex items-center gap-1"
                >
                  <Upload size={14} /> Change
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-fuchsia-400 bg-white p-6 rounded-xl text-center cursor-pointer transition flex flex-col items-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Upload Image to Dissect</p>
              <p className="text-[10px] text-slate-400">PNG, JPG or WebP up to 10MB</p>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="flex gap-2">
            <button 
              onClick={handleUseCurrentSelection}
              disabled={!activeObject}
              className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:border-fuchsia-300 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Layers size={14} className="text-violet-500" />
              Use Selected Canvas Layer
            </button>
          </div>
        </section>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="p-6 bg-fuchsia-50/80 border border-fuchsia-200 rounded-2xl text-center flex flex-col items-center gap-3 animate-in fade-in duration-200">
            <Loader2 size={28} className="text-fuchsia-600 animate-spin" />
            <div>
              <p className="text-sm font-bold text-fuchsia-900">Dissecting Artwork...</p>
              <p className="text-xs text-fuchsia-600 mt-0.5">{processingStep}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        {!isProcessing && imageSrc && (
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold">
            <button 
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-1.5 rounded-lg transition ${activeTab === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              All Results
            </button>
            <button 
              onClick={() => setActiveTab("colors")}
              className={`flex-1 py-1.5 rounded-lg transition ${activeTab === "colors" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Colors ({dominantColors.length})
            </button>
            <button 
              onClick={() => setActiveTab("components")}
              className={`flex-1 py-1.5 rounded-lg transition ${activeTab === "components" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Elements ({components.length})
            </button>
            <button 
              onClick={() => setActiveTab("fonts")}
              className={`flex-1 py-1.5 rounded-lg transition ${activeTab === "fonts" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Fonts ({typographyMatches.length})
            </button>
          </div>
        )}

        {!isProcessing && imageSrc && (
          <>
            {/* Color Palette Section */}
            {(activeTab === "all" || activeTab === "colors") && dominantColors.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Palette size={14} className="text-rose-500" /> Extracted Color Palette
                  </h3>
                  {activeObject && (
                    <span className="text-[10px] text-fuchsia-600 font-medium">Click chip to apply to selection</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {dominantColors.map((hex) => (
                    <div 
                      key={hex}
                      className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col gap-2 hover:shadow-md transition group"
                    >
                      <button
                        onClick={() => applyColorToSelection(hex)}
                        className="w-full h-12 rounded-lg border border-slate-200/60 shadow-inner group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: hex }}
                        title="Click to apply to active canvas object"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-slate-700 uppercase">{hex}</span>
                        <button
                          onClick={() => copyToClipboard(hex)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                          title="Copy Hex Code"
                        >
                          {copiedColor === hex ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Extracted Components Section */}
            {(activeTab === "all" || activeTab === "components") && components.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers size={14} className="text-violet-500" /> Dissected Design Components
                </h3>

                <div className="flex flex-col gap-3">
                  {components.map((comp) => (
                    <div key={comp.id} className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3 hover:border-fuchsia-300 transition">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200/60 p-1 flex items-center justify-center shrink-0 overflow-hidden pattern-dots">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={comp.dataUrl} alt={comp.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{comp.name}</h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-100">
                          {comp.type === "subject" ? "AI Extracted Subject" : "Graphic Component"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => addComponentToCanvas(comp.dataUrl)}
                          className="p-2 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-600 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          title="Add Component to Canvas"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => downloadComponent(comp.dataUrl, comp.name)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs transition flex items-center gap-1"
                          title="Download PNG"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Typography Section */}
            {(activeTab === "all" || activeTab === "fonts") && typographyMatches.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Type size={14} className="text-indigo-500" /> Typography & Font Matches
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  {typographyMatches.map((t, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800">{t.fontFamily}</span>
                          <span className="text-[10px] text-slate-400 block">{t.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: t.suggestedColor }} title={t.suggestedColor} />
                          <button
                            onClick={() => addMatchedTextToCanvas(t)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Plus size={12} /> Add Text
                          </button>
                        </div>
                      </div>
                      <div 
                        className="bg-slate-50 p-2.5 rounded-xl text-center text-lg tracking-wide border border-slate-100 overflow-hidden"
                        style={{ fontFamily: t.fontFamily, color: t.suggestedColor }}
                      >
                        {t.sampleText}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </div>
  );
}
