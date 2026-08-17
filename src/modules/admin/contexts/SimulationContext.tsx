'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ghost, ArrowLeftRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { MemberProfile } from '@/types/models';

interface SimulationContextType {
  simulatedProfile: MemberProfile | null;
  setSimulatedProfile: (profile: MemberProfile | null) => void;
  isSimulationActive: boolean;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simulatedProfile, setSimulatedProfileState] = useState<MemberProfile | null>(null);
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

  const setSimulatedProfile = (profile: MemberProfile | null) => {
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
            <Ghost className="w-4 h-4 text-[#FF6B00]" />
            <span className="text-xs font-mono tracking-wider uppercase text-white font-bold">
              Simulation Active : <span className="text-[#FF6B00]">{simulatedProfile.first_name} {simulatedProfile.last_name}</span> ({getRoleLabel(simulatedProfile.role || 'visitor')})
            </span>
          </div>

          <div className="flex items-center gap-4">
            {pathname !== '/admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="text-[11px] font-mono text-[#A0A0A0] hover:text-white transition-colors underline flex items-center gap-1"
              >
                Retour Admin
              </button>
            )}
            <button
              onClick={() => setSimulatedProfile(null)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 border border-[#FF6B00]/40 rounded text-xs font-bold text-[#FF6B00] transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Quitter la simulation
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
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
