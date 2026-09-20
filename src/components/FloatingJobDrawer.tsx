import React from 'react';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { OptOutRecord } from '../types';

interface FloatingJobDrawerProps {
  records: OptOutRecord[];
  onOpenRecord: (record: OptOutRecord) => void;
  onDismissJob?: (id: string) => void;
  dismissedJobIds?: Set<string>;
}

export const FloatingJobDrawer: React.FC<FloatingJobDrawerProps> = ({
  records,
  onOpenRecord,
  onDismissJob,
  dismissedJobIds,
}) => {
  const processingJobs = records.filter((r) => r.status === 'PROCESSING' || r.status === 'QUEUED');
  const readyJobs = records.filter(
    (r) => r.status === 'READY_FOR_VERIFICATION' && (!dismissedJobIds || !dismissedJobIds.has(r.id))
  );

  if (processingJobs.length === 0 && readyJobs.length === 0) {
    return null;
  }

  return (
    <div
      id="floating-job-drawer"
      className="fixed bottom-20 sm:bottom-6 inset-x-0 sm:inset-x-auto sm:right-6 z-50 max-w-md mx-auto sm:mx-0 w-full px-3 sm:px-4 pointer-events-none pb-safe"
    >
      <div className="space-y-2 pointer-events-auto">
        {/* In-flight processing banner */}
        {processingJobs.map((job) => (
          <div
            key={job.id}
            id={`job-banner-${job.id}`}
            className="flex items-center justify-between p-3.5 bg-stone-900 border border-stone-700/80 rounded-xl shadow-2xl text-stone-100 backdrop-blur-md animate-pulse"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
              <div className="truncate">
                <h4 className="text-xs font-semibold text-stone-100 truncate">
                  Vision AI Forensic Extraction in Progress
                </h4>
                <p className="text-[11px] text-stone-400 truncate">
                  Prioritizing marked bounding boxes & matching corporate suppression lists...
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 shrink-0 ml-2">
              Background Job
            </span>
          </div>
        ))}

        {/* Ready for Verification banner */}
        {readyJobs.slice(0, 2).map((job) => (
          <div
            key={job.id}
            id={`job-ready-banner-${job.id}`}
            onClick={() => onOpenRecord(job)}
            className="flex items-center justify-between p-3.5 bg-emerald-950/90 border border-emerald-700/80 rounded-xl shadow-2xl text-stone-100 backdrop-blur-md cursor-pointer hover:bg-emerald-900 transition-all hover:scale-[1.01]"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <h4 className="text-xs font-semibold text-emerald-100 truncate flex items-center gap-1.5">
                  Extraction Complete: {job.companyName}
                </h4>
                <p className="text-[11px] text-emerald-300/80 truncate">
                  Click to review legal opt-out notice and dispatch.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
              <button
                id={`btn-verify-${job.id}`}
                className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                <span>Verify</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              {onDismissJob && (
                <button
                  id={`btn-dismiss-${job.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissJob(job.id);
                  }}
                  className="p-1 rounded-md text-emerald-400/70 hover:text-emerald-200 hover:bg-emerald-900/60 transition-colors"
                  title="Dismiss notification"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
