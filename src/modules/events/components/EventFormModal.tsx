'use client';

import React from 'react';
import { Trophy, ExternalLink, Save } from 'lucide-react';
import { EventFormData, EventType, RaceCategoryItem, MealOptionItem } from '@/modules/events/actions';
import CategoryMealFields from './CategoryMealFields';

interface EventFormModalProps {
  editingEventId: string | null;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  eventDate: string;
  setEventDate: (val: string) => void;
  startTime: string;
  setStartTime: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;
  categoryBadge: string;
  setCategoryBadge: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  status: 'open' | 'closed' | 'draft';
  setStatus: (val: 'open' | 'closed' | 'draft') => void;
  eventType: EventType;
  onEventTypeChange: (type: EventType) => void;
  hasRegistration: boolean;
  setHasRegistration: (val: boolean) => void;
  externalLink: string;
  setExternalLink: (val: string) => void;
  categories: RaceCategoryItem[];
  onCategoryChange: (index: number, field: keyof RaceCategoryItem, val: string | number) => void;
  onAddCategory: () => void;
  onRemoveCategory: (index: number) => void;
  mealOptions: MealOptionItem[];
  onMealChange: (index: number, field: keyof MealOptionItem, val: string | number) => void;
  onAddMeal: () => void;
  onRemoveMeal: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

export default function EventFormModal({
  editingEventId,
  title,
  setTitle,
  description,
  setDescription,
  eventDate,
  setEventDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  categoryBadge,
  setCategoryBadge,
  location,
  setLocation,
  status,
  setStatus,
  eventType,
  onEventTypeChange,
  hasRegistration,
  setHasRegistration,
  externalLink,
  setExternalLink,
  categories,
  onCategoryChange,
  onAddCategory,
  onRemoveCategory,
  mealOptions,
  onMealChange,
  onAddMeal,
  onRemoveMeal,
  onSubmit,
  onReset,
}: EventFormModalProps) {
  return (
    <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-6">
      <div className="flex items-center justify-between border-b border-[#353535] pb-3">
        <h3 className="font-anybody font-black text-base uppercase tracking-wider text-white sport-skew flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          {editingEventId ? "Modifier l'Événement" : 'Créer un Nouvel Événement'}
        </h3>
        {editingEventId && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] text-foreground/50 hover:text-white font-mono uppercase cursor-pointer"
          >
            Annuler
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-5 text-xs font-mono">
        {/* Sélecteur de Type d'Événement */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1.5 font-bold">
            1. Type d&apos;Événement *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: 'sbc_race' as EventType,
                label: 'Course Club SBC',
                icon: '🏁',
                desc: 'Course locale avec paiements & repas',
              },
              {
                id: 'belgian_championship' as EventType,
                label: 'Champ. de Belgique / Ext.',
                icon: '🏆',
                desc: 'Course extérieure / lien officiel',
              },
              {
                id: 'holiday' as EventType,
                label: 'Événement Spécial / Fête Club',
                icon: '🎉',
                desc: 'Événement ponctuel ou fête locale sans inscription',
              },
              {
                id: 'club_meeting' as EventType,
                label: 'Réunion / Activité',
                icon: '🤝',
                desc: 'Activité du club ou assemblée',
              },
            ].map((item) => {
              const isSelected = eventType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onEventTypeChange(item.id)}
                  className={`p-3 border text-left rounded transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-[inset_0_0_12px_rgba(255,110,0,0.12)]'
                      : 'border-[#353535] bg-surface hover:bg-surface-high text-foreground/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[9px] text-foreground/50 mt-1 leading-tight">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Case à cocher : Inscriptions sur l'app */}
        <div className="p-3 bg-surface-dim border border-[#353535] rounded space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hasRegistration}
              onChange={(e) => setHasRegistration(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-[#353535] rounded focus:ring-primary focus:ring-offset-0 cursor-pointer"
            />
            <span className="font-bold text-white text-xs font-sans">
              Activer les inscriptions sur SBC App
            </span>
          </label>
          <p className="text-[10px] text-foreground/50 leading-relaxed">
            {hasRegistration
              ? "✅ Les pilotes pourront s'inscrire directement, choisir leurs catégories et commander des repas."
              : "ℹ️ Pas d'inscription ni de paiement sur l'app. L'événement est informatif ou utilise un lien externe."}
          </p>
        </div>

        {/* Lien externe (Utile pour Champ. Belgique / MyRCM) */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
            Lien Externe Officiel (Optionnel)
          </label>
          <input
            type="url"
            value={externalLink}
            onChange={(e) => setExternalLink(e.target.value)}
            placeholder="Ex: https://www.myrcm.ch/myrcm/main?pLa=fr&pFi=..."
            className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
          />
          <p className="text-[9px] text-foreground/45 mt-1 leading-tight">
            Idéal pour renvoyer vers MyRCM, la FBA ou la billetterie extérieure.
          </p>
        </div>

        {/* Titre */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
            Titre de l&apos;événement *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Manche 1 - Championnat de Belgique 1/8 Buggy"
            className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-sans text-sm font-bold"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
            Description & Programme
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Compétition officielle 1/8 Thermique & Électrique. Contrôle technique dès 08h30..."
            className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-sans text-xs leading-relaxed"
          />
        </div>

        {/* Date, Heures & Statut */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded px-2.5 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Début - Fin
            </label>
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-1/2 bg-background border border-[#353535] rounded px-1.5 py-2 text-white focus:outline-none focus:border-primary text-center font-mono text-xs"
              />
              <span className="text-foreground/40">-</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-1/2 bg-background border border-[#353535] rounded px-1.5 py-2 text-white focus:outline-none focus:border-primary text-center font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Statut
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'open' | 'closed' | 'draft')}
              className="w-full bg-background border border-[#353535] rounded px-2 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
            >
              <option value="open">🟢 Ouvert / Affiché</option>
              <option value="closed">🔴 Fermé / Clôturé</option>
              <option value="draft">⚪ Brouillon (Masqué)</option>
            </select>
          </div>
        </div>

        {/* Lieu & Catégorie Badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Lieu
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Badge personnalisé
            </label>
            <input
              type="text"
              value={categoryBadge}
              onChange={(e) => setCategoryBadge(e.target.value)}
              placeholder="Ex: Course Club SBC"
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
            />
          </div>
        </div>

        {/* Sections Tarifs & Repas */}
        {hasRegistration ? (
          <div className="pt-2 border-t border-[#353535]/60">
            <CategoryMealFields
              categories={categories}
              onCategoryChange={onCategoryChange}
              onAddCategory={onAddCategory}
              onRemoveCategory={onRemoveCategory}
              mealOptions={mealOptions}
              onMealChange={onMealChange}
              onAddMeal={onAddMeal}
              onRemoveMeal={onRemoveMeal}
            />
          </div>
        ) : (
          <div className="p-3 bg-surface border border-[#353535] rounded text-center text-foreground/45 text-[11px] font-mono">
            Sections tarifs & repas masquées (Inscriptions désactivées sur l&apos;app).
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full premium-btn text-xs flex items-center justify-center gap-2 cursor-pointer mt-4"
        >
          <span className="transform skew-x-8 flex items-center gap-1.5">
            <Save className="w-4 h-4" />
            {editingEventId ? 'Enregistrer les Modifications' : "Créer l'Événement"}
          </span>
        </button>
      </form>
    </div>
  );
}
