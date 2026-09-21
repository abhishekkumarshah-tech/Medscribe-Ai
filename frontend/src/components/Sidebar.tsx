import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Users, FileText, ShieldCheck, Lock, Settings as SettingsIcon,
} from 'lucide-react';
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

export default function Sidebar() {
  const { doctor } = useAuth();

  return (
    <aside className="hidden md:flex md:w-64 flex-col shrink-0 border-r border-line bg-surface">
      <div className="h-16 flex items-center gap-2 px-6 border-b border-line">
        <img
          src={medscribeLogo}
          alt="Medscribe AI"
          className="h-7 w-7 rounded-md object-contain"
        />
        <span className="font-semibold text-ink-900 tracking-tight">Medscribe AI</span>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-100 text-brand-900 font-medium'
                  : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900'
              }`
            }
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-line">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-brand-700 text-white flex items-center justify-center text-xs font-medium">
            {doctor?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'DR'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{doctor?.name || 'Doctor'}</p>
            <p className="text-xs text-ink-500 truncate">{doctor?.specialty}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
