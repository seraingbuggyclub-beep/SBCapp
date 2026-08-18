'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, MapPin, ShieldAlert, Award, Calendar, Radio, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadBrief } from '@/hooks/useUnreadBrief';

export default function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const { hasUnreadBrief, markAsRead } = useUnreadBrief();

  const links = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/events', label: 'Courses & Calendrier', icon: Calendar },
    { href: '/check-in', label: 'Check-in Terrain', icon: MapPin },
    { href: '/dashboard', label: 'Espace Pilote', icon: LayoutDashboard },
    { href: '/pit-lane', label: 'Pit-Lane', icon: Radio },
  ];

  return (
    <aside className="w-full md:w-64 border-r border-[#353535] bg-surface-dim px-4 py-6 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <h2 className="px-3 mb-3 text-[10px] font-mono uppercase tracking-widest text-foreground/40 font-semibold">
            Navigation SBC
          </h2>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              const isPitLane = link.href === '/pit-lane';
              const showUnread = isPitLane && hasUnreadBrief;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    if (isPitLane) markAsRead();
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded font-medium text-sm transition-all border ${
                    isActive
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-[inset_0_0_12px_rgba(255,110,0,0.1)]'
                      : showUnread
                      ? 'bg-primary/5 text-primary border-primary/30 animate-pulse drop-shadow-[0_0_8px_rgba(255,110,0,0.5)]'
                      : 'text-foreground/75 border-transparent hover:bg-surface/50 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive || showUnread ? 'text-primary' : 'text-foreground/50'}`} />
                    <span className={showUnread ? 'font-bold' : ''}>{link.label}</span>
                  </div>
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded font-medium text-sm transition-all border ${
                  pathname.startsWith('/admin')
                    ? 'bg-primary/10 text-primary border-primary/20 shadow-[inset_0_0_12px_rgba(255,110,0,0.1)]'
                    : 'text-foreground/75 border-transparent hover:bg-surface/50 hover:text-foreground'
                }`}
              >
                <Shield className={`w-4 h-4 ${pathname.startsWith('/admin') ? 'text-primary' : 'text-foreground/50'}`} />
                Administration
              </Link>
            )}
          </nav>
        </div>

        {/* Club Info Segment */}
        <div className="p-3.5 rounded bg-surface border border-[#353535]">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="font-anybody font-black text-xs uppercase tracking-tight text-white">
              Seraing Buggy Club
            </span>
          </div>
          <p className="text-[11px] text-foreground/60 leading-relaxed font-mono">
            Piste tout-terrain 1/8ème & 1/10ème thermique & électrique située à Seraing. Affilié FBA.
          </p>
        </div>
      </div>

      {/* Insurance warning footer inside sidebar */}
      <div className="mt-6 md:mt-0 p-3 rounded bg-secondary/10 border border-secondary/20 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
        <div className="text-[10px] leading-tight text-secondary/90 font-medium font-mono">
          Assurance FBA active uniquement pour les membres encodés en présence sur place.
        </div>
      </div>
    </aside>
  );
}
