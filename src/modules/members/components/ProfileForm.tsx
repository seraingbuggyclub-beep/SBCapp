'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMemberProfile, updateMemberProfile } from '../actions';
import AuthForm from './AuthForm';
import { 
  Phone, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Hash, 
  Save
} from 'lucide-react';

export default function ProfileForm() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const supabase = createClient();

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const { data: profileData } = await getMemberProfile(session.user.id);
        setProfile(profileData);
        
        // Pré-remplissage des champs
        if (profileData) {
          setPhone(profileData.phone || '');
          setStreetNumber(profileData.street_number || '');
          setZipCode(profileData.zip_code || '');
          setCity(profileData.city || '');
          setBirthDate(profileData.birth_date || '');
          setTransponderNumber(profileData.transponder_number || '');
          setRoiAccepted(profileData.roi_accepted || false);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err: any) {
      console.error("Erreur lors de la récupération du profil:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfileData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

      const { data, error } = await updateMemberProfile({
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
      });

      if (error) throw new Error(error);

      setSuccessMsg("Profil pilote mis à jour avec succès !");
      if (data) {
        setProfile(data);
      }
      
      // Nettoyer le message de succès après 4 secondes
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de la sauvegarde.");
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
    <div className="w-full max-w-lg mx-auto premium-card p-6 md:p-8 rounded-lg border border-[#353535]">
      <div className="mb-6 pb-4 border-b border-[#353535]/50 flex items-center justify-between">
        <div>
          <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
            Mon Profil Pilote
          </h2>
          <p className="text-[10px] text-foreground/50 font-mono mt-1">
            Pilote : {profile?.first_name} {profile?.last_name} • Rôle : {profile?.role === 'admin' ? 'Admin' : profile?.role === 'daily_member' ? 'Membre 1 Jour' : 'Visiteur'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 mb-5 rounded bg-secondary/10 border border-secondary/20 text-secondary text-xs font-mono">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 mb-5 rounded bg-success/10 border border-success/20 text-success text-xs font-mono flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35" />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
                placeholder="+32 470 00 00 00"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Date de naissance</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35" />
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Rue et numéro</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35" />
            <input
              type="text"
              required
              value={streetNumber}
              onChange={(e) => setStreetNumber(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-sans"
              placeholder="Rue du Circuit, 42"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Code postal</label>
            <input
              type="text"
              required
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
              placeholder="4100"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Ville</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-sans"
              placeholder="Seraing"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">N° Transpondeur (Facultatif)</label>
          <div className="relative">
            <Hash className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35" />
            <input
              type="text"
              value={transponderNumber}
              onChange={(e) => setTransponderNumber(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
              placeholder="1234567"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 pt-2">
          <input
            id="roi-edit"
            type="checkbox"
            required
            checked={roiAccepted}
            onChange={(e) => setRoiAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 bg-background border border-[#353535] rounded checked:bg-primary accent-primary text-black cursor-pointer"
          />
          <label htmlFor="roi-edit" className="text-xs text-foreground/75 leading-tight font-sans select-none">
            J'accepte le <span className="text-primary hover:text-white underline cursor-pointer">Règlement d'Ordre Intérieur (ROI)</span> du club.
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full premium-btn text-sm flex items-center justify-center gap-2 mt-5 cursor-pointer disabled:opacity-50"
        >
          <span className="transform skew-x-8 flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Sauvegarder le Profil'}
          </span>
        </button>
      </form>
    </div>
  );
}
