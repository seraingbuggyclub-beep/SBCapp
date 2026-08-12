'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMemberProfile } from '@/modules/members/actions';
import { getActiveEvents, registerForEvent, getMemberRegistrations } from '@/modules/events/actions';
import CadenasLock from '@/modules/payments/components/CadenasLock';
import FbaDisclaimer from '@/modules/presence/components/FbaDisclaimer';
import { Trophy, Calendar, MapPin, Radio, KeyRound, Check, RefreshCw, Send } from 'lucide-react';
import Link from 'next/link';

export default function EventsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected event for registration
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [raceCategory, setRaceCategory] = useState('1/10 Buggy 2WD');
  const [categoryFee, setCategoryFee] = useState(25);
  
  // Food options
  const [lunchPack, setLunchPack] = useState(false);
  const [saturdayBbq, setSaturdayBbq] = useState(false);
  
  const [transponderId, setTransponderId] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    // 1. Charger les événements
    const { data: eventsData } = await getActiveEvents();
    setEvents(eventsData || []);

    if (session?.user) {
      setUser(session.user);
      
      // 2. Charger le profil
      const { data: profileData } = await getMemberProfile(session.user.id);
      setProfile(profileData);

      // 3. Charger les inscriptions existantes
      const { data: regsData } = await getMemberRegistrations(session.user.id);
      setRegistrations(regsData || []);
    } else {
      setUser(null);
      setProfile(null);
      setRegistrations([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCategoryChange = (category: string, fee: number) => {
    setRaceCategory(category);
    setCategoryFee(fee);
  };

  const getFoodOptionsArray = () => {
    const opts = [];
    if (lunchPack) opts.push('Lunch Pack');
    if (saturdayBbq) opts.push('Dinner BBQ');
    return opts;
  };

  const calculateTotal = () => {
    let total = categoryFee;
    if (lunchPack) total += 12;
    if (saturdayBbq) total += 22;
    return total;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedEvent) return;
    setRegLoading(true);
    setRegError('');
    setRegSuccess(false);

    try {
      const total = calculateTotal();
      const foodOpts = getFoodOptionsArray();

      const { error } = await registerForEvent({
        event_id: selectedEvent.id,
        member_id: user.id,
        race_category: raceCategory,
        food_options: foodOpts,
        transponder_id: transponderId,
        total_paid: total,
      });

      if (error) {
        setRegError(error);
      } else {
        setRegSuccess(true);
        // Refresh list
        const { data: regsData } = await getMemberRegistrations(user.id);
        setRegistrations(regsData || []);
        
        setTimeout(() => {
          setSelectedEvent(null);
          setRegSuccess(false);
          setLunchPack(false);
          setSaturdayBbq(false);
          setTransponderId('');
        }, 2000);
      }
    } catch (err: any) {
      setRegError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setRegLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-2 font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Chargement des événements...</span>
      </div>
    );
  }

  // Not Logged In -> Show warning and calendar preview only
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] text-center">
          <KeyRound className="w-12 h-12 text-primary mx-auto mb-3" />
          <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
            Connexion Requise pour l'Inscription
          </h2>
          <p className="text-xs text-foreground/50 font-mono mt-1 mb-4">
            Connectez-vous pour vous inscrire officiellement aux courses du club
          </p>
          <Link href="/dashboard" className="premium-btn text-xs">
            <span className="transform skew-x-8">Se connecter</span>
          </Link>
        </div>

        {/* Public list of events */}
        <div className="space-y-4">
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
            Prochaines Courses & Activités
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => (
              <div key={event.id} className="premium-card p-5 rounded-lg border border-[#353535] flex justify-between items-center">
                <div>
                  <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[9px] font-mono font-bold uppercase tracking-wider">
                    {event.category}
                  </span>
                  <h4 className="font-anybody font-black text-base text-white uppercase sport-skew mt-1">
                    {event.title}
                  </h4>
                  <p className="text-xs text-foreground/60 mt-1">{event.description}</p>
                </div>
                <div className="text-right font-mono text-xs text-foreground/50">
                  <div>{new Date(event.event_date).toLocaleDateString('fr-BE')}</div>
                  <div>Frais : €{parseFloat(event.registration_fee).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Pending user -> Locked by cadenas
  if (profile && profile.payment_status !== 'paid') {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6">
        <CadenasLock userId={user.id} onUnlocked={loadData} />
        <FbaDisclaimer />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#353535] pb-4">
        <div>
          <h1 className="font-anybody font-black text-2xl md:text-3xl uppercase tracking-tight sport-skew text-white">
            Calendrier & <span className="text-primary">Inscriptions</span>
          </h1>
          <p className="text-xs text-foreground/50 font-mono mt-1">
            Pilote : {profile?.first_name} {profile?.last_name}
          </p>
        </div>
      </div>

      <FbaDisclaimer />

      {/* Main Registration Block */}
      {selectedEvent ? (
        <div className="premium-card rounded-lg overflow-hidden border border-primary/30">
          <div className="bg-primary/10 border-b border-[#353535] p-5 flex justify-between items-center">
            <div>
              <span className="bg-racing-red text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                Formulaire Officiel
              </span>
              <h3 className="font-anybody font-black text-lg text-white uppercase sport-skew mt-1">
                Inscription : {selectedEvent.title}
              </h3>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-xs text-foreground/50 hover:text-white font-mono uppercase cursor-pointer"
            >
              Annuler
            </button>
          </div>

          <form onSubmit={handleRegister} className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#353535]">
            {/* Left: Category and options */}
            <div className="lg:col-span-8 p-6 space-y-6">
              {regError && (
                <div className="p-3 rounded bg-secondary/10 border border-secondary/20 text-secondary text-xs font-mono">
                  ⚠️ {regError}
                </div>
              )}

              {regSuccess && (
                <div className="p-3 rounded bg-success/15 border border-success/30 text-success text-xs font-mono flex items-center gap-2">
                  ✓ Inscription validée ! Préparation du départ...
                </div>
              )}

              {/* Race categories */}
              <div>
                <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew mb-3">
                  1. Choisir la Catégorie de Course
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { cat: '1/10 Buggy 2WD', fee: 25, type: 'Electric' },
                    { cat: '1/8 E-Buggy', fee: 30, type: 'Electric' },
                    { cat: '1/8 Nitro Buggy', fee: 35, type: 'Nitro' },
                    { cat: 'Crawler Meet', fee: 15, type: 'Social' },
                  ].map((item) => (
                    <button
                      key={item.cat}
                      type="button"
                      onClick={() => handleCategoryChange(item.cat, item.fee)}
                      className={`p-4 border text-left rounded flex flex-col justify-between transition-all cursor-pointer ${
                        raceCategory === item.cat
                          ? 'border-primary bg-primary/10 text-primary shadow-[inset_0_0_15px_rgba(255,110,0,0.15)]'
                          : 'border-[#353535] bg-surface hover:bg-surface-high text-foreground'
                      }`}
                    >
                      <span className="text-[9px] font-mono uppercase text-foreground/45">{item.type}</span>
                      <span className="font-anybody font-black text-sm uppercase sport-skew text-white mt-1">{item.cat}</span>
                      <span className="text-xs font-mono font-bold mt-2 text-primary">€{item.fee.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Food & Transponder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Food options */}
                <div>
                  <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew mb-3">
                    2. Repas (Optionnel)
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-surface border border-[#353535] rounded cursor-pointer hover:bg-surface-high">
                      <input
                        type="checkbox"
                        checked={lunchPack}
                        onChange={(e) => setLunchPack(e.target.checked)}
                        className="w-4 h-4 text-primary bg-background border-[#353535] focus:ring-primary focus:ring-offset-0 rounded"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-white">Lunch Pack (+12.00 €)</div>
                        <div className="text-[10px] text-foreground/50">Sandwich, boisson & snack</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-surface border border-[#353535] rounded cursor-pointer hover:bg-surface-high">
                      <input
                        type="checkbox"
                        checked={saturdayBbq}
                        onChange={(e) => setSaturdayBbq(e.target.checked)}
                        className="w-4 h-4 text-primary bg-background border-[#353535] focus:ring-primary focus:ring-offset-0 rounded"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-white">Barbecue Samedi Soir (+22.00 €)</div>
                        <div className="text-[10px] text-foreground/50">3 viandes, buffet salade & 1 boisson</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Transponder ID */}
                <div>
                  <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew mb-3">
                    3. Matériel Télémétrie
                  </h4>
                  <div className="p-4 bg-surface border border-[#353535] rounded space-y-3">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50">
                      N° Transpondeur (AMB/MyLaps)
                    </label>
                    <input
                      type="text"
                      value={transponderId}
                      onChange={(e) => setTransponderId(e.target.value)}
                      placeholder="#1234567"
                      className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
                    />
                    <p className="text-[9px] text-foreground/45 font-mono leading-tight">
                      Laissez vide si vous n'avez pas de transpondeur personnel (location possible sur place).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Summary */}
            <div className="lg:col-span-4 p-6 bg-surface-dim flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2">
                  Résumé Facturation
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-foreground/55">Catégorie :</span>
                    <span className="text-white">{raceCategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/55">Frais :</span>
                    <span className="text-primary font-bold">€{categoryFee.toFixed(2)}</span>
                  </div>
                  {lunchPack && (
                    <div className="flex justify-between">
                      <span className="text-foreground/55">Lunch Pack :</span>
                      <span className="text-white">€12.00</span>
                    </div>
                  )}
                  {saturdayBbq && (
                    <div className="flex justify-between">
                      <span className="text-foreground/55">Barbecue :</span>
                      <span className="text-white">€22.00</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#353535]/50">
                <div className="flex justify-between items-end">
                  <span className="font-anybody font-black text-sm uppercase sport-skew text-foreground/50">Total</span>
                  <span className="font-anybody font-black text-2xl uppercase sport-skew text-success">
                    €{calculateTotal().toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={regLoading || regSuccess}
                  className="w-full premium-btn text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="transform skew-x-8 flex items-center gap-1.5">
                    <Send className="w-4 h-4" />
                    {regLoading ? 'Traitement...' : 'Confirmer Inscription'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Events list */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-anybody font-black text-sm uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2">
              Courses & Compétitions Ouvertes
            </h3>

            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-foreground/50 font-mono border border-[#353535] rounded">
                Aucun événement prévu pour le moment.
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="premium-card p-6 rounded-lg border border-[#353535] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-primary/20 rounded">
                        {event.category}
                      </span>
                      <span className="text-[10px] text-foreground/45 font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {new Date(event.event_date).toLocaleDateString('fr-BE')}
                      </span>
                    </div>
                    <h4 className="font-anybody font-black text-lg text-white uppercase sport-skew">
                      {event.title}
                    </h4>
                    <p className="text-xs text-foreground/60 leading-relaxed font-sans">{event.description}</p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end mt-4 sm:mt-0">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="w-full sm:w-auto px-5 py-2 border-2 border-primary text-primary hover:bg-primary hover:text-black font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer"
                    >
                      <span className="transform skew-x-8">S'inscrire</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: User registrations history */}
          <div className="premium-card p-6 rounded-lg border border-[#353535] h-fit space-y-4">
            <h3 className="font-anybody font-black text-sm uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2">
              Mes Engagements (Courses)
            </h3>

            {registrations.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-foreground/40 font-mono">
                Vous n'êtes inscrit à aucune course pour le moment.
              </div>
            ) : (
              <div className="space-y-3 max-h-75 overflow-y-auto">
                {registrations.map((reg) => (
                  <div key={reg.id} className="p-3 bg-surface-dim border border-[#353535]/50 rounded font-mono text-[11px] space-y-1">
                    <div className="font-bold text-white text-xs font-sans truncate uppercase sport-skew">
                      {reg.sbc_events.title}
                    </div>
                    <div className="text-foreground/45 flex justify-between">
                      <span>Catégorie :</span>
                      <span className="text-primary font-bold">{reg.race_category}</span>
                    </div>
                    <div className="text-foreground/45 flex justify-between">
                      <span>Transpondeur :</span>
                      <span className="text-white">{reg.transponder_id || 'Aucun'}</span>
                    </div>
                    <div className="text-foreground/45 flex justify-between">
                      <span>Total Payé :</span>
                      <span className="text-success font-bold">€{parseFloat(reg.total_paid).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
