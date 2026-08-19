'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PresenceSession, PresenceZoneState } from '@/types/models';
import { checkOutByMemberId } from '../actions';

// Coordonnées du terrain Seraing Buggy Club
export const SBC_LAT = 50.599627;
export const SBC_LNG = 5.529321;
export const GEOFENCE_RADIUS_METERS = 150; // Rayon de 150 mètres
export const GPS_DEADBAND_METERS = 3; // Seuil minimum d'oscillation GPS en mètres

// Formule de Haversine pour calculer la distance en mètres
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const PresenceZoneContext = createContext<PresenceZoneState | undefined>(undefined);

export function PresenceZoneProvider({ children }: { children: React.ReactNode }) {
  const [isInZone, setIsInZone] = useState<boolean>(false);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activePresence, setActivePresence] = useState<PresenceSession | null>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [loadingPresence, setLoadingPresence] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const supabase = useMemo(() => createClient(), []);

  // 1. Rafraîchir la présence active de l'utilisateur connecté
  const refreshPresence = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoadingPresence(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMountedRef.current) return;

      if (!session?.user) {
        setCurrentUserId(null);
        setIsCheckedIn(false);
        setActivePresence(null);
        return;
      }

      setCurrentUserId(session.user.id);

      const { data, error } = await supabase
        .from('sbc_presence')
        .select('*')
        .eq('member_id', session.user.id)
        .eq('is_active', true)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMountedRef.current) return;

      if (!error && data) {
        setIsCheckedIn(true);
        setActivePresence(data as PresenceSession);
      } else {
        setIsCheckedIn(false);
        setActivePresence(null);
      }
    } catch (err) {
      console.error('Erreur lors de la vérification de présence:', err);
    } finally {
      if (isMountedRef.current) {
        setLoadingPresence(false);
      }
    }
  }, [supabase]);

  // 2. Scan GPS one-shot (appelé à la demande ou au réveil d'écran)
  const refreshLocation = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (isMountedRef.current) setLoadingLocation(false);
      return;
    }

    if (isMountedRef.current) setLoadingLocation(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMountedRef.current) { resolve(); return; }
          const { latitude, longitude } = position.coords;
          const rawDist = calculateHaversineDistance(latitude, longitude, SBC_LAT, SBC_LNG);
          const roundedDist = Math.round(rawDist);
          setCoords({ lat: latitude, lng: longitude });
          setDistance(roundedDist);
          setIsInZone(rawDist <= GEOFENCE_RADIUS_METERS);
          setLoadingLocation(false);
          resolve();
        },
        () => {
          if (isMountedRef.current) setLoadingLocation(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  // 3. Détection au réveil d'écran : visibilitychange + focus
  //    Si une session est active ET qu'on est hors zone → checkout automatique
  useEffect(() => {
    const handleWakeUp = async () => {
      if (!isMountedRef.current || !isCheckedIn || !currentUserId) return;
      if (typeof window === 'undefined' || !navigator.geolocation) return;

      // Scan GPS immédiat
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isMountedRef.current) return;
          const { latitude, longitude } = position.coords;
          const dist = calculateHaversineDistance(latitude, longitude, SBC_LAT, SBC_LNG);
          const roundedDist = Math.round(dist);
          setCoords({ lat: latitude, lng: longitude });
          setDistance(roundedDist);
          const inside = dist <= GEOFENCE_RADIUS_METERS;
          setIsInZone(inside);

          if (!inside) {
            // Hors zone → clôture automatique de la session
            console.info(`[SBC Radar] Hors zone (${roundedDist}m). Checkout automatique.`);
            await checkOutByMemberId(currentUserId);
            await refreshPresence();
          }
        },
        () => { /* Silencieux si GPS indisponible */ },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleWakeUp();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWakeUp);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWakeUp);
    };
  }, [isCheckedIn, currentUserId, refreshPresence]);

  // 4. Cycle de vie initial et écoute auth
  useEffect(() => {
    isMountedRef.current = true;
    refreshPresence();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMountedRef.current) return;

      if (session?.user) {
        setCurrentUserId(session.user.id);
        refreshPresence();
      } else {
        setCurrentUserId(null);
        setIsCheckedIn(false);
        setActivePresence(null);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [refreshPresence, supabase]);

  // 5. Écoute temps réel des changements de présence Supabase (realtime)
  useEffect(() => {
    if (!currentUserId) return;

    const channelName = `presence_user_${currentUserId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sbc_presence',
          filter: `member_id=eq.${currentUserId}`,
        },
        () => {
          if (isMountedRef.current) {
            refreshPresence();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshPresence, supabase]);

  const value = useMemo<PresenceZoneState>(() => ({
    isInZone,
    isCheckedIn,
    distance,
    coords,
    activePresence,
    loadingLocation,
    loadingPresence,
    refreshPresence,
    refreshLocation,
    setIsInZone,
    setIsCheckedIn,
  }), [
    isInZone,
    isCheckedIn,
    distance,
    coords,
    activePresence,
    loadingLocation,
    loadingPresence,
    refreshPresence,
    refreshLocation,
  ]);

  return (
    <PresenceZoneContext.Provider value={value}>
      {children}
    </PresenceZoneContext.Provider>
  );
}

export function usePresenceZone(): PresenceZoneState {
  const context = useContext(PresenceZoneContext);
  if (context === undefined) {
    throw new Error('usePresenceZone doit être utilisé au sein d\'un PresenceZoneProvider');
  }
  return context;
}
