'use client';

import React from 'react';
import { Plus, Trash2, Trophy, Utensils } from 'lucide-react';
import { RaceCategoryItem, MealOptionItem } from '@/types/models';

interface CategoryMealFieldsProps {
  categories: RaceCategoryItem[];
  onCategoryChange: (index: number, field: keyof RaceCategoryItem, value: string | number) => void;
  onAddCategory: () => void;
  onRemoveCategory: (index: number) => void;
  mealOptions: MealOptionItem[];
  onMealChange: (index: number, field: keyof MealOptionItem, value: string | number) => void;
  onAddMeal: () => void;
  onRemoveMeal: (index: number) => void;
  disabled?: boolean;
}

export default function CategoryMealFields({
  categories,
  onCategoryChange,
  onAddCategory,
  onRemoveCategory,
  mealOptions,
  onMealChange,
  onAddMeal,
  onRemoveMeal,
  disabled = false,
}: CategoryMealFieldsProps) {
  return (
    <div className="space-y-6">
      {/* 1. Catégories de Course */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-[#353535]/60 pb-2">
          <label className="text-xs font-mono uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-primary" />
            Catégories de Course & Tarifs ({categories.length})
          </label>
          <button
            type="button"
            onClick={onAddCategory}
            disabled={disabled}
            className="text-[11px] font-mono text-primary hover:text-white flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-background p-2 rounded border border-[#353535]">
              <input
                type="text"
                value={cat.name}
                disabled={disabled}
                onChange={(e) => onCategoryChange(idx, 'name', e.target.value)}
                placeholder="Nom (ex: Buggy 1/10 4WD)"
                className="grow bg-transparent border-0 text-white font-mono text-xs focus:outline-none placeholder:text-foreground/30"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-foreground/40 font-mono">€</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={cat.fee}
                  disabled={disabled}
                  onChange={(e) => onCategoryChange(idx, 'fee', parseFloat(e.target.value) || 0)}
                  className="w-14 bg-surface border border-[#353535] rounded px-1.5 py-0.5 text-right font-mono text-xs text-primary font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <input
                type="text"
                value={cat.type || ''}
                disabled={disabled}
                onChange={(e) => onCategoryChange(idx, 'type', e.target.value)}
                placeholder="Type (Elec/Nitro)"
                className="w-20 bg-surface border border-[#353535] rounded px-1.5 py-0.5 font-mono text-[10px] text-foreground/70 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onRemoveCategory(idx)}
                disabled={disabled || categories.length <= 1}
                className="text-foreground/40 hover:text-secondary p-1 rounded disabled:opacity-20 cursor-pointer transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Options Repas & Restauration */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-[#353535]/60 pb-2">
          <label className="text-xs font-mono uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-primary" />
            Options de Restauration / Repas ({mealOptions.length})
          </label>
          <button
            type="button"
            onClick={onAddMeal}
            disabled={disabled}
            className="text-[11px] font-mono text-primary hover:text-white flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {mealOptions.map((meal, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-background p-2 rounded border border-[#353535]">
              <input
                type="text"
                value={meal.name}
                disabled={disabled}
                onChange={(e) => onMealChange(idx, 'name', e.target.value)}
                placeholder="Nom (ex: Pain garni Hamburger)"
                className="grow bg-transparent border-0 text-white font-mono text-xs focus:outline-none placeholder:text-foreground/30"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-foreground/40 font-mono">€</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={meal.price}
                  disabled={disabled}
                  onChange={(e) => onMealChange(idx, 'price', parseFloat(e.target.value) || 0)}
                  className="w-14 bg-surface border border-[#353535] rounded px-1.5 py-0.5 text-right font-mono text-xs text-white font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemoveMeal(idx)}
                disabled={disabled || mealOptions.length <= 1}
                className="text-foreground/40 hover:text-secondary p-1 rounded disabled:opacity-20 cursor-pointer transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
