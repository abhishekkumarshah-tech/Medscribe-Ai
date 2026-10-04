import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Lock, Settings as SettingsIcon, ShieldCheck, Users, FileText } from 'lucide-react';
import { useAuth } from '../lib/auth';
import medscribeLogo from '../assets/Medscribe-logo.jpeg';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/consultations', label: 'Consultations', icon: FileText },
  { to: '/audit', label: 'Audit Trail', icon: ShieldCheck },
  { to: '/privacy', label: 'Privacy & Security', icon: Lock },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const { doctor } = useAuth();
  const initials = doctor?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'DR';

  return (
    <>
      <div className="h-16 flex items-center gap-2 px-6 border-b border-line">
        <img src={medscribeLogo} alt="" className="h-7 w-7 rounded-md object-contain" />
        <span className="font-semibold text-ink-900 tracking-tight">Medscribe AI</span>
      </div>
      <nav aria-label="Main navigation" className="flex-1 px-3 py-5 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-100 text-brand-900 font-medium'
                  : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900'
              }`
            }
          >
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-line">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div aria-hidden="true" className="h-8 w-8 rounded-full bg-brand-700 text-white flex items-center justify-center text-xs font-medium">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{doctor?.name || 'Doctor'}</p>
            <p className="text-xs text-ink-500 truncate">{doctor?.specialty}</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="hidden md:flex md:w-64 flex-col shrink-0 border-r border-line bg-surface">
        <SidebarContents />
      </aside>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="absolute inset-0 bg-ink-900/35"
          />
          <aside id="mobile-navigation" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface shadow-xl">
            <SidebarContents onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
