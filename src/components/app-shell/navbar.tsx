'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Key, Menu, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Ferme le menu mobile automatiquement lors d'un changement de page
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

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
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            href="/" 
            className={`font-anybody text-xs font-bold uppercase tracking-wider transition-colors ${
              pathname === '/' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Home
          </Link>
          <Link 
            href="/events" 
            className={`font-anybody text-xs font-bold uppercase tracking-wider transition-colors ${
              pathname === '/events' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Events
          </Link>
          <Link 
            href="/check-in" 
            className={`font-anybody text-xs font-bold uppercase tracking-wider transition-colors ${
              pathname === '/check-in' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Tracks
          </Link>
          <Link 
            href="/dashboard" 
            className={`font-anybody text-xs font-bold uppercase tracking-wider transition-colors ${
              pathname === '/dashboard' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/pit-lane" 
            className={`font-anybody text-xs font-bold uppercase tracking-wider transition-colors ${
              pathname === '/pit-lane' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Pit Lane
          </Link>
          <Link 
            href="/admin" 
            className={`font-anybody text-xs font-bold uppercase tracking-wider transition-colors ${
              pathname === '/admin' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Admin
          </Link>
        </nav>

        {/* User Actions & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* User Profile / Login Button */}
          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface border border-[#353535] hover:border-primary transition-all text-xs font-medium"
              >
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline text-foreground max-w-30 truncate">
                  {user.email}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 rounded bg-surface-dim hover:bg-secondary/15 border border-[#353535] hover:border-secondary transition-all text-secondary cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                href="/dashboard"
                className="px-4 py-1.5 bg-primary text-black font-anybody font-extrabold uppercase text-xs tracking-wider border border-black hover:bg-secondary hover:text-white transition-all sport-skew flex items-center gap-2 shadow-[2px_2px_0px_#000]"
              >
                <span className="transform skew-x-8 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Se Connecter
                </span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded bg-surface border border-[#353535] hover:border-primary text-foreground/75 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            aria-label="Menu principal"
          >
            {isOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown Overlay */}
      {isOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-[#353535] px-6 py-5 flex flex-col gap-4 animate-fade-in shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <Link 
            href="/" 
            className={`font-anybody text-sm font-bold uppercase tracking-wider py-2 border-b border-[#353535]/30 transition-colors ${
              pathname === '/' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Home
          </Link>
          <Link 
            href="/events" 
            className={`font-anybody text-sm font-bold uppercase tracking-wider py-2 border-b border-[#353535]/30 transition-colors ${
              pathname === '/events' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Events
          </Link>
          <Link 
            href="/check-in" 
            className={`font-anybody text-sm font-bold uppercase tracking-wider py-2 border-b border-[#353535]/30 transition-colors ${
              pathname === '/check-in' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Tracks
          </Link>
          <Link 
            href="/dashboard" 
            className={`font-anybody text-sm font-bold uppercase tracking-wider py-2 border-b border-[#353535]/30 transition-colors ${
              pathname === '/dashboard' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/pit-lane" 
            className={`font-anybody text-sm font-bold uppercase tracking-wider py-2 border-b border-[#353535]/30 transition-colors ${
              pathname === '/pit-lane' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Pit Lane
          </Link>
          <Link 
            href="/admin" 
            className={`font-anybody text-sm font-bold uppercase tracking-wider py-2 transition-colors ${
              pathname === '/admin' ? 'text-primary' : 'text-foreground/60 hover:text-primary'
            }`}
          >
            Admin
          </Link>
        </nav>
      )}
    </div>
  );
}
