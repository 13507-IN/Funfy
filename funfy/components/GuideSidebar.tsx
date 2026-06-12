"use client";

import { useStickerStore } from "../store/useStickerStore";
import { X, BookOpen, Grid3x3, Grid } from "lucide-react";
import * as fabric from "fabric";
import { useEffect, useRef } from "react";

export default function GuideSidebar() {
  const { isGuideOpen, setGuideOpen, canvas, guideState, setGuideState } = useStickerStore();
  const ruleOfThirdsLinesRef = useRef<fabric.Line[]>([]);

  // Rule of Thirds logic
  useEffect(() => {
    if (!canvas) return;

    if (guideState.ruleOfThirds) {
      const width = canvas.width || 500;
      const height = canvas.height || 500;
      
      const lineOpts = {
        stroke: 'rgba(236, 72, 153, 0.5)', // pink-500 with opacity
        strokeWidth: 2,
        selectable: false,
        evented: false,
        excludeFromExport: true
      };

      const lines = [
        new fabric.Line([width / 3, 0, width / 3, height], lineOpts),
        new fabric.Line([2 * width / 3, 0, 2 * width / 3, height], lineOpts),
        new fabric.Line([0, height / 3, width, height / 3], lineOpts),
        new fabric.Line([0, 2 * height / 3, width, 2 * height / 3], lineOpts)
      ];

      lines.forEach(l => canvas.add(l));
      ruleOfThirdsLinesRef.current = lines;
      canvas.requestRenderAll();
    } else {
      ruleOfThirdsLinesRef.current.forEach(l => canvas.remove(l));
      ruleOfThirdsLinesRef.current = [];
      canvas.requestRenderAll();
    }
  }, [guideState.ruleOfThirds, canvas]);

  const gridLinesRef = useRef<fabric.Line[]>([]);

  // Grid Snapping logic
  useEffect(() => {
    if (!canvas) return;

    const gridSize = 20;

    const snapToGrid = (options: any) => {
      const target = options.target;
      if (target && guideState.gridSnapping) {
        target.set({
          left: Math.round((target.left || 0) / gridSize) * gridSize,
          top: Math.round((target.top || 0) / gridSize) * gridSize
        });
      }
    };

    if (guideState.gridSnapping) {
      canvas.on('object:moving', snapToGrid);
      
      // Draw grid
      const width = canvas.width || 500;
      const height = canvas.height || 500;
      const gridLines = [];
      const lineOpts = {
        stroke: 'rgba(59, 130, 246, 0.2)', // blue-500 with low opacity
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true
      };
      
      for (let i = 0; i < (width / gridSize); i++) {
        gridLines.push(new fabric.Line([i * gridSize, 0, i * gridSize, height], lineOpts));
      }
      for (let i = 0; i < (height / gridSize); i++) {
        gridLines.push(new fabric.Line([0, i * gridSize, width, i * gridSize], lineOpts));
      }
      
      gridLines.forEach(l => canvas.add(l));
      gridLinesRef.current = gridLines;
      canvas.requestRenderAll();
    } else {
      canvas.off('object:moving', snapToGrid);
      gridLinesRef.current.forEach(l => canvas.remove(l));
      gridLinesRef.current = [];
      canvas.requestRenderAll();
    }

    return () => {
      canvas.off('object:moving', snapToGrid);
    };
  }, [guideState.gridSnapping, canvas]);

  if (!isGuideOpen) return null;

  return (
    <div className="fixed inset-0 md:absolute md:inset-auto md:left-20 md:top-0 w-full md:w-80 h-full bg-white shadow-2xl border-r border-slate-200 z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-left">
      <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <BookOpen size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Design Guidebook</h2>
        </div>
        <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-8">
        
        {/* Guide 1 */}
        <section>
          <h3 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Grid3x3 size={18} className="text-pink-500" />
            Rule of Thirds
          </h3>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Divide your canvas into 9 equal parts. Placing your main subjects at the intersections or along the lines creates more tension, energy, and interest than simply centering them.
          </p>
          <button 
            onClick={() => setGuideState({ ruleOfThirds: !guideState.ruleOfThirds })}
            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors border ${guideState.ruleOfThirds ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            {guideState.ruleOfThirds ? 'Hide Rule of Thirds' : 'Show Rule of Thirds'}
          </button>
        </section>

        {/* Guide 2 */}
        <section>
          <h3 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Grid size={18} className="text-blue-500" />
            Grid Snapping
          </h3>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Alignment is key to a professional design. Snapping elements to a grid ensures consistent spacing and prevents a messy, disorganized layout.
          </p>
          <button 
            onClick={() => setGuideState({ gridSnapping: !guideState.gridSnapping })}
            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors border ${guideState.gridSnapping ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            {guideState.gridSnapping ? 'Disable Grid Snapping' : 'Enable Grid Snapping'}
          </button>
        </section>

        {/* Guide 3 (Informational) */}
        <section>
          <h3 className="text-md font-bold text-slate-800 mb-2">Visual Hierarchy</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Make the most important element the largest or the most colorful. The viewer's eye is naturally drawn to contrast. Try placing your main component slightly above center.
          </p>
        </section>

        {/* Guide 4 (Informational) */}
        <section>
          <h3 className="text-md font-bold text-slate-800 mb-2">Color Harmony</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Stick to 2-3 primary colors for a cohesive look. Use our predefined color palette for colors that are guaranteed to look great together.
          </p>
        </section>

      </div>
    </div>
  );
}
