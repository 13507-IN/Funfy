"use client";

import { useStickerStore } from "../store/useStickerStore";
import { X, Layers, Image as ImageIcon, Type, Shapes, ArrowUp, ArrowDown, Lock, Unlock, Trash2 } from "lucide-react";
import * as fabric from "fabric";
import { useEffect, useState } from "react";

export default function LayersSidebar() {
  const { isLayersOpen, setLayersOpen, canvas, activeObject } = useStickerStore();
  const [objects, setObjects] = useState<fabric.FabricObject[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    if (!canvas) return;

    const updateLayers = () => {
      // Exclude grid lines (which have excludeFromExport set to true)
      const validObjects = canvas.getObjects().filter(obj => !obj.excludeFromExport);
      setObjects([...validObjects]);
    };

    updateLayers();

    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);
    canvas.on('object:modified', updateLayers);
    // Also update when stacking order changes or active object changes
    canvas.on('selection:created', updateLayers);
    canvas.on('selection:updated', updateLayers);
    canvas.on('selection:cleared', updateLayers);

    return () => {
      canvas.off('object:added', updateLayers);
      canvas.off('object:removed', updateLayers);
      canvas.off('object:modified', updateLayers);
      canvas.off('selection:created', updateLayers);
      canvas.off('selection:updated', updateLayers);
      canvas.off('selection:cleared', updateLayers);
    };
  }, [canvas, updateTrigger]);

  if (!isLayersOpen) return null;

  const moveUp = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    if (!canvas) return;
    canvas.bringObjectForward(obj);
    canvas.renderAll();
    setUpdateTrigger(prev => prev + 1); // Force re-render
  };

  const moveDown = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    if (!canvas) return;
    canvas.sendObjectBackwards(obj);
    canvas.renderAll();
    setUpdateTrigger(prev => prev + 1);
  };

  const toggleLock = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    if (!canvas) return;
    
    // @ts-ignore
    const isLocked = obj.selectable === false;
    
    obj.set({
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
    setUpdateTrigger(prev => prev + 1);
  };

  const deleteObject = (e: React.MouseEvent, obj: fabric.FabricObject) => {
    e.stopPropagation();
    if (!canvas) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const selectObject = (obj: fabric.FabricObject) => {
    if (!canvas) return;
    // @ts-ignore
    if (obj.selectable === false) return; // Don't select locked objects
    canvas.setActiveObject(obj);
    canvas.renderAll();
  };

  return (
    <div className="fixed inset-0 md:absolute md:inset-auto md:right-0 md:top-0 w-full md:w-80 h-full bg-white shadow-2xl md:border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right">
      <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Layers size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Layers</h2>
        </div>
        <button onClick={() => setLayersOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {objects.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-sm">
            No objects on the canvas
          </div>
        ) : (
          [...objects].reverse().map((obj, i) => {
            const isSelected = activeObject === obj;
            // @ts-ignore
            const isLocked = obj.selectable === false;
            
            let Icon = Shapes;
            let name = "Shape";
            
            if (obj.type === 'i-text' || obj.type === 'text') {
              Icon = Type;
              // @ts-ignore
              name = obj.text ? `Text: "${obj.text.substring(0, 10)}${obj.text.length > 10 ? '...' : ''}"` : "Text";
            } else if (obj.type === 'image') {
              Icon = ImageIcon;
              name = "Image";
            } else if (obj.type === 'circle') name = "Circle";
            else if (obj.type === 'rect') name = "Rectangle";
            else if (obj.type === 'triangle') name = "Triangle";

            return (
              <div 
                key={i}
                onClick={() => selectObject(obj)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : isLocked 
                      ? 'bg-slate-50 border-slate-100 opacity-75' 
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => moveUp(e, obj)} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition" title="Bring Forward">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={(e) => moveDown(e, obj)} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition" title="Send Backward">
                    <ArrowDown size={14} />
                  </button>
                  <button onClick={(e) => toggleLock(e, obj)} className={`p-1.5 hover:bg-slate-200 rounded-md transition ${isLocked ? 'text-rose-500' : 'text-slate-400 hover:text-slate-700'}`} title="Toggle Lock">
                    {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button onClick={(e) => deleteObject(e, obj)} className="p-1.5 hover:bg-rose-100 rounded-md text-slate-400 hover:text-rose-600 transition" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
