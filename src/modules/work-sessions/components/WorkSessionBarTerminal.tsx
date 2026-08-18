'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Calendar,
  Clock,
  Users,
  Coffee,
  Droplet,
  Utensils,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Check,
  ShieldCheck,
  Ban,
  Flag,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  WorkSession,
  WorkSessionVolunteer,
  WorkSessionRedeemType,
  WorkSessionReport,
} from '@/types/models';
import {
  getWorkSessions,
  getWorkSessionDetails,
  checkinVolunteer,
  redeemVolunteerItem,
  closeWorkSessionManually,
} from '../work-actions';
import BarQrScannerModal from '@/modules/buvette/components/BarQrScannerModal';

export default function WorkSessionBarTerminal() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  // Modal clôture
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingReport, setClosingReport] = useState<WorkSessionReport | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const res = await getWorkSessions(true);
    if (res.data) {
      setSessions(res.data);
      if (res.data.length > 0) {
        // Sélectionner la première session OPEN ou la première de la liste
        const openSession = res.data.find((s) => s.status !== 'CLOSED') || res.data[0];
        setSelectedSessionId(openSession.id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadSessionDetails = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    const res = await getWorkSessionDetails(sessionId);
    if (res.data) {
      setActiveSession(res.data);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId, loadSessionDetails]);

  const showNotification = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Check-in Bénévole
  const handleCheckin = async (volunteer: WorkSessionVolunteer) => {
    if (!activeSession) return;
    setActionLoading(true);
    const res = await checkinVolunteer(activeSession.id, volunteer.member_id);
    setActionLoading(false);

    if (res.error) {
      showNotification(res.error, 'error');
    } else {
      showNotification(`Présence confirmée pour ${volunteer.member?.first_name} ${volunteer.member?.last_name}`);
      await loadSessionDetails(activeSession.id);
    }
  };

  // Distribution article pack
  const handleRedeem = async (
    volunteer: WorkSessionVolunteer,
    itemType: WorkSessionRedeemType
  ) => {
    if (!activeSession) return;
    setActionLoading(true);

    const res = await redeemVolunteerItem(activeSession.id, volunteer.member_id, itemType);
    setActionLoading(false);

    if (res.error) {
      showNotification(res.error, 'error');
    } else if (res.quotaExceeded) {
      showNotification(res.message || 'Quota dépassé !', 'warning');
    } else {
      showNotification(res.message || 'Avantage distribué !', 'success');
      await loadSessionDetails(activeSession.id);
    }
  };

  // Clôture manuelle définitive
  const handleCloseSession = async () => {
    if (!activeSession) return;
    setActionLoading(true);

    const res = await closeWorkSessionManually(activeSession.id);
    setActionLoading(false);

    if (res.error) {
      showNotification(res.error, 'error');
    } else if (res.data) {
      setClosingReport(res.data);
      showNotification('🏁 Session travaux clôturée définitivement.', 'success');
      await loadSessions();
      await loadSessionDetails(activeSession.id);
    }
  };

  // Recherche / QR match
  const filteredVolunteers = (activeSession?.volunteers || []).filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${v.member?.first_name || ''} ${v.member?.last_name || ''}`.toLowerCase();
    const meal = (v.selected_meal || '').toLowerCase();
    const license = (v.member?.license_number || '').toLowerCase();
    return name.includes(q) || meal.includes(q) || license.includes(q);
  });

  const isClosed = activeSession?.status === 'CLOSED';
  const totalVolunteers = activeSession?.volunteers?.length || 0;
  const checkedInCount = activeSession?.volunteers?.filter((v) => v.checkin_at).length || 0;
  const totalSofts = activeSession?.volunteers?.reduce((sum, v) => sum + (v.softs_used || 0), 0) || 0;
  const totalWater = activeSession?.volunteers?.reduce((sum, v) => sum + (v.water_used || 0), 0) || 0;
  const totalMeals = activeSession?.volunteers?.filter((v) => v.meal_redeemed).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sélecteur de session & Bouton Clôture */}
      <div className="bg-surface border border-[#353535] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary shrink-0" />
            <span className="font-anybody font-black text-sm uppercase text-white tracking-wider">
              Session Active :
            </span>
          </div>

          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="bg-[#181818] border border-[#353535] rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-primary focus:outline-none min-w-[260px]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.session_date} — {s.title} ({s.status === 'CLOSED' ? 'CLÔTURÉE' : 'EN COURS'})
              </option>
            ))}
          </select>

          {isClosed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-mono font-bold">
              <Ban className="w-3.5 h-3.5" /> Clôturée
            </span>
          )}
        </div>

        {/* Bouton Clôture Admin */}
        {activeSession && !isClosed && (
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={actionLoading}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            <Flag className="w-4 h-4" />
            <span className="transform skew-x-8">🏁 Clôturer définitivement la session travaux</span>
          </button>
        )}
      </div>

      {/* Bannière de notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl font-mono text-xs flex items-center gap-3 border ${
            feedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : feedback.type === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              : 'bg-green-500/10 border-green-500/30 text-green-400'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Résumé des statistiques du Jour J */}
      {activeSession && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface p-4 rounded-xl border border-[#353535] space-y-1 font-mono">
            <div className="text-[11px] text-foreground/50 flex items-center gap-1.5 uppercase">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Présences</span>
            </div>
            <div className="text-xl font-black text-white font-anybody">
              {checkedInCount} / {totalVolunteers}{' '}
              <span className="text-xs font-mono text-foreground/40 font-normal">inscrits</span>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-xl border border-[#353535] space-y-1 font-mono">
            <div className="text-[11px] text-foreground/50 flex items-center gap-1.5 uppercase">
              <Coffee className="w-3.5 h-3.5 text-primary" />
              <span>Softs Servis</span>
            </div>
            <div className="text-xl font-black text-white font-anybody">
              {totalSofts}{' '}
              <span className="text-xs font-mono text-foreground/40 font-normal">
                (max {totalVolunteers * activeSession.free_softs_quota})
              </span>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-xl border border-[#353535] space-y-1 font-mono">
            <div className="text-[11px] text-foreground/50 flex items-center gap-1.5 uppercase">
              <Droplet className="w-3.5 h-3.5 text-blue-400" />
              <span>Eaux Servies</span>
            </div>
            <div className="text-xl font-black text-white font-anybody">
              {totalWater}{' '}
              <span className="text-xs font-mono text-foreground/40 font-normal">bouteilles</span>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-xl border border-[#353535] space-y-1 font-mono">
            <div className="text-[11px] text-foreground/50 flex items-center gap-1.5 uppercase">
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              <span>Repas Retirés</span>
            </div>
            <div className="text-xl font-black text-white font-anybody">
              {totalMeals} / {totalVolunteers}{' '}
              <span className="text-xs font-mono text-foreground/40 font-normal">distribués</span>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'outils Scan & Recherche rapide */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un bénévole (nom, prénom, repas choisi)..."
            className="w-full bg-surface border border-[#353535] rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono text-white placeholder-foreground/40 focus:border-primary focus:outline-none"
          />
        </div>

        <button
          onClick={() => setScannerOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-surface-high hover:bg-[#353535] border border-primary/40 text-primary font-anybody font-bold text-xs uppercase tracking-wider rounded-xl sport-skew flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
        >
          <QrCode className="w-4 h-4" />
          <span className="transform skew-x-8">Scanner Pass QR Bénévole</span>
        </button>
      </div>

      {/* Liste des Packs Bénévoles */}
      {loading ? (
        <div className="py-12 text-center text-foreground/40 font-mono text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Chargement des packs bénévoles...</span>
        </div>
      ) : !activeSession || filteredVolunteers.length === 0 ? (
        <div className="py-12 bg-surface border border-dashed border-[#353535] rounded-2xl text-center space-y-2">
          <Users className="w-8 h-8 text-foreground/20 mx-auto" />
          <p className="text-xs font-mono text-foreground/40">
            Aucun bénévole trouvé pour cette session.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVolunteers.map((v) => {
            const isCheckedIn = Boolean(v.checkin_at);
            const quota = activeSession.free_softs_quota || 2;
            const softsLeft = Math.max(0, quota - v.softs_used);

            return (
              <div
                key={v.id}
                className={`bg-surface border rounded-2xl p-5 space-y-4 transition-all ${
                  v.meal_redeemed && v.softs_used >= quota
                    ? 'border-green-500/30 bg-green-950/5'
                    : isCheckedIn
                    ? 'border-primary/40'
                    : 'border-[#353535]'
                }`}
              >
                {/* En-tête Bénévole */}
                <div className="flex items-start justify-between gap-2 border-b border-[#2d2d2d] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-anybody font-black text-base uppercase text-white">
                        {v.member?.first_name} {v.member?.last_name}
                      </h4>
                      {isCheckedIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30 text-[10px] font-mono font-bold">
                          <Check className="w-3 h-3" /> Présent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-[10px] font-mono">
                          Non pointé
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-foreground/50 mt-0.5">
                      Licence : {v.member?.license_number || 'N/A'} • {v.member?.email}
                    </div>
                  </div>

                  {!isCheckedIn && !isClosed && (
                    <button
                      onClick={() => handleCheckin(v)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-anybody font-bold text-[11px] uppercase rounded-lg sport-skew flex items-center gap-1 cursor-pointer shrink-0 shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="transform skew-x-8">Valider Présence</span>
                    </button>
                  )}
                </div>

                {/* Détail du Pack & Actions Buvette */}
                <div className="space-y-3 font-mono text-xs">
                  {/* 1. Softs Restants */}
                  <div className="p-3 bg-[#181818] rounded-xl border border-[#2a2a2a] flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-foreground/80 font-bold">
                        <Coffee className="w-4 h-4 text-primary" />
                        <span>Softs Offerts :</span>
                        <span
                          className={`font-anybody font-black text-sm ${
                            softsLeft === 0 ? 'text-foreground/40' : 'text-primary'
                          }`}
                        >
                          [ {v.softs_used} / {quota} ]
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground/40">
                        {softsLeft > 0
                          ? `Reste ${softsLeft} soft(s) offert(s)`
                          : 'Quota épuisé (passer en caisse normale)'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRedeem(v, 'SOFT')}
                      disabled={actionLoading || isClosed}
                      className={`px-3 py-2 rounded-lg font-anybody font-bold text-xs uppercase sport-skew transition-all flex items-center gap-1.5 ${
                        softsLeft > 0 && !isClosed
                          ? 'bg-primary hover:bg-primary-hover text-black cursor-pointer shadow-[2px_2px_0px_#000]'
                          : 'bg-surface-high border border-[#353535] text-foreground/30 cursor-not-allowed'
                      }`}
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span className="transform skew-x-8">Distribuer Soft</span>
                    </button>
                  </div>

                  {/* 2. Eau Plate / Pétillante */}
                  <div className="p-3 bg-[#181818] rounded-xl border border-[#2a2a2a] flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-foreground/80 font-bold">
                        <Droplet className="w-4 h-4 text-blue-400" />
                        <span>Eau (Gratuit & Illimité) :</span>
                        <span className="font-anybody font-black text-sm text-blue-400">
                          [ {v.water_used} ]
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground/40">
                        Bouteilles distribuées pour hydratation
                      </p>
                    </div>

                    <button
                      onClick={() => handleRedeem(v, 'WATER')}
                      disabled={actionLoading || isClosed}
                      className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg font-anybody font-bold text-xs uppercase sport-skew transition-all flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Droplet className="w-3.5 h-3.5" />
                      <span className="transform skew-x-8">Distribuer Eau</span>
                    </button>
                  </div>

                  {/* 3. Repas Choisi */}
                  <div className="p-3 bg-[#181818] rounded-xl border border-[#2a2a2a] flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-foreground/80 font-bold">
                        <Utensils className="w-4 h-4 text-amber-400" />
                        <span>Repas Sélectionné :</span>
                      </div>
                      <div className="font-anybody font-black text-sm text-white tracking-wide">
                        {v.selected_meal}
                      </div>
                    </div>

                    {v.meal_redeemed ? (
                      <span className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 font-anybody font-black text-xs uppercase sport-skew flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="transform skew-x-8">Distribué</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRedeem(v, 'MEAL')}
                        disabled={actionLoading || isClosed}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew transition-all flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span className="transform skew-x-8">Valider Retrait Repas</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Scanner QR Code */}
      <BarQrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onMemberSelected={(scannedMember) => {
          setScannerOpen(false);
          setSearchQuery(scannedMember.first_name || scannedMember.last_name || '');
          showNotification(
            `Bénévole scanné : ${scannedMember.first_name} ${scannedMember.last_name}`
          );
        }}
      />

      {/* Modal Confirmation Clôture Définitive */}
      {showCloseModal && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-red-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-400">
                <Flag className="w-5 h-5" />
                <h3 className="font-anybody font-black text-lg uppercase">
                  Clôture Définitive Session Travaux
                </h3>
              </div>
              <p className="text-xs font-mono text-foreground/70">
                Cette action fige la session, verrouille les distributions gratuites et génère
                l&apos;écriture de charge comptable pour le Bénévolat ASBL.
              </p>
            </div>

            {/* Récapitulatif indicatif */}
            <div className="bg-[#181818] p-4 rounded-xl border border-[#353535] space-y-2 font-mono text-xs">
              <h4 className="font-bold text-white uppercase text-[11px]">Bilan de la Session :</h4>
              <ul className="space-y-1 text-foreground/70">
                <li className="flex justify-between">
                  <span>Bénévoles pointés :</span>
                  <span className="text-white font-bold">{checkedInCount} / {totalVolunteers}</span>
                </li>
                <li className="flex justify-between">
                  <span>Repas consommés :</span>
                  <span className="text-white font-bold">{totalMeals}</span>
                </li>
                <li className="flex justify-between">
                  <span>Softs consommés :</span>
                  <span className="text-white font-bold">{totalSofts}</span>
                </li>
                <li className="flex justify-between">
                  <span>Eaux consommées :</span>
                  <span className="text-white font-bold">{totalWater}</span>
                </li>
                <li className="flex justify-between pt-2 border-t border-[#333] text-primary font-bold">
                  <span>Écriture comptable estimée (TRAVAUX_PISTE) :</span>
                  <span>
                    {(totalMeals * 3.50 + totalSofts * 0.65 + totalWater * 0.40).toFixed(2)} €
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white rounded-lg font-anybody font-bold text-xs uppercase sport-skew"
              >
                <span className="transform skew-x-8">Annuler</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseModal(false);
                  handleCloseSession();
                }}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span className="transform skew-x-8">Confirmer la Clôture Définitive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rapport post-clôture */}
      {closingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-primary/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-anybody font-black text-lg uppercase text-white">
                Session Clôturée avec Succès
              </h3>
              <p className="text-xs font-mono text-foreground/60">
                {closingReport.title} ({closingReport.date})
              </p>
            </div>

            <div className="bg-[#181818] p-4 rounded-xl border border-[#353535] text-left font-mono text-xs space-y-1.5 text-foreground/70">
              <p>• Bénévoles présents : <strong className="text-white">{closingReport.checkedInVolunteers}</strong></p>
              <p>• Repas servis : <strong className="text-white">{closingReport.mealsRedeemed}</strong></p>
              <p>• Boissons offertes : <strong className="text-white">{closingReport.softsRedeemed} softs, {closingReport.waterRedeemed} eaux</strong></p>
              <p className="pt-2 border-t border-[#333] text-primary">
                • Dépense de charge ASBL enregistrée : <strong>{closingReport.estimatedExpense.toFixed(2)} €</strong>
              </p>
            </div>

            <button
              onClick={() => setClosingReport(null)}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-black font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew"
            >
              <span className="transform skew-x-8">Fermer le Rapport</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
