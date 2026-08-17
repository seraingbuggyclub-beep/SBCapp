'use client';

import { useState, useCallback } from 'react';
import {
  ClubEvent,
  EventRegistration,
  SelectedCategoryItem,
  SelectedMealItem,
  RaceCategoryItem,
  MealOptionItem,
  getErrorMessage,
} from '@/types/models';
import { registerForEvent, updateEventRegistration } from '@/modules/events/actions';

export const DEFAULT_RACE_CATEGORIES: SelectedCategoryItem[] = [
  { name: 'Buggy 1/10 2WD', fee: 10, type: 'Electric' },
  { name: 'Buggy 1/10 4WD', fee: 10, type: 'Electric' },
  { name: 'Truck 1/10 2wD', fee: 10, type: 'Electric' },
  { name: 'Buggy 1/8', fee: 15, type: 'Nitro / Elec' },
  { name: 'Truggy 1/8', fee: 15, type: 'Nitro / Elec' },
  { name: 'Vintage 1/10', fee: 10, type: 'Electric' },
  { name: 'Rallye Game 1/10', fee: 10, type: 'Electric' },
];

export const DEFAULT_MEAL_OPTIONS: MealOptionItem[] = [
  { name: 'Pain garni Hamburger', price: 4.5, desc: 'Pain garni avec hamburger chaud' },
  { name: 'Pain garni Mexicanos', price: 4.5, desc: 'Pain garni avec mexicanos chaud' },
  { name: 'Pain garni Saucisse géante', price: 4.5, desc: 'Pain garni avec saucisse géante' },
];

export interface UseEventRegistrationOptions {
  defaultTransponder?: string | null;
}

