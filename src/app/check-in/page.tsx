'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMemberProfile } from '@/modules/members/actions';
import { getMemberActivePresence } from '@/modules/presence/actions';
import CheckInToggle from '@/modules/presence/components/CheckInToggle';
import CadenasLock from '@/modules/payments/components/CadenasLock';
import FbaDisclaimer from '@/modules/presence/components/FbaDisclaimer';
import { KeyRound, ShieldAlert, Radio } from 'lucide-react';
import Link from 'next/link';

export default function CheckInPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activePresence, setActivePresence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUser(session.user);
      
      // Fetch member profile details
      const { data: profileData } = await getMemberProfile(session.user.id);
      setProfile(profileData);

      if (profileData && profileData.payment_status === 'paid') {
        // Fetch active presence for check-in toggle
        const { data: presenceData } = await getMemberActivePresence(session.user.id);
        setActivePresence(presenceData);
      }
    } else {
      setUser(null);
      setProfile(null);
      setActivePresence(null);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-2 font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Chargement des données GPS...</span>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 text-center">
        <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535]">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4 border border-[#353535] text-primary">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white mb-2">
            Connexion Requise
          </h3>
          <p className="text-xs text-foreground/60 leading-relaxed mb-6 font-mono">
            Vous devez être connecté avec votre compte pilote pour valider votre présence sur la piste.
          </p>
          <Link
            href="/dashboard"
            className="premium-btn text-xs w-full flex items-center justify-center"
          >
            <span className="transform skew-x-8">Accéder à la connexion</span>
          </Link>
        </div>

        <FbaDisclaimer />
      </div>
    );
  }

  // Cotisation pas en règle
  if (profile && profile.payment_status !== 'paid') {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6">
        <CadenasLock userId={user.id} onUnlocked={loadData} />
        <FbaDisclaimer />
      </div>
    );
  }

  // En ordre de cotisation -> Afficher le check-in toggle
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-[#353535] pb-4">
        <div>
          <h1 className="font-anybody font-black text-2xl md:text-3xl uppercase tracking-tight sport-skew text-white">
            Enregistrement <span className="text-primary">Présence</span>
          </h1>
          <p className="text-xs text-foreground/50 font-mono mt-1">
            Pilote : {profile?.first_name} {profile?.last_name} • Licence: {profile?.license_number || 'Non encodée'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-success/15 border border-success/30 px-3 py-1 rounded text-[10px] text-success font-mono font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping shrink-0" />
          Radar FBA Actif
        </div>
      </div>

      {/* Mandatory disclaimer */}
      <FbaDisclaimer />

      {/* Check-in toggle component */}
      <CheckInToggle memberId={user.id} initialPresence={activePresence} />
    </div>
  );
}
