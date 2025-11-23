import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mermaid from 'mermaid';
import { Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (chart) {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.render(id, chart).then(({ svg }) => {
        setSvg(svg);
      }).catch((error) => {
        console.error('Mermaid render error:', error);
        setSvg('<div class="text-red-500 text-xs">Failed to render diagram</div>');
      });
    }
  }, [chart]);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const scaleChange = -e.deltaY * 0.001;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale + scaleChange))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });

  return (
    <div className="relative group">
      <div 
        className="mermaid my-4 flex justify-center bg-white/5 p-4 rounded-lg overflow-x-auto min-h-[100px]"
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
      
      {/* Maximize Button */}
      <button
        onClick={() => { setIsMaximized(true); resetTransform(); }}
        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-primary text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        title="Maximize"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Modal */}
      {isMaximized && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm overflow-hidden">
          {/* Toolbar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
            <div className="flex items-center gap-1 bg-zinc-800 border border-white/10 rounded-lg p-1">
              <button onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - 0.1) }))} className="p-2 hover:bg-white/10 rounded text-white"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={resetTransform} className="p-2 hover:bg-white/10 rounded text-white"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={() => setTransform(p => ({ ...p, scale: Math.min(5, p.scale + 0.1) }))} className="p-2 hover:bg-white/10 rounded text-white"><ZoomIn className="w-4 h-4" /></button>
            </div>
            <button 
              onClick={() => setIsMaximized(false)}
              className="p-2 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Canvas */}
          <div 
            className="w-full h-full cursor-move flex items-center justify-center"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div 
              style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
              className="origin-center pointer-events-none select-none"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none">
            Scroll to zoom • Drag to pan
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
