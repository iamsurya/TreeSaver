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
  Crosshair,
  Crop
} from 'lucide-react';
import { MailRegionAnnotation, MailRegionType } from '../types';
import { rotateImage, getImageDimensions, cropImage } from '../utils/imageUtils';

interface MailRegionAnnotatorProps {
  imageUrl: string;
  onCancel: () => void;
  onProcess: (payload: { imageUrl: string; regions: MailRegionAnnotation[] }) => void;
}

interface RegionMeta {
  type: MailRegionType;
  label: string;
  shortLabel: string;
  color: string;
  strokeColor: string;
  fillColor: string;
  badge: string;
}

const REGION_CONFIGS: Record<MailRegionType, RegionMeta> = {
  SENDER_ADDRESS: {
    type: 'SENDER_ADDRESS',
    label: 'Sender Address',
    shortLabel: 'Sender',
    color: 'blue',
    strokeColor: '#2563eb',
    fillColor: 'rgba(37, 99, 235, 0.15)',
    badge: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  },
  RECIPIENT_ADDRESS: {
    type: 'RECIPIENT_ADDRESS',
    label: 'Recipient Address',
    shortLabel: 'Recipient',
    color: 'green',
    strokeColor: '#16a34a',
    fillColor: 'rgba(22, 163, 74, 0.15)',
    badge: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
  },
  POSTAL_BARCODE: {
    type: 'POSTAL_BARCODE',
    label: 'Postal Barcode / IMb',
    shortLabel: 'Barcode',
    color: 'yellow',
    strokeColor: '#ca8a04',
    fillColor: 'rgba(202, 138, 4, 0.18)',
    badge: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
  },
  RETURN_PERMIT: {
    type: 'RETURN_PERMIT',
    label: 'Permit / IBR Indicia',
    shortLabel: 'Permit',
    color: 'orange',
    strokeColor: '#ea580c',
    fillColor: 'rgba(234, 88, 12, 0.15)',
    badge: 'bg-orange-600/20 text-orange-300 border-orange-500/40',
  },
  KEY_CODE: {
    type: 'KEY_CODE',
    label: 'Customer / Key Code',
    shortLabel: 'Key Code',
    color: 'purple',
    strokeColor: '#9333ea',
    fillColor: 'rgba(147, 51, 234, 0.15)',
    badge: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
  },
  CUSTOM: {
    type: 'CUSTOM',
    label: 'Other Region',
    shortLabel: 'Other',
    color: 'stone',
    strokeColor: '#78716c',
    fillColor: 'rgba(120, 113, 108, 0.15)',
    badge: 'bg-stone-600/20 text-stone-300 border-stone-500/40',
  },
};

interface AnnotatorHistoryState {
  regions: MailRegionAnnotation[];
  image: string;
}

