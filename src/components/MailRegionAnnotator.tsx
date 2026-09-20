import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  Undo2,
  Trash2,
  Sparkles,
  ArrowRight,
  Info,
  X,
  Plus,
  Crosshair
} from 'lucide-react';
import { MailRegionAnnotation, MailRegionType } from '../types';
import { rotateImage, getImageDimensions } from '../utils/imageUtils';

interface MailRegionAnnotatorProps {
  imageUrl: string;
  onCancel: () => void;
  onProcess: (payload: { imageUrl: string; regions: MailRegionAnnotation[] }) => void;
}

interface RegionMeta {
  type: MailRegionType;
  label: string;
  color: string;
  strokeColor: string;
  fillColor: string;
  badge: string;
}

const REGION_CONFIGS: Record<MailRegionType, RegionMeta> = {
  SENDER_ADDRESS: {
    type: 'SENDER_ADDRESS',
    label: 'Sender Address',
    color: 'blue',
    strokeColor: '#2563eb',
    fillColor: 'rgba(37, 99, 235, 0.15)',
    badge: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  },
  RECIPIENT_ADDRESS: {
    type: 'RECIPIENT_ADDRESS',
    label: 'Recipient Address',
    color: 'green',
    strokeColor: '#16a34a',
    fillColor: 'rgba(22, 163, 74, 0.15)',
    badge: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
  },
  POSTAL_BARCODE: {
    type: 'POSTAL_BARCODE',
    label: 'Postal Barcode / IMb',
    color: 'yellow',
    strokeColor: '#ca8a04',
    fillColor: 'rgba(202, 138, 4, 0.18)',
    badge: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
  },
  RETURN_PERMIT: {
    type: 'RETURN_PERMIT',
    label: 'Permit / IBR Indicia',
    color: 'orange',
    strokeColor: '#ea580c',
    fillColor: 'rgba(234, 88, 12, 0.15)',
    badge: 'bg-orange-600/20 text-orange-300 border-orange-500/40',
  },
  KEY_CODE: {
    type: 'KEY_CODE',
    label: 'Customer / Key Code',
    color: 'purple',
    strokeColor: '#9333ea',
    fillColor: 'rgba(147, 51, 234, 0.15)',
    badge: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
  },
  CUSTOM: {
    type: 'CUSTOM',
    label: 'Other Region',
    color: 'stone',
    strokeColor: '#78716c',
    fillColor: 'rgba(120, 113, 108, 0.15)',
    badge: 'bg-stone-600/20 text-stone-300 border-stone-500/40',
  },
};

