'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateMemberProfile } from '../actions';
import AuthForm from './AuthForm';
import { 
  Phone, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Hash, 
  Save
} from 'lucide-react';
import { getErrorMessage } from '@/types/models';

export default function ProfileForm() {
  const { user, profile, loading, refresh } = useAuth();

  // Champs modifiables
  const [phone, setPhone] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [transponderNumber, setTransponderNumber] = useState('');
  const [roiAccepted, setRoiAccepted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pré-remplissage des champs à partir du profil mis en cache
  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '');
      setStreetNumber(profile.street_number || '');
      setZipCode(profile.zip_code || '');
      setCity(profile.city || '');
      setBirthDate(profile.birth_date || '');
      setTransponderNumber(profile.transponder_number || '');
      setRoiAccepted(profile.roi_accepted || false);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (!phone) throw new Error("Le numéro de téléphone est obligatoire.");
      if (!streetNumber) throw new Error("La rue et le numéro sont obligatoires.");
      if (!zipCode) throw new Error("Le code postal est obligatoire.");
      if (!city) throw new Error("La ville est obligatoire.");
      if (!birthDate) throw new Error("La date de naissance est obligatoire.");
      if (!roiAccepted) throw new Error("Vous devez accepter le Règlement d'Ordre Intérieur (ROI).");

      const { error } = await updateMemberProfile({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone,
        street_number: streetNumber,
        zip_code: zipCode,
        city,
        birth_date: birthDate,
        transponder_number: transponderNumber || undefined,
        roi_accepted: roiAccepted,
        insurance_ack: profile.insurance_ack ?? true,
      });

      if (error) throw new Error(error);

      setSuccessMsg("Profil pilote mis à jour avec succès !");
      await refresh();
      
      // Nettoyer le message de succès après 4 secondes
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-24 flex items-center justify-center">
        <div className="p-8 text-center text-xs text-foreground/50 font-mono flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <span>Chargement du profil pilote...</span>
        </div>
      </div>
    );
  }

  // Si non connecté, afficher le formulaire d'authentification
  if (!user) {
    return (
      <div className="w-full">
        <div className="max-w-md mx-auto text-center mb-8">
          <h1 className="font-anybody font-black text-3xl uppercase tracking-tight sport-skew text-white mb-2">
            Pit Lane
          </h1>
          <p className="text-xs font-mono text-foreground/50">
            Connectez-vous pour configurer votre transpondeur et gérer vos coordonnées pilotes.
          </p>
        </div>
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="premium-card p-6 rounded-lg border border-[#353535]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#353535]/60 pb-5 mb-5">
          <div>
            <h2 className="font-anybody font-black text-xl text-white uppercase sport-skew">
              Pilote : <span className="text-primary">{profile?.first_name} {profile?.last_name}</span>
            </h2>
            <p className="text-xs font-mono text-foreground/50 mt-0.5">{profile?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
              profile?.payment_status === 'paid' 
                ? 'bg-success/10 text-success border border-success/20' 
                : 'bg-secondary/10 text-secondary border border-secondary/20'
            }`}>
              {profile?.payment_status === 'paid' ? 'Cotisation en ordre' : 'Cotisation en attente'}
            </span>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {successMsg && (
          <div className="mb-6 p-3 rounded bg-success/15 border border-success/30 font-mono text-xs text-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-3 rounded bg-secondary/15 border border-secondary/30 font-mono text-xs text-secondary">
            {errorMsg}
          </div>
        )}

        {/* Main Update Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Téléphone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                Numéro de téléphone <span className="text-primary">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+32 470 00 00 00"
                className="w-full bg-[#1c1c1c] border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-primary transition-colors"
              />
            </div>

            {/* Date de naissance */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Date de naissance <span className="text-primary">*</span>
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Rue et Numéro */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Rue et Numéro <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={streetNumber}
              onChange={(e) => setStreetNumber(e.target.value)}
              placeholder="Rue du Circuit, 42"
              className="w-full bg-[#1c1c1c] border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code Postal */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                Code Postal <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="4100"
                className="w-full bg-[#1c1c1c] border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-primary transition-colors"
              />
            </div>

            {/* Ville */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                Ville <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Seraing"
                className="w-full bg-[#1c1c1c] border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Section Racing / Pit Lane */}
          <div className="pt-4 border-t border-[#353535]/60 mt-4 space-y-4">
            <h3 className="font-anybody font-bold text-xs uppercase tracking-wider text-primary">
              Paramètres Piste & Chronométrage
            </h3>

            {/* Numéro de transpondeur */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                Numéro de Transpondeur Personnel (Optionnel)
              </label>
              <input
                type="text"
                value={transponderNumber}
                onChange={(e) => setTransponderNumber(e.target.value)}
                placeholder="ex: 7489321 (Mylaps / RC4)"
                className="w-full bg-[#1c1c1c] border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-primary transition-colors"
              />
              <p className="text-[10px] font-mono text-foreground/40">
                Ce numéro sera automatiquement pré-rempli lors de vos inscriptions aux courses officielles du club.
              </p>
            </div>

            {/* Acceptation ROI */}
            <label className="flex items-start gap-2.5 pt-2 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={roiAccepted}
                onChange={(e) => setRoiAccepted(e.target.checked)}
                className="mt-0.5 rounded border-[#353535] text-primary focus:ring-primary bg-[#1c1c1c]"
              />
              <span className="text-[11px] font-mono text-foreground/70 group-hover:text-white transition-colors">
                J'atteste avoir lu et m'engage à respecter le <strong className="text-white">Règlement d'Ordre Intérieur (ROI)</strong> du Seraing Buggy Club ASBL.
              </span>
            </label>
          </div>

          {/* Bouton de sauvegarde */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-black font-anybody font-extrabold uppercase text-xs tracking-wider border border-black hover:bg-secondary hover:text-white transition-all sport-skew shadow-[3px_3px_0px_#000] cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
