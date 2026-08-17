'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Trophy, Shield, Coffee, Scale, ShieldCheck, Lock } from 'lucide-react';

export default function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/admin',
      label: 'Membres & Cadenas',
      icon: Users,
      active: pathname === '/admin',
    },
    {
      href: '/admin/presences',
      label: 'Présences FBA',
      icon: ShieldCheck,
      active: pathname.startsWith('/admin/presences'),
    },
    {
      href: '/admin/comptabilite',
      label: 'Comptabilité ASBL',
      icon: Scale,
      active: pathname.startsWith('/admin/comptabilite'),
    },
    {
      href: '/admin/buvette',
      label: 'Buvette & POS',
      icon: Coffee,
      active: pathname.startsWith('/admin/buvette'),
    },
    {
      href: '/admin/rgpd',
      label: 'RGPD & APD',
      icon: Lock,
      active: pathname.startsWith('/admin/rgpd'),
    },
    {
      href: '/admin/events',
      label: 'Événements & Courses',
      icon: Trophy,
      active: pathname === '/admin/events',
    },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-[#353535] pb-2 mb-6">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2.5 rounded font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew cursor-pointer ${
              item.active
                ? 'bg-primary text-black shadow-[3px_3px_0px_#000]'
                : 'bg-surface text-foreground/70 hover:text-white hover:bg-surface-high border border-[#353535]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 transform skew-x-8" />
            <span className="transform skew-x-8">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
