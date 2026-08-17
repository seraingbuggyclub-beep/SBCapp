'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Search, User, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { MemberBalanceItem } from '@/types/models';
import { getMemberBarDetails } from '../actions';
import { extractMemberIdFromQr } from '@/modules/members/utils/qrcode';

interface BarQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberSelected: (member: MemberBalanceItem) => void;
}

export default function BarQrScannerModal({
  isOpen,
  onClose,
  onMemberSelected,
}: BarQrScannerModalProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = 'bar-qr-reader-region';

  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    const stopAllTracks = () => {
      try {
        const videoElem = document.querySelector(`#${readerId} video`) as HTMLVideoElement | null;
        if (videoElem && videoElem.srcObject) {
          const stream = videoElem.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoElem.srcObject = null;
        }
      } catch (e) {
        console.warn('Erreur coupure pistes vidéo:', e);
      }
    };

    const cleanupScanner = async () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) {
          console.warn('Scanner stop error:', e);
        } finally {
          scannerRef.current = null;
        }
      }
      stopAllTracks();
    };

    const startScanner = async () => {
      setCameraError(null);
      setErrorMsg(null);

      try {
        const html5QrCode = new Html5Qrcode(readerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (!isSubscribed) return;

            // Extraire l'ID membre du QR code (ex: sbc:member:<uuid> ou uuid direct)
            const extractedId = extractMemberIdFromQr(decodedText) || decodedText.trim();
            if (extractedId) {
              setLoading(true);
              const res = await getMemberBarDetails(extractedId);
              setLoading(false);

              if (res.data) {
                // Arrêt scanner et libération caméra immédiate
                await cleanupScanner();
                onMemberSelected(res.data);
                onClose();
              } else {
                setErrorMsg('QR Code valide mais membre introuvable dans la base SBC.');
              }
            }
          },
          () => {} // Ignorer les frames sans QR
        );

        if (isSubscribed) setCameraActive(true);
      } catch (err: unknown) {
        if (isSubscribed) {
          stopAllTracks();
          const msg = err instanceof Error ? err.message : 'Caméra indisponible';
          setCameraError(msg);
          setCameraActive(false);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen, onClose, onMemberSelected]);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    // Si l'utilisateur colle un ID ou scanne via douchette
    const extracted = extractMemberIdFromQr(searchQuery.trim()) || searchQuery.trim();
    const res = await getMemberBarDetails(extracted);
    setLoading(false);

    if (res.data) {
      onMemberSelected(res.data);
      onClose();
    } else {
      setErrorMsg('Aucun membre trouvé avec cet identifiant.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-[#0f0f0f] border border-[#353535] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#292929] flex items-center justify-between bg-surface-dim">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-anybody font-black text-sm uppercase text-white sport-skew">
              Scanner Pass Pilote QR
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface text-foreground/50 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Scanner Video Region */}
          <div className="relative rounded-xl overflow-hidden bg-black border border-[#353535] aspect-square flex flex-col items-center justify-center">
            <div id={readerId} className="w-full h-full" />

            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-foreground/50 text-xs font-mono bg-black/80">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span>Initialisation de la caméra...</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center gap-2 bg-black/90 text-foreground/60 text-xs font-mono">
                <Camera className="w-8 h-8 text-foreground/40" />
                <p>Accès caméra non disponible ou refusé.</p>
                <span className="text-[10px] text-foreground/40">Utilisez la saisie directe ci-dessous.</span>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 text-primary font-mono text-xs z-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Identification du membre...</span>
              </div>
            )}
          </div>

          {/* Fallback Saisie / Douchette USB */}
          <form onSubmit={handleManualSearch} className="space-y-2 pt-2 border-t border-[#292929]">
            <label className="text-[11px] font-mono text-foreground/60 block">
              Saisie ID ou scan douchette :
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="sbc:member:xxx ou ID membre"
                className="flex-1 bg-surface border border-[#353535] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-4 py-2 bg-primary text-black font-anybody font-bold text-xs uppercase rounded-lg hover:bg-secondary hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Valider
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
