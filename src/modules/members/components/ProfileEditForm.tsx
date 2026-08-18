'use client';

import React, { useEffect, useState, useRef } from 'react';
import { User, CheckCircle2, AlertTriangle, Phone, Save, Radio, ShieldCheck, Hash, RefreshCw } from 'lucide-react';
import { MemberProfile, MemberProfileUpdateInput, getErrorMessage } from '@/types/models';
import { updateMemberProfile } from '@/modules/members/actions';
import { syncMyFbaLicense } from '@/modules/members/fba-sync';
import { formatDate } from '@/lib/utils/formatters';

interface ProfileEditFormProps {
  member: MemberProfile | null;
  onProfileUpdated?: () => Promise<void> | void;
}

export default function ProfileEditForm({ member, onProfileUpdated }: ProfileEditFormProps) {
  const isMountedRef = useRef(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [transponderNumber, setTransponderNumber] = useState('');
  const [roiAccepted, setRoiAccepted] = useState(false);
  const [insuranceAck, setInsuranceAck] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [syncingFba, setSyncingFba] = useState(false);
  const [fbaMsg, setFbaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name || '');
      setLastName(member.last_name || '');
      setPhone(member.phone || '');
      setLicenseNumber(member.license_number || '');
      setBirthDate(member.birth_date || '');
      setStreetNumber(member.street_number || '');
      setZipCode(member.zip_code || '');
      setCity(member.city || '');
      setTransponderNumber(member.transponder_number || '');
      setRoiAccepted(Boolean(member.roi_accepted));
      setInsuranceAck(Boolean(member.insurance_ack));
    }
  }, [member]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error('Le prénom et le nom sont requis.');
      }
      if (!phone.trim()) {
        throw new Error('Le numéro de téléphone est obligatoire.');
      }
      if (!roiAccepted) {
        throw new Error("Vous devez accepter le Règlement d'Ordre Intérieur (ROI).");
      }

      const payload: MemberProfileUpdateInput = {
        id: member.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        license_number: licenseNumber.trim() || null,
        birth_date: birthDate || null,
        street_number: streetNumber.trim() || null,
        zip_code: zipCode.trim() || null,
        city: city.trim() || null,
        transponder_number: transponderNumber.trim() || null,
        roi_accepted: roiAccepted,
        insurance_ack: insuranceAck,
      };

      const { error } = await updateMemberProfile(payload);
      if (error) throw new Error(error);

      if (onProfileUpdated) {
        await onProfileUpdated();
      }

      if (isMountedRef.current) {
        setProfileMsg({ type: 'success', text: 'Profil et paramètres piste enregistrés avec succès !' });
        setTimeout(() => {
          if (isMountedRef.current) setProfileMsg(null);
        }, 4000);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setProfileMsg({ type: 'error', text: getErrorMessage(err) });
      }
    } finally {
      if (isMountedRef.current) {
        setSavingProfile(false);
      }
    }
  };

  const handleSyncFba = async () => {
    if (!member?.id) return;
    setSyncingFba(true);
    setFbaMsg(null);

    try {
      const res = await syncMyFbaLicense(member.id);
      if (!res.success) {
        setFbaMsg({ type: 'error', text: res.error || 'Affiliation non trouvée sur fba-rc.be' });
      } else {
        if (res.licenseNumber) {
          setLicenseNumber(res.licenseNumber);
        }
        if (onProfileUpdated) {
          await onProfileUpdated();
        }
        setFbaMsg({ type: 'success', text: res.message || 'Licence FBA synchronisée avec succès !' });
        setTimeout(() => {
          if (isMountedRef.current) setFbaMsg(null);
        }, 5000);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setFbaMsg({ type: 'error', text: getErrorMessage(err) });
      }
    } finally {
      if (isMountedRef.current) {
        setSyncingFba(false);
      }
    }
  };

  return (
    <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-6">
      <div className="flex items-center justify-between border-b border-[#353535] pb-4">
        <div className="flex items-center gap-2.5">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
            Mon Profil & Paramètres Piste
          </h2>
        </div>
        <span className="text-[10px] font-mono text-foreground/45 uppercase tracking-wider hidden sm:inline">
          Fiche Officielle Pilote
        </span>
      </div>

      {profileMsg && (
        <div
          className={`p-3.5 rounded font-mono text-xs flex items-center gap-2 animate-fade-in ${
            profileMsg.type === 'success'
              ? 'bg-success/15 border border-success/30 text-success'
              : 'bg-secondary/15 border border-secondary/30 text-secondary'
          }`}
        >
          {profileMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{profileMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1 : Identité & Contact */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-primary font-bold mb-3 flex items-center gap-1.5">
            <span>1. Identité & Contact</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                Nom *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-foreground/60">
                  Adresse Email
                </label>
                <span className="text-[9px] font-mono text-primary px-1 py-0.2 rounded bg-primary/10 border border-primary/20">
                  Lié au compte
                </span>
              </div>
              <input
                type="email"
                disabled
                value={member?.email || ''}
                className="w-full bg-background/50 border border-[#353535] rounded px-3 py-2 text-xs font-mono text-foreground/60 cursor-not-allowed select-none opacity-80"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                Téléphone (GSM) *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-foreground/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+32 400 00 00 00"
                  className="w-full bg-background border border-[#353535] rounded pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                Date de Naissance
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 2 : Adresse postale */}
        <div className="pt-2 border-t border-[#353535]/60">
          <h3 className="text-xs font-mono uppercase tracking-wider text-primary font-bold mb-3 flex items-center gap-1.5">
            <span>2. Adresse Résidentielle</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                Rue et Numéro
              </label>
              <input
                type="text"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                placeholder="Ex: Rue de la Piste, 42"
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                Code Postal
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Ex: 4100"
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                Ville
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Seraing"
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 3 : Paramètres Piste & Licences */}
        <div className="pt-2 border-t border-[#353535]/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>3. Paramètres Course & Licences FBA</span>
            </h3>
            <button
              type="button"
              onClick={handleSyncFba}
              disabled={syncingFba}
              className="px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 border border-primary/40 hover:border-primary text-primary font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
              title="Interroger le registre officiel fba-rc.be pour mettre à jour votre numéro d'affiliation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingFba ? 'animate-spin' : ''}`} />
              <span>{syncingFba ? 'Synchronisation FBA...' : '🔄 Synchroniser avec la FBA'}</span>
            </button>
          </div>

          {/* Notification de synchronisation FBA */}
          {fbaMsg && (
            <div
              className={`p-3 rounded font-mono text-xs flex items-center gap-2 animate-fade-in ${
                fbaMsg.type === 'success'
                  ? 'bg-success/15 border border-success/30 text-success'
                  : 'bg-secondary/15 border border-secondary/30 text-secondary'
              }`}
            >
              {fbaMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{fbaMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-foreground/60">
                  Numéro de Licence FBA
                </label>
                {member?.fba_synced_at ? (
                  <span className="text-[9px] font-mono text-success flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Synchro FBA le {formatDate(member.fba_synced_at)}
                  </span>
                ) : member?.license_number ? (
                  <span className="text-[9px] font-mono text-foreground/50">
                    Édition manuelle
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-yellow-400">
                    Non synchronisé
                  </span>
                )}
              </div>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-foreground/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Ex: 143-52"
                  className="w-full bg-background border border-[#353535] rounded pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                />
              </div>
              <p className="text-[9px] font-mono text-foreground/40 mt-1">
                Récupéré automatiquement depuis fba-rc.be ou modifiable manuellement.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/60 mb-1">
                Numéro de Transpondeur Personnel (MyLaps / RC4)
              </label>
              <div className="relative">
                <Radio className="w-3.5 h-3.5 text-foreground/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={transponderNumber}
                  onChange={(e) => setTransponderNumber(e.target.value)}
                  placeholder="Ex: 7392811"
                  className="w-full bg-background border border-[#353535] rounded pl-8 pr-3 py-2 text-xs font-mono text-primary font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <p className="text-[9px] font-mono text-foreground/40 mt-1">
                Nécessaire pour le chronométrage officiel des courses et entraînements.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4 : Consentements & Règlement (Ultra-visible si non cochés) */}
        <div id="engagements-section" className="pt-2 border-t border-[#353535]/60">
          {!roiAccepted || !insuranceAck ? (
            <div className="p-5 rounded-lg border-2 border-secondary/90 bg-secondary/15 space-y-4 ring-2 ring-secondary/30 shadow-[0_0_30px_rgba(255,50,0,0.15)] animate-pulse">
              <div className="flex items-center gap-2 text-secondary font-bold text-xs font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-secondary" />
                <span>⚠️ OBLIGATOIRE : Vous devez cocher ces deux engagements pour activer votre accès aux circuits et aux courses.</span>
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={roiAccepted}
                    onChange={(e) => setRoiAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-[#353535] text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs font-mono text-white font-medium leading-relaxed">
                    J&apos;atteste avoir lu et j&apos;accepte sans réserve le <strong>Règlement d&apos;Ordre Intérieur (ROI)</strong> du Seraing Buggy Club ASBL. *
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={insuranceAck}
                    onChange={(e) => setInsuranceAck(e.target.checked)}
                    className="mt-0.5 rounded border-[#353535] text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs font-mono text-white font-medium leading-relaxed">
                    J&apos;ai pris connaissance des conditions d&apos;assurance FBA et de l&apos;obligation de check-in géolocalisé lors de toute présence sur piste. *
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-success/30 bg-success/10 space-y-3">
              <div className="flex items-center gap-2 text-success font-bold text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
                <span>Engagements réglementaires & Assurance FBA validés</span>
              </div>

              <div className="space-y-2 pt-1 text-[11px] font-mono text-foreground/80">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={roiAccepted}
                    onChange={(e) => setRoiAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-[#353535] text-primary focus:ring-primary"
                  />
                  <span>Règlement d&apos;Ordre Intérieur (ROI) du SBC ASBL accepté.</span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={insuranceAck}
                    onChange={(e) => setInsuranceAck(e.target.checked)}
                    className="mt-0.5 rounded border-[#353535] text-primary focus:ring-primary"
                  />
                  <span>Conditions d&apos;assurance FBA et check-in géolocalisé approuvés.</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Bouton d'enregistrement unique */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={savingProfile}
            className="w-full sm:w-auto premium-btn text-xs px-8 py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span className="transform skew-x-8">
              {savingProfile ? 'Enregistrement en cours...' : 'Enregistrer mon profil pilote'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
