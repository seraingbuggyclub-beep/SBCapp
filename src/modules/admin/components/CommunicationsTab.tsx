'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
} from '@/modules/announcements/actions';
import { ClubAnnouncement, AnnouncementFormData, AnnouncementCategory } from '@/types/models';
import {
  Radio,
  Plus,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Wrench,
  Flag,
  Users,
} from 'lucide-react';

interface CommunicationsTabProps {
  canEdit: boolean;
  isSimulated: boolean;
}

export default function CommunicationsTab({ canEdit, isSimulated }: CommunicationsTabProps) {
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('info_piste');
  const [isPinned, setIsPinned] = useState(false);
  const [authorName, setAuthorName] = useState('Comité SBC');
  const [submitting, setSubmitting] = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    const { data } = await getAnnouncements();
    setAnnouncements(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setCategory('info_piste');
    setIsPinned(false);
    setAuthorName('Comité SBC');
  };

  const handleStartEdit = (item: ClubAnnouncement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category);
    setIsPinned(item.is_pinned);
    setAuthorName(item.author_name);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSimulated) {
      showMessage('error', 'Simulation active : modification des annonces bloquée.');
      return;
    }
    if (!canEdit) {
      showMessage('error', 'Droits insuffisants pour publier des annonces.');
      return;
    }

    setSubmitting(true);
    const payload: AnnouncementFormData = {
      title: title.trim(),
      content: content.trim(),
      category,
      is_pinned: isPinned,
      author_name: authorName.trim() || 'Comité SBC',
    };

    if (editingId) {
      const { data, error } = await updateAnnouncement(editingId, payload);
      if (error) {
        showMessage('error', `Erreur modification : ${error}`);
      } else if (data) {
        showMessage('success', 'Annonce modifiée avec succès !');
        resetForm();
        fetchNews();
      }
    } else {
      const { data, error } = await createAnnouncement(payload);
      if (error) {
        showMessage('error', `Erreur création : ${error}`);
      } else if (data) {
        showMessage('success', 'Annonce publiée sur le Pit-Lane !');
        resetForm();
        fetchNews();
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (isSimulated) {
      showMessage('error', 'Simulation active : suppression bloquée.');
      return;
    }
    if (!canEdit) return;
    if (!window.confirm('Voulez-vous vraiment supprimer cette annonce du babillard ?')) return;

    const { success, error } = await deleteAnnouncement(id);
    if (success) {
      showMessage('success', 'Annonce supprimée.');
      fetchNews();
    } else {
      showMessage('error', `Erreur suppression : ${error}`);
    }
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    if (isSimulated || !canEdit) return;
    const { success, error } = await togglePinAnnouncement(id, !currentPin);
    if (success) {
      showMessage('success', currentPin ? 'Annonce désépinglée.' : 'Annonce épinglée au sommet !');
      fetchNews();
    } else {
      showMessage('error', `Erreur : ${error}`);
    }
  };

  const getCategoryBadge = (cat: AnnouncementCategory) => {
    switch (cat) {
      case 'info_piste':
        return { label: 'Info Piste', icon: Info, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'travaux':
        return { label: 'Travaux', icon: Wrench, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'briefing_course':
        return { label: 'Briefing', icon: Flag, color: 'text-primary bg-primary/10 border-primary/20' };
      case 'vie_du_club':
      default:
        return { label: 'Vie Club', icon: Users, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Alertes de statut */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded font-mono text-xs flex items-center gap-2 animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-success/15 border border-success/30 text-success'
              : 'bg-secondary/15 border border-secondary/30 text-secondary'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Formulaire de publication / édition */}
      <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-6">
        <div className="flex items-center justify-between border-b border-[#353535] pb-4">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-primary" />
            <h3 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
              {editingId ? 'Modifier l\'annonce' : 'Publier une nouvelle annonce'}
            </h3>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs font-mono text-foreground/50 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Annuler l'édition
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Titre */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-foreground/60 mb-1">
                Titre de l'annonce *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Fermeture temporaire pour surfaçage..."
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/60 mb-1">
                Catégorie *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer font-bold uppercase tracking-wider text-[11px]"
              >
                <option value="info_piste">Info Piste</option>
                <option value="travaux">Travaux & Entretien</option>
                <option value="briefing_course">Briefing Course</option>
                <option value="vie_du_club">Vie du Club</option>
              </select>
            </div>
          </div>

          {/* Message / Contenu */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/60 mb-1">
              Contenu du message (texte ou consignes) *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez la communication officielle..."
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
            {/* Signature auteur */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/60 mb-1">
                Signature / Émetteur
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ex: Comité SBC, Commission Piste..."
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Switch Épinglé */}
            <div className="flex items-center gap-3 sm:pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-[#353535] text-primary focus:ring-primary"
                />
                <span className="text-xs text-white font-bold flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-secondary" />
                  Épingler en haut du Babillard (Urgent / Prioritaire)
                </span>
              </label>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="premium-btn text-xs px-6 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="transform skew-x-8">
                {submitting ? 'Enregistrement...' : editingId ? 'Mettre à jour l\'annonce' : 'Diffuser sur le Pit-Lane'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Liste des annonces existantes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-anybody font-black text-sm uppercase sport-skew text-white">
            Annonces publiées ({announcements.length})
          </h4>
          <button
            onClick={fetchNews}
            disabled={loading}
            className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white transition-colors cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {announcements.map((item) => {
            const badge = getCategoryBadge(item.category);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg bg-surface-dim border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  item.is_pinned ? 'border-primary/40 shadow-[0_0_15px_rgba(255,110,0,0.08)]' : 'border-[#353535]'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${badge.color}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>

                    {item.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/15 border border-secondary/30 text-secondary text-[10px] font-mono font-bold uppercase tracking-wider">
                        <Pin className="w-3 h-3" /> Épinglé
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-foreground/40">
                      {new Date(item.created_at).toLocaleDateString('fr-BE')} • {item.author_name}
                    </span>
                  </div>

                  <h5 className="font-anybody font-black text-sm uppercase sport-skew text-white">
                    {item.title}
                  </h5>

                  <p className="text-xs font-mono text-foreground/65 line-clamp-2">
                    {item.content}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleTogglePin(item.id, item.is_pinned)}
                    className={`p-2 rounded border transition-colors cursor-pointer text-xs ${
                      item.is_pinned
                        ? 'bg-secondary/20 border-secondary/40 text-secondary hover:bg-secondary/30'
                        : 'bg-surface border-[#353535] text-foreground/50 hover:text-white'
                    }`}
                    title={item.is_pinned ? 'Désépingler' : 'Épingler au sommet'}
                  >
                    {item.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleStartEdit(item)}
                    className="p-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white transition-colors cursor-pointer"
                    title="Éditer"
                  >
                    <Edit className="w-3.5 h-3.5 text-primary" />
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-secondary transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
