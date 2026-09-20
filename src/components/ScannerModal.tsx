import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCw, Zap, ZapOff, Sparkles, X, AlertCircle } from 'lucide-react';
import { fileToCompressedDataUri, rotateImage, createSampleMailPiece } from '../utils/imageUtils';

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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize WebRTC Camera with rear camera preference
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
            facingMode: { ideal: 'environment' },
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
        }
      } catch (err: any) {
        console.warn('Camera access denied or unavailable:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access or switch to file upload.'
            : 'No active camera found on this device. You can upload a photo or use a sample mail piece below.'
        );
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, activeTab, previewImage]);

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
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
    setPreviewImage(dataUri);
    stopCamera();
  }

  // File upload handler
  async function handleFileSelected(file: File) {
    try {
      const dataUri = await fileToCompressedDataUri(file, 1920, 0.85);
      setPreviewImage(dataUri);
    } catch (err: any) {
      alert('Error processing file: ' + err.message);
    }
  }

  // Instant 90° clockwise rotation
  async function handleRotate() {
    if (!previewImage || isRotating) return;
    setIsRotating(true);
    try {
      const rotated = await rotateImage(previewImage, 90);
      setPreviewImage(rotated);
    } catch (err) {
      console.error('Rotation failed:', err);
    } finally {
      setIsRotating(false);
    }
  }

  // Advance to bounding box annotation step
  function handleConfirmImage() {
    if (!previewImage) return;
    onImageCaptured(previewImage);
    setPreviewImage(null);
  }

  // Pick realistic synthetic sample mail piece
  function handleSelectSample(type: 'VALPAK' | 'CREDIT_CARD' | 'CATALOG' | 'CHARITY') {
    const sampleUri = createSampleMailPiece(type);
    setPreviewImage(sampleUri);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-semibold tracking-tight text-stone-50">Capture Physical Mail</h2>
          </div>
          <button
            onClick={() => {
              stopCamera();
              setPreviewImage(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Captured Preview Mode */}
        {previewImage ? (
          <div className="p-6 flex flex-col items-center">
            <div className="relative w-full max-h-[55vh] flex items-center justify-center bg-stone-950 rounded-xl overflow-hidden border border-stone-800">
              <img
                src={previewImage}
                alt="Captured Mail Document"
                className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-inner"
              />
              <button
                onClick={handleRotate}
                disabled={isRotating}
                className="absolute top-4 right-4 flex items-center space-x-1.5 px-3 py-2 bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700/60 rounded-lg text-xs font-medium backdrop-blur-sm shadow-md transition-all active:scale-95"
                title="Rotate 90 degrees clockwise"
              >
                <RotateCw className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} />
                <span>Rotate 90°</span>
              </button>
            </div>

            <div className="mt-5 w-full flex items-center justify-between">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2.5 rounded-lg text-stone-300 hover:text-stone-100 hover:bg-stone-800 text-sm font-medium transition-colors"
              >
                ← Retake / Choose Another
              </button>

              <button
                onClick={handleConfirmImage}
                className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all active:scale-98"
              >
                <span>Tag Document Regions</span>
                <span className="text-emerald-200">➔</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-stone-800 bg-stone-950/50 p-1.5 gap-1.5 text-xs font-medium">
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg transition-colors ${
                  activeTab === 'camera'
                    ? 'bg-stone-800 text-stone-100 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Live Camera Scanner
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-stone-800 text-stone-100 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                File Upload / Drop
              </button>
              <button
                onClick={() => setActiveTab('samples')}
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg transition-colors ${
                  activeTab === 'samples'
                    ? 'bg-stone-800 text-stone-100 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Instant Sample Mail
              </button>
            </div>

            {/* Tab 1: Live WebRTC Camera */}
            {activeTab === 'camera' && (
              <div className="p-6 flex flex-col items-center">
                {cameraError ? (
                  <div className="w-full p-6 bg-stone-950 border border-stone-800 rounded-xl flex flex-col items-center text-center">
                    <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
                    <p className="text-sm text-stone-300 max-w-md mb-4">{cameraError}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        Switch to File Upload
                      </button>
                      <button
                        onClick={() => setActiveTab('samples')}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Try with Sample Mail
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-stone-800 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* On-screen alignment reticle (letter shape guideline) */}
                    <div className="absolute inset-8 border-2 border-dashed border-emerald-400/70 rounded-lg pointer-events-none flex flex-col justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      <div className="flex justify-between items-start text-[11px] font-mono text-emerald-400 uppercase tracking-widest bg-stone-950/60 px-2 py-1 rounded backdrop-blur-sm self-start">
                        Align envelope within frame
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                        <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                      </div>
                    </div>

                    {/* Flashlight toggle if supported */}
                    {hasTorch && (
                      <button
                        onClick={toggleTorch}
                        className="absolute top-4 right-4 p-2.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700 backdrop-blur-sm shadow-md"
                        title={torchOn ? 'Turn Flash Off' : 'Turn Flash On'}
                      >
                        {torchOn ? <ZapOff className="w-4 h-4 text-amber-400" /> : <Zap className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}

                {!cameraError && (
                  <div className="mt-6 flex items-center space-x-4">
                    <button
                      onClick={capturePhoto}
                      className="flex items-center space-x-3 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-full font-semibold shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Capture Mail Piece</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Drag and Drop File Upload */}
            {activeTab === 'upload' && (
              <div className="p-6">
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : 'border-stone-700 hover:border-stone-600 bg-stone-950/40 hover:bg-stone-950/80'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-stone-800/80 border border-stone-700 flex items-center justify-center mb-4 text-stone-300">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-stone-100 mb-1">
                    Drag and drop mail photo here
                  </h3>
                  <p className="text-xs text-stone-400 max-w-sm mb-4">
                    Supports high-resolution JPEG, PNG, WEBP, or HEIC mail scans up to 25MB.
                  </p>
                  <span className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors">
                    Browse Local Files
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
              <div className="p-6">
                <p className="text-xs text-stone-400 mb-4">
                  Select a realistic physical mail sample to test the complete bounding box annotation, Vision OCR, and statutory opt-out generation flow instantly:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSelectSample('VALPAK')}
                    className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-sky-500/50 hover:bg-sky-950/10 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">
                        National Coupon Mailer
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/40">
                        IMb Barcode
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-sky-300">
                      Valpak Direct Marketing Envelope
                    </h4>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                      St. Petersburg FL return address, Intelligent Mail barcode sequence, and coupon key code.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectSample('CREDIT_CARD')}
                    className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 hover:bg-amber-950/10 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                        Pre-Screened Credit Offer
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                        FCRA Notice
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300">
                      Capital One Presorted Mail
                    </h4>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                      Official Salt Lake City PO Box, customer opt-out reference number, and glassine address window.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectSample('CATALOG')}
                    className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-emerald-500/50 hover:bg-emerald-950/10 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                        Commercial Catalog
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                        Source Code
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-emerald-300">
                      Uline Heavyweight Shipping Catalog
                    </h4>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                      Customer number string, catalog campaign source code, and Pleasant Prairie WI address.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectSample('CHARITY')}
                    className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-purple-500/50 hover:bg-purple-950/10 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">
                        Nonprofit Appeal
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">
                        BRM Permit
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-purple-300">
                      St. Jude Business Reply Envelope
                    </h4>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">
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
