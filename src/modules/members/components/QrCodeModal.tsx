'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Sun, Moon, Shield, CheckCircle2, AlertTriangle, Maximize2 } from 'lucide-react';
import { getMemberQrPayload, getMemberQrTheme } from '../utils/qrcode';
import { MemberProfile } from '@/types/models';

interface QrCodeModalProps {
  member: MemberProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QrCodeModal({ member, isOpen, onClose }: QrCodeModalProps) {
  const [sunMode, setSunMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const payload = getMemberQrPayload(member.id);
  const theme = getMemberQrTheme(member.payment_status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Content */}
      <div
        className={`relative z-10 w-full max-w-sm rounded-2xl border transition-all duration-300 overflow-hidden shadow-[8px_8px_0px_#000] ${
          sunMode
            ? 'bg-white text-black border-zinc-300'
            : `bg-[#0e0e0e] text-white ${theme.containerBorder} ${theme.glowClass}`
        }`}
      >
        {/* Header */}
        <div className={`p-4 flex items-center justify-between border-b ${sunMode ? 'border-zinc-200' : 'border-[#292929]'}`}>
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${sunMode ? 'text-black' : 'text-primary'}`} />
            <span className="font-anybody font-black text-sm uppercase tracking-wider">
              Pass Pilote SBC
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sun Mode Toggle */}
            <button
              onClick={() => setSunMode(!sunMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border ${
                sunMode
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200'
                  : 'bg-surface border-[#353535] text-foreground/70 hover:text-white'
              }`}
              title="Activer le mode contraste élevé pour scanner en plein soleil"
            >
              {sunMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span className="text-[11px] font-bold">{sunMode ? 'Mode Sombre' : 'Mode Soleil'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                sunMode ? 'hover:bg-zinc-200 text-zinc-600' : 'hover:bg-surface text-foreground/60 hover:text-white'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Pilot info + QR Code */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {/* Pilot Identity */}
          <div className="space-y-0.5">
            <h3 className="font-anybody font-black text-2xl uppercase tracking-tight">
              {member.first_name} {member.last_name}
            </h3>
            <div className="flex items-center justify-center gap-2 text-xs font-mono opacity-70">
              <span>Licence : <strong className={sunMode ? 'text-black' : 'text-primary'}>{member.license_number || 'Non renseignée'}</strong></span>
              {member.transponder_number && (
                <>
                  <span>•</span>
                  <span>Transpondeur : <strong>{member.transponder_number}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* QR Code Container */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-center transition-all ${
              sunMode
                ? 'bg-white border-zinc-300 shadow-md'
                : `bg-[#080808] ${theme.containerBorder} shadow-inner`
            }`}
          >
            <QRCodeSVG
              value={payload}
              size={240}
              level="H"
              includeMargin={false}
              fgColor={sunMode ? '#000000' : theme.fgColor}
              bgColor={sunMode ? '#FFFFFF' : 'transparent'}
            />
          </div>

          {/* Status Badge */}
          <div className="w-full pt-1">
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-mono font-bold ${
                sunMode
                  ? theme.isPaid
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                  : theme.badgeClass
              }`}
            >
              {theme.isPaid ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="leading-tight">{theme.badgeText}</span>
            </div>
          </div>

          {/* Usage hint */}
          <p className={`text-[10px] font-mono ${sunMode ? 'text-zinc-500' : 'text-foreground/40'}`}>
            Présentez ce QR code à la buvette SBC ou lors du contrôle des présences FBA.
          </p>
        </div>
      </div>
    </div>
  );
}
