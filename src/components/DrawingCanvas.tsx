import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Square, Circle, Type, Undo, Redo, Eraser, Save, X } from 'lucide-react';

interface DrawingCanvasProps {
  onSave: (imageData: string) => void;
  onClose: () => void;
  initialData?: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSave, onClose, initialData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'square' | 'circle' | 'text'>('pen');
  const [color, setColor] = useState('#29235C');
  const [lineWidth, setLineWidth] = useState(3);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    updateCanvasSize();

    // Load initial data if provided
    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveToHistory();
      };
      img.src = initialData;
    } else {
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
    }

    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [initialData]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchPos = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const startDrawing = (pos: { x: number; y: number }) => {
    setIsDrawing(true);
    setStartPos(pos);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (pos: { x: number; y: number }) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = tool === 'eraser' ? 'white' : color;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const finishDrawing = (pos: { x: number; y: number }) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (tool === 'square') {
      const width = pos.x - startPos.x;
      const height = pos.y - startPos.y;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    saveToHistory();
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      restoreFromHistory(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      restoreFromHistory(historyIndex + 1);
    }
  };

  const restoreFromHistory = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !history[index]) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[index];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas!.width, canvas!.height);
    saveToHistory();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const tools = [
    { id: 'pen', icon: Pencil, label: 'Crayon' },
    { id: 'eraser', icon: Eraser, label: 'Gomme' },
    { id: 'square', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Cercle' },
    { id: 'text', icon: Type, label: 'Texte' },
  ];

  const colors = ['#29235C', '#E72C63', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <h2 className="text-lg font-bold text-[#29235C]">Croquis de l'installation</h2>

        <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Redo className="w-5 h-5" />
          </button>
          <button
            onClick={clearCanvas}
            className="px-3 py-2 min-h-[44px] text-sm bg-gray-100 hover:bg-gray-200 rounded-lg whitespace-nowrap"
          >
            Effacer tout
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 min-h-[44px] bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center"
          >
            <Save className="w-5 h-5" />
            Enregistrer
          </button>
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 ml-auto sm:ml-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tools */}
      <div className="bg-white p-4 border-b flex items-center gap-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          {tools.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id as typeof tool)}
              className={`p-3 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center flex-shrink-0 ${tool === id
                  ? 'bg-[#29235C] text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              title={label}
            >
              <Icon className="w-6 h-6" />
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-gray-300"></div>

        <div className="flex items-center gap-2">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-11 h-11 flex-shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'
                }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-8 bg-gray-300"></div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Taille:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-gray-600 w-6">{lineWidth}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-white rounded-lg shadow-lg cursor-crosshair"
          onMouseDown={(e) => startDrawing(getMousePos(e))}
          onMouseMove={(e) => draw(getMousePos(e))}
          onMouseUp={(e) => finishDrawing(getMousePos(e))}
          onMouseLeave={() => setIsDrawing(false)}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(getTouchPos(e));
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(getTouchPos(e));
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const rect = canvasRef.current!.getBoundingClientRect();
            finishDrawing({
              x: touch.clientX - rect.left,
              y: touch.clientY - rect.top
            });
          }}
        />
      </div>
    </div>
  );
};