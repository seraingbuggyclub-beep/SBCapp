'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Save, AlertTriangle } from 'lucide-react';
import {
  EventFormData,
  EventType,
  RaceCategoryItem,
  MealOptionItem,
  getErrorMessage,
} from '@/types/models';
import { createEventAdmin } from '@/modules/events/actions';
import CategoryMealFields from './CategoryMealFields';

const DEFAULT_CATEGORIES: RaceCategoryItem[] = [
  { name: 'Buggy 1/10 2WD', fee: 10, type: 'Electric' },
  { name: 'Buggy 1/10 4WD', fee: 10, type: 'Electric' },
  { name: 'Truck 1/10 2wD', fee: 10, type: 'Electric' },
  { name: 'Buggy 1/8', fee: 15, type: 'Nitro / Elec' },
  { name: 'Truggy 1/8', fee: 15, type: 'Nitro / Elec' },
  { name: 'Vintage 1/10', fee: 10, type: 'Electric' },
  { name: 'Rallye Game 1/10', fee: 10, type: 'Electric' },
];

const DEFAULT_MEALS: MealOptionItem[] = [
  { name: 'Pain garni Hamburger', price: 4.5, desc: 'Pain garni avec hamburger chaud' },
  { name: 'Pain garni Mexicanos', price: 4.5, desc: 'Pain garni avec mexicanos chaud' },
  { name: 'Pain garni Saucisse géante', price: 4.5, desc: 'Pain garni avec saucisse géante' },
];

interface QuickEventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  defaultDate?: string;
}

