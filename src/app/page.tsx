import React from 'react';
import Link from 'next/link';
import { getPublicActivePresences } from '@/modules/presence/actions';
import PresenceList from '@/modules/presence/components/PresenceList';
import FbaDisclaimer from '@/modules/presence/components/FbaDisclaimer';
import { Trophy, Shield, MapPin, Key, Radio, Navigation, UserCheck, LockOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import LockCodeWidget from '@/modules/admin/components/LockCodeWidget';
import EventsCalendarView from '@/modules/events/components/EventsCalendarView';
import TracksLiveStatus from '@/modules/tracks/components/TracksLiveStatus';
import MemberQrCodeCard from '@/modules/members/components/MemberQrCodeCard';

export const revalidate = 0; // Force SSR

export default async function LandingPage() {
  const { data: activePresences } = await getPublicActivePresences();

  // Check if current user is logged in and in order of payment to show the lock code
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  let clubConfig = null;
  
  if (user) {
    const { data: profileData } = await supabase
      .from('sbc_members')
      .select('*')
      .eq('id', user.id)
      .single();
    
    profile = profileData;
    
    if (profile?.payment_status === 'paid') {
      const { data: configData } = await supabase
        .from('sbc_club_config')
        .select('lock_code')
        .limit(1)
        .maybeSingle();
      clubConfig = configData;
    }
  }

  return (
    <div className="w-full min-h-screen bg-background relative flex flex-col pb-16">
      {/* Background Carbon Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none z-0" />

      {/* Hero Full-Width Immersive Section */}
      <section className="relative w-full h-130 flex items-center overflow-hidden border-b border-[#353535] z-10 bg-black">
        {/* Immersive background action photo */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url('/hero-bg.png')` 
          }}
        />
        {/* Darkening overlay gradient so the text on the right pops */}
        <div className="absolute inset-0 bg-linear-to-r from-black/35 via-black/60 to-black/95 md:bg-linear-to-r md:from-transparent md:via-black/50 md:to-black/95" />

        {/* Content Container (Right-aligned text) */}
        <div className="relative w-full max-w-6xl mx-auto px-6 flex flex-col items-end text-right z-20">
          <div className="max-w-xl space-y-4 md:space-y-6">
            {/* Badge */}
            <div>
              <span className="inline-block bg-primary text-black font-anybody font-black text-[11px] px-3.5 py-1.5 uppercase tracking-wider sport-skew shadow-[3px_3px_0px_#000]">
                <span className="transform skew-x-8 block font-black">Seraing Buggy Club</span>
              </span>
            </div>

            {/* Title */}
            <h1 className="font-anybody font-black text-4xl md:text-6xl uppercase tracking-tighter sport-skew leading-none text-white select-none">
              PISTE TOUT-TERRAIN <br />
              <span className="text-primary font-black">SERAING BUGGY CLUB</span>
            </h1>

            {/* Description */}
            <p className="text-xs md:text-sm text-foreground/80 leading-relaxed font-sans max-w-md ml-auto">
              Bienvenue sur l'application officielle du SBC. Enregistrez votre présence avant de prendre la piste pour rouler en toute sécurité et être couvert par l'assurance FBA.
            </p>

            {/* Lock code display dynamically resolved for simulation or real permissions */}
            <LockCodeWidget initialLockCode={clubConfig?.lock_code || null} realUserProfile={profile} />

            {/* CTA Buttons */}
            <div className="pt-2 flex gap-3 justify-end">
              <Link
                href="/check-in"
                className="px-5 py-3 bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider border border-black hover:bg-secondary hover:text-white transition-all sport-skew flex items-center gap-2 shadow-[4px_4px_0px_#000] cursor-pointer"
              >
                <span className="transform skew-x-8 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4" />
                  S'enregistrer sur le terrain
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-3 bg-surface border-2 border-primary/20 text-white font-anybody font-black uppercase text-xs tracking-wider hover:border-primary transition-all sport-skew flex items-center gap-2 shadow-[4px_4px_0px_#000] cursor-pointer"
              >
                <span className="transform skew-x-8 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Espace Pilote
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main content in a centered container */}
      <div className="w-full max-w-6xl mx-auto px-6 py-10 space-y-8 relative z-10">
        
        {/* Pass Pilote si l'utilisateur est connecté */}
        {profile && (
          <section className="max-w-xl mx-auto w-full">
            <MemberQrCodeCard member={profile} />
          </section>
        )}

        {/* Live Track Status & Weather */}
        <section>
          <TracksLiveStatus />
        </section>

        {/* FBA Insurance Warning */}
        <section>
          <FbaDisclaimer />
        </section>

        {/* Live Presence List */}
        <section className="max-w-3xl mx-auto">
          <PresenceList presences={activePresences || []} />
        </section>

        {/* Interactive Club Events & Belgian Holidays Calendar */}
        <section className="w-full pt-4">
          <EventsCalendarView />
        </section>
      </div>
    </div>
  );
}
