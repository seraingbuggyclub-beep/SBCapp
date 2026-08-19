'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FbaAttendanceItem,
  TrackItem,
  MemberProfile,
} from '@/types/models';
import {
  checkInMember,
  checkOutMember,
  getCurrentMemberActiveAttendance,
} from '../actions';
import { getTracks } from '@/modules/tracks/actions';
import {
  Radio,
  Clock,
  Flag,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sparkles,
  ShieldCheck,
  Timer,
  Play,
  Square,
  RefreshCw,
} from 'lucide-react';

interface PilotAttendanceWidgetProps {
  member: MemberProfile | null;
  onAttendanceChange?: () => void;
}

export default function PilotAttendanceWidget({
  member,
  onAttendanceChange,
}: PilotAttendanceWidgetProps) {
  const [activeSession, setActiveSession] = useState<FbaAttendanceItem | null>(null);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Chronomètre en direct
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  const loadData = useCallback(async () => {
    if (!member?.id) return;
    setLoading(true);

    try {
      const [tracksRes, activeRes] = await Promise.all([
        getTracks(),
        getCurrentMemberActiveAttendance(member.id),
      ]);

      const fetchedTracks = tracksRes.data || [];
      setTracks(fetchedTracks);
      if (fetchedTracks.length > 0) {
        setSelectedTrackId((prev) => (prev ? prev : fetchedTracks[0].id));
      }
      setActiveSession(activeRes.data);
    } catch (err) {
      console.error('Erreur chargement présence FBA:', err);
    } finally {
      setLoading(false);
    }
  }, [member?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcul du temps écoulé
  useEffect(() => {
    if (!activeSession) return;

    const updateTimer = () => {
      const start = new Date(activeSession.check_in_at).getTime();
      const now = new Date().getTime();
      const diffMin = Math.max(0, Math.floor((now - start) / (1000 * 60)));
      setElapsedMinutes(diffMin);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Mise à jour toutes les 30s
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleCheckIn = async () => {
    if (!member) return;
    setActionLoading(true);
    setMsg(null);

    const res = await checkInMember(selectedTrackId || undefined);
    setActionLoading(false);

    if (res.success && res.data) {
      setActiveSession(res.data);
      setMsg({
        text: "Pointage FBA enregistré avec succès ! Vous êtes officiellement couvert sur le complexe.",
        type: 'success',
      });
      if (onAttendanceChange) onAttendanceChange();
    } else {
      setMsg({ text: res.error || 'Erreur lors du pointage.', type: 'error' });
    }
  };

  const handleCheckOut = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    setMsg(null);

    const res = await checkOutMember(activeSession.id);
    setActionLoading(false);

    if (res.success) {
      setActiveSession(null);
      setMsg({
        text: "Session terminée. Merci et à bientôt sur le complexe !",
        type: 'success',
      });
      if (onAttendanceChange) onAttendanceChange();
      loadData();
    } else {
      setMsg({ text: res.error || 'Erreur lors du départ.', type: 'error' });
    }
  };

  const formatElapsedTime = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours === 0) return `${remainingMins} min`;
    return `${hours}h ${remainingMins.toString().padStart(2, '0')}min`;
  };

  if (!member) return null;

  return (
    <div className="premium-card p-5 rounded-2xl border border-[#353535] space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      {/* Header Widget */}
      <div className="flex items-center justify-between border-b border-[#353535] pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            activeSession
              ? 'bg-green-500/15 text-green-400 border border-green-500/40'
              : 'bg-primary/10 text-primary border border-primary/30'
          }`}>
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-anybody font-black text-sm uppercase tracking-tight text-white sport-skew">
              Registre de Présence FBA
            </h3>
            <p className="text-[10px] font-mono text-foreground/50">
              Pointage officiel de présence sur le site
            </p>
          </div>
        </div>

        {activeSession ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 text-[10px] font-mono font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            Sur Site
          </span>
        ) : (
          <span className="text-[10px] font-mono text-foreground/45 uppercase">
            Hors Site
          </span>
        )}
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between animate-fade-in ${
            msg.type === 'success'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary/15 border-secondary/40 text-secondary'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-foreground/40 hover:text-white">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-foreground/40 font-mono text-xs">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Vérification de la présence...</span>
        </div>
      ) : activeSession ? (
        /* ÉTAT 1 : MEMBRE EN PISTE (ACTIF) */
        <div className="p-4 rounded-xl bg-surface-dim border border-green-500/30 space-y-4 font-mono text-xs animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] text-foreground/45 uppercase block">Arrivée enregistrée</span>
              <strong className="text-white text-sm">
                {new Date(activeSession.check_in_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-foreground/45 uppercase block">Complexe RC</span>
              <strong className="text-primary text-sm">
                {activeSession.tracks?.name || 'Site Seraing BC'}
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-foreground/45 uppercase block">Temps sur site</span>
              <strong className="text-green-400 text-sm flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                {formatElapsedTime(elapsedMinutes)}
              </strong>
            </div>
          </div>

          <div className="pt-2 border-t border-[#353535] flex items-center justify-between gap-3">
            <span className="text-[11px] text-foreground/60">
              Assurance FBA active pour cette session.
            </span>

            <button
              type="button"
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-white font-anybody font-black uppercase text-xs tracking-wider flex items-center gap-1.5 transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="transform skew-x-8">
                {actionLoading ? 'Départ...' : 'Terminer ma session (Départ)'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* ÉTAT 2 : MEMBRE NON POINTÉ (PRÊT À ROULER) */
        <div className="space-y-3 font-mono text-xs">
          <p className="text-[11px] text-foreground/50">
            Enregistrez votre présence sur le complexe pour activer la couverture assurance FBA.
          </p>
          {/* Gros Bouton d'action tactile */}
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={actionLoading}
            className="w-full premium-btn text-xs py-3.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span className="transform skew-x-8">
              {actionLoading ? 'Pointage en cours...' : '🚦 Enregistrer ma présence (FBA)'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
