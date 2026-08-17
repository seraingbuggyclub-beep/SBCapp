import React from 'react';
import { UserCheck, Radio, Clock } from 'lucide-react';
import { PublicPresenceItem } from '@/types/models';

interface PresenceListProps {
  presences: PublicPresenceItem[];
}

export default function PresenceList({ presences }: PresenceListProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    const fn = firstName ? firstName.charAt(0) : '';
    const ln = lastName ? lastName.charAt(0) : '';
    return `${fn}${ln}`.toUpperCase() || 'SB';
  };

  return (
    <div className="w-full premium-card rounded-lg overflow-hidden border border-[#353535]">
      {/* Header bar */}
      <div className="bg-surface-dim px-5 py-4 border-b border-[#353535] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <h3 className="font-anybody font-black text-sm uppercase tracking-wider text-white sport-skew">
            Pilotes en Piste <span className="text-primary">({presences.length})</span>
          </h3>
        </div>
        <span className="text-[10px] font-mono text-foreground/40 bg-surface px-2 py-0.5 rounded border border-[#353535]">
          LIVE TELEMETRY
        </span>
      </div>

      {presences.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-surface-dim border border-[#353535] flex items-center justify-center text-foreground/30 mb-3">
            <UserCheck className="w-5 h-5" />
          </div>
          <p className="text-xs text-foreground/50 font-mono">Aucun pilote enregistré sur le circuit actuellement.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#353535]/50 max-h-100 overflow-y-auto">
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
                  <div className="hidden sm:block">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                      presence.check_in_type === 'auto'
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-tertiary/10 text-tertiary border border-tertiary/20'
                    }`}>
                      {presence.check_in_type === 'auto' ? 'Radar Auto' : 'Manuel'}
                    </span>
                  </div>

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
  );
}
