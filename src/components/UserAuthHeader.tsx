import React, { useState, useEffect } from 'react';
import {
  Trees,
  ShieldCheck,
  LogOut,
  User,
  Users,
  ShieldAlert,
  BookOpen,
  Plus,
  Droplets,
  Wind,
  Layers,
  ChevronDown
} from 'lucide-react';
import { UserProfile } from '../types';

interface UserAuthHeaderProps {
  currentUser: UserProfile;
  onSwitchUser: (email: string, name?: string) => void;
  onOpenScanner: () => void;
  onOpenAdminPurge: () => void;
  onOpenDirectory: () => void;
  totalSubmissions: number;
}

export const UserAuthHeader: React.FC<UserAuthHeaderProps> = ({
  currentUser,
  onSwitchUser,
  onOpenScanner,
  onOpenAdminPurge,
  onOpenDirectory,
  totalSubmissions,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [showCustomLogin, setShowCustomLogin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setAvailableUsers(data.users);
      })
      .catch((err) => console.warn('Could not fetch user list:', err));
  }, [currentUser]);

  // Mathematical environmental savings impact based on average junk mail weight
  // (avg 4.1 lbs / month per household, 1 ton paper = 17 trees, 7000 gal water, 3.3 tons CO2)
  const piecesPrevented = totalSubmissions * 12; // annualized per opt-out
  const lbsPaperSaved = Math.round(piecesPrevented * 0.18);
  const treesSaved = (lbsPaperSaved / 117).toFixed(1);
  const gallonsWaterSaved = Math.round(lbsPaperSaved * 3.5);

  function handleQuickLogin(user: UserProfile) {
    onSwitchUser(user.email, user.name);
    setShowUserMenu(false);
  }

  function handleCustomLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customEmailInput || !customEmailInput.includes('@')) return;
    onSwitchUser(customEmailInput);
    setCustomEmailInput('');
    setShowCustomLogin(false);
    setShowUserMenu(false);
  }

  return (
    <header className="bg-stone-900 border-b border-stone-800 text-stone-100 sticky top-0 z-30 shadow-md">
      {/* Top Banner & User Profile Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
            <Trees className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-stone-50">
                TreeSaver
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/80 text-emerald-400">
                Opt-Out
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden md:block">
              Forensic Postal Vision OCR • Statutory Prohibitory Orders • CCPA & DMA Suppression
            </p>
          </div>
        </div>

        {/* Action Controls & User Identity */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {/* Verified Directory Button (hidden on smallest screens, available in bottom nav) */}
          <button
            onClick={onOpenDirectory}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700/60 text-xs font-medium transition-colors"
            title="Browse verified suppression contacts for top 50 junk mailers"
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
            <span>50+ Privacy Directory</span>
          </button>

          {/* Admin Purge Button (Only visible to admins) */}
          {currentUser.isAdmin && (
            <button
              onClick={onOpenAdminPurge}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/80 text-red-300 border border-red-800/60 text-xs font-semibold transition-colors min-h-[38px]"
              title="Global Admin: Purge all mail records for all users"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Admin Purge</span>
            </button>
          )}

          {/* Primary Scan Button (compact on mobile) */}
          <button
            onClick={onOpenScanner}
            className="flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/50 transition-all active:scale-95 min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Scan</span>
            <span className="hidden sm:inline">Mail</span>
          </button>

          {/* Google User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-1.5 sm:space-x-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-800 border border-stone-700 text-stone-200 transition-colors min-h-[38px] min-w-[38px]"
              aria-label="User Account Menu"
            >
              {currentUser.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-emerald-500/50"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-300 text-xs font-bold flex items-center justify-center ring-1 ring-emerald-500/40">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden lg:block text-left text-xs">
                <div className="font-semibold text-stone-100 flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  {currentUser.isAdmin && (
                    <span className="text-[9px] bg-red-950 text-red-300 px-1 py-0.2 rounded border border-red-800/50">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-stone-400 truncate max-w-[120px]">
                  {currentUser.email}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* Dropdown Menu: Multi-User Switcher & Google Sign-In */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50 sm:hidden"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-auto sm:mt-2 left-3 sm:left-auto max-w-sm sm:w-72 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl py-2 z-50 text-xs text-stone-200 divide-y divide-stone-800">
                  {/* Active user status */}
                  <div className="px-4 py-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
                      Logged in via Google
                    </span>
                    <div className="font-bold text-stone-50 mt-0.5 text-sm">{currentUser.name}</div>
                    <div className="text-stone-400 font-mono text-[11px] truncate">{currentUser.email}</div>
                    {currentUser.isAdmin && (
                      <div className="mt-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-800/50 text-[10px] text-red-300 font-medium">
                        <ShieldCheck className="w-3 h-3 text-red-400" />
                        <span>Admin Rights: Can Purge System Data</span>
                      </div>
                    )}
                  </div>

                  {/* Switch to another independent user */}
                  <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-stone-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Switch User Account</span>
                    </div>

                    {availableUsers.map((u) => {
                      const isCurrent = u.email.toLowerCase() === currentUser.email.toLowerCase();
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleQuickLogin(u)}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                            isCurrent
                              ? 'bg-emerald-950/40 text-emerald-300 font-semibold'
                              : 'hover:bg-stone-800 text-stone-300'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="font-medium text-stone-100 flex items-center gap-1">
                              {u.name}
                              {u.isAdmin && (
                                <span className="text-[9px] bg-red-950 text-red-400 px-1 rounded border border-red-850">
                                  admin
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">{u.email}</div>
                          </div>
                          {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Google Sign-In Input */}
                  <div className="p-3">
                    {showCustomLogin ? (
                      <form onSubmit={handleCustomLoginSubmit} className="space-y-2">
                        <input
                          type="email"
                          value={customEmailInput}
                          onChange={(e) => setCustomEmailInput(e.target.value)}
                          placeholder="your-name@gmail.com"
                          className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-base sm:text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="submit"
                            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                          >
                            Sign In
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCustomLogin(false)}
                            className="px-2.5 py-2 bg-stone-800 text-stone-400 hover:text-stone-200 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowCustomLogin(true)}
                        className="w-full text-center px-3 py-2 rounded-lg border border-dashed border-stone-700 hover:border-stone-500 text-stone-400 hover:text-stone-200 text-xs font-medium transition-colors"
                      >
                        + Sign In with Another Google Email
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Environmental Impact Ticker Bar - Horizontal Swipeable on Mobile */}
      <div className="bg-stone-950/80 border-t border-stone-800/80 px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-1.5 text-stone-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-medium text-stone-300 text-[11px] sm:text-xs">
              Impact:
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-6 font-mono text-[10px] sm:text-[11px] shrink-0">
            <div className="flex items-center space-x-1 text-emerald-400">
              <Trees className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span><strong>{treesSaved}</strong> Trees</span>
            </div>

            <div className="flex items-center space-x-1 text-stone-300">
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              <span><strong>{lbsPaperSaved}</strong> lbs Paper</span>
            </div>

            <div className="flex items-center space-x-1 text-sky-400">
              <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span><strong>{gallonsWaterSaved}</strong> gal Water</span>
            </div>

            <div className="flex items-center space-x-1 text-stone-400">
              <Wind className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300 shrink-0" />
              <span><strong>{Math.round(lbsPaperSaved * 1.5)}</strong> lbs CO₂</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
