'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// Coordonnées du terrain Seraing Buggy Club
export const SBC_LAT = 50.599627;
export const SBC_LNG = 5.529321;
export const GEOFENCE_RADIUS_METERS = 150; // Rayon de 150 mètres

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

interface PresenceZoneContextType {
  isInZone: boolean;
  isCheckedIn: boolean;
  distance: number | null;
  coords: { lat: number; lng: number } | null;
  activePresence: any;
  loadingLocation: boolean;
  loadingPresence: boolean;
  refreshPresence: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  setIsInZone: (val: boolean) => void;
  setIsCheckedIn: (val: boolean) => void;
}

const PresenceZoneContext = createContext<PresenceZoneContextType | undefined>(undefined);

export function PresenceZoneProvider({ children }: { children: React.ReactNode }) {
  const [isInZone, setIsInZone] = useState<boolean>(false);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activePresence, setActivePresence] = useState<any>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [loadingPresence, setLoadingPresence] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createClient();

  // 1. Rafraîchir la présence active de l'utilisateur connecté
  const refreshPresence = useCallback(async () => {
    try {
      setLoadingPresence(true);
      const { data: { session } } = await supabase.auth.getSession();
      
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

      if (!error && data) {
        setIsCheckedIn(true);
        setActivePresence(data);
      } else {
        setIsCheckedIn(false);
        setActivePresence(null);
      }
    } catch (err) {
      console.error("Erreur lors de la vérification de présence:", err);
    } finally {
      setLoadingPresence(false);
    }
  }, [supabase]);

  // 2. Traiter la géolocalisation
  const handlePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    setCoords({ lat: latitude, lng: longitude });

    const dist = calculateHaversineDistance(latitude, longitude, SBC_LAT, SBC_LNG);
    const roundedDist = Math.round(dist);
    setDistance(roundedDist);

    const inZone = dist <= GEOFENCE_RADIUS_METERS;
    setIsInZone(inZone);
    setLoadingLocation(false);
  }, []);

  const handleGeoError = useCallback((_err: GeolocationPositionError) => {
    setLoadingLocation(false);
  }, []);

  // 3. Rafraîchir la position GPS
  const refreshLocation = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLoadingLocation(false);
      return;
    }

    setLoadingLocation(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePosition(pos);
          resolve();
        },
        (err) => {
          handleGeoError(err);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }, [handlePosition, handleGeoError]);

  // Montage initial : chargement présence & géolocalisation
  useEffect(() => {
    refreshPresence();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      subscription.unsubscribe();
    };
  }, [refreshPresence, supabase]);

  // Suivi de géolocalisation
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLoadingLocation(false);
      return;
    }

    refreshLocation();

    // Suivi continu des déplacements
    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleGeoError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [refreshLocation, handlePosition, handleGeoError]);

  // Écoute temps réel des changements de présence Supabase
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('presence_realtime_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sbc_presence',
          filter: `member_id=eq.${currentUserId}`,
        },
        () => {
          refreshPresence();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshPresence, supabase]);

  return (
    <PresenceZoneContext.Provider
      value={{
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
      }}
    >
      {children}
    </PresenceZoneContext.Provider>
  );
}

export function usePresenceZone() {
  const context = useContext(PresenceZoneContext);
  if (context === undefined) {
    throw new Error('usePresenceZone doit être utilisé au sein d\'un PresenceZoneProvider');
  }
  return context;
}
