'use client';

import React, { useState } from 'react';
import { UserCheck, Radio, Clock, Navigation, LogOut, Loader2 } from 'lucide-react';
import { PublicPresenceItem } from '@/types/models';
import { useAuth } from '@/hooks/useAuth';
import { usePresenceZone } from '../contexts/PresenceZoneContext';
import { checkOutMember } from '../actions';
import Link from 'next/link';

interface PresenceListProps {
  presences: PublicPresenceItem[];
}

export default function PresenceList({ presences }: PresenceListProps) {
  const { user } = useAuth();
  const { isCheckedIn, activePresence, refreshPresence } = usePresenceZone();
  const [checkingOut, setCheckingOut] = useState(false);

  const getInitials = (firstName?: string, lastName?: string) => {
    const fn = firstName ? firstName.charAt(0) : '';
    const ln = lastName ? lastName.charAt(0) : '';
    return `${fn}${ln}`.toUpperCase() || 'SB';
  };

  const handleCheckOut = async () => {
    if (!activePresence?.id) return;
    setCheckingOut(true);
    try {
      await checkOutMember(activePresence.id);
      await refreshPresence();
    } catch (err) {
      console.error('Erreur checkout landing page:', err);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="w-full premium-card rounded-lg overflow-hidden border border-[#353535] flex flex-col justify-between">
      <div>
        {/* Header bar */}
        <div className="bg-surface-dim px-5 py-4 border-b border-[#353535] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <h3 className="font-anybody font-black text-sm uppercase tracking-wider text-white sport-skew">
              Pilotes Sur Site <span className="text-primary">({presences.length})</span>
            </h3>
          </div>
          <span className="text-[10px] font-mono text-foreground/40 bg-surface px-2 py-0.5 rounded border border-[#353535]">
            LIVE TELEMETRY
          </span>
        </div>

        {/* List */}
        {presences.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-surface-dim border border-[#353535] flex items-center justify-center text-foreground/30 mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <p className="text-xs text-foreground/50 font-mono">Aucun pilote enregistré sur le site actuellement.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#353535]/50 max-h-80 overflow-y-auto">
            {presences.map((presence) => {
              const member = presence.sbc_members;
              const timeString = new Date(presence.check_in_time).toLocaleTimeString('fr-BE', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={presence.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-high/35 transition-colors"
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-background border border-primary/20 flex items-center justify-center text-primary font-anybody font-extrabold text-xs sport-skew shadow-[1px_1px_0px_#000]">
                      <span className="transform skew-x-8">
                        {getInitials(member?.first_name, member?.last_name)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {member?.first_name || 'Pilote'} {member?.last_name || 'SBC'}
                      </h4>
                      <p className="text-[10px] text-foreground/45 font-mono">
                        {member?.license_number || 'Pas de licence FBA'}
                      </p>
                    </div>
                  </div>

                  {/* Telemetry info */}
                  <div className="flex items-center gap-4 text-right">
                    <div className="flex items-center gap-1.5 text-xs text-foreground/60 font-mono">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{timeString}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Action Button */}
      <div className="p-4 bg-surface-dim border-t border-[#353535]">
        {user && isCheckedIn ? (
          <button
            onClick={handleCheckOut}
            disabled={checkingOut}
            className="w-full py-2.5 px-4 rounded bg-secondary hover:bg-red-700 text-white font-anybody font-extrabold text-xs uppercase tracking-wider transition-all sport-skew flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
          >
            {checkingOut ? (
              <Loader2 className="w-4 h-4 animate-spin transform skew-x-8" />
            ) : (
              <LogOut className="w-4 h-4 transform skew-x-8" />
            )}
            <span className="transform skew-x-8">Quitter le site</span>
          </button>
        ) : (
          <Link
            href="/check-in"
            className="w-full py-2.5 px-4 rounded bg-primary hover:bg-primary/90 text-black font-anybody font-extrabold text-xs uppercase tracking-wider transition-all sport-skew flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000] cursor-pointer text-center"
          >
            <Navigation className="w-4 h-4 transform skew-x-8" />
            <span className="transform skew-x-8">📍 Enregistrer ma présence sur site</span>
          </Link>
        )}
      </div>
    </div>
  );
}
