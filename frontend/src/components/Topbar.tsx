import React from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Topbar({
  title,
  subtitle,
  mobileMenuOpen,
  onToggleMobileMenu,
}: {
  title: string;
  subtitle?: string;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}) {
  const { logout } = useAuth();

  return (
    <header className="min-h-16 flex items-center justify-between gap-3 px-4 md:px-8 border-b border-line bg-surface">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          className="md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-500 hover:bg-surface-muted hover:text-ink-900"
        >
          {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold text-ink-900">{title}</h1>
          {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => { void logout(); }}
        aria-label="Sign out"
        className="flex shrink-0 items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </header>
  );
}