export function useEventRegistration(options?: UseEventRegistrationOptions) {
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategoryItem[]>([]);
  const [mealQuantities, setMealQuantities] = useState<Record<string, number>>({});
  const [transponderId, setTransponderId] = useState<string>(options?.defaultTransponder || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const getEventCategories = useCallback((event: ClubEvent | null): SelectedCategoryItem[] => {
    if (!event) return [];
    if (Array.isArray(event.categories) && event.categories.length > 0) {
      return event.categories as unknown as SelectedCategoryItem[];
    }
    return DEFAULT_RACE_CATEGORIES;
  }, []);

  const getEventMeals = useCallback((event: ClubEvent | null): MealOptionItem[] => {
    if (!event) return [];
    if (Array.isArray(event.meal_options) && event.meal_options.length > 0) {
      return event.meal_options as unknown as MealOptionItem[];
    }
    return DEFAULT_MEAL_OPTIONS;
  }, []);

  const isWithin48Hours = useCallback((eventDate: string, startTime?: string | null): boolean => {
    const timeStr = startTime || '09:00:00';
    const eventDateTime = new Date(`${eventDate}T${timeStr}`);
    const now = new Date();
    const diffMs = eventDateTime.getTime() - now.getTime();
    return diffMs < 48 * 60 * 60 * 1000;
  }, []);

  const resetRegistration = useCallback(() => {
    setSelectedEvent(null);
    setEditingRegistrationId(null);
    setSelectedCategories([]);
    setMealQuantities({});
    setTransponderId(options?.defaultTransponder || '');
    setError('');
    setSuccess(false);
  }, [options?.defaultTransponder]);

  const selectEvent = useCallback((event: ClubEvent, userTransponder?: string | null) => {
    setSelectedEvent(event);
    setEditingRegistrationId(null);
    setMealQuantities({});
    setTransponderId(userTransponder || options?.defaultTransponder || '');
    setError('');
    setSuccess(false);

    const cats = getEventCategories(event);
    if (cats.length > 0) {
      setSelectedCategories([cats[0]]);
    } else {
      setSelectedCategories([{ name: 'Générale', fee: event.registration_fee || 0, type: 'Course' }]);
    }
  }, [getEventCategories, options?.defaultTransponder]);

  const editRegistration = useCallback((event: ClubEvent, existingReg: EventRegistration) => {
    setSelectedEvent(event);
    setEditingRegistrationId(existingReg.id);
    setError('');
    setSuccess(false);

    // Pré-remplissage des catégories
    if (Array.isArray(existingReg.selected_categories) && existingReg.selected_categories.length > 0) {
      setSelectedCategories(existingReg.selected_categories as unknown as SelectedCategoryItem[]);
    } else if (existingReg.race_category) {
      const splitNames = existingReg.race_category.split(',').map((s) => s.trim());
      const availableCats = getEventCategories(event);
      const matched = availableCats.filter((c) => splitNames.includes(c.name));
      setSelectedCategories(
        matched.length > 0
          ? matched
          : [{ name: existingReg.race_category, fee: event.registration_fee || 0, type: 'Course' }]
      );
    } else {
      const cats = getEventCategories(event);
      setSelectedCategories(cats.slice(0, 1));
    }

    // Pré-remplissage des repas
    const mealMap: Record<string, number> = {};
    if (Array.isArray(existingReg.selected_meals) && existingReg.selected_meals.length > 0) {
      (existingReg.selected_meals as unknown as { name: string; quantity: number }[]).forEach((m) => {
        mealMap[m.name] = m.quantity || 0;
      });
    } else if (Array.isArray(existingReg.food_options) && existingReg.food_options.length > 0) {
      existingReg.food_options.forEach((opt: string) => {
        const match = opt.match(/(.+)\s+x(\d+)/);
        if (match) {
          mealMap[match[1].trim()] = parseInt(match[2], 10);
        }
      });
    }
    setMealQuantities(mealMap);
    setTransponderId(existingReg.transponder_id || '');
  }, [getEventCategories]);

  const toggleCategory = useCallback((cat: SelectedCategoryItem) => {
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.name === cat.name);
      return exists ? prev.filter((c) => c.name !== cat.name) : [...prev, cat];
    });
  }, []);

  const updateMealQuantity = useCallback((mealName: string, delta: number) => {
    setMealQuantities((prev) => {
      const current = prev[mealName] || 0;
      const next = Math.min(10, Math.max(0, current + delta));
      return { ...prev, [mealName]: next };
    });
  }, []);

  const getSelectedMealsArray = useCallback((): SelectedMealItem[] => {
    if (!selectedEvent) return [];
    const meals = getEventMeals(selectedEvent);
    return meals
      .filter((m) => (mealQuantities[m.name] || 0) > 0)
      .map((m) => ({
        name: m.name,
        quantity: mealQuantities[m.name],
        unit_price: Number(m.price) || 0,
      }));
  }, [selectedEvent, getEventMeals, mealQuantities]);

  const calculateCategoriesTotal = useCallback((): number => {
    return selectedCategories.reduce((acc, cat) => acc + (Number(cat.fee) || 0), 0);
  }, [selectedCategories]);

  const calculateMealsTotal = useCallback((): number => {
    const meals = getSelectedMealsArray();
    return meals.reduce((acc, m) => acc + m.quantity * m.unit_price, 0);
  }, [getSelectedMealsArray]);

  const calculateTotal = useCallback((): number => {
    return calculateCategoriesTotal() + calculateMealsTotal();
  }, [calculateCategoriesTotal, calculateMealsTotal]);

  const submit = useCallback(
    async (userId: string, onCompleted?: () => void | Promise<void>) => {
      if (!selectedEvent) return;
      if (selectedCategories.length === 0) {
        setError('Veuillez sélectionner au moins une catégorie de course.');
        return;
      }

      setLoading(true);
      setError('');
      setSuccess(false);

      try {
        const total = calculateTotal();
        const activeMeals = getSelectedMealsArray();

        if (editingRegistrationId) {
          const { error: regErr } = await updateEventRegistration(editingRegistrationId, {
            selected_categories: selectedCategories,
            selected_meals: activeMeals,
            transponder_id: transponderId,
            total_paid: total,
          });

          if (regErr) {
            setError(regErr);
          } else {
            setSuccess(true);
            if (onCompleted) await onCompleted();
          }
        } else {
          const { error: regErr } = await registerForEvent({
            event_id: selectedEvent.id,
            member_id: userId,
            selected_categories: selectedCategories,
            selected_meals: activeMeals,
            transponder_id: transponderId,
            total_paid: total,
          });

          if (regErr) {
            setError(regErr);
          } else {
            setSuccess(true);
            if (onCompleted) await onCompleted();
          }
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [selectedEvent, selectedCategories, editingRegistrationId, transponderId, calculateTotal, getSelectedMealsArray]
  );

  return {
    selectedEvent,
    editingRegistrationId,
    selectedCategories,
    mealQuantities,
    transponderId,
    loading,
    success,
    error,
    setTransponderId,
    setError,
    setSuccess,
    selectEvent,
    editRegistration,
    resetRegistration,
    toggleCategory,
    updateMealQuantity,
    getEventCategories,
    getEventMeals,
    getSelectedMealsArray,
    calculateCategoriesTotal,
    calculateMealsTotal,
    calculateTotal,
    isWithin48Hours,
    submit,
  };
}
