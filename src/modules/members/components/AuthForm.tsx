'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createMemberProfile } from '../actions';
import { checkBlacklistStatus } from '@/modules/admin/blacklist-actions';
import { 
  KeyRound, 
  Mail, 
  UserPlus, 
  LogIn, 
  Phone, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Hash, 
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [regType, setRegType] = useState<'visitor' | 'member'>('visitor');
  
  // Champs de base (Visiteur & Adhérent)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [insuranceAck, setInsuranceAck] = useState(false);
  
  // Champs spécifiques Adhérent
  const [phone, setPhone] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [transponderNumber, setTransponderNumber] = useState('');
  const [roiAccepted, setRoiAccepted] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        // 1. Contrôle préalable de la liste noire privée (Organe d'Administration)
        const blacklistCheck = await checkBlacklistStatus(email, firstName, lastName);
        if (blacklistCheck.isBlacklisted) {
          throw new Error(
            blacklistCheck.message ||
              "Votre demande d'inscription n'a pas été retenue par l'Organe d'Administration du Seraing Buggy Club (ASBL), conformément aux statuts du club."
          );
        }

        // Validation stricte de l'acquittement assurance FBA
        if (!insuranceAck) {
          throw new Error("Vous devez obligatoirement accepter l'engagement d'enregistrement pour être couvert par l'assurance FBA.");
        }

        // Validation dynamique côté client
        if (regType === 'member') {
          if (!phone) throw new Error("Le numéro de téléphone est obligatoire.");
          if (!streetNumber) throw new Error("La rue et le numéro sont obligatoires.");
          if (!zipCode) throw new Error("Le code postal est obligatoire.");
          if (!city) throw new Error("La ville est obligatoire.");
          if (!birthDate) throw new Error("La date de naissance est obligatoire.");
          if (!roiAccepted) throw new Error("Vous devez accepter le Règlement d'Ordre Intérieur (ROI).");
        }

        // Préparation des métadonnées utilisateur
        const metaData: Record<string, string | boolean | null> = {
          first_name: firstName,
          last_name: lastName,
          registration_type: regType,
          insurance_ack: insuranceAck,
          has_accepted_insurance_terms: insuranceAck,
        };

        if (regType === 'member') {
          metaData.phone = phone;
          metaData.street_number = streetNumber;
          metaData.zip_code = zipCode;
          metaData.city = city;
          metaData.birth_date = birthDate;
          metaData.membership_choice = 'member';
          metaData.transponder_number = transponderNumber || null;
          metaData.roi_accepted = roiAccepted;
        }

        // Enregistrement Auth Supabase avec métadonnées
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metaData,
          },
        });

        if (authError) throw authError;

        // Créer ou mettre à jour le profil membre dans la base de données
        if (authData.user) {
          await createMemberProfile({
            id: authData.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            phone: phone || undefined,
            street_number: streetNumber || undefined,
            zip_code: zipCode || undefined,
            city: city || undefined,
            birth_date: birthDate || undefined,
            membership_choice: regType === 'member' ? 'member' : 'visitor',
            transponder_number: transponderNumber || undefined,
            roi_accepted: regType === 'member' ? roiAccepted : true,
            insurance_ack: insuranceAck,
          });
        }

        setSuccessMsg("Inscription réussie ! Vous pouvez maintenant vous connecter.");
        setIsSignUp(false);
      } else {
        // Connexion
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Une erreur est survenue lors de l'authentification.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto premium-card p-6 md:p-8 rounded-lg">
      <div className="text-center mb-6">
        <h2 className="font-anybody font-black text-2xl uppercase tracking-tight sport-skew text-white">
          {isSignUp ? 'Créer un compte' : 'Se connecter'}
        </h2>
        <p className="text-xs text-foreground/60 mt-1 font-mono">
          {isSignUp ? 'Rejoignez le Seraing Buggy Club' : 'Accédez à votre espace pilote'}
        </p>
      </div>

      {isSignUp && (
        <div className="flex gap-2 p-1 bg-background/50 border border-[#353535] rounded mb-6">
          <button
            type="button"
            onClick={() => {
              setRegType('visitor');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
              regType === 'visitor'
                ? 'bg-primary text-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]'
                : 'text-foreground/60 hover:text-white'
            }`}
          >
            Visiteur / One Day
          </button>
          <button
            type="button"
            onClick={() => {
              setRegType('member');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
              regType === 'member'
                ? 'bg-primary text-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]'
                : 'text-foreground/60 hover:text-white'
            }`}
          >
            Adhérent SBC
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 mb-5 rounded bg-secondary/10 border border-secondary/20 text-secondary text-xs font-mono">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 mb-5 rounded bg-success/10 border border-success/20 text-success text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Prénom</label>
              <input
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Nom</label>
              <input
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-sans"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-sans"
                placeholder="pilote@gmail.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Mot de passe</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded pl-10 pr-10 py-2 text-sm text-white focus:outline-none focus:border-primary font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-foreground/40 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {isSignUp && regType === 'member' && (
          <div className="space-y-4 pt-2 border-t border-[#353535]/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
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
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35 pointer-events-none" />
                  <input
                    type="date"
                    required
                    autoComplete="bday"
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
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="street-address"
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
                  autoComplete="postal-code"
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
                  autoComplete="address-level2"
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
                <Hash className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35 pointer-events-none" />
                <input
                  type="text"
                  value={transponderNumber}
                  onChange={(e) => setTransponderNumber(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
                  placeholder="Ex: 1234567"
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2">
              <input
                id="roi"
                type="checkbox"
                required
                checked={roiAccepted}
                onChange={(e) => setRoiAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 bg-background border border-[#353535] rounded checked:bg-primary accent-primary text-black cursor-pointer"
              />
              <label htmlFor="roi" className="text-xs text-foreground/75 leading-tight font-sans select-none">
                J'accepte le <span className="text-primary hover:text-white underline cursor-pointer">Règlement d'Ordre Intérieur (ROI)</span> du club.
              </label>
            </div>
          </div>
        )}

        {isSignUp && (
          <div className="p-3.5 rounded bg-secondary/10 border border-secondary/25 flex items-start gap-2.5 mt-4">
            <input
              id="fba-insurance-ack"
              type="checkbox"
              required
              checked={insuranceAck}
              onChange={(e) => setInsuranceAck(e.target.checked)}
              className="mt-0.5 w-4 h-4 bg-background border border-[#353535] rounded checked:bg-secondary accent-secondary text-white cursor-pointer shrink-0"
            />
            <label htmlFor="fba-insurance-ack" className="text-xs text-foreground/90 leading-relaxed font-sans select-none">
              Je reconnais que je dois obligatoirement m'enregistrer dans le registre de présence à mon arrivée sur la piste pour être couvert par l'assurance FBA. <span className="text-secondary font-bold">*</span>
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full premium-btn text-sm flex items-center justify-center gap-2 mt-5 cursor-pointer disabled:opacity-50"
        >
          <span className="transform skew-x-8 flex items-center gap-2">
            {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Chargement...' : isSignUp ? "S'inscrire" : 'Se connecter'}
          </span>
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[#353535]/50 text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setErrorMsg('');
          }}
          className="text-xs text-primary hover:text-secondary hover:underline transition-colors font-mono cursor-pointer"
        >
          {isSignUp ? "Vous avez déjà un compte ? Se connecter" : "Nouveau pilote ? Créer un compte"}
        </button>
      </div>
    </div>
  );
}
