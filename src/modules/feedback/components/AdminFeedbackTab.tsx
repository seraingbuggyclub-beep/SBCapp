'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  Bug,
  Construction,
  ThumbsUp,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ShieldCheck,
  MessageSquare,
  Send,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  FeedbackItem,
  FeedbackType,
  FeedbackStatus,
  FeedbackSeverity,
} from '@/types/feedback.types';
import {
  getAllFeedbacksAdmin,
  updateFeedbackAdminStatus,
} from '@/modules/feedback/feedback-actions';

export default function AdminFeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<FeedbackType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'ALL'>('ALL');

  // Modale de modération / réponse CA
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [newStatus, setNewStatus] = useState<FeedbackStatus>('PENDING');
  const [adminResponse, setAdminResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    const { data } = await getAllFeedbacksAdmin(filterType, filterStatus);
    setFeedbacks(data || []);
    setLoading(false);
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleOpenProcessModal = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setNewStatus(item.status);
    setAdminResponse(item.admin_response || '');
    setActionMsg(null);
  };

  const handleSaveProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    setSaving(true);
    setActionMsg(null);

    const { success, error } = await updateFeedbackAdminStatus(
      selectedFeedback.id,
      newStatus,
      adminResponse.trim() || null
    );

    setSaving(false);

    if (success) {
      setActionMsg({ type: 'success', text: 'Ticket mis à jour avec succès.' });
      fetchFeedbacks();
      setTimeout(() => {
        setSelectedFeedback(null);
      }, 1000);
    } else {
      setActionMsg({ type: 'error', text: error || 'Erreur lors de la mise à jour.' });
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> À l'étude
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Retenu / En cours
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Réalisé
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-surface border border-[#353535] text-foreground/50 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Non retenu
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: FeedbackType) => {
    switch (type) {
      case 'IDEA':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> Idée
          </span>
        );
      case 'BUG_APP':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center gap-1">
            <Bug className="w-3 h-3" /> Bug App
          </span>
        );
      case 'INCIDENT_TRACK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-secondary/15 border border-secondary/30 text-secondary flex items-center gap-1">
            <Construction className="w-3 h-3" /> Piste
          </span>
        );
      default:
        return null;
    }
  };

  const getAuthorDisplay = (author?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null) => {
    if (!author) return 'Membre inconnu';
    const fullName = `${author.first_name || ''} ${author.last_name || ''}`.trim();
    return fullName || author.email || 'Membre';
  };

  return (
    <div className="space-y-6">
      {/* Header & Filtres */}
      <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
                Boîte à Idées & <span className="text-primary">Signalements CA</span>
              </h2>
              <p className="text-xs text-foreground/50 font-mono">
                Consultez, priorisez et traitez les propositions et signalements des membres
              </p>
            </div>
          </div>

          <button
            onClick={fetchFeedbacks}
            disabled={loading}
            className="p-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white transition-all cursor-pointer self-start sm:self-auto flex items-center gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Filtres Type & Statut */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#353535]">
          <div className="flex items-center gap-1.5 bg-surface-dim p-1 rounded border border-[#353535]">
            <span className="text-[10px] font-mono text-foreground/40 px-2 uppercase font-bold">Type :</span>
            {(['ALL', 'IDEA', 'INCIDENT_TRACK', 'BUG_APP'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  filterType === t
                    ? 'bg-primary text-black'
                    : 'text-foreground/60 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'Tous' : t === 'IDEA' ? '💡 Idées' : t === 'INCIDENT_TRACK' ? '⚠️ Pistes' : '🐛 Bugs'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-surface-dim p-1 rounded border border-[#353535]">
            <span className="text-[10px] font-mono text-foreground/40 px-2 uppercase font-bold">Statut :</span>
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-primary text-black'
                    : 'text-foreground/60 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'Tous' : st === 'PENDING' ? 'À l\'étude' : st === 'IN_PROGRESS' ? 'En cours' : st === 'RESOLVED' ? 'Réalisé' : 'Refusé'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des Tickets */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-foreground/40 font-mono text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Chargement des retours...</span>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 text-center bg-surface-dim rounded-lg border border-[#353535] text-foreground/40 font-mono text-xs">
            Aucun ticket ne correspond aux critères sélectionnés.
          </div>
        ) : (
          feedbacks.map((item) => (
            <div
              key={item.id}
              className="premium-card p-5 rounded-lg border border-[#353535] hover:border-primary/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Infos principales */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {getTypeBadge(item.type)}
                  <span className="px-2 py-0.5 rounded bg-surface border border-[#353535] text-foreground/60 font-mono text-[10px] font-bold">
                    {item.category}
                  </span>
                  {getStatusBadge(item.status)}
                  {item.type === 'IDEA' && (
                    <span className="px-2 py-0.5 rounded bg-primary/20 border border-primary/40 text-primary font-mono text-[10px] font-bold flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {item.votes_count} vote{item.votes_count > 1 ? 's' : ''}
                    </span>
                  )}
                  {item.severity && item.severity !== 'LOW' && (
                    <span className="px-2 py-0.5 rounded bg-secondary/20 border border-secondary/40 text-secondary font-mono text-[10px] font-bold">
                      Gravité : {item.severity}
                    </span>
                  )}
                </div>

                <h3 className="font-anybody font-bold text-base uppercase sport-skew text-white">
                  {item.title}
                </h3>

                <p className="text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>

                {item.admin_response && (
                  <div className="p-2.5 rounded bg-surface-dim border border-primary/30 text-xs font-mono text-white/90">
                    <strong className="text-primary block text-[10px] uppercase">
                      Réponse officielle :
                    </strong>
                    « {item.admin_response} »
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] font-mono text-foreground/40 pt-1">
                  <span>Auteur : <strong className="text-foreground/70">{getAuthorDisplay(item.author)}</strong></span>
                  <span>•</span>
                  <span>{new Date(item.created_at).toLocaleDateString('fr-BE')}</span>
                </div>
              </div>

              {/* Bouton de modération */}
              <div className="shrink-0 flex items-center">
                <button
                  onClick={() => handleOpenProcessModal(item)}
                  className="premium-btn py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 transform skew-x-8" />
                  <span className="transform skew-x-8">Traiter le ticket</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALE DE TRAITEMENT ET RÉPONSE OFFICIELLE DU CA */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="premium-card w-full max-w-lg p-6 rounded-lg border border-[#353535] space-y-5 relative">
            <button
              onClick={() => setSelectedFeedback(null)}
              className="absolute top-4 right-4 text-foreground/40 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary text-primary flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-anybody font-black text-lg uppercase sport-skew text-white">
                  Traitement du Ticket
                </h3>
                <p className="text-[10px] font-mono text-foreground/50">
                  {selectedFeedback.title}
                </p>
              </div>
            </div>

            {actionMsg && (
              <div
                className={`p-3 rounded font-mono text-xs flex items-center gap-2 ${
                  actionMsg.type === 'success'
                    ? 'bg-success/15 border border-success/30 text-success'
                    : 'bg-secondary/15 border border-secondary/30 text-secondary'
                }`}
              >
                {actionMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{actionMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProcessing} className="space-y-4">
              {/* Statut */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                  Statut du ticket *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as FeedbackStatus)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                >
                  <option value="PENDING">🟡 À l'étude (En attente d'analyse)</option>
                  <option value="IN_PROGRESS">🔵 Retenu / En cours de réalisation</option>
                  <option value="RESOLVED">🟢 Réalisé / Résolu</option>
                  <option value="REJECTED">⚪ Non retenu / Rejeté</option>
                </select>
              </div>

              {/* Réponse officielle */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                  Réponse officielle du Comité (Visible par les membres)
                </label>
                <textarea
                  rows={4}
                  placeholder="Expliquez la décision du CA, le planning d'intervention ou la résolution..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 rounded font-mono text-xs text-foreground/60 hover:text-white cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="premium-btn py-2 px-5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin transform skew-x-8" />
                  ) : (
                    <Send className="w-4 h-4 transform skew-x-8" />
                  )}
                  <span className="transform skew-x-8">Enregistrer la décision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
