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
  Trash2,
  Check,
  Globe,
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
  approveIdeaAdmin,
  deleteFeedbackAdmin,
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

  // Suppression
  const [deletingItem, setDeletingItem] = useState<FeedbackItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    const { data } = await getAllFeedbacksAdmin(filterType, filterStatus);
    setFeedbacks(data || []);
    setLoading(false);
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Action rapide : Approuver / Publier
  const handleQuickApprove = async (item: FeedbackItem) => {
    setApprovingId(item.id);
    const { success, error } = await approveIdeaAdmin(item.id);
    setApprovingId(null);

    if (success) {
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'APPROVED' } : f))
      );
      setActionMsg({ type: 'success', text: `Idée "${item.title}" approuvée et publiée !` });
      setTimeout(() => setActionMsg(null), 3000);
    } else {
      setActionMsg({ type: 'error', text: error || 'Erreur lors de l\'approbation.' });
    }
  };

  // Action : Supprimer définitivement
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    const { success, error } = await deleteFeedbackAdmin(deletingItem.id);
    setIsDeleting(false);
    setDeletingItem(null);

    if (success) {
      setFeedbacks((prev) => prev.filter((f) => f.id !== deletingItem.id));
      setActionMsg({ type: 'success', text: `Ticket "${deletingItem.title}" supprimé définitivement.` });
      setTimeout(() => setActionMsg(null), 3000);
    } else {
      setActionMsg({ type: 'error', text: error || 'Erreur lors de la suppression.' });
    }
  };

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
            <HelpCircle className="w-3 h-3" /> En attente de modération
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Approuvée / Publiée
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Retenue / En cours
          </span>
        );
      case 'RESOLVED':
      case 'DONE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-green-500/15 border border-green-500/30 text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Réalisée / Clôturée
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-surface border border-[#353535] text-foreground/50 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Refusée (Masquée)
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
                Modérez, validez et traitez les propositions et signalements des membres
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

        {/* Action Message */}
        {actionMsg && (
          <div
            className={`p-3 rounded font-mono text-xs flex items-center justify-between animate-fade-in ${
              actionMsg.type === 'success'
                ? 'bg-success/15 border border-success/30 text-success'
                : 'bg-secondary/15 border border-secondary/30 text-secondary'
            }`}
          >
            <span>{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} className="text-foreground/40 hover:text-white cursor-pointer">
              ×
            </button>
          </div>
        )}

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
            {(['ALL', 'PENDING', 'APPROVED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st as FeedbackStatus | 'ALL')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-primary text-black'
                    : 'text-foreground/60 hover:text-white'
                }`}
              >
                {st === 'ALL'
                  ? 'Tous'
                  : st === 'PENDING'
                  ? '🟡 En attente'
                  : st === 'APPROVED'
                  ? '🟢 Approuvé'
                  : st === 'IN_PROGRESS'
                  ? '🔵 En cours'
                  : st === 'RESOLVED'
                  ? '🏁 Réalisé'
                  : '⚪ Refusé'}
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
              className={`premium-card p-5 rounded-lg border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                item.status === 'PENDING'
                  ? 'border-yellow-500/40 bg-yellow-500/5'
                  : 'border-[#353535] hover:border-primary/40'
              }`}
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

              {/* Boutons d'actions */}
              <div className="shrink-0 flex items-center gap-2 flex-wrap">
                {/* Bouton rapide d'approbation si en attente */}
                {item.status === 'PENDING' && (
                  <button
                    onClick={() => handleQuickApprove(item)}
                    disabled={approvingId === item.id}
                    title="Valider et publier cette idée publiquement"
                    className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {approvingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Approuver / Publier</span>
                  </button>
                )}

                {/* Bouton Traiter / Répondre */}
                <button
                  onClick={() => handleOpenProcessModal(item)}
                  className="premium-btn py-2 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 transform skew-x-8" />
                  <span className="transform skew-x-8">Traiter</span>
                </button>

                {/* Bouton Supprimer */}
                <button
                  onClick={() => setDeletingItem(item)}
                  title="Supprimer définitivement ce ticket"
                  className="p-2 rounded-lg bg-surface-dim hover:bg-red-500/20 text-foreground/50 hover:text-red-400 border border-[#353535] hover:border-red-500/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
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
                  <option value="PENDING">🟡 En attente de modération (Non visible publiquement)</option>
                  <option value="APPROVED">🟢 Approuvée & Publiée (Visible par les membres)</option>
                  <option value="IN_PROGRESS">🔵 Retenue / En cours de réalisation</option>
                  <option value="RESOLVED">🏁 Réalisée / Résolue</option>
                  <option value="REJECTED">⚪ Non retenue / Rejetée (Masquée du public)</option>
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

      {/* DIALOGUE DE CONFIRMATION DE SUPPRESSION */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-red-500/30 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-anybody font-black text-lg text-white uppercase tracking-tight sport-skew">
                  Supprimer le Ticket
                </h3>
                <p className="text-xs text-foreground/60 font-mono">Action irréversible</p>
              </div>
            </div>

            <p className="text-xs font-mono text-foreground/80 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le ticket{' '}
              <strong className="text-white">&quot;{deletingItem.title}&quot;</strong> ainsi que tous ses votes associés ?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-xs font-mono text-foreground/70 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-anybody font-black text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
