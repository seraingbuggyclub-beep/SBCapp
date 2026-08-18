'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSimulation } from '@/modules/admin/contexts/SimulationContext';
import { useUnreadBrief } from '@/hooks/useUnreadBrief';
import { LogOut, User, Key, Menu, X, Shield, Radio, Trophy, LayoutDashboard, QrCode } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import QrCodeModal from '@/modules/members/components/QrCodeModal';

import { isSuperAdmin } from '@/modules/admin/permissions';

export default function AppHeader() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { simulatedProfile, isSimulationActive } = useSimulation();
  const effectiveProfile = simulatedProfile || profile;
  const { hasUnreadBrief, markAsRead } = useUnreadBrief();

  const isSuper = isSuperAdmin(effectiveProfile ? effectiveProfile.email : (user ? user.email : null));
  const isClubAdmin = Boolean(isAdmin || isSuper || effectiveProfile?.role === 'admin');
  const canManageBar = Boolean(
    isClubAdmin ||
    (effectiveProfile?.role === 'referent' && effectiveProfile?.referent_permissions?.can_manage_bar)
  );

  const [isOpen, setIsOpen] = useState(false);
  const [headerQrOpen, setHeaderQrOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Ferme le menu mobile automatiquement lors d'un changement de page
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/events', label: 'Courses & Calendrier' },
    { href: '/check-in', label: 'Check-in Piste' },
    ...(canManageBar ? [{ href: '/buvette', label: 'Buvette' }] : []),
    { href: '/dashboard', label: 'Espace Pilote' },
    { href: '/pit-lane', label: 'Pit-Lane' },
  ];

  return (
    <div className="relative w-full z-40">
      <header className="sticky top-0 w-full border-b border-[#353535] bg-background/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="px-2 h-8 rounded bg-primary flex items-center justify-center font-anybody font-black text-black sport-skew transform text-sm transition-transform group-hover:rotate-12">
              SBC
            </div>
            <span className="font-anybody font-black text-xl tracking-tight uppercase sport-skew text-white group-hover:text-primary transition-colors">
              Seraing <span className="text-primary">Buggy</span> Club
            </span>
          </Link>
          <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono tracking-wider uppercase sport-skew">
            ASBL
          </span>
        </div>

        {/* Navigation Links in Center (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link) => {
            const isPitLane = link.href === '/pit-lane';
            const showUnread = isPitLane && hasUnreadBrief;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  if (isPitLane) markAsRead();
                }}
                className={`font-anybody text-xs font-bold uppercase tracking-wider transition-colors sport-skew relative flex items-center ${
                  showUnread
                    ? 'text-primary animate-pulse drop-shadow-[0_0_8px_rgba(255,110,0,0.9)]'
                    : pathname === link.href
                    ? 'text-primary'
                    : 'text-foreground/60 hover:text-primary'
                }`}
              >
                <span className="transform skew-x-8">{link.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`font-anybody text-xs font-bold uppercase tracking-wider transition-colors sport-skew flex items-center gap-1.5 ${
                pathname.startsWith('/admin') ? 'text-primary' : 'text-foreground/60 hover:text-primary'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="transform skew-x-8">Admin</span>
              {isSimulationActive && (
                <span className="px-1.5 py-0.2 rounded bg-primary/20 border border-primary/40 text-[9px] font-mono text-primary font-bold">
                  SIMULATION
                </span>
              )}
            </Link>
          )}
        </nav>

        {/* Auth / Profile Actions Right */}
        <div className="flex items-center gap-3">
          {(user || simulatedProfile) ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Pass QR Button */}
              {effectiveProfile && (
                <button
                  onClick={() => setHeaderQrOpen(true)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    effectiveProfile.payment_status === 'paid'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                      : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  }`}
                  title="Afficher mon Pass Pilote QR"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">Pass QR</span>
                </button>
              )}

              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-surface border border-[#353535] hover:border-primary text-xs font-mono text-white transition-colors"
              >
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="truncate max-w-28">
                  {effectiveProfile?.first_name ? `${effectiveProfile.first_name}` : user?.email?.split('@')[0]}
                </span>
              </Link>

              <button
                onClick={handleSignOut}
                className="hidden sm:flex p-1.5 rounded hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/50 hover:text-secondary transition-all cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider border border-black hover:bg-secondary hover:text-white transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="transform skew-x-8">Connexion</span>
            </Link>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded bg-surface border border-[#353535] text-white hover:text-primary cursor-pointer transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Fullscreen / Slide Menu */}
      {isOpen && (
        <div className="md:hidden bg-background border-b border-[#353535] px-6 py-6 space-y-4 font-anybody font-bold uppercase tracking-wider text-sm animate-fade-in shadow-2xl">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => {
              const isPitLane = link.href === '/pit-lane';
              const showUnread = isPitLane && hasUnreadBrief;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    if (isPitLane) markAsRead();
                  }}
                  className={`py-2 border-b border-[#353535]/50 flex items-center justify-between transition-colors ${
                    pathname === link.href ? 'text-primary pl-2 border-primary' : 'text-foreground/70 hover:text-primary'
                  }`}
                >
                  <span>{link.label}</span>
                  {showUnread && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/20 border border-primary/40 text-primary text-[10px] font-mono font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>NOUVEAU</span>
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className={`py-2 border-b border-[#353535]/50 flex items-center justify-between ${
                  pathname.startsWith('/admin') ? 'text-primary pl-2 border-primary' : 'text-foreground/70 hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Administration SBC</span>
                </div>
                {isSimulationActive && (
                  <span className="px-1.5 py-0.5 rounded bg-primary/20 border border-primary/40 text-[9px] font-mono text-primary font-bold">
                    SIMULATION
                  </span>
                )}
              </Link>
            )}
          </div>

          {/* Auth in Mobile Menu */}
          <div className="pt-4 border-t border-[#353535] flex items-center justify-between">
            {(user || simulatedProfile) ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setHeaderQrOpen(true);
                    }}
                    className="p-1.5 rounded bg-primary/20 border border-primary/40 text-primary text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Pass QR</span>
                  </button>
                  <span className="text-xs font-mono text-foreground/60">
                    <strong className="text-white">{effectiveProfile?.first_name || user?.email}</strong>
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-xs text-secondary font-mono hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : (
              <Link
                href="/dashboard"
                className="w-full py-2.5 bg-primary text-black text-center font-anybody font-black uppercase text-xs tracking-wider rounded sport-skew block"
              >
                <span className="transform skew-x-8">Se Connecter</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Header QR Modal */}
      <QrCodeModal
        member={profile}
        isOpen={headerQrOpen}
        onClose={() => setHeaderQrOpen(false)}
      />
    </div>
  );
}
