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
  Printer
} from 'lucide-react';
import { OptOutRecord } from '../types';
import { generateGmailComposeUrl, generateMailtoUri, generateLegalNoticeText } from '../utils/legalNotices';

interface VerifyMailModalProps {
  isOpen: boolean;
  record: OptOutRecord | null;
  onClose: () => void;
  onUpdateRecord: (updated: OptOutRecord) => void;
  onStatusChange: (recordId: string, newStatus: OptOutRecord['status'], channel?: string) => void;
}

export const VerifyMailModal: React.FC<VerifyMailModalProps> = ({
  isOpen,
  record,
  onClose,
  onUpdateRecord,
  onStatusChange,
}) => {
  const [activeTab, setActiveTab] = useState<'photo' | 'details' | 'legal'>('details');
  const [isCopiedNotice, setIsCopiedNotice] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

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
  const [legalNoticeText, setLegalNoticeText] = useState('');

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

      const notice = record.legalNoticeContent || generateLegalNoticeText(record);
      setLegalNoticeText(notice);
      setZoomLevel(1);
    }
  }, [record]);

  if (!isOpen || !record) return null;

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
      legalNoticeContent: legalNoticeText,
      updatedAt: new Date().toISOString(),
    };
    onUpdateRecord(updated);
  }

  // Copy notice text to clipboard
  function handleCopyNotice() {
    navigator.clipboard.writeText(legalNoticeText);
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
    const subject = `Statutory Physical Mail Opt-Out Demand - 39 U.S.C. § 3008 [${recipientName || 'Consumer'}]`;
    const gmailUrl = generateGmailComposeUrl(targetContact, subject, legalNoticeText);
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  }

  // Dispatch 2: Universal Mailto
  function handleOpenMailto() {
    const subject = `Statutory Physical Mail Opt-Out Demand - 39 U.S.C. § 3008`;
    const mailtoUri = generateMailtoUri(targetContact, subject, legalNoticeText);
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
    onStatusChange(record.id, 'OPT_OUT_SUBMITTED', channelType);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto text-stone-100 max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-50">
                  {companyName || 'Mail Verification Review'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  {Math.round((record.verificationConfidence || 0.9) * 100)}% Confidence
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Extracted via Gemini Vision AI • Ready for Statutory Opt-Out Enforcement
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Tab Segmented Control */}
        <div className="flex border-b border-stone-800 bg-stone-950/50 px-6 py-2 gap-2 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'details'
                ? 'bg-stone-800 text-stone-100 shadow-sm border border-stone-700/60'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Extracted Details & Target</span>
          </button>

          <button
            onClick={() => setActiveTab('photo')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'photo'
                ? 'bg-stone-800 text-stone-100 shadow-sm border border-stone-700/60'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
            <span>Annotated Photo Review</span>
          </button>

          <button
            onClick={() => setActiveTab('legal')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'legal'
                ? 'bg-stone-800 text-stone-100 shadow-sm border border-stone-700/60'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Formal Legal Notice</span>
          </button>
        </div>

        {/* Tab 1: Annotated Photo Review */}
        {activeTab === 'photo' && (
          <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-stone-400">
              <span>Original document with active OCR bounding boxes:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                  className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px]">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
                  className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative w-full max-h-[58vh] bg-stone-950 border border-stone-800 rounded-xl overflow-auto flex items-center justify-center p-4">
              <div
                className="relative transition-transform duration-150"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
              >
                <img
                  src={record.imageUrl}
                  alt="Scanned Physical Mail Piece"
                  className="max-h-[52vh] max-w-full object-contain rounded shadow-lg block"
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

        {/* Tab 2: Extracted Details & Corporate Target */}
        {activeTab === 'details' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* Grounding Source Badge */}
            {record.groundingSources && record.groundingSources.length > 0 && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-start space-x-3">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-emerald-300">Grounded Search Verification: </span>
                  <span className="text-stone-300">
                    Target contact verified against corporate privacy compliance records.
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {record.groundingSources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-[11px] text-emerald-400 hover:text-emerald-300 underline"
                      >
                        <Link className="w-3 h-3 mr-1" />
                        {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sender Details */}
              <div className="p-4 bg-stone-950/60 rounded-xl border border-stone-800 space-y-3">
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Originating Mailer / Brand
                </h3>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Official Domain</label>
                  <input
                    type="text"
                    value={companyDomain}
                    onChange={(e) => setCompanyDomain(e.target.value)}
                    placeholder="e.g. company.com"
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Sender Return Address</label>
                  <textarea
                    rows={2}
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Recipient & Identification */}
              <div className="p-4 bg-stone-950/60 rounded-xl border border-stone-800 space-y-3">
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
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Delivery Address</label>
                  <textarea
                    rows={2}
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-500 font-mono"
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
                      className="flex-1 bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    {customerNumber && (
                      <button
                        onClick={handleCopyCustomerNumber}
                        className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs font-medium text-stone-300 flex items-center gap-1"
                        title="Copy customer code to clipboard"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Decoded USPS IMb Barcode (20/31-Digit)
                </label>
                <input
                  type="text"
                  value={postalBarcodeDigits}
                  onChange={(e) => setPostalBarcodeDigits(e.target.value)}
                  placeholder="e.g. 0070104847291048572910485920194"
                  className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 font-mono"
                />
              </div>

              <div className="p-4 bg-stone-950/60 rounded-xl border border-stone-800 space-y-2">
                <label className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                  Business Reply Permit / Indicia
                </label>
                <input
                  type="text"
                  value={permitNumber}
                  onChange={(e) => setPermitNumber(e.target.value)}
                  placeholder="e.g. FIRST-CLASS MAIL PERMIT NO. 1112"
                  className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 font-mono"
                />
              </div>
            </div>

            {/* Target Contact & Dispatch Channel */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Corporate Suppression Target
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Verified Opt-Out Email / Destination
                  </label>
                  <input
                    type="text"
                    value={targetContact}
                    onChange={(e) => setTargetContact(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">Channel Type</label>
                  <select
                    value={channelType}
                    onChange={(e) => setChannelType(e.target.value as any)}
                    className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100"
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
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={portalUrl}
                      onChange={(e) => setPortalUrl(e.target.value)}
                      className="flex-1 bg-stone-900 border border-stone-700/80 rounded-lg px-3 py-2 text-xs text-stone-100 font-mono"
                    />
                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <span>Open Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveForm}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors"
              >
                Save Details
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Formal Legal Notice */}
        {activeTab === 'legal' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-100">
                  Enforceable Statutory Cease-and-Desist Demand
                </h3>
                <p className="text-xs text-stone-400">
                  Cited under USPS Prohibitory Order 39 U.S.C. § 3008, DMA Choice, and state consumer privacy laws.
                </p>
              </div>

              <button
                onClick={handleCopyNotice}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors"
              >
                {isCopiedNotice ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied Notice</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Letter</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={16}
                value={legalNoticeText}
                onChange={(e) => setLegalNoticeText(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-xs font-mono text-stone-200 leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* One-Click Dispatch Footer */}
        <div className="p-4 sm:px-6 bg-stone-950 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-stone-400">
            <Clock className="w-4 h-4 text-stone-500" />
            <span>
              Status:{' '}
              <strong className="text-stone-200">
                {record.status === 'OPT_OUT_SUBMITTED' ? 'Opt-Out Submitted' : 'Ready for Dispatch'}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Direct Web Portal Link */}
            {portalUrl && (
              <button
                onClick={handleOpenWebPortal}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors"
                title="Open official corporate suppression form with account number copied"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>Web Opt-Out Portal</span>
              </button>
            )}

            {/* RFC Mailto Link */}
            {targetContact.includes('@') && (
              <button
                onClick={handleOpenMailto}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors"
                title="Send via default desktop mail client"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Default Mail Client</span>
              </button>
            )}

            {/* Gmail Web Compose */}
            {targetContact.includes('@') && (
              <button
                onClick={handleOpenGmailCompose}
                className="flex items-center space-x-2 px-4 py-2 bg-red-900/60 hover:bg-red-800 text-red-100 rounded-lg text-xs font-semibold border border-red-700/60 shadow-md transition-all active:scale-95"
                title="Open pre-filled Gmail Web Compose in new tab"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gmail Web Compose</span>
              </button>
            )}

            {/* Mark as Sent */}
            <button
              onClick={handleMarkAsSubmitted}
              className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Opted-Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
