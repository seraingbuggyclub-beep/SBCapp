'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMemberProfile, updateMemberProfile } from '@/modules/members/actions';
import { getMemberRegistrations, getActiveEvents } from '@/modules/events/actions';
import AuthForm from '@/modules/members/components/AuthForm';
import CadenasLock from '@/modules/payments/components/CadenasLock';
import FbaDisclaimer from '@/modules/presence/components/FbaDisclaimer';
import { User, Phone, FileText, CheckCircle2, Award, Calendar, Clock, MapPin, Trophy, ShieldCheck, Lock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const supabase = createClient();

  const loadDashboardData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUser(session.user);
      
      // Fetch member profile details
      const { data: profileData } = await getMemberProfile(session.user.id);
      setProfile(profileData);

      if (profileData && profileData.payment_status === 'paid') {
        // Fetch active registrations
        const { data: regsData } = await getMemberRegistrations(session.user.id);
        setRegistrations(regsData || []);

        // Fetch active upcoming events
        const { data: eventsData } = await getActiveEvents();
        // Exclude events they are already registered for
        const registeredEventIds = (regsData || []).map((r: any) => r.sbc_events.id);
        const filteredEvents = (eventsData || []).filter(
          (e: any) => !registeredEventIds.includes(e.id)
        );
        setUpcomingEvents(filteredEvents);
      }
    } else {
      setUser(null);
      setProfile(null);
      setRegistrations([]);
      setUpcomingEvents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadDashboardData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdateError('');
    setUpdateSuccess('');

    const { data, error } = await updateMemberProfile({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      phone,
      license_number: licenseNumber,
    });

    if (error) {
      setUpdateError(error);
    } else {
      setProfile(data);
      setUpdateSuccess('Profil mis à jour !');
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-2 font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Chargement de votre cockpit pilote...</span>
      </div>
    );
  }

  // Not Authenticated -> Show Auth Form
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16">
        <AuthForm />
      </div>
    );
  }

  // Authenticated but Payment pending -> Show Lock Code screen
  if (profile && profile.payment_status !== 'paid') {
    return (
      <div className="max-w-md mx-auto py-16 space-y-6">
        <FbaDisclaimer />
        <CadenasLock userId={user.id} onUnlocked={loadDashboardData} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background relative flex flex-col pb-16">
      {/* Background Carbon Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none z-0" />

      {/* Main content grid in a centered container */}
      <div className="w-full max-w-6xl mx-auto px-6 py-12 space-y-8 relative z-10">
        {/* FBA Insurance dynamic alert */}
        <FbaDisclaimer />

        {/* Simple Dashboard Welcome Banner */}
        <div className="premium-card p-6 md:p-8 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#353535]">
          <div className="space-y-1.5">
            <span className="inline-block bg-primary/10 border border-primary/20 text-primary font-mono text-[9px] px-2.5 py-0.5 uppercase tracking-wider rounded">
              Cockpit Pilote SBC
            </span>
            <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
              Pilote : <span className="text-primary">{profile?.first_name} {profile?.last_name}</span>
            </h2>
            <p className="text-xs text-foreground/55 font-mono">
              Licence FBA : {profile?.license_number || 'Non renseignée'} • Statut : Adhérent SBC
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/events"
              className="px-4 py-2 bg-primary text-black font-anybody font-black uppercase text-[10px] tracking-wider border border-black hover:bg-secondary hover:text-white transition-all sport-skew flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <span className="transform skew-x-8">S'inscrire à une course</span>
            </Link>
            <Link
              href="/check-in"
              className="px-4 py-2 bg-surface border border-[#353535] hover:border-primary text-white font-anybody font-black uppercase text-[10px] tracking-wider transition-all sport-skew flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <span className="transform skew-x-8">Prendre la piste</span>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Wallet & Profile Info) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Status Widget */}
            <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-4">
              <h3 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Statut Assurance FBA
              </h3>
              
              <div className="flex items-center gap-2 text-success font-mono font-bold text-xs bg-success/10 border border-success/20 p-3 rounded">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>COUVERTURE ACTIVE</span>
              </div>

              <p className="text-[11px] text-foreground/50 leading-relaxed font-mono">
                Votre cotisation annuelle FBA est à jour pour {new Date().getFullYear()}. N'oubliez pas de valider votre check-in GPS en arrivant au circuit.
              </p>
            </div>

            {/* Profile Card */}
            <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-4">
              <div className="flex items-center justify-between border-b border-[#353535] pb-2">
                <h3 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Mon Profil
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[10px] text-primary hover:text-secondary font-mono font-bold uppercase cursor-pointer"
                  >
                    Modifier
                  </button>
                )}
              </div>

              {updateError && (
                <div className="p-2 rounded bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-mono">
                  ⚠️ {updateError}
                </div>
              )}

              {updateSuccess && (
                <div className="p-2 rounded bg-success/10 border border-success/20 text-success text-[10px] font-mono">
                  ✓ {updateSuccess}
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="block text-[9px] text-foreground/50 uppercase">Prénom</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-background border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-foreground/50 uppercase">Nom</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-background border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-foreground/50 uppercase">Téléphone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-background border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-foreground/50 uppercase">Licence FBA</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full bg-background border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setUpdateError('');
                      }}
                      className="px-3 py-1 bg-[#222] border border-[#353535] text-white rounded text-[10px] cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-primary text-black font-bold rounded text-[10px] cursor-pointer hover:bg-secondary hover:text-white transition-colors"
                    >
                      Sauver
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 font-mono text-[11px] text-foreground/75">
                  <div className="flex justify-between border-b border-[#353535]/30 pb-1.5">
                    <span className="text-foreground/45">Nom :</span>
                    <span className="text-white font-bold">{profile?.first_name} {profile?.last_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#353535]/30 pb-1.5">
                    <span className="text-foreground/45">Téléphone :</span>
                    <span className="text-white">{profile?.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#353535]/30 pb-1.5">
                    <span className="text-foreground/45">Licence :</span>
                    <span className="text-primary font-bold">{profile?.license_number || 'Non renseignée'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Registrations & Upcoming Events) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* User's registered events */}
            <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-4">
              <h3 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Mes Engagements Courses ({registrations.length})
              </h3>

              {registrations.length === 0 ? (
                <div className="p-4 text-center text-xs text-foreground/40 font-mono">
                  Vous n'avez pas d'inscription de course enregistrée.
                </div>
              ) : (
                <div className="space-y-4">
                  {registrations.map((reg) => (
                    <div key={reg.id} className="p-4 bg-surface-dim border border-[#353535] rounded flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[9px] font-mono font-bold uppercase tracking-wider">
                          {reg.race_category}
                        </span>
                        <h4 className="font-anybody font-black text-sm text-white uppercase sport-skew mt-1.5">
                          {reg.sbc_events.title}
                        </h4>
                        <p className="text-[10px] text-foreground/45 font-mono flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          {reg.sbc_events.location}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between text-right font-mono text-xs">
                        <div className="text-foreground/50">{new Date(reg.sbc_events.event_date).toLocaleDateString('fr-BE')}</div>
                        <div className="text-success font-bold mt-1">€{parseFloat(reg.total_paid).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Other upcoming events */}
            {upcomingEvents.length > 0 && (
              <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-4">
                <div className="flex justify-between items-center border-b border-[#353535] pb-2">
                  <h3 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Courses Ouvertes aux Inscriptions ({upcomingEvents.length})
                  </h3>
                  <Link href="/events" className="text-primary hover:text-secondary text-[11px] font-mono hover:underline">
                    Voir tout
                  </Link>
                </div>

                <div className="space-y-3">
                  {upcomingEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="p-4 bg-surface/50 border border-[#353535] rounded flex items-center justify-between gap-4 hover:border-primary transition-all">
                      <div>
                        <div className="text-[10px] text-foreground/40 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          {new Date(event.event_date).toLocaleDateString('fr-BE')}
                        </div>
                        <h4 className="font-anybody font-black text-sm text-white uppercase sport-skew mt-1">
                          {event.title}
                        </h4>
                      </div>

                      <Link
                        href="/events"
                        className="px-4 py-1.5 border border-primary text-primary hover:bg-primary hover:text-black font-anybody font-extrabold uppercase text-[10px] tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000]"
                      >
                        <span className="transform skew-x-8">S'inscrire</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Cards from Mockup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="premium-card p-5 rounded-lg border border-[#353535] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-anybody font-black text-sm text-white uppercase sport-skew">
                  Règlement (ROI)
                </h4>
                <p className="text-[10px] text-foreground/50 font-mono">Charte & ROI</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <a 
                href="/reglement-ordre-interieur.pdf"
                target="_blank"
                className="px-3.5 py-1.5 bg-[#252525] border border-[#353535] hover:border-primary text-white text-[10px] font-mono uppercase tracking-wider rounded transition-all cursor-pointer text-center"
              >
                Lire le ROI
              </a>
              <a 
                href="/charte-bienveillance-comportement.pdf"
                target="_blank"
                className="px-3.5 py-1.5 bg-[#252525] border border-[#353535] hover:border-primary text-white text-[10px] font-mono uppercase tracking-wider rounded transition-all cursor-pointer text-center"
              >
                Lire la charte
              </a>
            </div>
          </div>

          <div className="premium-card p-5 rounded-lg border border-[#353535] flex items-center justify-between opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-foreground/10 flex items-center justify-center text-foreground/50">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-anybody font-black text-sm text-white uppercase sport-skew flex items-center gap-2">
                  Réglages Voitures
                  <span className="bg-primary/20 text-primary text-[8px] px-1.5 py-0.2 rounded font-mono font-bold tracking-tight">BIENTÔT</span>
                </h4>
                <p className="text-[10px] text-foreground/50 font-mono">Base de données setups & télémétrie</p>
              </div>
            </div>
            <Lock className="w-4 h-4 text-foreground/35 mr-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
