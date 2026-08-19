'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  FileSignature,
  X,
  Eraser,
  CheckCircle2,
  AlertTriangle,
  Award,
  Shield,
} from 'lucide-react';
import { GeneralAssemblyItem, getErrorMessage } from '@/types/models';
import { addAgSignature } from '../actions';

interface AsblAgSignatureModalProps {
  ag: GeneralAssemblyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSignerName?: string;
}

export default function AsblAgSignatureModal({
  ag,
  isOpen,
  onClose,
  onSuccess,
  defaultSignerName = '',
}: AsblAgSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerRole, setSignerRole] = useState('Administrateur');
  const [customRole, setCustomRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSignerName(defaultSignerName || '');
      setSignerRole('Président');
      setCustomRole('');
      setHasDrawn(false);
      setErrorMsg('');
      setTimeout(initCanvas, 50);
    }
  }, [isOpen, defaultSignerName]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redimensionnement net (support retina / high-dpi)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#22c55e'; // Vert signature numérique
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Coordonnées souris & tactile
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSaveSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ag) return;

    if (!signerName.trim()) {
      setErrorMsg('Veuillez renseigner le nom complet du signataire.');
      return;
    }

    if (!hasDrawn || !canvasRef.current) {
      setErrorMsg('Veuillez apposer votre signature sur le pad tactile.');
      return;
    }

    const finalRole = signerRole === 'AUTRE' ? customRole.trim() || 'Signataire' : signerRole;

    setSaving(true);
    setErrorMsg('');

    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const { success, error } = await addAgSignature(ag.id, {
        signer_name: signerName.trim(),
        signer_role: finalRole,
        signature_data: dataUrl,
      });

      if (!success || error) {
        throw new Error(error || 'Erreur lors de l’enregistrement de la signature.');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !ag) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div className="w-full max-w-lg bg-[#111] p-6 rounded-2xl border border-primary/40 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-anybody font-black text-base uppercase tracking-tight sport-skew text-white">
                Signature Numérique du PV
              </h3>
              <p className="text-[10px] text-foreground/60 truncate max-w-xs">
                {ag.title} • {new Date(ag.date).toLocaleDateString('fr-BE')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface text-foreground/50 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-secondary/15 border border-secondary/30 text-secondary text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveSignature} className="space-y-3.5">
          {/* Identité & Fonction du signataire */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1">
                Nom & Prénom du Signataire *
              </label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Ex: Stéphane G."
                className="w-full bg-[#181818] border border-[#333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1">
                Qualité / Rôle à l'AG *
              </label>
              <select
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
                className="w-full bg-[#181818] border border-[#333] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono cursor-pointer"
              >
                <option value="Président">Président de séance</option>
                <option value="Secrétaire">Secrétaire de séance</option>
                <option value="Trésorier">Trésorier</option>
                <option value="Administrateur">Administrateur (CA)</option>
                <option value="Scrutateur">Scrutateur de vote</option>
                <option value="Membre effectif">Membre effectif présent</option>
                <option value="AUTRE">Autre fonction...</option>
              </select>
            </div>
          </div>

          {signerRole === 'AUTRE' && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1">
                Précisez votre rôle
              </label>
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="Ex: Vérificateur aux comptes"
                className="w-full bg-[#181818] border border-[#333] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-sans"
              />
            </div>
          )}

          {/* Zone de tracé de signature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-foreground/60">
                Pad de signature tactile *
              </span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[10px] text-foreground/50 hover:text-secondary flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Eraser className="w-3 h-3" />
                <span>Effacer</span>
              </button>
            </div>

            <div className="relative w-full h-40 bg-[#161616] border-2 border-dashed border-[#333] hover:border-primary/50 rounded-xl overflow-hidden touch-none flex items-center justify-center transition-colors">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair"
              />

              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-foreground/30 text-xs">
                  <span>Signez ici avec votre doigt ou la souris</span>
                </div>
              )}
            </div>
          </div>

          {/* Déclaration d'approbation */}
          <div className="p-3 rounded-lg bg-[#141414] border border-[#2c2c2c] text-[10px] text-foreground/60 leading-relaxed">
            En apposant ma signature électronique, j'atteste sur l'honneur l'exactitude des résolutions votées et des débats consignés dans le Procès-Verbal de l'Assemblée Générale.
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2c2c2c]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 cursor-pointer text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-primary hover:bg-primary-light text-black font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
            >
              <span className="transform skew-x-8">
                {saving ? 'Signature en cours...' : 'Valider la signature'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
