import React, { useState } from 'react';
import { Search, ExternalLink, Mail, ShieldCheck, X, Copy, Check } from 'lucide-react';
import { VERIFIED_COMPANIES, VerifiedCompanyRecord } from '../data/verifiedCompanies';

interface PrivacyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompanyForOptOut: (company: VerifiedCompanyRecord) => void;
}

export const PrivacyDirectoryModal: React.FC<PrivacyDirectoryModalProps> = ({
  isOpen,
  onClose,
  onSelectCompanyForOptOut,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['ALL', 'COUPONS & ADVO', 'FINANCIAL & CREDIT', 'CATALOGS & RETAIL', 'CHARITY & NONPROFIT'];

  const filteredCompanies = VERIFIED_COMPANIES.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.privacyEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'COUPONS & ADVO' && (company.notes?.includes('coupon') || company.domain.includes('valpak') || company.domain.includes('save.com') || company.domain.includes('moneysaver'))) ||
      (selectedCategory === 'FINANCIAL & CREDIT' && (company.notes?.includes('credit') || company.domain.includes('capitalone') || company.domain.includes('discover') || company.domain.includes('chase') || company.domain.includes('citi') || company.domain.includes('amex'))) ||
      (selectedCategory === 'CATALOGS & RETAIL' && (company.notes?.includes('catalog') || company.domain.includes('uline') || company.domain.includes('williams-sonoma') || company.domain.includes('rh.com'))) ||
      (selectedCategory === 'CHARITY & NONPROFIT' && (company.notes?.includes('charity') || company.notes?.includes('nonprofit') || company.domain.includes('stjude')));

    return matchesSearch && matchesCategory;
  });

  function handleCopyEmail(email: string) {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-stone-950 sm:bg-stone-950/80 sm:backdrop-blur-sm sm:p-4 overflow-y-auto">
      <div className="relative w-full sm:max-w-4xl bg-stone-900 sm:border sm:border-stone-800 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-full sm:min-h-0 sm:max-h-[88vh] text-stone-100 sm:my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 bg-stone-900/95 shrink-0 pt-safe">
          <div className="flex items-center space-x-2.5 sm:space-x-3 truncate">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-stone-50 truncate">
                Junk Mail Suppression Directory
              </h2>
              <p className="text-[11px] text-stone-400 truncate">
                50+ Corporate Privacy Compliance Endpoints & Opt-Out Portals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 sm:p-5 border-b border-stone-800 bg-stone-950/50 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies (Valpak, Capital One, Uline)..."
              className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-10 pr-4 py-2.5 text-sm sm:text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex overflow-x-auto no-scrollbar gap-1.5 text-xs py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[34px] ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Company List */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-2.5 sm:space-y-3 flex-1 pb-safe">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              No verified mailers found matching your search.
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <div
                key={company.domain}
                className="p-3.5 sm:p-4 bg-stone-950/60 rounded-xl border border-stone-800 hover:border-stone-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-stone-100">{company.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                      {company.domain}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
                    <div className="flex items-center space-x-1 font-mono text-[11px] text-emerald-400">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="break-all">{company.privacyEmail}</span>
                      <button
                        onClick={() => handleCopyEmail(company.privacyEmail)}
                        className="p-1 text-stone-400 hover:text-stone-200 min-h-[28px] min-w-[28px] flex items-center justify-center"
                        title="Copy email"
                      >
                        {copiedEmail === company.privacyEmail ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {company.statutoryBasis && (
                      <span className="text-[10px] text-stone-500 font-mono">
                        Statute: {company.statutoryBasis}
                      </span>
                    )}
                  </div>

                  {company.notes && (
                    <p className="text-[11px] text-stone-400 line-clamp-2">{company.notes}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0 pt-1 sm:pt-0">
                  {company.portalUrl && (
                    <a
                      href={company.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center justify-center gap-1 min-h-[40px]"
                    >
                      <span>Web Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      onSelectCompanyForOptOut(company);
                      onClose();
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors text-center min-h-[40px]"
                  >
                    Draft Notice
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
