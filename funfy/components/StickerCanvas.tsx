"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useStickerStore } from "../store/useStickerStore";

export default function StickerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setCanvas = useStickerStore((state) => state.setCanvas);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Fabric canvas
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true, // Keep objects in their layer when selected
    });

    setCanvas(fabricCanvas);

    // Clean up on unmount
    return () => {
      fabricCanvas.dispose();
      setCanvas(null as any);
    };
  }, [setCanvas]);

  return (
    <div className="w-[500px] h-[500px] bg-white rounded-2xl shadow-xl border border-slate-200 relative group overflow-hidden">
      {/* Background hint (only visible when canvas is empty, managed by React for simplicity or fabric for accuracy) */}
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
    </div>
  );
}