export const MailRegionAnnotator: React.FC<MailRegionAnnotatorProps> = ({
  imageUrl: initialImageUrl,
  onCancel,
  onProcess,
}) => {
  const [currentImage, setCurrentImage] = useState(initialImageUrl);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const [regions, setRegions] = useState<MailRegionAnnotation[]>([]);
  const [history, setHistory] = useState<AnnotatorHistoryState[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<MailRegionType>('SENDER_ADDRESS');
  const [isRotating, setIsRotating] = useState(false);
  const [isCroppingImage, setIsCroppingImage] = useState(false);

  const selectedRegion = regions.find((r) => r.id === selectedRegionId);
  const selectedMeta = selectedRegion
    ? REGION_CONFIGS[selectedRegion.label] || REGION_CONFIGS.CUSTOM
    : null;

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

  // Push history before mutating regions or image
  const recordHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-15), { regions, image: currentImage }]);
  }, [regions, currentImage]);

  function handleUndo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRegions(previous.regions);
    setCurrentImage(previous.image);
    setSelectedRegionId(null);
  }

  function handleClearAll() {
    recordHistory();
    setRegions([]);
    setSelectedRegionId(null);
  }

  async function handleRotateImage() {
    if (isRotating) return;
    setIsRotating(true);
    recordHistory();
    try {
      const rotated = await rotateImage(currentImage, 90);
      setCurrentImage(rotated);
      // Transform existing bounding boxes clockwise [ymin, xmin, ymax, xmax] -> [xmin, 1000 - ymax, xmax, 1000 - ymin]
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

  // Crop image to the currently selected region bounding box
  async function handleCropToSelectedRegion() {
    const targetRegion = regions.find((r) => r.id === selectedRegionId);
    if (!targetRegion) return;

    setIsCroppingImage(true);
    recordHistory();
    try {
      const [cropYmin, cropXmin, cropYmax, cropXmax] = targetRegion.box;
      const cropW = cropXmax - cropXmin;
      const cropH = cropYmax - cropYmin;

      if (cropW < 20 || cropH < 20) return;

      const croppedUri = await cropImage(currentImage, targetRegion.box);
      setCurrentImage(croppedUri);

      // Re-map other regions to the new cropped 0-1000 coordinate space
      const otherRegions = regions
        .filter((r) => r.id !== targetRegion.id)
        .map((r) => {
          const [rymin, rxmin, rymax, rxmax] = r.box;
          const newXmin = Math.max(0, Math.min(1000, Math.round(((rxmin - cropXmin) / cropW) * 1000)));
          const newXmax = Math.max(0, Math.min(1000, Math.round(((rxmax - cropXmin) / cropW) * 1000)));
          const newYmin = Math.max(0, Math.min(1000, Math.round(((rymin - cropYmin) / cropH) * 1000)));
          const newYmax = Math.max(0, Math.min(1000, Math.round(((rymax - cropYmin) / cropH) * 1000)));
          return {
            ...r,
            box: [newYmin, newXmin, newYmax, newXmax] as [number, number, number, number],
          };
        })
        .filter((r) => {
          const [, xmin, , xmax] = r.box;
          const [ymin, , ymax] = r.box;
          return xmax - xmin > 15 && ymax - ymin > 15;
        });

      setRegions(otherRegions);
      setSelectedRegionId(null);
    } catch (err) {
      console.error('Failed to crop image in annotator:', err);
    } finally {
      setIsCroppingImage(false);
    }
  }

  // Crop image to the envelope of all currently tagged regions
  async function handleCropToAllRegions() {
    if (regions.length === 0) return;
    setIsCroppingImage(true);
    recordHistory();
    try {
      let minX = 1000;
      let minY = 1000;
      let maxX = 0;
      let maxY = 0;

      for (const r of regions) {
        const [ymin, xmin, ymax, xmax] = r.box;
        minX = Math.min(minX, xmin);
        minY = Math.min(minY, ymin);
        maxX = Math.max(maxX, xmax);
        maxY = Math.max(maxY, ymax);
      }

      // Add a 4% margin around the bounding envelope
      const padX = Math.round((maxX - minX) * 0.04);
      const padY = Math.round((maxY - minY) * 0.04);
      const paddedXmin = Math.max(0, minX - padX);
      const paddedXmax = Math.min(1000, maxX + padX);
      const paddedYmin = Math.max(0, minY - padY);
      const paddedYmax = Math.min(1000, maxY + padY);

      const boundBox: [number, number, number, number] = [paddedYmin, paddedXmin, paddedYmax, paddedXmax];
      const cropW = paddedXmax - paddedXmin;
      const cropH = paddedYmax - paddedYmin;

      if (cropW < 40 || cropH < 40) return;

      const croppedUri = await cropImage(currentImage, boundBox);
      setCurrentImage(croppedUri);

      // Re-map regions to new coordinate space
      const remapped = regions.map((r) => {
        const [rymin, rxmin, rymax, rxmax] = r.box;
        const newXmin = Math.max(0, Math.min(1000, Math.round(((rxmin - paddedXmin) / cropW) * 1000)));
        const newXmax = Math.max(0, Math.min(1000, Math.round(((rxmax - paddedXmin) / cropW) * 1000)));
        const newYmin = Math.max(0, Math.min(1000, Math.round(((rymin - paddedYmin) / cropH) * 1000)));
        const newYmax = Math.max(0, Math.min(1000, Math.round(((rymax - paddedYmin) / cropH) * 1000)));
        return {
          ...r,
          box: [newYmin, newXmin, newYmax, newXmax] as [number, number, number, number],
        };
      });

      setRegions(remapped);
      setSelectedRegionId(null);
    } catch (err) {
      console.error('Failed to crop to all regions:', err);
    } finally {
      setIsCroppingImage(false);
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
      <header className="px-2 sm:px-4 py-2 bg-stone-900 border-b border-stone-800 flex items-center justify-between z-10 shrink-0 gap-1.5">
        {/* Left: Close button and Title */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={onCancel}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5">
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-stone-100 whitespace-nowrap">
              Tag Regions
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-300">
              {regions.length}
            </span>
          </div>
        </div>

        {/* Right: Actions toolbar (Strictly constrained, icon-first on mobile, guaranteed not to overflow) */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          {/* Quick Auto Tag for standard postal envelopes */}
          <button
            onClick={handleQuickSelectAll}
            className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 border border-amber-600/50 rounded-lg text-xs font-semibold transition-colors min-h-[36px]"
            title="Auto-fill standard US postal layout coordinates"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">Auto</span>
          </button>

          {/* Rotate 90° */}
          <button
            onClick={handleRotateImage}
            disabled={isRotating}
            className="p-1.5 text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-lg border border-stone-700/60 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
            title="Rotate 90° clockwise"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
          </button>

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 text-stone-300 hover:text-stone-100 hover:bg-stone-800 disabled:opacity-30 rounded-lg border border-stone-700/60 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
            title="Undo last action"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Process Document CTA */}
          <button
            onClick={() => onProcess({ imageUrl: currentImage, regions })}
            className="flex items-center space-x-1 px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-950/50 transition-all active:scale-95 min-h-[36px] shrink-0"
          >
            <span>Done</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </header>

      {/* Tool Palette Bar: 5-column grid on mobile so ALL 5 tag types fit on screen without horizontal scrolling */}
      <div className="px-2 py-1.5 bg-stone-900/95 border-b border-stone-800 shrink-0 w-full">
        <div className="grid grid-cols-5 gap-1 w-full max-w-2xl mx-auto">
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
                  className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-1.5 px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-all min-h-[36px] ${
                    isSelected
                      ? `${meta.badge} ring-1 ring-inset shadow-sm font-bold`
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 font-medium'
                  }`}
                  title={`Select tag type: ${meta.label}`}
                >
                  <span
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: meta.strokeColor }}
                  />
                  <span className="sm:hidden text-[10px] leading-tight text-center truncate w-full mt-0.5">
                    {meta.shortLabel}
                  </span>
                  <span className="hidden sm:inline text-xs truncate">
                    {meta.label}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Contextual Action Bar when a region is actively selected */}
      {selectedRegionId && selectedMeta && (
        <div className="px-2.5 sm:px-4 py-1.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs shrink-0 w-full gap-2 animate-fadeIn">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedMeta.strokeColor }}
            />
            <span className="font-semibold text-stone-200 truncate text-[11px] sm:text-xs">
              {selectedMeta.label}
            </span>
            <span className="text-stone-500 text-[10px] hidden xs:inline">(Selected)</span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            <button
              onClick={handleCropToSelectedRegion}
              disabled={isCroppingImage}
              className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-700/60 rounded-lg text-[11px] font-semibold transition-colors min-h-[30px]"
              title="Crop image to this selected area"
            >
              <Crop className="w-3 h-3 shrink-0" />
              <span>Crop Area</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              className="flex items-center space-x-1 px-2 py-1 bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-800/50 rounded-lg text-[11px] font-semibold transition-colors min-h-[30px]"
              title="Delete this tag"
            >
              <Trash2 className="w-3 h-3 shrink-0" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedRegionId(null)}
              className="p-1 text-stone-400 hover:text-stone-200 rounded min-h-[30px] min-w-[30px] flex items-center justify-center"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Canvas Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-stone-950 flex items-center justify-center p-2 sm:p-4 overflow-hidden touch-none"
      >
        <div
          className="relative max-h-[78vh] max-w-full inline-block cursor-crosshair shadow-2xl rounded-xl overflow-hidden border border-stone-800"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Base Document Image */}
          <img
            ref={imageRef}
            src={currentImage}
            alt="Mail Document"
            className="max-h-[76vh] max-w-full object-contain pointer-events-none block rounded-lg"
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
                    strokeWidth={isSelected ? 6 : 3.5}
                    strokeDasharray={isSelected ? '10 5' : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRegionId(region.id);
                      setActiveTool(region.label);
                    }}
                  />

                  {/* Touch-Friendly Corner Handles (Expanded for mobile fingers) */}
                  {isSelected && (
                    <>
                      {/* NW */}
                      <circle cx={xmin} cy={ymin} r={40} fill="transparent" />
                      <circle cx={xmin} cy={ymin} r={18} fill="#ffffff" stroke={meta.strokeColor} strokeWidth={4} />
                      {/* NE */}
                      <circle cx={xmax} cy={ymin} r={40} fill="transparent" />
                      <circle cx={xmax} cy={ymin} r={18} fill="#ffffff" stroke={meta.strokeColor} strokeWidth={4} />
                      {/* SE */}
                      <circle cx={xmax} cy={ymax} r={40} fill="transparent" />
                      <circle cx={xmax} cy={ymax} r={18} fill="#ffffff" stroke={meta.strokeColor} strokeWidth={4} />
                      {/* SW */}
                      <circle cx={xmin} cy={ymax} r={40} fill="transparent" />
                      <circle cx={xmin} cy={ymax} r={18} fill="#ffffff" stroke={meta.strokeColor} strokeWidth={4} />
                    </>
                  )}

                  {/* Labeled Pill Tag */}
                  <g
                    transform={`translate(${xmin + 4}, ${Math.max(ymin - 36, 12)})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRegionId(region.id);
                    }}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={meta.label.length * 11 + 32}
                      height={28}
                      rx={6}
                      fill="#0c0a09"
                      stroke={meta.strokeColor}
                      strokeWidth={2}
                    />
                    <circle cx={14} cy={14} r={5} fill={meta.strokeColor} />
                    <text
                      x={26}
                      y={19}
                      fill="#f8fafc"
                      fontSize={13}
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
                strokeWidth={4}
                strokeDasharray="8 4"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Mobile-Friendly Bottom Guidance & Actions Bar */}
      <footer className="px-2.5 sm:px-4 py-2 bg-stone-900 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 shrink-0 gap-2">
        <div className="flex items-center space-x-1.5 truncate">
          <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="truncate text-[11px]">
            {regions.length === 0
              ? 'Draw boxes on mail or tap Auto'
              : `${regions.length} region${regions.length > 1 ? 's' : ''} tagged`}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {regions.length > 0 && (
            <>
              <button
                onClick={handleCropToAllRegions}
                disabled={isCroppingImage}
                className="flex items-center space-x-1 px-2 py-1 bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-stone-700 rounded text-[11px] font-medium min-h-[28px]"
                title="Crop photo to bounding envelope of all tagged regions"
              >
                <Crop className="w-3 h-3" />
                <span className="hidden xs:inline">Crop to Tags</span>
                <span className="xs:hidden">Crop</span>
              </button>

              <button
                onClick={handleClearAll}
                className="flex items-center space-x-1 px-2 py-1 bg-stone-800 hover:bg-red-950/50 text-stone-400 hover:text-red-300 border border-stone-700 rounded text-[11px] font-medium min-h-[28px]"
                title="Clear all tagged regions"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden xs:inline">Clear All</span>
                <span className="xs:hidden">Clear</span>
              </button>
            </>
          )}

          {regions.length === 0 && (
            <button
              onClick={handleQuickSelectAll}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline"
            >
              Auto Tag Standard Envelope
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
