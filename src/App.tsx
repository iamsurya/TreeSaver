import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Trash2,
  Building2,
  Sparkles,
  ShieldCheck,
  Trees,
  Layers,
  FileText,
  AlertCircle,
  Eye,
  Send,
  Loader2,
  X
} from 'lucide-react';
import { OptOutRecord, UserProfile, MailRegionAnnotation } from './types';
import { UserAuthHeader } from './components/UserAuthHeader';
import { ScannerModal } from './components/ScannerModal';
import { MailRegionAnnotator } from './components/MailRegionAnnotator';
import { VerifyMailModal } from './components/VerifyMailModal';
import { AdminPurgeModal } from './components/AdminPurgeModal';
import { PrivacyDirectoryModal } from './components/PrivacyDirectoryModal';
import { FloatingJobDrawer } from './components/FloatingJobDrawer';
import { VerifiedCompanyRecord } from './data/verifiedCompanies';
import { createSampleMailPiece } from './utils/imageUtils';

export default function App() {
  // Current user state (Default admin per prompt context: ssharma@exponent.com)
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'admin-1',
    email: 'ssharma@exponent.com',
    name: 'S. Sharma (Admin)',
    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isAdmin: true,
    mailingAddress: '1428 Elm Street, Apt 4B, San Francisco, CA 94107',
  });

  // Records state
  const [records, setRecords] = useState<OptOutRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<OptOutRecord | null>(null);

  // Modal visibility states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [annotatorImage, setAnnotatorImage] = useState<string | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAdminPurgeOpen, setIsAdminPurgeOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  // Polling ref for in-flight background jobs
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ID of the most recently submitted or processed mail record for visual highlight
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  // Dismissed ready jobs from floating drawer
  const [dismissedReadyJobIds, setDismissedReadyJobIds] = useState<Set<string>>(new Set());
  // Success toast message when an extraction completes
  const [completionToast, setCompletionToast] = useState<{ id: string; companyName: string } | null>(null);

  // Fetch current user and mail records from server
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/mail-records', {
        headers: {
          'x-user-email': currentUser.email,
        },
      });
      const data = await res.json();
      if (data.records) {
        setRecords((prev) => {
          // Check if any job transitioned from PROCESSING to READY_FOR_VERIFICATION
          const newlyReady = data.records.find((newR: OptOutRecord) => {
            const oldR = prev.find((o) => o.id === newR.id);
            return (
              newR.status === 'READY_FOR_VERIFICATION' &&
              oldR &&
              (oldR.status === 'PROCESSING' || oldR.status === 'QUEUED')
            );
          });

          if (newlyReady) {
            setCompletionToast({
              id: newlyReady.id,
              companyName: newlyReady.companyName || 'Sender Identified',
            });
            setHighlightedRecordId(newlyReady.id);
          }

          return data.records;
        });
      }
    } catch (err) {
      console.warn('Could not fetch records:', err);
    }
  }, [currentUser.email]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Background polling for active jobs
  useEffect(() => {
    const hasActiveJobs = records.some((r) => r.status === 'PROCESSING' || r.status === 'QUEUED');
    if (hasActiveJobs) {
      pollingTimerRef.current = setInterval(() => {
        fetchRecords();
      }, 2500);
    } else if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [records, fetchRecords]);

  // Switch active Google User account
  function handleSwitchUser(email: string, name?: string) {
    const isAdmin =
      email.toLowerCase() === 'ssharma@exponent.com' ||
      email.toLowerCase().endsWith('@exponent.com') ||
      email.toLowerCase().includes('admin');

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      isAdmin,
    };
    setCurrentUser(newUser);

    // Register/sync with backend
    fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch((err) => console.warn('User sync error:', err));
  }

  // Phase 1 -> Phase 2: User captured a photo
  function handleImageCaptured(imageDataUri: string) {
    setIsScannerOpen(false);
    setAnnotatorImage(imageDataUri);
  }

  // Phase 2 -> Phase 3: Annotator completed, launch background processing
  async function handleStartProcessing(payload: {
    imageUrl: string;
    regions: MailRegionAnnotation[];
  }) {
    setAnnotatorImage(null);

    // Ensure filter is ALL or PROCESSING so the record is immediately visible in the list
    if (filterStatus === 'SUBMITTED') {
      setFilterStatus('ALL');
    }

    // Optimistic record creation
    const tempId = `mail-${Date.now()}`;
    const optimisticRecord: OptOutRecord = {
      id: tempId,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl: payload.imageUrl,
      regions: payload.regions,
      companyName: 'Analyzing Mail Document...',
      targetContact: 'Discovering verified privacy contact...',
      channelType: 'DIRECT_EMAIL',
      verificationConfidence: 0.1,
      status: 'PROCESSING',
    };

    setHighlightedRecordId(tempId);
    setRecords((prev) => [optimisticRecord, ...prev]);

    // Smoothly scroll down to the mail pieces feed
    setTimeout(() => {
      const recordsSection = document.getElementById('scanned-records-section');
      if (recordsSection) {
        recordsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);

    try {
      const response = await fetch('/api/process-mail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify({
          imageUrl: payload.imageUrl,
          regions: payload.regions,
          userProfile: currentUser,
        }),
      });

      const data = await response.json();
      if (data.record) {
        setHighlightedRecordId(data.record.id);
        setRecords((prev) =>
          prev.map((r) => (r.id === tempId ? data.record : r))
        );
      }
    } catch (err) {
      console.error('Failed to submit mail processing job:', err);
    }
  }

  // Update record fields
  async function handleUpdateRecord(updated: OptOutRecord) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    try {
      await fetch(`/api/mail-records/${updated.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to update record:', err);
    }
  }

  // Change record status (e.g. mark as submitted)
  async function handleStatusChange(
    recordId: string,
    newStatus: OptOutRecord['status'],
    channel?: string
  ) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: newStatus,
              optOutSubmittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );

    try {
      await fetch(`/api/mail-records/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify({
          status: newStatus,
          optOutSubmittedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Status update failed:', err);
    }
  }

  // Delete single record
  async function handleDeleteRecord(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
      setIsVerifyModalOpen(false);
    }
    try {
      await fetch(`/api/mail-records/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': currentUser.email },
      });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  // Pick company from verified directory to create quick notice
  function handleSelectCompanyFromDirectory(company: VerifiedCompanyRecord) {
    const sampleUri = createSampleMailPiece('VALPAK');
    const newRecord: OptOutRecord = {
      id: `mail-${Date.now()}`,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl: sampleUri,
      companyName: company.name,
      companyDomain: company.domain,
      senderAddress: company.notes || 'Corporate Headquarters',
      recipientName: currentUser.name,
      recipientAddress: currentUser.mailingAddress || '1428 Elm Street, Apt 4B, San Francisco, CA 94107',
      customerNumber: '',
      targetContact: company.privacyEmail,
      portalUrl: company.portalUrl,
      channelType: company.privacyEmail ? 'DIRECT_EMAIL' : 'WEB_PORTAL',
      verificationConfidence: 0.98,
      status: 'READY_FOR_VERIFICATION',
      groundingSources: [{
        title: `${company.name} Official Privacy Compliance Record`,
        uri: company.portalUrl || `https://${company.domain}`,
      }],
    };

    setRecords((prev) => [newRecord, ...prev]);
    setSelectedRecord(newRecord);
    setIsVerifyModalOpen(true);

    fetch('/api/mail-records/' + newRecord.id, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': currentUser.email,
      },
      body: JSON.stringify(newRecord),
    }).catch((err) => console.warn('Sync failed:', err));
  }

  // Filter and search logic
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.targetContact && r.targetContact.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.customerNumber && r.customerNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.recipientName && r.recipientName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'READY' && r.status === 'READY_FOR_VERIFICATION') ||
      (filterStatus === 'PROCESSING' && (r.status === 'PROCESSING' || r.status === 'QUEUED')) ||
      (filterStatus === 'SUBMITTED' && r.status === 'OPT_OUT_SUBMITTED');

    return matchesSearch && matchesStatus;
  });

  const submittedCount = records.filter((r) => r.status === 'OPT_OUT_SUBMITTED').length;
  const readyCount = records.filter((r) => r.status === 'READY_FOR_VERIFICATION').length;
  const processingCount = records.filter((r) => r.status === 'PROCESSING' || r.status === 'QUEUED').length;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Google User Header & Environmental Tickers */}
      <UserAuthHeader
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenAdminPurge={() => setIsAdminPurgeOpen(true)}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
        totalSubmissions={submittedCount}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8 pb-28 sm:pb-8">
        {/* Quick Action Banner */}
        <section className="bg-gradient-to-r from-stone-900 via-stone-900 to-emerald-950/30 border border-stone-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[11px] sm:text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Forensic Postal AI & Statutory Prohibitory Orders</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-stone-50">
                Eliminate Marketing Mail at the Source
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Scan coupon envelopes, credit solicitations, or heavy catalogs. Our forensic OCR pipeline
                extracts customer key codes, decodes USPS IMb barcodes, and dispatches
                legally enforceable suppression notices under 39 U.S.C. § 3008 and state privacy statutes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center justify-center space-x-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-950/60 transition-all active:scale-95 min-h-[48px]"
              >
                <Camera className="w-4 h-4" />
                <span>Scan New Mail Piece</span>
              </button>
              <button
                onClick={() => setIsDirectoryOpen(true)}
                className="flex items-center justify-center px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium border border-stone-700/80 transition-colors min-h-[44px]"
              >
                Browse 50+ Directory
              </button>
            </div>
          </div>
        </section>

        {/* Real-time Status Metric Counters - 3 Column Compact on Mobile */}
        <section className="grid grid-cols-3 gap-2 sm:gap-4">
          <div
            onClick={() => setFilterStatus('SUBMITTED')}
            className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'SUBMITTED'
                ? 'bg-emerald-950/40 border-emerald-600/80 ring-1 ring-emerald-500/50'
                : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-wider truncate">
                Suppressed
              </span>
              <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-3 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:space-x-2">
              <span className="text-xl sm:text-3xl font-extrabold text-stone-50">{submittedCount}</span>
              <span className="text-[10px] sm:text-xs text-stone-400 truncate">enforced</span>
            </div>
          </div>

          <div
            onClick={() => setFilterStatus('READY')}
            className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'READY'
                ? 'bg-sky-950/40 border-sky-600/80 ring-1 ring-sky-500/50'
                : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-wider truncate">
                To Review
              </span>
              <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-sky-950/80 text-sky-400 border border-sky-800/60 shrink-0">
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-3 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:space-x-2">
              <span className="text-xl sm:text-3xl font-extrabold text-stone-50">{readyCount}</span>
              <span className="text-[10px] sm:text-xs text-stone-400 truncate">pending</span>
            </div>
          </div>

          <div
            onClick={() => setFilterStatus('PROCESSING')}
            className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'PROCESSING'
                ? 'bg-amber-950/40 border-amber-600/80 ring-1 ring-amber-500/50'
                : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-wider truncate">
                AI Pipeline
              </span>
              <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-3 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:space-x-2">
              <span className="text-xl sm:text-3xl font-extrabold text-stone-50">{processingCount}</span>
              <span className="text-[10px] sm:text-xs text-stone-400 truncate">active</span>
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          {/* Segmented Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-stone-900 p-1.5 rounded-xl border border-stone-800 text-xs font-medium overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap min-h-[34px] ${
                filterStatus === 'ALL'
                  ? 'bg-stone-800 text-stone-100 shadow-sm font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All ({records.length})
            </button>
            <button
              onClick={() => setFilterStatus('READY')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap min-h-[34px] ${
                filterStatus === 'READY'
                  ? 'bg-sky-950 text-sky-300 border border-sky-800/60 shadow-sm font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Review ({readyCount})
            </button>
            <button
              onClick={() => setFilterStatus('PROCESSING')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap min-h-[34px] ${
                filterStatus === 'PROCESSING'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60 shadow-sm font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Processing ({processingCount})
            </button>
            <button
              onClick={() => setFilterStatus('SUBMITTED')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap min-h-[34px] ${
                filterStatus === 'SUBMITTED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 shadow-sm font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Suppressed ({submittedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sender, key code, address..."
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-sm sm:text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500 min-h-[42px]"
            />
          </div>
        </div>

        {/* Mail Records List */}
        <div id="scanned-records-section" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-100">
                Scanned Mail Pieces & Active Dispatches
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-400 font-mono">
                {filteredRecords.length}
              </span>
            </div>
            {highlightedRecordId && (
              <span className="text-xs text-emerald-400 font-medium animate-pulse flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recently Scanned Mail Piece</span>
              </span>
            )}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center bg-stone-900/40 border border-dashed border-stone-800 rounded-3xl flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400">
                <FileText className="w-8 h-8 text-stone-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-200">No Mail Pieces in this View</h3>
                <p className="text-xs text-stone-400 max-w-sm mt-1">
                  {records.length === 0
                    ? 'Scan your first piece of junk mail or select one of our pre-built synthetic envelopes to test the entire OCR and statutory opt-out workflow.'
                    : 'No records match your active search or filter selection.'}
                </p>
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                + Scan Your First Envelope
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRecords.map((record) => {
                const isProcessing = record.status === 'PROCESSING' || record.status === 'QUEUED';
                const isReady = record.status === 'READY_FOR_VERIFICATION';
                const isSubmitted = record.status === 'OPT_OUT_SUBMITTED';
                const isNewlyScanned = highlightedRecordId === record.id;

                return (
                  <div
                    key={record.id}
                    id={`mail-card-${record.id}`}
                    onClick={() => {
                      setSelectedRecord(record);
                      setIsVerifyModalOpen(true);
                    }}
                    className={`bg-stone-900 border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer flex flex-col group relative ${
                      isNewlyScanned
                        ? 'border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-emerald-950/50'
                        : 'border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {isNewlyScanned && (
                      <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 text-[10px] font-bold shadow-md uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Just Added</span>
                      </div>
                    )}

                    {/* Document Thumbnail Preview */}
                    <div className="relative aspect-[16/9] bg-stone-950 overflow-hidden border-b border-stone-800/80 flex items-center justify-center">
                      <img
                        src={record.imageUrl}
                        alt={record.companyName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        {isProcessing && (
                          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-950/90 text-amber-400 border border-amber-800/80 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-md">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Vision OCR Processing</span>
                          </span>
                        )}
                        {isReady && (
                          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-950/90 text-sky-400 border border-sky-800/80 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-md">
                            <Send className="w-3 h-3" />
                            <span>Ready to Review & Send</span>
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Opted-Out</span>
                          </span>
                        )}
                      </div>

                      {/* Region Count Pill */}
                      {record.regions && record.regions.length > 0 && (
                        <div className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded bg-stone-950/80 text-stone-300 border border-stone-800 backdrop-blur-sm">
                          {record.regions.length} tags
                        </div>
                      )}
                    </div>

                    {/* Body Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-bold text-stone-100 group-hover:text-emerald-400 transition-colors">
                              {record.companyName}
                            </h3>
                            {record.companyDomain && (
                              <span className="text-[11px] font-mono text-stone-400">
                                {record.companyDomain}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => handleDeleteRecord(record.id, e)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Recipient & Key Code info */}
                        <div className="text-xs text-stone-400 space-y-1">
                          {record.recipientName && (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-stone-500">Recipient:</span>
                              <span className="text-stone-300 font-medium truncate">
                                {record.recipientName}
                              </span>
                            </div>
                          )}

                          {record.customerNumber && (
                            <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                              <span className="text-stone-500">Acct / Key:</span>
                              <span className="text-amber-400 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800">
                                {record.customerNumber}
                              </span>
                            </div>
                          )}

                          {record.postalBarcodeDigits && (
                            <div className="flex items-center space-x-1.5 font-mono text-[10px] text-stone-500 truncate">
                              <span>IMb:</span>
                              <span className="truncate">{record.postalBarcodeDigits}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Controls */}
                      <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 text-stone-400">
                          {record.channelType === 'DIRECT_EMAIL' ? (
                            <Mail className="w-3.5 h-3.5 text-sky-400" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span className="text-[11px] truncate max-w-[150px]">
                            {record.targetContact || 'Corporate Target'}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          {isSubmitted ? 'View Notice ➔' : isReady ? 'Review Notice ➔' : 'View Status ➔'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Floating Action Bar (Sticky at bottom on phones) */}
      <div className="sm:hidden fixed bottom-3 inset-x-3 z-30 flex items-center gap-2 p-2 bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-2xl shadow-2xl shadow-black/80 pb-safe">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="flex-1 flex items-center justify-center space-x-2 py-3 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/60 min-h-[46px]"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Mail Piece</span>
        </button>
        <button
          onClick={() => setIsDirectoryOpen(true)}
          className="px-3.5 py-3 bg-stone-800 active:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 min-h-[46px] flex items-center gap-1.5 shrink-0"
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Directory</span>
        </button>
      </div>

      {/* Non-Blocking Floating Job Drawer */}
      <FloatingJobDrawer
        records={records}
        dismissedJobIds={dismissedReadyJobIds}
        onDismissJob={(id) => {
          setDismissedReadyJobIds((prev) => new Set(prev).add(id));
        }}
        onOpenRecord={(rec) => {
          setSelectedRecord(rec);
          setIsVerifyModalOpen(true);
        }}
      />

      {/* Completion Toast Notification */}
      {completionToast && (
        <div
          id="completion-toast"
          className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-stone-900/95 border border-emerald-500/80 rounded-2xl shadow-2xl p-4 text-stone-100 backdrop-blur-md animate-bounce"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-stone-100">
                  Mail Scanned & Ready!
                </h4>
                <p className="text-[11px] text-stone-300 leading-snug">
                  {completionToast.companyName} is ready to review in your list below.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => {
                      const rec = records.find((r) => r.id === completionToast.id);
                      if (rec) {
                        setSelectedRecord(rec);
                        setIsVerifyModalOpen(true);
                      }
                      setCompletionToast(null);
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline"
                  >
                    Review Now ➔
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setCompletionToast(null)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              title="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Phase 1: Camera Scanner & File Upload Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onImageCaptured={handleImageCaptured}
      />

      {/* Phase 2: Interactive Bounding Box Annotation Canvas */}
      {annotatorImage && (
        <MailRegionAnnotator
          imageUrl={annotatorImage}
          onCancel={() => setAnnotatorImage(null)}
          onProcess={handleStartProcessing}
        />
      )}

      {/* Phase 5: Verification Modal & One-Click Legal Notice Dispatch */}
      <VerifyMailModal
        isOpen={isVerifyModalOpen}
        record={selectedRecord}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setSelectedRecord(null);
        }}
        onUpdateRecord={handleUpdateRecord}
        onStatusChange={handleStatusChange}
        onDeleteRecord={handleDeleteRecord}
      />

      {/* Admin Purge Modal: System-wide data deletion */}
      <AdminPurgeModal
        isOpen={isAdminPurgeOpen}
        adminEmail={currentUser.email}
        onClose={() => setIsAdminPurgeOpen(false)}
        onPurgeComplete={() => {
          setRecords([]);
          fetchRecords();
        }}
      />

      {/* Verified Corporate Privacy Directory Modal */}
      <PrivacyDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        onSelectCompanyForOptOut={handleSelectCompanyFromDirectory}
      />
    </div>
  );
}