export default function QuickEventCreateModal({
  isOpen,
  onClose,
  onCreated,
  defaultDate,
}: QuickEventCreateModalProps) {
  const [modalDate, setModalDate] = useState<string>(defaultDate || '');
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalDesc, setModalDesc] = useState<string>('');
  const [modalType, setModalType] = useState<EventType>('sbc_race');
  const [modalHasReg, setModalHasReg] = useState<boolean>(true);
  const [modalExtLink, setModalExtLink] = useState<string>('');
  const [modalStartTime, setModalStartTime] = useState<string>('09:00');
  const [modalEndTime, setModalEndTime] = useState<string>('18:00');
  const [modalLocation, setModalLocation] = useState<string>('Seraing Buggy Track, Belgium');

  const [modalCategories, setModalCategories] = useState<RaceCategoryItem[]>(DEFAULT_CATEGORIES);
  const [modalMeals, setModalMeals] = useState<MealOptionItem[]>(DEFAULT_MEALS);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');

  useEffect(() => {
    if (defaultDate) {
      setModalDate(defaultDate);
    }
  }, [defaultDate]);

  if (!isOpen) return null;

  const handleCategoryChange = (index: number, field: keyof RaceCategoryItem, val: string | number) => {
    const updated = [...modalCategories];
    updated[index] = { ...updated[index], [field]: val };
    setModalCategories(updated);
  };

  const handleAddCategory = () => {
    setModalCategories([...modalCategories, { name: 'Nouvelle Catégorie', fee: 10, type: 'Electric' }]);
  };

  const handleRemoveCategory = (index: number) => {
    setModalCategories(modalCategories.filter((_, i) => i !== index));
  };

  const handleMealChange = (index: number, field: keyof MealOptionItem, val: string | number) => {
    const updated = [...modalMeals];
    updated[index] = { ...updated[index], [field]: val };
    setModalMeals(updated);
  };

  const handleAddMeal = () => {
    setModalMeals([...modalMeals, { name: 'Pain garni', price: 4.5, desc: '' }]);
  };

  const handleRemoveMeal = (index: number) => {
    setModalMeals(modalMeals.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim() || !modalDate) {
      setModalError('Le titre et la date sont requis.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const payload: EventFormData = {
        title: modalTitle.trim(),
        description: modalDesc.trim() || undefined,
        event_date: modalDate,
        start_time: modalStartTime,
        end_time: modalEndTime,
        category:
          modalType === 'sbc_race'
            ? 'Course Club SBC'
            : modalType === 'belgian_championship'
            ? 'Champ. de Belgique'
            : modalType === 'holiday'
            ? 'Événement Spécial'
            : 'Réunion Club',
        location: modalLocation.trim() || 'Seraing Buggy Track, Belgium',
        registration_fee: modalHasReg && modalCategories[0]?.fee ? modalCategories[0].fee : 0,
        status: 'open',
        event_type: modalType,
        has_registration: modalHasReg,
        external_link: modalExtLink.trim() || undefined,
        categories: modalHasReg ? modalCategories : [],
        meal_options: modalHasReg ? modalMeals : [],
      };

      const { error } = await createEventAdmin(payload);
      if (error) {
        setModalError(error);
      } else {
        onClose();
        await onCreated();
      }
    } catch (err: unknown) {
      setModalError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="premium-card rounded-lg max-w-2xl w-full border border-primary/40 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Modale */}
        <div className="p-5 bg-surface-dim border-b border-[#353535] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" /> Administration SBC
            </span>
            <h3 className="font-anybody font-black text-lg text-white uppercase sport-skew">
              Programmer un Événement
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-foreground/40 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
          {modalError && (
            <div className="p-3 bg-secondary/20 border border-secondary/40 text-secondary rounded flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Type d'événement */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Type d'activité
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'sbc_race', label: '🏁 Course Club' },
                { id: 'belgian_championship', label: '🏆 Champ. BE' },
                { id: 'holiday', label: '🎉 Fête / Spécial' },
                { id: 'club_meeting', label: '🤝 Réunion' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setModalType(t.id as EventType);
                    if (t.id !== 'sbc_race') setModalHasReg(false);
                    else setModalHasReg(true);
                  }}
                  className={`p-2 rounded border text-center transition-all cursor-pointer ${
                    modalType === t.id
                      ? 'bg-primary/20 border-primary text-primary font-bold'
                      : 'bg-surface border-[#353535] text-foreground/60 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Titre de l'événement *
            </label>
            <input
              type="text"
              required
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              placeholder="ex: Manche 1 Championnat SBC 2026"
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* Date & Horaires */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                Heure Début
              </label>
              <input
                type="time"
                value={modalStartTime}
                onChange={(e) => setModalStartTime(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                Heure Fin
              </label>
              <input
                type="time"
                value={modalEndTime}
                onChange={(e) => setModalEndTime(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Lieu */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Lieu
            </label>
            <input
              type="text"
              value={modalLocation}
              onChange={(e) => setModalLocation(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
              Description / Informations
            </label>
            <textarea
              rows={2}
              value={modalDesc}
              onChange={(e) => setModalDesc(e.target.value)}
              placeholder="Règlement, détails horaires, restauration..."
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* Inscription directe vs Lien externe */}
          <div className="p-3 rounded bg-surface border border-[#353535] space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
              <input
                type="checkbox"
                checked={modalHasReg}
                onChange={(e) => setModalHasReg(e.target.checked)}
                className="accent-primary cursor-pointer w-4 h-4"
              />
              <span className="font-bold">Activer les inscriptions en ligne (Pilotes SBC)</span>
            </label>

            {!modalHasReg && (
              <div className="pt-2">
                <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                  Lien externe vers le site / inscriptions officielles
                </label>
                <input
                  type="url"
                  value={modalExtLink}
                  onChange={(e) => setModalExtLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-background border border-[#353535] rounded px-3 py-1.5 text-white focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Configuration dynamique des Catégories & Repas si inscriptions actives */}
          {modalHasReg && (
            <div className="pt-2 border-t border-[#353535]/60">
              <CategoryMealFields
                categories={modalCategories}
                onCategoryChange={handleCategoryChange}
                onAddCategory={handleAddCategory}
                onRemoveCategory={handleRemoveCategory}
                mealOptions={modalMeals}
                onMealChange={handleMealChange}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMeal}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Boutons validation */}
          <div className="pt-4 border-t border-[#353535] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white rounded cursor-pointer transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider rounded sport-skew hover:bg-secondary hover:text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="transform skew-x-8">
                {isSubmitting ? 'Enregistrement...' : 'Créer l\'Événement'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
