import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  Zap,
  ZapOff,
  Sparkles,
  X,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Crop,
  Undo2,
  Check,
  Maximize2
} from 'lucide-react';
import { fileToCompressedDataUri, rotateImage, createSampleMailPiece, cropImage } from '../utils/imageUtils';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (imageDataUri: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onImageCaptured,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Photo review & cropping state
  const [rawCapturedImage, setRawCapturedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState<[number, number, number, number]>([60, 60, 940, 940]);
  const [isCropped, setIsCropped] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [activeHandle, setActiveHandle] = useState<'nw' | 'ne' | 'se' | 'sw' | 'move' | 'new' | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [initialCropBox, setInitialCropBox] = useState<[number, number, number, number]>([60, 60, 940, 940]);
  const previewImageRef = useRef<HTMLImageElement>(null);

  const [isRotating, setIsRotating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize WebRTC Camera
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera' || previewImage) {
      stopCamera();
      return;
    }

    let isMounted = true;
    async function startCamera() {
      setCameraError(null);
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((err) => console.warn('Video play error:', err));
        }

        // Check if torch/flashlight is supported
        const track = mediaStream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() || {}) as any;
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.warn('Camera access denied or unavailable:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please enable camera in your browser settings, or use the photo upload button.'
            : 'Live camera stream is unavailable in this environment. You can take a photo with your device camera or choose from your library below.'
        );
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, activeTab, previewImage, facingMode]);

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }

  // Toggle front/back camera
  function handleFlipCamera() {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }

  // Toggle flashlight
  async function toggleTorch() {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Could not toggle flashlight:', err);
    }
  }

  // Helper to initialize newly captured or uploaded photo
  function handleSetNewImage(dataUri: string) {
    setRawCapturedImage(dataUri);
    setPreviewImage(dataUri);
    setIsCropped(false);
    setCropBox([60, 60, 940, 940]);
  }

  // Snap photo from WebRTC video
  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg', 0.88);
    handleSetNewImage(dataUri);
    stopCamera();
  }

  // File upload handler
  async function handleFileSelected(file: File) {
    try {
      const dataUri = await fileToCompressedDataUri(file, 1920, 0.85);
      handleSetNewImage(dataUri);
    } catch (err: any) {
      alert('Error processing file: ' + err.message);
    }
  }

  // Pick realistic synthetic sample mail piece
  function handleSelectSample(type: 'VALPAK' | 'CREDIT_CARD' | 'CATALOG' | 'CHARITY') {
    const sampleUri = createSampleMailPiece(type);
    handleSetNewImage(sampleUri);
  }

  // Pointer event helpers for Crop Box manipulation
  function getCropNormalizedPoint(e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | null {
    if (!previewImageRef.current) return null;
    const rect = previewImageRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const px = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const py = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);

    const normX = Math.round((px / rect.width) * 1000);
    const normY = Math.round((py / rect.height) * 1000);

    return { x: normX, y: normY };
  }

  function handleCropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const pt = getCropNormalizedPoint(e);
    if (!pt) return;

    const [ymin, xmin, ymax, xmax] = cropBox;
    const touchThreshold = 75; // Touch-friendly normalized radius

    const nearNW = Math.hypot(pt.x - xmin, pt.y - ymin) < touchThreshold;
    const nearNE = Math.hypot(pt.x - xmax, pt.y - ymin) < touchThreshold;
    const nearSE = Math.hypot(pt.x - xmax, pt.y - ymax) < touchThreshold;
    const nearSW = Math.hypot(pt.x - xmin, pt.y - ymax) < touchThreshold;

    let handle: 'nw' | 'ne' | 'se' | 'sw' | 'move' | 'new' = 'new';
    if (nearNW) handle = 'nw';
    else if (nearNE) handle = 'ne';
    else if (nearSE) handle = 'se';
    else if (nearSW) handle = 'sw';
    else if (pt.x >= xmin && pt.x <= xmax && pt.y >= ymin && pt.y <= ymax) {
      handle = 'move';
    } else {
      handle = 'new';
      setCropBox([pt.y, pt.x, pt.y, pt.x]);
    }

    setActiveHandle(handle);
    setDragStartPoint(pt);
    setInitialCropBox([...cropBox] as [number, number, number, number]);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!activeHandle || !dragStartPoint) return;
    const pt = getCropNormalizedPoint(e);
    if (!pt) return;

    const [initYmin, initXmin, initYmax, initXmax] = initialCropBox;
    const dx = pt.x - dragStartPoint.x;
    const dy = pt.y - dragStartPoint.y;

    if (activeHandle === 'move') {
      const w = initXmax - initXmin;
      const h = initYmax - initYmin;
      const newXmin = Math.max(0, Math.min(1000 - w, initXmin + dx));
      const newYmin = Math.max(0, Math.min(1000 - h, initYmin + dy));
      setCropBox([newYmin, newXmin, newYmin + h, newXmin + w]);
    } else if (activeHandle === 'nw') {
      const newXmin = Math.max(0, Math.min(initXmax - 40, initXmin + dx));
      const newYmin = Math.max(0, Math.min(initYmax - 40, initYmin + dy));
      setCropBox([newYmin, newXmin, initYmax, initXmax]);
    } else if (activeHandle === 'ne') {
      const newXmax = Math.min(1000, Math.max(initXmin + 40, initXmax + dx));
      const newYmin = Math.max(0, Math.min(initYmax - 40, initYmin + dy));
      setCropBox([newYmin, initXmin, initYmax, newXmax]);
    } else if (activeHandle === 'se') {
      const newXmax = Math.min(1000, Math.max(initXmin + 40, initXmax + dx));
      const newYmax = Math.min(1000, Math.max(initYmin + 40, initYmax + dy));
      setCropBox([initYmin, initXmin, newYmax, newXmax]);
    } else if (activeHandle === 'sw') {
      const newXmin = Math.max(0, Math.min(initXmax - 40, initXmin + dx));
      const newYmax = Math.min(1000, Math.max(initYmin + 40, initYmax + dy));
      setCropBox([initYmin, newXmin, newYmax, initXmax]);
    } else if (activeHandle === 'new') {
      const minX = Math.max(0, Math.min(dragStartPoint.x, pt.x));
      const maxX = Math.min(1000, Math.max(dragStartPoint.x, pt.x));
      const minY = Math.max(0, Math.min(dragStartPoint.y, pt.y));
      const maxY = Math.min(1000, Math.max(dragStartPoint.y, pt.y));
      setCropBox([minY, minX, maxY, maxX]);
    }
  }

  function handleCropPointerUp() {
    if (activeHandle === 'new') {
      const [ymin, xmin, ymax, xmax] = cropBox;
      if (xmax - xmin < 40 || ymax - ymin < 40) {
        setCropBox([60, 60, 940, 940]);
      }
    }
    setActiveHandle(null);
    setDragStartPoint(null);
  }

  // Explicitly crop image in-place to selected area
  async function applyCrop() {
    if (!previewImage) return;
    setIsCropping(true);
    try {
      const cropped = await cropImage(previewImage, cropBox);
      setPreviewImage(cropped);
      setIsCropped(true);
      setCropBox([40, 40, 960, 960]);
    } catch (err) {
      console.error('Cropping failed:', err);
    } finally {
      setIsCropping(false);
    }
  }

  // Reset to original full camera capture
  function resetCrop() {
    if (rawCapturedImage) {
      setPreviewImage(rawCapturedImage);
      setIsCropped(false);
      setCropBox([60, 60, 940, 940]);
    }
  }

  // Instant 90° clockwise rotation
  async function handleRotate() {
    if (!previewImage || isRotating) return;
    setIsRotating(true);
    try {
      const rotated = await rotateImage(previewImage, 90);
      setPreviewImage(rotated);
      if (rawCapturedImage) {
        const rotatedRaw = await rotateImage(rawCapturedImage, 90);
        setRawCapturedImage(rotatedRaw);
      }
      setCropBox(([ymin, xmin, ymax, xmax]) => [
        xmin,
        Math.max(0, 1000 - ymax),
        xmax,
        Math.min(1000, 1000 - ymin),
      ]);
    } catch (err) {
      console.error('Rotation failed:', err);
    } finally {
      setIsRotating(false);
    }
  }

  // Advance to bounding box annotation step with the cropped image
  async function handleConfirmImage() {
    if (!previewImage) return;
    setIsCropping(true);
    try {
      let finalImage = previewImage;
      const isSubArea = cropBox[0] > 10 || cropBox[1] > 10 || cropBox[2] < 990 || cropBox[3] < 990;
      // If not manually cropped yet and user selected an area, crop now
      if (!isCropped && isSubArea) {
        finalImage = await cropImage(previewImage, cropBox);
      }
      onImageCaptured(finalImage);
      setPreviewImage(null);
      setRawCapturedImage(null);
      setIsCropped(false);
    } catch (err) {
      console.error('Crop before confirm failed:', err);
      onImageCaptured(previewImage);
    } finally {
      setIsCropping(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-stone-950 sm:bg-stone-950/80 sm:backdrop-blur-sm sm:p-4 overflow-y-auto">
      <div className="relative w-full sm:max-w-2xl bg-stone-900 sm:border sm:border-stone-800 sm:rounded-2xl shadow-2xl flex flex-col min-h-full sm:min-h-0 text-stone-100 sm:my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 bg-stone-900/95 shrink-0 pt-safe">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-stone-50">
              Capture Physical Mail
            </h2>
          </div>
          <button
            onClick={() => {
              stopCamera();
              setPreviewImage(null);
              setRawCapturedImage(null);
              setIsCropped(false);
              onClose();
            }}
            className="p-2 -mr-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Captured Preview & Crop Mode */}
        {previewImage ? (
          <div className="p-3 sm:p-5 flex flex-col flex-1 items-center justify-between overflow-hidden">
            {/* Top Toolbar: Crop Action, Reset, Rotate, Status */}
            <div className="w-full flex items-center justify-between gap-1.5 mb-2 shrink-0">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5 truncate">
                  <Crop className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Crop Mail Area</span>
                </span>
                {isCropped && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                    Cropped
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
                {/* Crop to Selected Area button */}
                <button
                  onClick={applyCrop}
                  disabled={isCropping}
                  className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all min-h-[34px]"
                  title="Crop photo to the selected area"
                >
                  <Crop className="w-3.5 h-3.5 shrink-0" />
                  <span>{isCropped ? 'Re-Crop' : 'Crop'}</span>
                </button>

                {/* Reset to Original Photo */}
                {(isCropped || cropBox[0] > 10 || cropBox[1] > 10 || cropBox[2] < 990 || cropBox[3] < 990) && (
                  <button
                    onClick={resetCrop}
                    className="flex items-center space-x-1 px-2 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-medium border border-stone-700 min-h-[34px]"
                    title="Revert to full uncropped camera photo"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Reset</span>
                  </button>
                )}

                {/* Rotate 90° */}
                <button
                  onClick={handleRotate}
                  disabled={isRotating}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-medium border border-stone-700 min-h-[34px]"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                  <span className="hidden xs:inline">Rotate</span>
                </button>
              </div>
            </div>

            {/* Interactive Image & Crop Stage */}
            <div className="relative w-full flex-1 min-h-[42vh] max-h-[58vh] flex items-center justify-center bg-stone-950 rounded-xl overflow-hidden border border-stone-800 touch-none select-none">
              <div
                className="relative inline-block cursor-crosshair max-h-[55vh] max-w-full"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
              >
                <img
                  ref={previewImageRef}
                  src={previewImage}
                  alt="Captured Mail Document"
                  className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-inner block pointer-events-none"
                  draggable={false}
                />

                {/* SVG Overlay for Crop Area */}
                {(() => {
                  const [ymin, xmin, ymax, xmax] = cropBox;
                  const w = Math.max(0, xmax - xmin);
                  const h = Math.max(0, ymax - ymin);

                  return (
                    <svg
                      viewBox="0 0 1000 1000"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      {/* Dark translucent backdrop masking out the unselected area */}
                      <path
                        d={`M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z M ${xmin} ${ymin} L ${xmin} ${ymax} L ${xmax} ${ymax} L ${xmax} ${ymin} Z`}
                        fill="rgba(0, 0, 0, 0.58)"
                        fillRule="evenodd"
                      />

                      {/* Active Crop Border */}
                      <rect
                        x={xmin}
                        y={ymin}
                        width={w}
                        height={h}
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth={3.5}
                      />

                      {/* Rule of Thirds Guidelines */}
                      <line x1={xmin + w / 3} y1={ymin} x2={xmin + w / 3} y2={ymax} stroke="rgba(255, 255, 255, 0.25)" strokeDasharray="6 4" strokeWidth={1.5} />
                      <line x1={xmin + (2 * w) / 3} y1={ymin} x2={xmin + (2 * w) / 3} y2={ymax} stroke="rgba(255, 255, 255, 0.25)" strokeDasharray="6 4" strokeWidth={1.5} />
                      <line x1={xmin} y1={ymin + h / 3} x2={xmax} y2={ymin + h / 3} stroke="rgba(255, 255, 255, 0.25)" strokeDasharray="6 4" strokeWidth={1.5} />
                      <line x1={xmin} y1={ymin + (2 * h) / 3} x2={xmax} y2={ymin + (2 * h) / 3} stroke="rgba(255, 255, 255, 0.25)" strokeDasharray="6 4" strokeWidth={1.5} />

                      {/* Corner Handles (Large touch targets) */}
                      {/* NW */}
                      <circle cx={xmin} cy={ymin} r={18} fill="#10b981" stroke="#ffffff" strokeWidth={3.5} />
                      {/* NE */}
                      <circle cx={xmax} cy={ymin} r={18} fill="#10b981" stroke="#ffffff" strokeWidth={3.5} />
                      {/* SE */}
                      <circle cx={xmax} cy={ymax} r={18} fill="#10b981" stroke="#ffffff" strokeWidth={3.5} />
                      {/* SW */}
                      <circle cx={xmin} cy={ymax} r={18} fill="#10b981" stroke="#ffffff" strokeWidth={3.5} />

                      {/* Crop Dimension Badge */}
                      <g transform={`translate(${Math.max(xmin, 12)}, ${Math.max(ymin - 30, 12)})`}>
                        <rect x={0} y={0} width={180} height={24} rx={6} fill="#0c0a09" stroke="#10b981" strokeWidth={1.5} />
                        <text x={8} y={16} fill="#10b981" fontSize={11} fontFamily="monospace" fontWeight="bold">
                          SELECTED: {Math.round(w / 10)}% × {Math.round(h / 10)}%
                        </text>
                      </g>
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="mt-3 w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-safe">
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setRawCapturedImage(null);
                  setIsCropped(false);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-stone-300 hover:text-stone-100 hover:bg-stone-800 text-xs font-medium transition-colors text-center min-h-[44px]"
              >
                ← Retake / Choose Another
              </button>

              <button
                onClick={handleConfirmImage}
                disabled={isCropping}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-950/50 transition-all active:scale-98 min-h-[46px]"
              >
                <span>{isCropped ? 'Proceed with Cropped Photo' : 'Crop to Selection & Continue'}</span>
                <span className="text-emerald-200">➔</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-stone-800 bg-stone-950/70 p-1 sm:p-1.5 gap-1 text-xs font-medium shrink-0">
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex-1 flex items-center justify-center py-2.5 sm:py-2.5 rounded-lg transition-colors min-h-[40px] ${
                  activeTab === 'camera'
                    ? 'bg-stone-800 text-stone-100 shadow-sm font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Camera className="w-3.5 h-3.5 mr-1 sm:mr-1.5 text-emerald-400 shrink-0" />
                <span>Camera</span>
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center py-2.5 sm:py-2.5 rounded-lg transition-colors min-h-[40px] ${
                  activeTab === 'upload'
                    ? 'bg-stone-800 text-stone-100 shadow-sm font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Upload className="w-3.5 h-3.5 mr-1 sm:mr-1.5 text-sky-400 shrink-0" />
                <span>Upload</span>
              </button>
              <button
                onClick={() => setActiveTab('samples')}
                className={`flex-1 flex items-center justify-center py-2.5 sm:py-2.5 rounded-lg transition-colors min-h-[40px] ${
                  activeTab === 'samples'
                    ? 'bg-stone-800 text-stone-100 shadow-sm font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 sm:mr-1.5 text-amber-400 shrink-0" />
                <span>Samples</span>
              </button>
            </div>

            {/* Tab 1: Live WebRTC Camera */}
            {activeTab === 'camera' && (
              <div className="flex-1 p-3 sm:p-6 flex flex-col items-center justify-between">
                {cameraError ? (
                  <div className="w-full my-auto p-5 bg-stone-950 border border-stone-800 rounded-2xl flex flex-col items-center text-center">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                    <h3 className="text-sm font-semibold text-stone-100 mb-1">Camera Stream Notice</h3>
                    <p className="text-xs text-stone-300 max-w-md mb-5 leading-relaxed">{cameraError}</p>
                    
                    {/* Direct mobile camera action button */}
                    <div className="w-full space-y-2 max-w-xs">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md min-h-[44px]"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo with Phone Camera</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium border border-stone-700 min-h-[44px]"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>Choose from Photo Gallery</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('samples')}
                        className="w-full text-center py-2 text-stone-400 hover:text-stone-200 text-xs transition-colors"
                      >
                        Or test with sample mail piece →
                      </button>
                    </div>

                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(file);
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative w-full flex-1 min-h-[50vh] sm:aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-stone-800 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* On-screen alignment reticle (letter shape guideline) */}
                    <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-emerald-400/60 rounded-xl pointer-events-none flex flex-col justify-between p-3 sm:p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                      <div className="flex justify-between items-start text-[10px] sm:text-[11px] font-mono text-emerald-300 uppercase tracking-wider bg-stone-950/80 px-2 py-1 rounded backdrop-blur-sm self-start">
                        Position envelope within frame
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="w-5 h-5 border-b-2 border-l-2 border-emerald-400" />
                        <div className="w-5 h-5 border-b-2 border-r-2 border-emerald-400" />
                      </div>
                    </div>

                    {/* Quick controls inside camera viewfinder */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {/* Camera flip (front/back) */}
                      <button
                        onClick={handleFlipCamera}
                        className="p-2.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700/80 backdrop-blur-md shadow-md min-h-[42px] min-w-[42px] flex items-center justify-center"
                        title="Flip Camera"
                      >
                        <RefreshCw className="w-4 h-4 text-stone-300" />
                      </button>

                      {/* Flashlight toggle if supported */}
                      {hasTorch && (
                        <button
                          onClick={toggleTorch}
                          className="p-2.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700/80 backdrop-blur-md shadow-md min-h-[42px] min-w-[42px] flex items-center justify-center"
                          title={torchOn ? 'Turn Flash Off' : 'Turn Flash On'}
                        >
                          {torchOn ? <ZapOff className="w-4 h-4 text-amber-400" /> : <Zap className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Mobile-first bottom shutter bar */}
                {!cameraError && (
                  <div className="w-full py-4 sm:py-6 flex items-center justify-center pb-safe shrink-0">
                    <button
                      onClick={capturePhoto}
                      aria-label="Capture Mail Piece"
                      className="group relative flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-90 p-1.5 shadow-xl shadow-emerald-950/60 transition-transform cursor-pointer border-4 border-stone-800"
                    >
                      <div className="w-full h-full rounded-full border-2 border-white/80 flex items-center justify-center bg-emerald-600 group-hover:bg-emerald-500 transition-colors">
                        <Camera className="w-7 h-7 text-white" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Drag and Drop / File Upload */}
            {activeTab === 'upload' && (
              <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : 'border-stone-700 hover:border-stone-600 bg-stone-950/40 hover:bg-stone-950/80'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-stone-800/80 border border-stone-700 flex items-center justify-center mb-3 text-stone-300">
                    <Upload className="w-6 h-6 text-sky-400" />
                  </div>
                  <h3 className="text-base font-semibold text-stone-100 mb-1">
                    Upload or take photo
                  </h3>
                  <p className="text-xs text-stone-400 max-w-sm mb-4">
                    Tap to select an envelope photo from your gallery or files. Supports JPEG, PNG, WEBP, and HEIC.
                  </p>
                  <span className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors min-h-[44px] flex items-center justify-center">
                    Browse Files or Photos
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Realistic Sample Mail Pieces */}
            {activeTab === 'samples' && (
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                <p className="text-xs text-stone-400 mb-3">
                  Tap any realistic junk mail sample to test the bounding box annotation, Vision OCR, and statutory opt-out generation flow:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <button
                    onClick={() => handleSelectSample('VALPAK')}
                    className="p-3.5 sm:p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-sky-500/50 hover:bg-sky-950/10 text-left transition-all active:scale-[0.99] group min-h-[72px]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">
                        National Coupon Mailer
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/40 font-mono">
                        IMb Barcode
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-sky-300">
                      Valpak Direct Marketing Envelope
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                      St. Petersburg FL return address, Intelligent Mail barcode sequence, and coupon key code.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectSample('CREDIT_CARD')}
                    className="p-3.5 sm:p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 hover:bg-amber-950/10 text-left transition-all active:scale-[0.99] group min-h-[72px]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                        Pre-Screened Credit Offer
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40 font-mono">
                        FCRA Notice
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300">
                      Capital One Presorted Mail
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                      Official Salt Lake City PO Box, customer opt-out reference number, and glassine address window.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectSample('CATALOG')}
                    className="p-3.5 sm:p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-emerald-500/50 hover:bg-emerald-950/10 text-left transition-all active:scale-[0.99] group min-h-[72px]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                        Commercial Catalog
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 font-mono">
                        Source Code
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-emerald-300">
                      Uline Heavyweight Shipping Catalog
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                      Customer number string, catalog campaign source code, and Pleasant Prairie WI address.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectSample('CHARITY')}
                    className="p-3.5 sm:p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-purple-500/50 hover:bg-purple-950/10 text-left transition-all active:scale-[0.99] group min-h-[72px]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">
                        Nonprofit Appeal
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40 font-mono">
                        BRM Permit
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-purple-300">
                      St. Jude Business Reply Envelope
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                      USPS Permit No. 1112 Memphis TN indicia, donor account reference, and FIM bars.
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

