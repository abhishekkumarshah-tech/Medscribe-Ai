import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-surface-muted">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
