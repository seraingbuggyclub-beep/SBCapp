'use client';

import React, { useState } from 'react';
import { X, Wrench, Calendar, Clock, Users, Coffee, Utensils, Plus, Trash2, Loader2 } from 'lucide-react';
import { CreateWorkSessionInput } from '@/types/models';
import { createWorkSession } from '../work-actions';

interface WorkSessionAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_MEALS = ['Pain Burger', 'Pain Mexicanos', 'Pain Saucisse', 'Végétarien'];

export default function WorkSessionAdminModal({
  isOpen,
  onClose,
  onSuccess,
}: WorkSessionAdminModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [freeSoftsQuota, setFreeSoftsQuota] = useState(2);
  const [meals, setMeals] = useState<string[]>(DEFAULT_MEALS);
  const [newMeal, setNewMeal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddMeal = () => {
    if (newMeal.trim() && !meals.includes(newMeal.trim())) {
      setMeals([...meals, newMeal.trim()]);
      setNewMeal('');
    }
  };

  const handleRemoveMeal = (index: number) => {
    setMeals(meals.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sessionDate || !startTime || !endTime) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (meals.length === 0) {
      setError('Veuillez renseigner au moins un type de repas disponible.');
      return;
    }

    setLoading(true);
    setError(null);

    const input: CreateWorkSessionInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      max_participants: Number(maxParticipants),
      free_softs_quota: Number(freeSoftsQuota),
      available_meals: meals,
    };

    const res = await createWorkSession(input);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-primary/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="px-6 py-4 bg-surface-high border-b border-[#353535] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            <h3 className="font-anybody font-black text-lg uppercase text-white tracking-wide">
              Nouvelle Session Travaux
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-foreground/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-foreground/80">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 font-sans text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-foreground/70 font-semibold mb-1 uppercase tracking-wider">
              Titre de la session *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Entretien Piste Astro & Tonte"
              required
              className="w-full bg-[#181818] border border-[#353535] rounded-lg px-3 py-2 text-white placeholder-foreground/30 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-foreground/70 font-semibold mb-1 uppercase tracking-wider">
              Description & Tâches prévues
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tâches prévues, matériel à apporter, consignes..."
              className="w-full bg-[#181818] border border-[#353535] rounded-lg px-3 py-2 text-white placeholder-foreground/30 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-foreground/70 font-semibold mb-1 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-primary" /> Date *
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="w-full bg-[#181818] border border-[#353535] rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-foreground/70 font-semibold mb-1 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-primary" /> Début *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-[#181818] border border-[#353535] rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-foreground/70 font-semibold mb-1 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-primary" /> Fin *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-[#181818] border border-[#353535] rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground/70 font-semibold mb-1 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 inline mr-1 text-primary" /> Max Bénévoles
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
                className="w-full bg-[#181818] border border-[#353535] rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-foreground/70 font-semibold mb-1 uppercase tracking-wider">
                <Coffee className="w-3.5 h-3.5 inline mr-1 text-primary" /> Softs Offerts
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={freeSoftsQuota}
                onChange={(e) => setFreeSoftsQuota(parseInt(e.target.value) || 0)}
                className="w-full bg-[#181818] border border-[#353535] rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-foreground/70 font-semibold mb-1 uppercase tracking-wider">
              <Utensils className="w-3.5 h-3.5 inline mr-1 text-primary" /> Choix de Repas Bénévoles
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {meals.map((meal, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-high border border-[#353535] rounded-lg text-white text-xs"
                >
                  {meal}
                  <button
                    type="button"
                    onClick={() => handleRemoveMeal(index)}
                    className="text-foreground/40 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMeal}
                onChange={(e) => setNewMeal(e.target.value)}
                placeholder="Ajouter une option (ex: Pain Mitraillette)"
                className="flex-1 bg-[#181818] border border-[#353535] rounded-lg px-3 py-1.5 text-white placeholder-foreground/30 focus:border-primary focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMeal();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddMeal}
                className="px-3 py-1.5 bg-surface-high hover:bg-[#353535] border border-[#353535] text-white rounded-lg flex items-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#353535]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white rounded-lg font-anybody font-bold text-xs uppercase sport-skew"
            >
              <span className="transform skew-x-8">Annuler</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-black font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span className="transform skew-x-8">Publier la Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
