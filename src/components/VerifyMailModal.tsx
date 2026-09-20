import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  FileText,
  Building2,
  ZoomIn,
  ZoomOut,
  Send,
  Sparkles,
  Link,
  HelpCircle,
  Clock,
  Trash2,
  Globe,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { OptOutRecord, CandidateEntity } from '../types';
import { generateGmailComposeUrl, generateMailtoUri, generateLegalNoticeText } from '../utils/legalNotices';

interface VerifyMailModalProps {
  isOpen: boolean;
  record: OptOutRecord | null;
  onClose: () => void;
  onUpdateRecord: (updated: OptOutRecord) => void;
  onStatusChange: (recordId: string, newStatus: OptOutRecord['status'], channel?: string) => void;
  onDeleteRecord?: (recordId: string) => void;
}

export const VerifyMailModal: React.FC<VerifyMailModalProps> = ({
  isOpen,
  record,
  onClose,
  onUpdateRecord,
  onStatusChange,
  onDeleteRecord,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'photo' | 'message'>('details');
  const [isCopiedNotice, setIsCopiedNotice] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [tone, setTone] = useState<'polite' | 'formal'>('polite');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [webSearchError, setWebSearchError] = useState<string | null>(null);

  // Editable Form State
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [postalBarcodeDigits, setPostalBarcodeDigits] = useState('');
  const [permitNumber, setPermitNumber] = useState('');
  const [targetContact, setTargetContact] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [channelType, setChannelType] = useState<OptOutRecord['channelType']>('DIRECT_EMAIL');
  const [noticeText, setNoticeText] = useState('');
  const [candidates, setCandidates] = useState<CandidateEntity[]>([]);

  useEffect(() => {
    if (record) {
      setCompanyName(record.companyName || '');
      setCompanyDomain(record.companyDomain || '');
      setSenderAddress(record.senderAddress || '');
      setRecipientName(record.recipientName || '');
      setRecipientAddress(record.recipientAddress || '');
      setCustomerNumber(record.customerNumber || '');
      setPostalBarcodeDigits(record.postalBarcodeDigits || '');
      setPermitNumber(record.permitNumber || '');
      setTargetContact(record.targetContact || '');
      setPortalUrl(record.portalUrl || '');
      setChannelType(record.channelType || 'DIRECT_EMAIL');
      setCandidates(record.candidateEntities || []);
      setWebSearchError(null);

      const generated = generateLegalNoticeText(record, undefined, undefined, 'polite');
      setNoticeText(record.legalNoticeContent || generated);
      setTone('polite');
      setZoomLevel(1);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  function handleToneChange(newTone: 'polite' | 'formal') {
    setTone(newTone);
    const updatedDraft = generateLegalNoticeText(
      {
        ...record,
        companyName,
        companyDomain,
        senderAddress,
        recipientName,
        recipientAddress,
        customerNumber,
        postalBarcodeDigits,
        permitNumber,
      },
      recipientName,
      recipientAddress,
      newTone
    );
    setNoticeText(updatedDraft);
  }

  function handleSelectCandidate(candidate: CandidateEntity) {
    setCompanyName(candidate.name);
    if (candidate.domain) setCompanyDomain(candidate.domain);
    if (candidate.privacyEmail) {
      setTargetContact(candidate.privacyEmail);
      setChannelType('DIRECT_EMAIL');
    } else if (candidate.portalUrl) {
      setPortalUrl(candidate.portalUrl);
      setTargetContact(candidate.portalUrl);
      setChannelType('WEB_PORTAL');
    }
    if (candidate.portalUrl) setPortalUrl(candidate.portalUrl);

    // Regenerate message text with new company name
    const updatedDraft = generateLegalNoticeText(
      {
        ...record,
        companyName: candidate.name,
        companyDomain: candidate.domain || companyDomain,
        senderAddress,
        recipientName,
        recipientAddress,
        customerNumber,
        postalBarcodeDigits,
        permitNumber,
      },
      recipientName,
      recipientAddress,
      tone
    );
    setNoticeText(updatedDraft);
  }

  async function handleTriggerWebSearch() {
    if (!companyName.trim()) return;
    setIsSearchingWeb(true);
    setWebSearchError(null);

    try {
      const resp = await fetch('/api/lookup-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          senderAddress,
          permitNumber,
          rawDomain: companyDomain,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Lookup failed with status ${resp.status}`);
      }

      const data = await resp.json();
      if (data.companyName) setCompanyName(data.companyName);
      if (data.companyDomain) setCompanyDomain(data.companyDomain);
      if (data.privacyEmail) {
        setTargetContact(data.privacyEmail);
        setChannelType('DIRECT_EMAIL');
      } else if (data.portalUrl) {
        setPortalUrl(data.portalUrl);
        setTargetContact(data.portalUrl);
        setChannelType('WEB_PORTAL');
      }
      if (data.portalUrl) setPortalUrl(data.portalUrl);
      if (data.candidateEntities && data.candidateEntities.length > 0) {
        setCandidates(data.candidateEntities);
      }

      // Update notice text
      const newNotice = generateLegalNoticeText(
        {
          ...record,
          companyName: data.companyName || companyName,
          companyDomain: data.companyDomain || companyDomain,
          senderAddress,
          recipientName,
          recipientAddress,
          customerNumber,
          postalBarcodeDigits,
          permitNumber,
        },
        recipientName,
        recipientAddress,
        tone
      );
      setNoticeText(newNotice);
    } catch (err: any) {
      setWebSearchError(err.message || 'Web search lookup failed.');
    } finally {
      setIsSearchingWeb(false);
    }
  }

  function handleSaveForm() {
    if (!record) return;
    const updated: OptOutRecord = {
      ...record,
      companyName,
      companyDomain,
      senderAddress,
      recipientName,
      recipientAddress,
      customerNumber,
      postalBarcodeDigits,
      permitNumber,
      targetContact,
      portalUrl,
      channelType,
      candidateEntities: candidates,
      legalNoticeContent: noticeText,
      updatedAt: new Date().toISOString(),
    };
    onUpdateRecord(updated);
  }

  function handleDiscard() {
    if (!record) return;
    if (confirm(`Discard and remove "${companyName || 'this mail item'}"?`)) {
      if (onDeleteRecord) {
        onDeleteRecord(record.id);
      }
      onClose();
    }
  }

  // Copy notice text to clipboard
  function handleCopyNotice() {
    navigator.clipboard.writeText(noticeText);
    setIsCopiedNotice(true);
    setTimeout(() => setIsCopiedNotice(false), 2200);
  }

  // Copy customer ID to clipboard
  function handleCopyCustomerNumber() {
    if (!customerNumber) return;
    navigator.clipboard.writeText(customerNumber);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2000);
  }

  // Dispatch 1: Gmail Web Compose
  function handleOpenGmailCompose() {
    const subject = `Mailing List Removal Request - [${recipientName || 'Resident'}]`;
    const gmailUrl = generateGmailComposeUrl(targetContact, subject, noticeText);
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  }

  // Dispatch 2: Universal Mailto
  function handleOpenMailto() {
    const subject = `Mailing List Removal Request - [${recipientName || 'Resident'}]`;
    const mailtoUri = generateMailtoUri(targetContact, subject, noticeText);
    window.location.href = mailtoUri;
  }

  // Dispatch 3: Web Portal Deep-link
  function handleOpenWebPortal() {
    if (!portalUrl) return;
    if (customerNumber) {
      navigator.clipboard.writeText(customerNumber);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 3000);
    }
    window.open(portalUrl, '_blank', 'noopener,noreferrer');
  }

  // Mark status as submitted
  function handleMarkAsSubmitted() {
    handleSaveForm();
    onStatusChange(record.id, 'OPT_OUT_SUBMITTED', channelType);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-stone-950 sm:bg-stone-950/80 sm:backdrop-blur-sm sm:p-4 overflow-y-auto">
      <div className="relative w-full sm:max-w-4xl bg-stone-900 sm:border sm:border-stone-800 sm:rounded-2xl shadow-2xl flex flex-col min-h-full sm:min-h-0 sm:max-h-[92vh] text-stone-100 sm:my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 bg-stone-900/95 shrink-0 pt-safe">
          <div className="flex items-center space-x-2.5 sm:space-x-3 truncate">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 truncate">
                <h2 className="text-sm sm:text-base font-bold text-stone-50 truncate">
                  {companyName || 'Mail Review & Opt-Out'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                  {Math.round((record.verificationConfidence || 0.9) * 100)}% Match
                </span>
                {record.verifiedViaSearch && (
                  <span className="hidden sm:inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/60 font-medium">
                    <Globe className="w-3 h-3 mr-1" /> Web Verified
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                Review sender details, choose your message tone, or discard this mail item.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button
              onClick={handleDiscard}
              className="p-2 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 border border-transparent hover:border-rose-800/40 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 text-xs font-medium"
              title="Discard this mail item"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Discard</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Tab Segmented Control */}
        <div className="flex border-b border-stone-800 bg-stone-950/70 px-2 sm:px-6 py-1.5 gap-1 sm:gap-2 text-xs font-medium shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'details'
                ? 'bg-stone-800 text-stone-100 shadow-sm border border-stone-700/60 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Sender & Target</span>
          </button>

          <button
            onClick={() => setActiveTab('message')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'message'
                ? 'bg-stone-800 text-stone-100 shadow-sm border border-stone-700/60 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Email Message</span>
          </button>

          <button
            onClick={() => setActiveTab('photo')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'photo'
                ? 'bg-stone-800 text-stone-100 shadow-sm border border-stone-700/60 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
            <span>Photo Scan</span>
          </button>
        </div>

        {/* Tab 1: Extracted Details & Corporate Target */}
        {activeTab === 'details' && (
          <div className="p-3 sm:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-6">
            {/* Candidate Entities Disambiguation / Search Grounding Panel */}
            {candidates && candidates.length > 0 && (
              <div className="p-3.5 bg-sky-950/30 border border-sky-800/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-sky-300">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>Entity Verification candidates (from Web Search):</span>
                  </div>
                  {record.entityVerificationReason && (
                    <span className="text-[11px] text-stone-400 hidden sm:inline truncate max-w-xs">
                      {record.entityVerificationReason}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {candidates.map((c, idx) => {
                    const isSelected = companyName.toLowerCase().trim() === c.name.toLowerCase().trim();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectCandidate(c)}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-900/40 border-sky-500 text-white ring-1 ring-sky-500'
                            : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-900'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-bold text-stone-100">{c.name}</span>
                          {c.isLikelyDirectMailer ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                              Direct Mailer
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                              Other Entity
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 mb-1 line-clamp-2">{c.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-800/60 font-mono">
                          <span>{c.domain || 'no domain'}</span>
                          <span>{c.privacyEmail || 'portal only'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Web Search Error Banner */}
            {webSearchError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{webSearchError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Sender Details */}
              <div className="p-3 sm:p-4 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Originating Mailer / Brand
                  </h3>
                  <button
                    type="button"
                    onClick={handleTriggerWebSearch}
                    disabled={isSearchingWeb || !companyName.trim()}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 rounded-md text-[11px] font-medium transition-colors"
                    title="Verify entity and find opt-out address using live web search"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSearchingWeb ? 'animate-spin text-sky-400' : ''}`} />
                    <span>{isSearchingWeb ? 'Searching...' : 'Web Verify'}</span>
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Official Domain</label>
                  <input
                    type="text"
                    value={companyDomain}
                    onChange={(e) => setCompanyDomain(e.target.value)}
                    placeholder="e.g. dripdropmarketing.com"
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Sender Return Address</label>
                  <textarea
                    rows={2}
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Recipient & Identification */}
              <div className="p-3 sm:p-4 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2.5">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Recipient & Household Match
                </h3>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Recipient Name on Envelope</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Delivery Address</label>
                  <textarea
                    rows={2}
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Customer ID / Account / Source Key Code
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={customerNumber}
                      onChange={(e) => setCustomerNumber(e.target.value)}
                      placeholder="e.g. VP-94107-8842-X9091"
                      className="flex-1 bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    {customerNumber && (
                      <button
                        onClick={handleCopyCustomerNumber}
                        className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs font-medium text-stone-300 flex items-center gap-1 min-h-[40px]"
                        title="Copy customer code"
                      >
                        {isCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Postal Tracking & BRM Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-stone-950/60 rounded-xl border border-stone-800 space-y-1.5">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  USPS IMb Barcode
                </label>
                <input
                  type="text"
                  value={postalBarcodeDigits}
                  onChange={(e) => setPostalBarcodeDigits(e.target.value)}
                  placeholder="e.g. 0070104847291048572910485920194"
                  className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 font-mono"
                />
              </div>

              <div className="p-3 sm:p-4 bg-stone-950/60 rounded-xl border border-stone-800 space-y-1.5">
                <label className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                  Business Reply Permit / Indicia
                </label>
                <input
                  type="text"
                  value={permitNumber}
                  onChange={(e) => setPermitNumber(e.target.value)}
                  placeholder="e.g. PERMIT NO. 1112"
                  className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 font-mono"
                />
              </div>
            </div>

            {/* Target Contact & Dispatch Channel */}
            <div className="p-3 sm:p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Corporate Suppression Target
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Verified Opt-Out Email / Destination
                  </label>
                  <input
                    type="text"
                    value={targetContact}
                    onChange={(e) => setTargetContact(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Channel Type</label>
                  <select
                    value={channelType}
                    onChange={(e) => setChannelType(e.target.value as any)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 min-h-[40px]"
                  >
                    <option value="DIRECT_EMAIL">Direct Email</option>
                    <option value="WEB_PORTAL">Web Opt-Out Portal</option>
                    <option value="POSTAL_MAIL">Postal Mail Notice</option>
                  </select>
                </div>
              </div>

              {portalUrl && (
                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Official Opt-Out Web Portal URL</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={portalUrl}
                      onChange={(e) => setPortalUrl(e.target.value)}
                      className="flex-1 bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-sm sm:text-xs text-stone-100 font-mono"
                    />
                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <span>Open Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[42px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Discard Mail</span>
              </button>

              <button
                onClick={handleSaveForm}
                className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold transition-colors min-h-[42px]"
              >
                Save Details
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Email Message / Polite Notice */}
        {activeTab === 'message' && (
          <div className="p-3 sm:p-6 flex-1 overflow-y-auto space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-950/60 p-3 rounded-xl border border-stone-800">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Mailing List Removal Message
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Choose a polite, friendly tone or a formal notice. No automated tool watermarks are included.
                </p>
              </div>

              {/* Tone Toggle Selector */}
              <div className="flex items-center space-x-1.5 bg-stone-900 p-1 rounded-lg border border-stone-700 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleToneChange('polite')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    tone === 'polite'
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Friendly & Polite
                </button>
                <button
                  type="button"
                  onClick={() => handleToneChange('formal')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    tone === 'formal'
                      ? 'bg-stone-700 text-stone-100 shadow-sm font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Formal Notice
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400">Preview & edit message body before sending:</span>
              <button
                onClick={handleCopyNotice}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors min-h-[36px]"
              >
                {isCopiedNotice ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={13}
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 sm:p-4 text-xs font-mono text-stone-200 leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Photo Scan */}
        {activeTab === 'photo' && (
          <div className="p-3 sm:p-6 flex-1 overflow-y-auto flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2 text-xs text-stone-400">
              <span>Original document with vision analysis overlay:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px]">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative w-full flex-1 min-h-[45vh] bg-stone-950 border border-stone-800 rounded-xl overflow-auto flex items-center justify-center p-2 sm:p-4">
              <div
                className="relative transition-transform duration-150"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
              >
                <img
                  src={record.imageUrl}
                  alt="Scanned Physical Mail Piece"
                  className="max-h-[50vh] max-w-full object-contain rounded shadow-lg block"
                />

                {/* Overlaid Normalized Bounding Boxes */}
                {record.regions && (
                  <svg
                    viewBox="0 0 1000 1000"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {record.regions.map((region) => {
                      const [ymin, xmin, ymax, xmax] = region.box;
                      return (
                        <g key={region.id}>
                          <rect
                            x={xmin}
                            y={ymin}
                            width={xmax - xmin}
                            height={ymax - ymin}
                            fill="rgba(16, 185, 129, 0.12)"
                            stroke="#10b981"
                            strokeWidth={3}
                          />
                          <text
                            x={xmin + 8}
                            y={Math.max(ymin - 6, 20)}
                            fill="#34d399"
                            fontSize={18}
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {region.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}

        {/* One-Click Dispatch & Discard Footer */}
        <div className="p-3 sm:p-5 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-safe">
          <div className="flex items-center justify-between sm:justify-start space-x-3 text-xs text-stone-400">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-stone-500 shrink-0" />
              <span className="truncate">
                Status:{' '}
                <strong className="text-stone-200">
                  {record.status === 'OPT_OUT_SUBMITTED' ? 'Opt-Out Sent' : 'Ready to Send'}
                </strong>
              </span>
            </div>

            <button
              onClick={handleDiscard}
              className="sm:hidden flex items-center space-x-1 text-rose-400 hover:text-rose-300 font-medium py-1 px-2 rounded bg-rose-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {/* Discard on Desktop */}
            <button
              onClick={handleDiscard}
              className="hidden sm:flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-stone-900 hover:bg-rose-950/60 text-stone-400 hover:text-rose-200 rounded-xl text-xs font-medium border border-stone-800 hover:border-rose-800/60 transition-colors min-h-[42px]"
              title="Discard this mail piece"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Discard</span>
            </button>

            {/* Direct Web Portal Link */}
            {portalUrl && (
              <button
                onClick={handleOpenWebPortal}
                className="flex items-center justify-center space-x-1 px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium border border-stone-700 min-h-[42px]"
                title="Open official corporate suppression form"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span className="truncate">Web Portal</span>
              </button>
            )}

            {/* RFC Mailto Link */}
            {targetContact.includes('@') && (
              <button
                onClick={handleOpenMailto}
                className="flex items-center justify-center space-x-1 px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium border border-stone-700 min-h-[42px]"
                title="Send via default mail app"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">Mail App</span>
              </button>
            )}

            {/* Gmail Web Compose */}
            {targetContact.includes('@') && (
              <button
                onClick={handleOpenGmailCompose}
                className="flex items-center justify-center space-x-1 px-3 py-2.5 bg-red-950/60 hover:bg-red-900 text-red-100 rounded-xl text-xs font-semibold border border-red-800/60 min-h-[42px]"
                title="Open Gmail Web Compose"
              >
                <Send className="w-3.5 h-3.5 text-red-400" />
                <span className="truncate">Gmail Compose</span>
              </button>
            )}

            {/* Mark as Sent */}
            <button
              onClick={handleMarkAsSubmitted}
              className="col-span-2 sm:col-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/50 transition-all active:scale-95 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