export const MailRegionAnnotator: React.FC<MailRegionAnnotatorProps> = ({
  imageUrl: initialImageUrl,
  onCancel,
  onProcess,
}) => {
  const [currentImage, setCurrentImage] = useState(initialImageUrl);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const [regions, setRegions] = useState<MailRegionAnnotation[]>([]);
  const [history, setHistory] = useState<MailRegionAnnotation[][]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<MailRegionType>('SENDER_ADDRESS');
  const [isRotating, setIsRotating] = useState(false);

  // Interaction tracking state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null); // handle position 'nw', 'ne', 'se', 'sw'

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load image natural dimensions on change
  useEffect(() => {
    getImageDimensions(currentImage)
      .then((dims) => {
        setNaturalSize(dims);
      })
      .catch((err) => console.error('Image load error:', err));
  }, [currentImage]);

  // Push history before mutating regions
  const recordHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-15), regions]);
  }, [regions]);

  function handleUndo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRegions(previous);
    setSelectedRegionId(null);
  }

  function handleClearAll() {
    recordHistory();
    setRegions([]);
    setSelectedRegionId(null);
  }

  async function handleRotateImage() {
    setIsRotating(true);
    try {
      const rotated = await rotateImage(currentImage, 90);
      setCurrentImage(rotated);
      // Transform existing bounding boxes clockwise [ymin, xmin, ymax, xmax] -> [xmin, 1000 - ymax, xmax, 1000 - ymin]
      recordHistory();
      setRegions((prev) =>
        prev.map((r) => {
          const [ymin, xmin, ymax, xmax] = r.box;
          return {
            ...r,
            box: [xmin, 1000 - ymax, xmax, 1000 - ymin],
          };
        })
      );
    } catch (err) {
      console.error('Rotate failed:', err);
    } finally {
      setIsRotating(false);
    }
  }

  // Quick Select All helper: applies standard postal layout defaults
  function handleQuickSelectAll() {
    recordHistory();
    const defaults: MailRegionAnnotation[] = [
      {
        id: `reg-${Date.now()}-sender`,
        label: 'SENDER_ADDRESS',
        box: [80, 60, 260, 480], // Top left corner
        color: REGION_CONFIGS.SENDER_ADDRESS.strokeColor,
      },
      {
        id: `reg-${Date.now()}-recipient`,
        label: 'RECIPIENT_ADDRESS',
        box: [360, 280, 660, 880], // Center-right delivery address
        color: REGION_CONFIGS.RECIPIENT_ADDRESS.strokeColor,
      },
      {
        id: `reg-${Date.now()}-barcode`,
        label: 'POSTAL_BARCODE',
        box: [720, 260, 890, 880], // Bottom barcode zone
        color: REGION_CONFIGS.POSTAL_BARCODE.strokeColor,
      },
      {
        id: `reg-${Date.now()}-permit`,
        label: 'RETURN_PERMIT',
        box: [60, 780, 240, 960], // Top right stamp / BRM indicia
        color: REGION_CONFIGS.RETURN_PERMIT.strokeColor,
      },
    ];
    setRegions(defaults);
    setSelectedRegionId(defaults[0].id);
  }

  // Helper to convert client pointer event to normalized 0-1000 coordinates
  function getNormalizedPoint(e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | null {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const px = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const py = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);

    const normX = Math.round((px / rect.width) * 1000);
    const normY = Math.round((py / rect.height) * 1000);

    return { x: normX, y: normY };
  }

  // Pointer down on canvas starts new box
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return; // Left click only
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    // Deselect if clicking on empty area
    setSelectedRegionId(null);
    setIsDrawing(true);
    setDrawStart(pt);
    setDrawCurrent(pt);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  // Pointer move updates dragging
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (isDrawing) {
      const pt = getNormalizedPoint(e);
      if (pt) setDrawCurrent(pt);
    }
  }

  // Pointer up finalizes box
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const minX = Math.min(drawStart.x, drawCurrent.x);
    const maxX = Math.max(drawStart.x, drawCurrent.x);
    const minY = Math.min(drawStart.y, drawCurrent.y);
    const maxY = Math.max(drawStart.y, drawCurrent.y);

    // Require minimum size (at least 20x20 in normalized 1000 scale)
    if (maxX - minX > 20 && maxY - minY > 20) {
      recordHistory();
      const newRegion: MailRegionAnnotation = {
        id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: activeTool,
        box: [minY, minX, maxY, maxX],
        color: REGION_CONFIGS[activeTool].strokeColor,
      };
      setRegions((prev) => [...prev, newRegion]);
      setSelectedRegionId(newRegion.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }

  // Remove selected region
  function handleDeleteSelected() {
    if (!selectedRegionId) return;
    recordHistory();
    setRegions((prev) => prev.filter((r) => r.id !== selectedRegionId));
    setSelectedRegionId(null);
  }

  // Change type of selected region
  function handleUpdateSelectedLabel(newType: MailRegionType) {
    if (!selectedRegionId) return;
    recordHistory();
    setRegions((prev) =>
      prev.map((r) => {
        if (r.id === selectedRegionId) {
          return {
            ...r,
            label: newType,
            color: REGION_CONFIGS[newType].strokeColor,
          };
        }
        return r;
      })
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-stone-100 select-none overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-16 px-4 sm:px-6 bg-stone-900 border-b border-stone-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-stone-100 flex items-center gap-2">
              Region Tagging Canvas
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                {regions.length} {regions.length === 1 ? 'region' : 'regions'} marked
              </span>
            </h2>
            <p className="text-xs text-stone-400 hidden sm:block">
              Drag over address boxes, postal barcodes, or catalog codes to focus Vision AI OCR.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={handleQuickSelectAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors"
            title="Auto-fill standard US postal layout coordinates"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Quick Select All</span>
            <span className="md:hidden">Auto</span>
          </button>

          <button
            onClick={handleRotateImage}
            disabled={isRotating}
            className="p-2 text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-lg border border-stone-700/50 text-xs font-medium transition-colors"
            title="Rotate 90° clockwise"
          >
            <RotateCw className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-2 text-stone-300 hover:text-stone-100 hover:bg-stone-800 disabled:opacity-40 rounded-lg border border-stone-700/50 text-xs font-medium transition-colors"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleClearAll}
            disabled={regions.length === 0}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 disabled:opacity-40 rounded-lg border border-red-900/30 text-xs font-medium transition-colors"
            title="Clear all regions"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-stone-800 mx-1" />

          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => onProcess({ imageUrl: currentImage, regions })}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all active:scale-98"
          >
            <span>Process Document</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Tool Palette Bar */}
      <div className="px-4 py-2 bg-stone-900/80 border-b border-stone-800 flex items-center justify-between overflow-x-auto gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider mr-2 hidden sm:inline">
            Active Tag:
          </span>

          {(Object.keys(REGION_CONFIGS) as MailRegionType[])
            .filter((t) => t !== 'CUSTOM')
            .map((type) => {
              const meta = REGION_CONFIGS[type];
              const isSelected = activeTool === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setActiveTool(type);
                    if (selectedRegionId) {
                      handleUpdateSelectedLabel(type);
                    }
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? `${meta.badge} ring-1 ring-inset shadow-sm`
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: meta.strokeColor }}
                  />
                  <span>{meta.label}</span>
                </button>
              );
            })}
        </div>

        {selectedRegionId && (
          <div className="flex items-center space-x-2 bg-stone-950/80 px-3 py-1 rounded-lg border border-stone-800">
            <span className="text-[11px] text-stone-400">Selected:</span>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center space-x-1 text-red-400 hover:text-red-300 text-xs font-medium"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Region</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Canvas Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-stone-950 flex items-center justify-center p-4 overflow-hidden touch-none"
      >
        <div
          className="relative max-h-[82vh] max-w-full inline-block cursor-crosshair shadow-2xl rounded-lg overflow-hidden border border-stone-800"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Base Document Image */}
          <img
            ref={imageRef}
            src={currentImage}
            alt="Mail Document"
            className="max-h-[80vh] max-w-full object-contain pointer-events-none block"
            draggable={false}
          />

          {/* SVG Overlay for Pixel-Perfect Scaled Bounding Boxes */}
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {regions.map((region) => {
              const [ymin, xmin, ymax, xmax] = region.box;
              const w = Math.max(xmax - xmin, 0);
              const h = Math.max(ymax - ymin, 0);
              const isSelected = selectedRegionId === region.id;
              const meta = REGION_CONFIGS[region.label] || REGION_CONFIGS.CUSTOM;

              return (
                <g key={region.id} className="pointer-events-auto cursor-pointer">
                  {/* Bounding Box Rect */}
                  <rect
                    x={xmin}
                    y={ymin}
                    width={w}
                    height={h}
                    fill={meta.fillColor}
                    stroke={meta.strokeColor}
                    strokeWidth={isSelected ? 6 : 3}
                    strokeDasharray={isSelected ? '8 4' : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRegionId(region.id);
                      setActiveTool(region.label);
                    }}
                  />

                  {/* Corner Resize Handles if Selected */}
                  {isSelected && (
                    <>
                      <circle cx={xmin} cy={ymin} r={9} fill="#ffffff" stroke={meta.strokeColor} strokeWidth={3} />
                      <circle cx={xmax} cy={ymin} r={9} fill="#ffffff" stroke={meta.strokeColor} strokeWidth={3} />
                      <circle cx={xmax} cy={ymax} r={9} fill="#ffffff" stroke={meta.strokeColor} strokeWidth={3} />
                      <circle cx={xmin} cy={ymax} r={9} fill="#ffffff" stroke={meta.strokeColor} strokeWidth={3} />
                    </>
                  )}

                  {/* Labeled Pill Tag */}
                  <g
                    transform={`translate(${xmin + 6}, ${Math.max(ymin - 32, 10)})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRegionId(region.id);
                    }}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={meta.label.length * 10 + 28}
                      height={24}
                      rx={4}
                      fill="#0f172a"
                      stroke={meta.strokeColor}
                      strokeWidth={1.5}
                    />
                    <circle cx={12} cy={12} r={4} fill={meta.strokeColor} />
                    <text
                      x={22}
                      y={16}
                      fill="#f8fafc"
                      fontSize={12}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {meta.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Currently Dragging New Box Preview */}
            {isDrawing && drawStart && drawCurrent && (
              <rect
                x={Math.min(drawStart.x, drawCurrent.x)}
                y={Math.min(drawStart.y, drawCurrent.y)}
                width={Math.abs(drawCurrent.x - drawStart.x)}
                height={Math.abs(drawCurrent.y - drawStart.y)}
                fill={REGION_CONFIGS[activeTool].fillColor}
                stroke={REGION_CONFIGS[activeTool].strokeColor}
                strokeWidth={3}
                strokeDasharray="6 3"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Bottom status bar */}
      <footer className="h-10 px-6 bg-stone-900 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-stone-500" />
          <span>Click and drag on the image to draw a custom box. Click any marked box to edit or reassign.</span>
        </div>
        <div className="font-mono text-stone-500 hidden sm:block">
          Dimensions: {naturalSize.width} × {naturalSize.height} px
        </div>
      </footer>
    </div>
  );
};
