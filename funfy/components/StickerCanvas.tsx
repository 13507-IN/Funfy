"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useStickerStore } from "../store/useStickerStore";

export default function StickerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setCanvas = useStickerStore((state) => state.setCanvas);
  const setActiveObject = useStickerStore((state) => state.setActiveObject);

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

    const STORAGE_KEY = "funfy_canvas_state";
    const EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

    const saveCanvasState = () => {
      const state = {
        data: fabricCanvas.toJSON(),
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    };

    const loadCanvasState = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const state = JSON.parse(saved);
          if (Date.now() - state.timestamp < EXPIRY_TIME) {
            await fabricCanvas.loadFromJSON(state.data);
            fabricCanvas.requestRenderAll();
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error("Failed to load canvas state", err);
      }
    };

    loadCanvasState();

    fabricCanvas.on('object:added', saveCanvasState);
    fabricCanvas.on('object:modified', saveCanvasState);
    fabricCanvas.on('object:removed', saveCanvasState);

    let clipboard: fabric.FabricObject | null = null;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'c') {
          const activeObject = fabricCanvas.getActiveObject();
          if (activeObject) {
            try {
              clipboard = await activeObject.clone();
            } catch (err) {
              console.error("Failed to copy", err);
            }
          }
        } else if (e.key.toLowerCase() === 'v') {
          if (!clipboard) return;
          try {
            const clonedObj = await clipboard.clone();
            fabricCanvas.discardActiveObject();
            
            clonedObj.set({
              left: (clonedObj.left || 0) + 20,
              top: (clonedObj.top || 0) + 20,
              evented: true,
            });

            if (clonedObj.type === 'activeSelection') {
              clonedObj.canvas = fabricCanvas;
              // @ts-ignore
              clonedObj.forEachObject((obj) => {
                fabricCanvas.add(obj);
              });
              clonedObj.setCoords();
            } else {
              fabricCanvas.add(clonedObj);
            }
            
            // Shift clipboard slightly so next paste moves again
            clipboard.top = (clipboard.top || 0) + 20;
            clipboard.left = (clipboard.left || 0) + 20;
            
            fabricCanvas.setActiveObject(clonedObj);
            fabricCanvas.requestRenderAll();
          } catch (err) {
            console.error("Failed to paste", err);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    fabricCanvas.on('selection:created', (e) => {
      setActiveObject(e.selected ? e.selected[0] : null);
    });
    fabricCanvas.on('selection:updated', (e) => {
      setActiveObject(e.selected ? e.selected[0] : null);
    });
    fabricCanvas.on('selection:cleared', () => {
      setActiveObject(null);
    });

    // Clean up on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      fabricCanvas.dispose();
      setCanvas(null);
      setActiveObject(null);
    };
  }, [setCanvas, setActiveObject]);

  return (
    <div className="w-[500px] h-[500px] bg-white rounded-2xl shadow-xl border border-slate-200 relative group overflow-hidden">
      {/* Background hint (only visible when canvas is empty, managed by React for simplicity or fabric for accuracy) */}
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
    </div>
  );
}
