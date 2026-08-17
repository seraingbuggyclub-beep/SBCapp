'use client';

import React from 'react';
import AppHeader from './AppHeader';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      {/* Top Application Header */}
      <AppHeader />

      {/* Main Page Area */}
      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>

      {/* Subtle Carbon Pattern Footer */}
      <footer className="border-t border-[#353535]/70 py-6 px-6 bg-surface-dim/80 text-center font-mono text-[10px] text-foreground/45">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Seraing Buggy Club (SBC) ASBL - Affilié FBA</span>
          <span className="text-primary font-bold">Piste Tout-Terrain Seraing, Belgique</span>
        </div>
      </footer>
    </div>
  );
}
