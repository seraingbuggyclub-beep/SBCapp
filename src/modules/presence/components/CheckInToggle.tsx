'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { checkInMember, checkOutMember } from '../actions';
import { ToggleLeft, ToggleRight, Radio, Compass, Navigation, LogOut } from 'lucide-react';
import {
  usePresenceZone,
  SBC_LAT,
  SBC_LNG,
  GEOFENCE_RADIUS_METERS,
  calculateHaversineDistance,
} from '../contexts/PresenceZoneContext';
import { PresenceSession, getErrorMessage } from '@/types/models';

interface CheckInToggleProps {
  memberId: string;
  initialPresence: PresenceSession | null;
}

export default function CheckInToggle({ memberId, initialPresence }: CheckInToggleProps) {
  const presenceContext = usePresenceZone();
  const [presence, setPresence] = useState<PresenceSession | null>(initialPresence);
  const [checkInType, setCheckInType] = useState<'auto' | 'manual'>('auto');
  const [isPublic, setIsPublic] = useState(true);

  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [insideGeofence, setInsideGeofence] = useState<boolean | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync initialPresence if updated from context
  useEffect(() => {
    if (presenceContext.activePresence !== undefined) {
      setPresence(presenceContext.activePresence);
    }
  }, [presenceContext.activePresence]);

  const logStatus = (msg: string) => {
    if (isMountedRef.current) {
      setStatusLog((prev) => [`[${new Date().toLocaleTimeString('fr-BE')}] ${msg}`, ...prev.slice(0, 4)]);
    }
  };

  // Obtenir la position GPS et vérifier la zone géofencée
  const verifyLocation = useCallback((): Promise<{ lat: number; lng: number; inside: boolean } | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        logStatus("La géolocalisation n'est pas supportée par votre navigateur.");
        resolve(null);
        return;
      }

      if (isMountedRef.current) setGeolocating(true);
      logStatus("Recherche des coordonnées GPS...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMountedRef.current) {
            resolve(null);
            return;
          }
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });

          const dist = calculateHaversineDistance(latitude, longitude, SBC_LAT, SBC_LNG);
          const roundedDist = Math.round(dist);
          setDistance(roundedDist);

          const inside = dist <= GEOFENCE_RADIUS_METERS;
          setInsideGeofence(inside);
          setGeolocating(false);

          logStatus(`GPS trouvé. Distance du club : ${roundedDist}m.`);
          logStatus(inside ? "✅ Vous êtes dans la zone autorisée (Seraing Buggy Club)." : "❌ Vous êtes hors zone (limite 150m).");

          resolve({ lat: latitude, lng: longitude, inside });
        },
        (error) => {
          if (isMountedRef.current) setGeolocating(false);
          logStatus(`Erreur GPS : ${error.message}`);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const handleCheckIn = useCallback(
    async (latitude?: number, longitude?: number, typeOverride?: 'manual' | 'auto') => {
      setLoading(true);
      const finalType = typeOverride || checkInType;

      try {
        const { data, error } = await checkInMember({
          member_id: memberId,
          check_in_type: finalType,
          latitude,
          longitude,
          is_public: isPublic,
        });

        if (error) {
          logStatus(`Erreur d'enregistrement : ${error}`);
        } else {
          setPresence((data as PresenceSession) || null);
          logStatus(`✅ Présence validée en mode ${finalType === 'auto' ? 'Automatique' : 'Manuel'}.`);
          await presenceContext.refreshPresence();
        }
      } catch (err: unknown) {
        logStatus(`Erreur système : ${getErrorMessage(err)}`);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [checkInType, memberId, isPublic, presenceContext]
  );

  // Déclenchement automatique en mode Auto si pas encore de présence active
  useEffect(() => {
    if (checkInType === 'auto' && !presence) {
      logStatus("Mode Auto actif. Lancement du radar de zone...");
      verifyLocation().then((loc) => {
        if (loc?.inside) {
          logStatus("Validation radar positive. Enregistrement automatique...");
          handleCheckIn(loc.lat, loc.lng, 'auto');
        }
      });
    }
  }, [checkInType, presence, verifyLocation, handleCheckIn]);

  const triggerManualCheckIn = async () => {
    logStatus("Lancement du check-in manuel...");
    const loc = await verifyLocation();

    if (loc) {
      if (loc.inside) {
        await handleCheckIn(loc.lat, loc.lng, 'manual');
      } else {
        logStatus("Check-in manuel bloqué : Vous devez être sur place (rayon 150m).");
      }
    } else {
      logStatus("GPS indisponible. Autorisation exceptionnelle sans coordonnées.");
      await handleCheckIn(undefined, undefined, 'manual');
    }
  };

  const handleCheckOut = async () => {
    if (!presence) return;
    setLoading(true);
    logStatus("Déconnexion du site...");

    try {
      const { error } = await checkOutMember(presence.id);
      if (error) {
        logStatus(`Erreur check-out : ${error}`);
      } else {
        setPresence(null);
        setDistance(null);
        setCoords(null);
        setInsideGeofence(null);
        logStatus("👋 Check-out effectué. Vous n'êtes plus encodé sur le site.");
        await presenceContext.refreshPresence();
      }
    } catch (err: unknown) {
      logStatus(`Erreur système : ${getErrorMessage(err)}`);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Statut principal et commandes */}
      <div className="premium-card p-6 rounded-lg border border-[#353535]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                presence
                  ? 'bg-success/15 text-success border border-success/30'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {presence ? (
                <Radio className="w-5 h-5 animate-pulse" />
              ) : (
                <Compass className={`w-5 h-5 ${geolocating ? 'animate-spin' : ''}`} />
              )}
            </div>
            <div>
              <h3 className="font-anybody font-black text-base text-white uppercase tracking-tight sport-skew">
                {presence ? 'Statut : Sur Site' : 'Statut : Hors Site'}
              </h3>
              <p className="text-[11px] text-foreground/50 font-mono">
                {presence
                  ? `Check-in enregistré à ${new Date(presence.check_in_time).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Enregistrez votre présence pour être couvert par la FBA'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs w-full md:w-auto justify-end">
            <span className="text-foreground/40">Visibilité publique :</span>
            <button
              onClick={() => setIsPublic(!isPublic)}
              disabled={loading || !!presence}
              className="flex items-center text-primary disabled:opacity-50 cursor-pointer"
            >
              {isPublic ? (
                <ToggleRight className="w-8 h-8 text-primary" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-foreground/30" />
              )}
              <span className="ml-1 text-[11px] font-bold">
                {isPublic ? 'Visible' : 'Masqué'}
              </span>
            </button>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
          {presence ? (
            <button
              onClick={handleCheckOut}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-secondary text-white font-anybody font-extrabold uppercase text-xs tracking-wider border border-black hover:bg-red-700 transition-all sport-skew shadow-[3px_3px_0px_#000] cursor-pointer"
            >
              <span className="transform skew-x-8 flex items-center gap-1.5 justify-center">
                <LogOut className="w-4 h-4" />
                Signaler mon départ (Check-out)
              </span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* Sélecteur de mode */}
              <div className="grid grid-cols-2 p-1 bg-surface-dim rounded border border-[#353535] sm:max-w-70">
                <button
                  onClick={() => setCheckInType('auto')}
                  className={`px-3 py-1.5 text-xs font-mono rounded font-bold uppercase transition-all ${
                    checkInType === 'auto'
                      ? 'bg-primary text-black'
                      : 'text-foreground/50 hover:text-white'
                  }`}
                >
                  Automatique
                </button>
                <button
                  onClick={() => setCheckInType('manual')}
                  className={`px-3 py-1.5 text-xs font-mono rounded font-bold uppercase transition-all ${
                    checkInType === 'manual'
                      ? 'bg-primary text-black'
                      : 'text-foreground/50 hover:text-white'
                  }`}
                >
                  Manuel
                </button>
              </div>

              {checkInType === 'manual' ? (
                <button
                  onClick={triggerManualCheckIn}
                  disabled={loading || geolocating}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary text-black font-anybody font-extrabold uppercase text-xs tracking-wider border border-black hover:bg-secondary hover:text-white transition-all sport-skew shadow-[3px_3px_0px_#000] cursor-pointer disabled:opacity-50"
                >
                  <span className="transform skew-x-8 flex items-center gap-1.5 justify-center">
                    <Navigation className="w-4 h-4" />
                    Valider ma présence (150m)
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => verifyLocation()}
                  disabled={loading || geolocating}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#222] text-white font-anybody font-extrabold uppercase text-xs tracking-wider border border-[#353535] hover:bg-[#333] transition-all sport-skew shadow-[3px_3px_0px_#000] cursor-pointer disabled:opacity-50"
                >
                  <span className="transform skew-x-8 flex items-center gap-1.5 justify-center">
                    <Navigation className={`w-4 h-4 ${geolocating ? 'animate-spin' : ''}`} />
                    Relancer le Radar Auto
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Console Radar & Télémétrie GPS */}
      <div className="premium-card p-5 rounded-lg border border-[#353535]">
        <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew mb-3">
          Console Radar & Télémétrie GPS
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded bg-surface-dim border border-[#353535]/65 font-mono text-[11px] space-y-1.5 text-foreground/75">
            <div>
              <span className="text-primary font-bold">Cible Club :</span> {SBC_LAT}, {SBC_LNG}
            </div>
            <div>
              <span className="text-primary font-bold">Votre position :</span>{' '}
              {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Indéterminée'}
            </div>
            <div>
              <span className="text-primary font-bold">Distance :</span>{' '}
              {distance !== null ? `${distance} mètres` : 'Calcul en cours'}
            </div>
            <div>
              <span className="text-primary font-bold">Zone :</span>{' '}
              {insideGeofence === null ? (
                'Non testé'
              ) : insideGeofence ? (
                <span className="text-success font-bold">DANS LE RAYON (150m)</span>
              ) : (
                <span className="text-secondary font-bold">HORS RAYON</span>
              )}
            </div>
          </div>

          {/* Logs en temps réel */}
          <div className="p-3 rounded bg-surface-dim border border-[#353535]/65 font-mono text-[10px] space-y-1 text-foreground/50 h-25 overflow-y-auto">
            {statusLog.length === 0 ? (
              <div className="italic">Radar passif. En attente d'action...</div>
            ) : (
              statusLog.map((log, idx) => (
                <div key={idx} className="truncate">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
