'use client';

import React from 'react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';

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

      {/* Global Legal & Corporate ASBL Footer */}
      <AppFooter />
    </div>
  );
}
