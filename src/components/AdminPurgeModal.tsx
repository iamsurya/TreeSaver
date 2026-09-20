import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AdminPurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurgeComplete: () => void;
  adminEmail: string;
}

export const AdminPurgeModal: React.FC<AdminPurgeModalProps> = ({
  isOpen,
  onClose,
  onPurgeComplete,
  adminEmail,
}) => {
  const [confirmationWord, setConfirmationWord] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ count: number; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleExecutePurge() {
    if (confirmationWord !== 'PURGE') return;
    setIsPurging(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/purge-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute system purge');
      }

      setPurgeResult({
        count: data.purgedCount || 0,
        message: data.message,
      });
      onPurgeComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during system purge');
    } finally {
      setIsPurging(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-stone-900 border border-red-900/40 rounded-2xl shadow-2xl overflow-hidden text-stone-100 p-4 sm:p-6 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-center space-x-3 truncate">
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-red-100 truncate">
                Administrative System Purge
              </h2>
              <p className="text-[11px] text-stone-400 truncate">
                Global Data Deletion Authority • {adminEmail}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {purgeResult ? (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-700 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-50">System Purge Successful</h3>
              <p className="text-xs text-stone-300 mt-1 max-w-sm">{purgeResult.message}</p>
            </div>
            <button
              onClick={() => {
                setPurgeResult(null);
                setConfirmationWord('');
                onClose();
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl text-xs font-semibold min-h-[42px]"
            >
              Close Console
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-red-950/30 border border-red-900/40 rounded-xl text-red-200/90 leading-relaxed">
              <div className="flex items-center space-x-2 font-bold text-red-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>CRITICAL SYSTEM ACTION</span>
              </div>
              As an administrator, this operation will permanently delete{' '}
              <strong>all physical mail pieces, optical document scans, bounding box coordinates, and legal opt-out records for ALL users</strong>{' '}
              across the entire TreeSaver platform (including other administrators).
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-200">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-stone-300 font-medium mb-1.5">
                Type <span className="font-mono text-red-400 font-bold">PURGE</span> below to confirm absolute data deletion:
              </label>
              <input
                type="text"
                value={confirmationWord}
                onChange={(e) => setConfirmationWord(e.target.value.toUpperCase())}
                placeholder="PURGE"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 font-mono tracking-widest text-base focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-medium transition-colors min-h-[42px] order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                disabled={confirmationWord !== 'PURGE' || isPurging}
                onClick={handleExecutePurge}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl font-semibold shadow-lg shadow-red-950/40 transition-all min-h-[44px] order-1 sm:order-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isPurging ? 'Purging All System Data...' : 'Purge All User Data'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
