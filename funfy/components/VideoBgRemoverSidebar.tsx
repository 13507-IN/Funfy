"use client";

import { useState, useEffect, useRef } from "react";
import { useStickerStore } from "../store/useStickerStore";
import { X, Video, Upload, Download, Play, Pause, RefreshCw, Sliders, Check, Layers, Image as ImageIcon, Sparkles, Pipette } from "lucide-react";
import * as fabric from "fabric";

export default function VideoBgRemoverSidebar() {
  const {
    isVideoBgOpen,
    setVideoBgOpen,
    canvas,
  } = useStickerStore();

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [keyColor, setKeyColor] = useState<string>("#00FF00"); // Default Green Screen
  const [tolerance, setTolerance] = useState<number>(40);
  const [feather, setFeather] = useState<number>(20);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasOutputRef = useRef<HTMLCanvasElement>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!isVideoBgOpen) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (videoRef.current) videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isVideoBgOpen]);

  if (!isVideoBgOpen) return null;

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setIsPlaying(false);
    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
  };

  // Convert hex color to RGB object
  const hexToRgb = (hex: string) => {
    let cleaned = hex.replace("#", "");
    if (cleaned.length === 3) {
      cleaned = cleaned.split("").map((c) => c + c).join("");
    }
    const num = parseInt(cleaned, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  // Real-time canvas frame keying pipeline
  const processVideoFrame = () => {
    const video = videoRef.current;
    const canvasOut = canvasOutputRef.current;
    if (!video || !canvasOut) return;

    if (video.paused || video.ended) return;

    const ctx = canvasOut.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (canvasOut.width !== video.videoWidth && video.videoWidth > 0) {
      canvasOut.width = video.videoWidth;
      canvasOut.height = video.videoHeight;
    }

    if (canvasOut.width > 0 && canvasOut.height > 0) {
      ctx.drawImage(video, 0, 0, canvasOut.width, canvasOut.height);
      const frameData = ctx.getImageData(0, 0, canvasOut.width, canvasOut.height);
      const data = frameData.data;

      const targetRgb = hexToRgb(keyColor);
      const tolDist = (tolerance / 100) * 255;
      const featherDist = (feather / 100) * 100;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Euclidean color distance in RGB space
        const dist = Math.sqrt(
          Math.pow(r - targetRgb.r, 2) +
          Math.pow(g - targetRgb.g, 2) +
          Math.pow(b - targetRgb.b, 2)
        );

        if (dist < tolDist) {
          // Complete removal
          data[i + 3] = 0;
        } else if (dist < tolDist + featherDist) {
          // Feathered smooth transparency edge
          const alpha = ((dist - tolDist) / featherDist) * 255;
          data[i + 3] = Math.round(alpha);
        }
      }

      ctx.putImageData(frameData, 0, 0);
    }

    animFrameId.current = requestAnimationFrame(processVideoFrame);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        processVideoFrame();
      }).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    }
  };

  const addKeyedFrameToCanvas = () => {
    const canvasOut = canvasOutputRef.current;
    if (!canvasOut || !canvas) return;

    const dataUrl = canvasOut.toDataURL("image/png");
    const imgElement = new window.Image();
    imgElement.src = dataUrl;
    imgElement.onload = () => {
      const newImg = new fabric.Image(imgElement, { left: 150, top: 150 });
      if (newImg.width && newImg.width > 300) newImg.scaleToWidth(300);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.renderAll();
    };
  };

  const downloadTransparentWebM = () => {
    const canvasOut = canvasOutputRef.current;
    const video = videoRef.current;
    if (!canvasOut || !video) return;

    setIsRecording(true);
    const stream = canvasOut.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = "funfy-transparent-video.webm";
      a.href = url;
      a.click();
      setIsRecording(false);
    };

    video.currentTime = 0;
    video.play().then(() => {
      setIsPlaying(true);
      recorder.start();
      processVideoFrame();

      const checkEnd = setInterval(() => {
        if (video.ended || video.paused) {
          recorder.stop();
          clearInterval(checkEnd);
        }
      }, 200);
    });
  };

  return (
    <div className="fixed inset-0 md:absolute md:inset-auto md:right-0 md:top-0 w-full md:w-96 h-full bg-white shadow-2xl md:border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right">
      
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Video size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Video BG Remover</h2>
            <p className="text-xs text-slate-500">Remove video backgrounds in real time</p>
          </div>
        </div>
        <button onClick={() => setVideoBgOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
          <X size={20} />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        
        {/* Source Video Input */}
        <section className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Video size={14} className="text-emerald-500" /> Source Video File
          </span>

          {!videoSrc ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-white p-6 rounded-xl text-center cursor-pointer transition flex flex-col items-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Upload Video (MP4, WebM, GIF)</p>
              <p className="text-[10px] text-slate-400">Green screen or solid backdrops</p>
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Upload size={14} className="text-emerald-500" /> Change Video
            </button>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleVideoUpload} 
            accept="video/*" 
            className="hidden" 
          />
        </section>

        {/* Live Transparent Video Player Preview */}
        {videoSrc && (
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-500" /> Live Transparent Video Preview
              </span>
              <button
                onClick={togglePlay}
                className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />} {isPlaying ? "Pause" : "Play"}
              </button>
            </div>

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 pattern-dots bg-slate-100 flex items-center justify-center">
              {/* Hidden HTML5 Video element */}
              <video 
                ref={videoRef}
                src={videoSrc}
                loop
                playsInline
                muted
                onLoadedMetadata={() => {
                  if (canvasOutputRef.current && videoRef.current) {
                    canvasOutputRef.current.width = videoRef.current.videoWidth;
                    canvasOutputRef.current.height = videoRef.current.videoHeight;
                  }
                }}
                className="hidden"
              />

              {/* Transparent Keyed Output Canvas */}
              <canvas ref={canvasOutputRef} className="w-full h-full object-contain" />
            </div>
          </section>
        )}

        {/* Keying & Removal Parameters */}
        {videoSrc && (
          <section className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sliders size={14} className="text-emerald-500" /> Background Removal Keying
            </span>

            {/* Key Color Swatches */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-700">Target Background Color</span>
              <div className="flex items-center gap-2">
                {[
                  { name: "Green Screen", hex: "#00FF00" },
                  { name: "Blue Screen", hex: "#0000FF" },
                  { name: "White Studio", hex: "#FFFFFF" },
                  { name: "Black Studio", hex: "#000000" }
                ].map((preset) => (
                  <button
                    key={preset.hex}
                    onClick={() => {
                      setKeyColor(preset.hex);
                      if (isPlaying) processVideoFrame();
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform shadow-sm ${
                      keyColor.toLowerCase() === preset.hex.toLowerCase() ? "border-slate-800 scale-110" : "border-slate-200 hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                  />
                ))}
                
                <div className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 ml-auto">
                  <input 
                    type="color" 
                    value={keyColor}
                    onChange={(e) => {
                      setKeyColor(e.target.value);
                      if (isPlaying) processVideoFrame();
                    }}
                    className="absolute -top-2 -left-2 w-11 h-11 cursor-pointer"
                    title="Custom Key Color"
                  />
                </div>
              </div>
            </div>

            {/* Tolerance Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Color Key Tolerance</span>
                <span>{tolerance}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="90" 
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                onMouseUp={() => { if (isPlaying) processVideoFrame(); }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Edge Feathering Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Edge Smoothness & Feather</span>
                <span>{feather}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="50" 
                value={feather}
                onChange={(e) => setFeather(Number(e.target.value))}
                onMouseUp={() => { if (isPlaying) processVideoFrame(); }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </section>
        )}

        {/* Output Action Buttons */}
        {videoSrc && (
          <section className="flex flex-col gap-2 pt-2">
            <button
              onClick={addKeyedFrameToCanvas}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <Check size={16} /> Add Keyed Frame Layer to Canvas
            </button>
            <button
              onClick={downloadTransparentWebM}
              disabled={isRecording}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={16} /> {isRecording ? "Recording WebM..." : "Download Transparent WebM Video"}
            </button>
          </section>
        )}

      </div>
    </div>
  );
}
