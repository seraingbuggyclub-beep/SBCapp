'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ghost, ArrowLeftRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface SimulationContextType {
  simulatedProfile: any;
  setSimulatedProfile: (profile: any) => void;
  isSimulationActive: boolean;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simulatedProfile, setSimulatedProfileState] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Charger le profil simulé depuis le sessionStorage après le montage (évite les erreurs d'hydratation)
  useEffect(() => {
    setIsMounted(true);
    const saved = sessionStorage.getItem('sbc_simulated_profile');
    if (saved) {
      try {
        setSimulatedProfileState(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur de parsing du profil simulé:", e);
      }
    }
  }, []);

  const setSimulatedProfile = (profile: any) => {
    if (profile) {
      sessionStorage.setItem('sbc_simulated_profile', JSON.stringify(profile));
    } else {
      sessionStorage.removeItem('sbc_simulated_profile');
    }
    setSimulatedProfileState(profile);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'daily_member': return 'Membre d\'un jour';
      case 'member': return 'Membre';
      case 'visitor': return 'Visiteur';
      default: return role;
    }
  };

  return (
    <SimulationContext.Provider value={{ simulatedProfile, setSimulatedProfile, isSimulationActive: !!simulatedProfile }}>
      {isMounted && simulatedProfile && (
        <div className="w-full bg-linear-to-r from-[#121212] via-[#FF6B00]/10 to-[#121212] border-b border-[#FF6B00] px-6 py-2.5 flex items-center justify-between shadow-2xl relative z-50 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6B00]"></span>
            </span>
            <div className="text-[10px] sm:text-xs font-mono tracking-wider text-white uppercase flex items-center gap-1.5 flex-wrap">
              <span className="text-primary font-black flex items-center gap-1">
                <Ghost className="w-3.5 h-3.5 animate-pulse" />
                [MODE MASQUERADE ACTIVE]
              </span>
              <span className="text-[#404040] hidden sm:inline">|</span>
              <span>Simulation : <strong className="text-white">{simulatedProfile.first_name} {simulatedProfile.last_name}</strong></span> 
              <span className="text-[#404040]">|</span>
              <span>Rôle : <strong className="text-primary">{getRoleLabel(simulatedProfile.role)}</strong></span>
              <span className="text-[#404040] hidden md:inline">|</span>
              <span className="text-foreground/50 hidden md:inline">{simulatedProfile.email}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            {pathname !== '/admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="px-2.5 py-1 rounded border border-[#353535] hover:border-primary text-foreground/75 hover:text-white text-[9px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3 text-primary" />
                Admin
              </button>
            )}
            <button
              onClick={() => {
                setSimulatedProfile(null);
                router.refresh();
              }}
              className="px-3 py-1 rounded bg-primary hover:bg-[#e05e00] text-black text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              Quitter
            </button>
          </div>
        </div>
      )}
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation doit être utilisé au sein d\'un SimulationProvider');
  }
  return context;
}
