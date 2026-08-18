'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  ThumbsUp,
  Plus,
  Flame,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Bug,
  Construction,
  Loader2,
  X,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import {
  FeedbackItem,
  FeedbackType,
  FeedbackSeverity,
  CreateFeedbackInput,
} from '@/types/feedback.types';
import {
  getPublicIdeas,
  getMyAnomalies,
  submitFeedback,
  toggleIdeaVote,
} from '@/modules/feedback/feedback-actions';
import { MemberProfile } from '@/types/models';

interface FeedbackIdeasWidgetProps {
  member?: MemberProfile | null;
}

const CATEGORIES_IDEAS = [
  'Infrastructure & Stands',
  'Piste Astro / Moquette',
  'Piste Terre / 1/8',
  'Animations & Courses',
  'Buvette & Convivialité',
  'Application SBC (UI / Features)',
  'Autre / Général',
];

const CATEGORIES_ANOMALIES_APP = [
  'Interface & Affichage',
  'Connexion / Mot de passe',
  'Paiement en ligne',
  'Pointage / Check-in GPS',
  'Inscriptions Courses',
  'Autre bug app',
];

const CATEGORIES_ANOMALIES_TRACK = [
  'Surface / Revêtement Piste',
  'Balisage / Tuyaux de délimitation',
  'Podium & Estrade',
  'Alimentation électrique / 220V',
  'Souffleur / Nettoyage',
  'Portail d\'accès / Cadenas',
  'Autre infrastructure',
];

