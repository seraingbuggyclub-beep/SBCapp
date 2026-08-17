'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PresenceSession, PresenceZoneState } from '@/types/models';

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
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [loadingPresence, setLoadingPresence] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // References pour le filtrage du deadband GPS et la prévention des memory leaks
  const isMountedRef = useRef<boolean>(true);
  const lastDistanceRef = useRef<number | null>(null);
  const lastIsInZoneRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

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
      console.error("Erreur lors de la vérification de présence:", err);
    } finally {
      if (isMountedRef.current) {
        setLoadingPresence(false);
      }
    }
  }, [supabase]);

  // 2. Traiter la géolocalisation avec Deadband / Throttling
  const handlePosition = useCallback((position: GeolocationPosition) => {
    if (!isMountedRef.current) return;

    const { latitude, longitude } = position.coords;
    const rawDist = calculateHaversineDistance(latitude, longitude, SBC_LAT, SBC_LNG);
    const roundedDist = Math.round(rawDist);
    const newIsInZone = rawDist <= GEOFENCE_RADIUS_METERS;
    const now = Date.now();

    // Vérification du seuil (Deadband) :
    // - Si la zone bascule (in -> out ou out -> in), MISE À JOUR IMMÉDIATE
    // - Sinon, ignorer si l'écart est < 3m et que moins de 4 secondes se sont écoulées
    if (lastDistanceRef.current !== null) {
      const isZoneBoundaryCrossed = newIsInZone !== lastIsInZoneRef.current;
      const distanceDelta = Math.abs(roundedDist - lastDistanceRef.current);
      const isTimeElapsed = now - lastUpdateTimeRef.current > 4000;

      if (!isZoneBoundaryCrossed && distanceDelta < GPS_DEADBAND_METERS && !isTimeElapsed) {
        setLoadingLocation(false);
        return;
      }
    }

    lastDistanceRef.current = roundedDist;
    lastIsInZoneRef.current = newIsInZone;
    lastUpdateTimeRef.current = now;

    setCoords({ lat: latitude, lng: longitude });
    setDistance(roundedDist);
    setIsInZone(newIsInZone);
    setLoadingLocation(false);
  }, []);

  const handleGeoError = useCallback((_err: GeolocationPositionError) => {
    if (isMountedRef.current) {
      setLoadingLocation(false);
    }
  }, []);

  // 3. Rafraîchir ponctuellement la position GPS
  const refreshLocation = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (isMountedRef.current) setLoadingLocation(false);
      return;
    }

    if (isMountedRef.current) setLoadingLocation(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isMountedRef.current) {
            handlePosition(pos);
          }
          resolve();
        },
        (err) => {
          if (isMountedRef.current) {
            handleGeoError(err);
          }
          resolve();
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
      );
    });
  }, [handlePosition, handleGeoError]);

  // Cycle de vie initial et écoute auth
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

  // Suivi continu de géolocalisation avec nettoyage systématique (une seule souscription)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLoadingLocation(false);
      return;
    }

    // Démarrage d'un unique watchPosition léger
    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleGeoError,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 15000 }
    );
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [handlePosition, handleGeoError]);

  // Écoute temps réel des changements de présence Supabase
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
