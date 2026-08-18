'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import {
  Wrench,
  Calendar,
  Clock,
  Users,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Trash2,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { WorkSession, WorkSessionVolunteer } from '@/types/models';
import {
  getWorkSessions,
  registerToWorkSession,
  cancelWorkSessionRegistration,
} from '../work-actions';
import WorkSessionAdminModal from './WorkSessionAdminModal';

export default function WorkSessionPilotSection() {
  const { user, profile } = useAuth();
  const permissions = usePermissions(profile);

  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inscription state
  const [selectedSessionForReg, setSelectedSessionForReg] = useState<WorkSession | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Admin modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getWorkSessions(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSessions(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleOpenRegister = (session: WorkSession) => {
    setSelectedSessionForReg(session);
    setSelectedMeal(session.available_meals[0] || 'Pain Burger');
    setError(null);
    setSuccessMsg(null);
  };

  const handleConfirmRegister = async () => {
    if (!selectedSessionForReg || !selectedMeal) return;

    setActionLoading(true);
    setError(null);

    const res = await registerToWorkSession(selectedSessionForReg.id, selectedMeal);
    setActionLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg('🎉 Inscription confirmée ! Merci pour votre engagement bénévole.');
      setSelectedSessionForReg(null);
      await loadSessions();
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleCancelRegistration = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre inscription à cette session de travaux ?')) {
      return;
    }

    setActionLoading(true);
    setError(null);

    const res = await cancelWorkSessionRegistration(sessionId);
    setActionLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg('Votre inscription a bien été annulée.');
      await loadSessions();
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-[#353535]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            <h2 className="font-anybody font-black text-xl uppercase tracking-tight text-white sport-skew">
              Sessions Travaux & Entretien <span className="text-primary">SBC</span>
            </h2>
          </div>
          <p className="text-xs font-mono text-foreground/60 max-w-2xl">
            Participez aux travaux du club, préparez la piste et profitez du pack bénévole :{' '}
            <span className="text-primary font-bold">1 repas offert</span> +{' '}
            <span className="text-primary font-bold">softs & eau</span> à la buvette !
          </p>
        </div>

        {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isReferent) && (
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-black font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000]"
          >
            <Plus className="w-4 h-4" />
            <span className="transform skew-x-8">Créer une session</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 font-mono text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-12 text-center text-foreground/40 font-mono text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Chargement des sessions de travaux...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-12 px-6 bg-surface/50 border border-dashed border-[#353535] rounded-2xl text-center space-y-3">
          <Wrench className="w-10 h-10 text-foreground/20 mx-auto" />
          <h3 className="font-anybody font-bold text-base uppercase text-white/70">
            Aucune session de travaux programmée
          </h3>
          <p className="text-xs font-mono text-foreground/40 max-w-md mx-auto">
            Les prochaines journées d&apos;entretien et d&apos;aménagement des pistes seront affichées ici.
          </p>
        </div>
      ) : (
        /* Grille des sessions */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const volunteers = session.volunteers || [];
            const isFull = volunteers.length >= session.max_participants;
            const myVolunteer = volunteers.find((v) => v.member_id === user?.id);
            const isRegistered = Boolean(myVolunteer);

            const placesLeft = Math.max(0, session.max_participants - volunteers.length);
            const fillPercentage = Math.min(
              100,
              Math.round((volunteers.length / session.max_participants) * 100)
            );

            return (
              <div
                key={session.id}
                className={`bg-surface border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                  isRegistered
                    ? 'border-primary/50 shadow-[0_0_20px_rgba(255,215,0,0.08)]'
                    : 'border-[#353535] hover:border-foreground/30'
                }`}
              >
                {/* Badge statut utilisateur */}
                {isRegistered && (
                  <div className="absolute top-0 right-0 bg-primary text-black font-anybody font-black text-[10px] uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3" />
                    <span>Inscrit • Repas : {myVolunteer?.selected_meal}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Titre & Date */}
                  <div>
                    <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider">
                      Journée d&apos;Entretien & Aménagement
                    </span>
                    <h3 className="font-anybody font-black text-lg uppercase text-white tracking-wide mt-0.5">
                      {session.title}
                    </h3>
                  </div>

                  {/* Infos Horaires & Lieu */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-foreground/70 bg-[#181818] p-3 rounded-xl border border-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="capitalize">{formatDate(session.session_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="text-xs font-mono text-foreground/60 line-clamp-3 bg-surface-high/30 p-2.5 rounded-lg border border-[#262626]">
                      {session.description}
                    </p>
                  )}

                  {/* Jauge des places */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/60 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-foreground/40" />
                        <span>Bénévoles inscrits :</span>
                      </span>
                      <span
                        className={`font-bold ${
                          isFull
                            ? 'text-red-400'
                            : placesLeft === 1
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`}
                      >
                        {volunteers.length} / {session.max_participants} places
                      </span>
                    </div>

                    {/* Barre de progression */}
                    <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#333]">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isFull
                            ? 'bg-red-500'
                            : fillPercentage > 75
                            ? 'bg-yellow-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Pack Avantages */}
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-primary font-anybody font-bold text-xs uppercase">
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Pack Bénévole Offert</span>
                    </div>
                    <ul className="text-[11px] font-mono text-foreground/70 space-y-0.5 list-disc list-inside">
                      <li>1 repas offert au choix à midi</li>
                      <li>{session.free_softs_quota} softs frais offerts + eau à volonté</li>
                    </ul>
                  </div>

                  {/* Liste des bénévoles inscrits */}
                  {volunteers.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-foreground/40 tracking-wider">
                        Équipe bénévole ({volunteers.length}) :
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {volunteers.map((v) => (
                          <span
                            key={v.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${
                              v.member_id === user?.id
                                ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                                : 'bg-[#1e1e1e] text-foreground/70 border-[#353535]'
                            }`}
                          >
                            {v.member?.first_name} {v.member?.last_name?.[0]}.
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Inscription / Désinscription */}
                <div className="pt-4 mt-4 border-t border-[#353535]">
                  {isRegistered ? (
                    <button
                      onClick={() => handleCancelRegistration(session.id)}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-anybody font-bold text-xs uppercase rounded-lg sport-skew transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="transform skew-x-8">Annuler mon inscription</span>
                    </button>
                  ) : isFull ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-surface-high border border-[#353535] text-foreground/30 font-anybody font-bold text-xs uppercase rounded-lg sport-skew cursor-not-allowed"
                    >
                      <span className="transform skew-x-8">Session Complète</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenRegister(session)}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-primary hover:bg-primary-hover text-black font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew transition-all shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span className="transform skew-x-8">M&apos;inscrire comme bénévole</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Choix du Repas & Inscription Pilote */}
      {selectedSessionForReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-primary/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-primary font-bold uppercase">
                Inscription Bénévole
              </span>
              <h3 className="font-anybody font-black text-lg uppercase text-white">
                {selectedSessionForReg.title}
              </h3>
              <p className="text-xs font-mono text-foreground/60">
                Date : {formatDate(selectedSessionForReg.session_date)} ({selectedSessionForReg.start_time.slice(0, 5)} - {selectedSessionForReg.end_time.slice(0, 5)})
              </p>
            </div>

            <div className="p-3 bg-surface-high rounded-xl border border-[#353535] space-y-2 font-mono text-xs">
              <label className="block text-foreground/90 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-primary">
                <Utensils className="w-3.5 h-3.5" />
                Sélectionnez votre repas offert *
              </label>
              <div className="space-y-1.5">
                {selectedSessionForReg.available_meals.map((meal) => (
                  <label
                    key={meal}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                      selectedMeal === meal
                        ? 'bg-primary/10 border-primary text-white font-bold'
                        : 'bg-[#181818] border-[#333] text-foreground/70 hover:border-foreground/30'
                    }`}
                  >
                    <span>{meal}</span>
                    <input
                      type="radio"
                      name="meal"
                      value={meal}
                      checked={selectedMeal === meal}
                      onChange={(e) => setSelectedMeal(e.target.value)}
                      className="text-primary focus:ring-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSessionForReg(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white rounded-lg font-anybody font-bold text-xs uppercase sport-skew"
              >
                <span className="transform skew-x-8">Annuler</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmRegister}
                disabled={actionLoading || !selectedMeal}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-black font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span className="transform skew-x-8">Valider mon inscription</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin Création de Session */}
      <WorkSessionAdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Session travaux créée avec succès.');
          loadSessions();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
}
