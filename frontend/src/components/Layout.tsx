import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh min-h-screen overflow-hidden bg-surface-muted">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          subtitle={subtitle}
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
