'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MemberProfile } from '@/types/models';
import { getMemberQrPayload, getMemberQrTheme } from '../utils/qrcode';
import QrCodeModal from './QrCodeModal';
import { Maximize2, Shield, CheckCircle2, AlertTriangle, Sparkles, Hash } from 'lucide-react';

interface MemberQrCodeCardProps {
  member: MemberProfile | null;
  className?: string;
}

export default function MemberQrCodeCard({ member, className = '' }: MemberQrCodeCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!member) return null;

  const payload = getMemberQrPayload(member.id);
  const theme = getMemberQrTheme(member.payment_status);

  return (
    <>
      <div
        className={`bg-surface/90 backdrop-blur-md border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-4 ${theme.containerBorder} ${className}`}
      >
        {/* Glow background effect */}
        <div
          className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
            theme.isPaid ? 'bg-green-500/10' : 'bg-red-500/15'
          }`}
        />

        {/* Top bar: Header & Expand button */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-anybody font-black text-xs uppercase tracking-wider text-white block">
                Pass Pilote Officiel
              </span>
              <span className="text-[10px] font-mono text-foreground/50">
                Seraing Buggy Club
              </span>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-xs font-mono text-foreground/70 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer hover:border-primary"
            title="Agrandir le QR Code pour le scanner"
          >
            <Maximize2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold">Agrandir</span>
          </button>
        </div>

        {/* Middle: Content with QR Code and Pilot details */}
        <div className="flex items-center gap-4 relative z-10">
          {/* QR Code thumbnail (Clickable to open modal) */}
          <div
            onClick={() => setModalOpen(true)}
            className={`p-2.5 rounded-xl border bg-black shrink-0 cursor-pointer transition-transform hover:scale-105 group relative ${theme.containerBorder} ${theme.glowClass}`}
            title="Cliquer pour afficher en grand écran"
          >
            <QRCodeSVG
              value={payload}
              size={84}
              level="M"
              fgColor={theme.fgColor}
              bgColor="transparent"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Pilot information */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="font-anybody font-black text-base md:text-lg text-white uppercase tracking-tight truncate">
              {member.first_name} {member.last_name}
            </h3>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-foreground/70">
                <span className="text-foreground/40">Licence :</span>
                <span className="font-bold text-primary truncate">
                  {member.license_number || 'Non renseignée'}
                </span>
              </div>

              {member.transponder_number && (
                <div className="flex items-center gap-1.5 text-foreground/60 text-[11px]">
                  <Hash className="w-3 h-3 text-foreground/40" />
                  <span>Transpondeur : {member.transponder_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Status Badge */}
        <div className="pt-2 border-t border-[#353535] relative z-10 flex items-center justify-between gap-2">
          <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 text-[11px] font-mono font-bold ${theme.badgeClass}`}>
            {theme.isPaid ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{theme.badgeText}</span>
          </div>

          <span className="text-[10px] font-mono text-foreground/40 shrink-0">
            ID: {member.id.substring(0, 8)}...
          </span>
        </div>
      </div>

      {/* Fullscreen Sun Mode Modal */}
      <QrCodeModal
        member={member}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