export default function FeedbackIdeasWidget({ member }: FeedbackIdeasWidgetProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ideas' | 'anomalies'>('ideas');
  const [ideaSort, setIdeaSort] = useState<'top' | 'recent'>('top');

  // Données
  const [ideas, setIdeas] = useState<FeedbackItem[]>([]);
  const [anomalies, setAnomalies] = useState<FeedbackItem[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);

  // Modale création d'idée
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaCategory, setIdeaCategory] = useState(CATEGORIES_IDEAS[0]);
  const [ideaDescription, setIdeaDescription] = useState('');
  const [submittingIdea, setSubmittingIdea] = useState(false);
  const [ideaError, setIdeaError] = useState('');

  // Formulaire Signalement
  const [anomalyType, setAnomalyType] = useState<FeedbackType>('INCIDENT_TRACK');
  const [anomalyCategory, setAnomalyCategory] = useState(CATEGORIES_ANOMALIES_TRACK[0]);
  const [anomalySeverity, setAnomalySeverity] = useState<FeedbackSeverity>('MEDIUM');
  const [anomalyTitle, setAnomalyTitle] = useState('');
  const [anomalyDescription, setAnomalyDescription] = useState('');
  const [submittingAnomaly, setSubmittingAnomaly] = useState(false);
  const [anomalyMsg, setAnomalyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Chargement des idées
  const fetchIdeas = useCallback(async () => {
    setLoadingIdeas(true);
    const { data } = await getPublicIdeas(ideaSort);
    setIdeas(data || []);
    setLoadingIdeas(false);
  }, [ideaSort]);

  // Chargement des anomalies
  const fetchAnomalies = useCallback(async () => {
    setLoadingAnomalies(true);
    const { data } = await getMyAnomalies();
    setAnomalies(data || []);
    setLoadingAnomalies(false);
  }, []);

  useEffect(() => {
    if (activeSubTab === 'ideas') {
      fetchIdeas();
    } else {
      fetchAnomalies();
    }
  }, [activeSubTab, fetchIdeas, fetchAnomalies]);

  // Gestion du vote optimiste
  const handleVote = async (ideaId: string) => {
    if (!member) return;

    // Optimistic UI
    setIdeas((prev) =>
      prev.map((item) => {
        if (item.id === ideaId) {
          const nextVoted = !item.has_voted_by_user;
          const nextCount = nextVoted ? item.votes_count + 1 : Math.max(0, item.votes_count - 1);
          return {
            ...item,
            has_voted_by_user: nextVoted,
            votes_count: nextCount,
          };
        }
        return item;
      })
    );

    const { success, hasVoted, newVotesCount, error } = await toggleIdeaVote(ideaId);
    if (!success || error) {
      // Revert if error
      fetchIdeas();
    } else if (hasVoted !== undefined && newVotesCount !== undefined) {
      setIdeas((prev) =>
        prev.map((item) =>
          item.id === ideaId
            ? { ...item, has_voted_by_user: hasVoted, votes_count: newVotesCount }
            : item
        )
      );
    }
  };

  // Soumission d'une nouvelle idée
  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdeaError('');
    if (!ideaTitle.trim() || !ideaDescription.trim()) {
      setIdeaError('Veuillez renseigner un titre et une description.');
      return;
    }

    setSubmittingIdea(true);
    const input: CreateFeedbackInput = {
      type: 'IDEA',
      category: ideaCategory,
      title: ideaTitle,
      description: ideaDescription,
      severity: 'LOW',
    };

    const { success, error } = await submitFeedback(input);
    setSubmittingIdea(false);

    if (success) {
      setIdeaTitle('');
      setIdeaDescription('');
      setIdeaModalOpen(false);
      fetchIdeas();
    } else {
      setIdeaError(error || 'Erreur lors de la soumission de votre idée.');
    }
  };

  // Soumission d'une anomalie
  const handleCreateAnomaly = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnomalyMsg(null);
    if (!anomalyTitle.trim() || !anomalyDescription.trim()) {
      setAnomalyMsg({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    setSubmittingAnomaly(true);
    const input: CreateFeedbackInput = {
      type: anomalyType,
      category: anomalyCategory,
      title: anomalyTitle,
      description: anomalyDescription,
      severity: anomalySeverity,
    };

    const { success, error } = await submitFeedback(input);
    setSubmittingAnomaly(false);

    if (success) {
      setAnomalyTitle('');
      setAnomalyDescription('');
      setAnomalyMsg({
        type: 'success',
        text: 'Votre signalement a été transmis au comité. Merci pour votre vigilance !',
      });
      fetchAnomalies();
    } else {
      setAnomalyMsg({
        type: 'error',
        text: error || 'Erreur lors de la transmission du signalement.',
      });
    }
  };

  const formatAuthorName = (author?: { first_name?: string | null; last_name?: string | null } | null) => {
    if (!author || !author.first_name) return 'Membre SBC';
    const lastInitial = author.last_name ? ` ${author.last_name.charAt(0).toUpperCase()}.` : '';
    return `${author.first_name}${lastInitial}`;
  };

  const getStatusBadge = (status: string) => {
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-400">
            Mineur
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
            Gênant
          </span>
        );
      case 'HIGH':
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-secondary/20 border border-secondary/40 text-secondary">
            Urgent / Bloquant
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-6">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#353535] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
            {activeSubTab === 'ideas' ? (
              <Lightbulb className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-secondary" />
            )}
          </div>
          <div>
            <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
              Boîte à Idées & <span className="text-primary">Signalements</span>
            </h2>
            <p className="text-xs text-foreground/50 font-mono">
              Participez à l'amélioration continue des pistes et de la vie du club SBC
            </p>
          </div>
        </div>

        {/* Bouton Action Rapide si onglet idées */}
        {activeSubTab === 'ideas' && (
          <button
            onClick={() => setIdeaModalOpen(true)}
            className="premium-btn py-2 px-4 text-xs flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 transform skew-x-8" />
            <span className="transform skew-x-8">Proposer une idée</span>
          </button>
        )}
      </div>

      {/* Navigation Sous-onglets */}
      <div className="flex items-center gap-2 border-b border-[#353535] pb-2">
        <button
          onClick={() => setActiveSubTab('ideas')}
          className={`px-4 py-2 rounded font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'ideas'
              ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
              : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white hover:bg-surface-high'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span className="transform skew-x-8">💡 Boîte à Idées</span>
        </button>

        <button
          onClick={() => setActiveSubTab('anomalies')}
          className={`px-4 py-2 rounded font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'anomalies'
              ? 'bg-secondary text-white shadow-[2px_2px_0px_#000]'
              : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white hover:bg-surface-high'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-secondary" />
          <span className="transform skew-x-8">⚠️ Signaler une Anomalie</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 1 : BOÎTE À IDÉES DU CLUB */}
      {/* ========================================================================= */}
      {activeSubTab === 'ideas' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filtres de tri */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-mono text-foreground/50">
              {ideas.length} suggestion{ideas.length > 1 ? 's' : ''} au total
            </span>

            <div className="flex items-center gap-1.5 bg-surface-dim p-1 rounded border border-[#353535]">
              <button
                onClick={() => setIdeaSort('top')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  ideaSort === 'top'
                    ? 'bg-primary text-black'
                    : 'text-foreground/60 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Top Votes</span>
              </button>
              <button
                onClick={() => setIdeaSort('recent')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  ideaSort === 'recent'
                    ? 'bg-primary text-black'
                    : 'text-foreground/60 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Récents</span>
              </button>
            </div>
          </div>

          {/* Liste des Idées */}
          {loadingIdeas ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-foreground/40 font-mono text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Chargement des idées de la communauté...</span>
            </div>
          ) : ideas.length === 0 ? (
            <div className="p-8 text-center bg-surface-dim rounded-lg border border-[#353535] space-y-3">
              <Lightbulb className="w-10 h-10 mx-auto text-foreground/20" />
              <p className="text-xs font-mono text-foreground/50">
                Aucune idée pour le moment. Soyez le premier à proposer une amélioration pour le club !
              </p>
              <button
                onClick={() => setIdeaModalOpen(true)}
                className="premium-btn py-1.5 px-3 text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 transform skew-x-8" />
                <span className="transform skew-x-8">Proposer la première idée</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-5 bg-surface-dim hover:bg-surface rounded-lg border border-[#353535] transition-all flex flex-col sm:flex-row sm:items-start gap-4 justify-between relative group"
                >
                  {/* Contenu principal */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] font-bold uppercase tracking-wider">
                        {idea.category}
                      </span>
                      {getStatusBadge(idea.status)}
                    </div>

                    <h3 className="font-anybody font-extrabold text-base uppercase sport-skew text-white group-hover:text-primary transition-colors">
                      {idea.title}
                    </h3>

                    <p className="text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-line">
                      {idea.description}
                    </p>

                    {/* Réponse officielle du CA si disponible */}
                    {idea.admin_response && (
                      <div className="mt-3 p-3.5 rounded-lg bg-surface border border-primary/30 space-y-1.5 relative overflow-hidden">
                        <div className="flex items-center gap-1.5 text-primary text-[11px] font-mono font-bold uppercase tracking-wider">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          <span>Réponse officielle du Comité :</span>
                        </div>
                        <p className="text-xs font-mono text-white/90 pl-5 leading-relaxed italic">
                          « {idea.admin_response} »
                        </p>
                        {idea.responded_at && (
                          <div className="text-[9px] font-mono text-foreground/40 pl-5">
                            Mis à jour le {new Date(idea.responded_at).toLocaleDateString('fr-BE')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Méta infos */}
                    <div className="flex items-center gap-3 text-[10px] font-mono text-foreground/40 pt-1">
                      <span>Proposé par <strong className="text-foreground/70">{formatAuthorName(idea.author)}</strong></span>
                      <span>•</span>
                      <span>{new Date(idea.created_at).toLocaleDateString('fr-BE')}</span>
                    </div>
                  </div>

                  {/* Bouton Upvote interactif */}
                  <div className="sm:self-center shrink-0">
                    <button
                      onClick={() => handleVote(idea.id)}
                      className={`px-4 py-2.5 rounded-lg font-anybody font-black text-sm uppercase sport-skew flex items-center gap-2 transition-all cursor-pointer ${
                        idea.has_voted_by_user
                          ? 'bg-primary text-black shadow-[2px_2px_0px_#000] scale-105'
                          : 'bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white'
                      }`}
                      title={idea.has_voted_by_user ? 'Cliquez pour retirer votre vote' : 'Voter pour cette idée'}
                    >
                      <ThumbsUp
                        className={`w-4 h-4 transform skew-x-8 ${
                          idea.has_voted_by_user ? 'fill-current' : ''
                        }`}
                      />
                      <span className="transform skew-x-8">{idea.votes_count}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 2 : SIGNALEMENT D'ANOMALIES */}
      {/* ========================================================================= */}
      {activeSubTab === 'anomalies' && (
        <div className="space-y-8 animate-fade-in">
          {/* Formulaire de création de signalement */}
          <div className="p-6 bg-surface-dim rounded-lg border border-[#353535] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#353535] pb-3">
              <AlertTriangle className="w-4 h-4 text-secondary" />
              <h3 className="font-anybody font-black text-sm uppercase sport-skew text-white">
                Nouveau Signalement au Comité
              </h3>
            </div>

            {anomalyMsg && (
              <div
                className={`p-3 rounded font-mono text-xs flex items-center gap-2 animate-fade-in ${
                  anomalyMsg.type === 'success'
                    ? 'bg-success/15 border border-success/30 text-success'
                    : 'bg-secondary/15 border border-secondary/30 text-secondary'
                }`}
              >
                {anomalyMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{anomalyMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateAnomaly} className="space-y-4">
              {/* Sélecteur de type */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1.5">
                  Type d'anomalie *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAnomalyType('INCIDENT_TRACK');
                      setAnomalyCategory(CATEGORIES_ANOMALIES_TRACK[0]);
                    }}
                    className={`p-3 rounded border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      anomalyType === 'INCIDENT_TRACK'
                        ? 'bg-secondary/15 border-secondary text-white'
                        : 'bg-surface border-[#353535] text-foreground/60 hover:text-white'
                    }`}
                  >
                    <Construction className="w-5 h-5 text-secondary shrink-0" />
                    <div>
                      <div className="font-anybody font-bold text-xs uppercase sport-skew">
                        Problème Piste / Infrastructure
                      </div>
                      <div className="text-[10px] font-mono text-foreground/50">
                        Revêtement, podium, électricité, sécurité
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAnomalyType('BUG_APP');
                      setAnomalyCategory(CATEGORIES_ANOMALIES_APP[0]);
                    }}
                    className={`p-3 rounded border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      anomalyType === 'BUG_APP'
                        ? 'bg-primary/15 border-primary text-white'
                        : 'bg-surface border-[#353535] text-foreground/60 hover:text-white'
                    }`}
                  >
                    <Bug className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="font-anybody font-bold text-xs uppercase sport-skew">
                        Bug Application SBC
                      </div>
                      <div className="text-[10px] font-mono text-foreground/50">
                        Dysfonctionnement plateforme, compte, paiements
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Catégorie & Gravité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                    Catégorie / Élément concerné *
                  </label>
                  <select
                    value={anomalyCategory}
                    onChange={(e) => setAnomalyCategory(e.target.value)}
                    className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                  >
                    {(anomalyType === 'INCIDENT_TRACK'
                      ? CATEGORIES_ANOMALIES_TRACK
                      : CATEGORIES_ANOMALIES_APP
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                    Niveau de gravité *
                  </label>
                  <select
                    value={anomalySeverity}
                    onChange={(e) => setAnomalySeverity(e.target.value as FeedbackSeverity)}
                    className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                  >
                    <option value="LOW">Mineur (Gêne légère, contournable)</option>
                    <option value="MEDIUM">Gênant (Impacte la pratique ou l'usage)</option>
                    <option value="HIGH">Urgent / Bloquant (Danger ou blocage total)</option>
                  </select>
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                  Objet du signalement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prise 220V défectueuse stand numéro 4..."
                  value={anomalyTitle}
                  onChange={(e) => setAnomalyTitle(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                  Détails & Constat *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Expliquez avec précision le problème rencontré et le lieu exact..."
                  value={anomalyDescription}
                  onChange={(e) => setAnomalyDescription(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingAnomaly}
                  className="premium-btn py-2 px-5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingAnomaly ? (
                    <Loader2 className="w-4 h-4 animate-spin transform skew-x-8" />
                  ) : (
                    <Send className="w-4 h-4 transform skew-x-8" />
                  )}
                  <span className="transform skew-x-8">Envoyer le signalement</span>
                </button>
              </div>
            </form>
          </div>

          {/* Liste "Mes Signalements" */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#353535] pb-2">
              <h3 className="font-anybody font-black text-sm uppercase sport-skew text-white flex items-center gap-2">
                <span>Mes Signalements Transmis ({anomalies.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-foreground/40">
                Visible uniquement par vous et le CA
              </span>
            </div>

            {loadingAnomalies ? (
              <div className="py-8 flex items-center justify-center gap-2 text-foreground/40 font-mono text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Chargement de vos tickets...</span>
              </div>
            ) : anomalies.length === 0 ? (
              <div className="py-6 text-center text-foreground/40 font-mono text-xs">
                Vous n'avez envoyé aucun signalement pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-surface-dim rounded-lg border border-[#353535] space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'BUG_APP' ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
                            <Bug className="w-3 h-3" /> Bug App
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-secondary/15 border border-secondary/30 text-secondary flex items-center gap-1">
                            <Construction className="w-3 h-3" /> Piste
                          </span>
                        )}
                        <span className="text-xs font-mono text-foreground/50">{item.category}</span>
                        {getSeverityBadge(item.severity)}
                      </div>

                      {getStatusBadge(item.status)}
                    </div>

                    <div className="font-anybody font-bold text-sm uppercase sport-skew text-white">
                      {item.title}
                    </div>

                    <p className="text-xs font-mono text-foreground/75 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Réponse officielle CA */}
                    {item.admin_response && (
                      <div className="p-3 rounded bg-surface border border-primary/30 space-y-1 mt-2">
                        <div className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Réponse du Comité :</span>
                        </div>
                        <p className="text-xs font-mono text-white/90 pl-4 italic">
                          « {item.admin_response} »
                        </p>
                      </div>
                    )}

                    <div className="text-[10px] font-mono text-foreground/40 pt-1">
                      Signalé le {new Date(item.created_at).toLocaleDateString('fr-BE')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE : PROPOSER UNE IDÉE */}
      {/* ========================================================================= */}
      {ideaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="premium-card w-full max-w-lg p-6 rounded-lg border border-[#353535] space-y-5 relative">
            <button
              onClick={() => setIdeaModalOpen(false)}
              className="absolute top-4 right-4 text-foreground/40 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary text-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-anybody font-black text-lg uppercase sport-skew text-white">
                Proposer une Idée au Club
              </h3>
            </div>

            {ideaError && (
              <div className="p-3 rounded bg-secondary/20 border border-secondary/40 text-secondary text-xs font-mono">
                ⚠️ {ideaError}
              </div>
            )}

            <form onSubmit={handleCreateIdea} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                  Catégorie *
                </label>
                <select
                  value={ideaCategory}
                  onChange={(e) => setIdeaCategory(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                >
                  {CATEGORIES_IDEAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                  Titre de l'idée *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Installation d'un compresseur d'air supplémentaire..."
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                  Explication détaillée *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Décrivez comment cela profiterait aux membres du club et à la piste..."
                  value={ideaDescription}
                  onChange={(e) => setIdeaDescription(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIdeaModalOpen(false)}
                  className="px-4 py-2 rounded font-mono text-xs text-foreground/60 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingIdea}
                  className="premium-btn py-2 px-5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingIdea ? (
                    <Loader2 className="w-4 h-4 animate-spin transform skew-x-8" />
                  ) : (
                    <Send className="w-4 h-4 transform skew-x-8" />
                  )}
                  <span className="transform skew-x-8">Publier l'idée</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
