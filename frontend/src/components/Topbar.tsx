import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { logout } = useAuth();
  return (
    <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-line bg-surface">
      <div>
        <h1 className="text-[15px] font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button className="text-ink-500 hover:text-ink-900 transition-colors" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.8} />
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </header>
  );
}
