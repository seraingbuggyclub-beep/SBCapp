import React from 'react';
import Link from 'next/link';
import { Pin, ArrowRight, Calendar, Info, Wrench, Flag, Users, Radio } from 'lucide-react';
import { ClubAnnouncement, AnnouncementCategory } from '@/types/models';

interface PinnedBriefBannerProps {
  announcement: ClubAnnouncement | null;
}

export default function PinnedBriefBanner({ announcement }: PinnedBriefBannerProps) {
  if (!announcement || !announcement.is_pinned) {
    return null;
  }

  const getCategoryConfig = (cat: AnnouncementCategory) => {
    switch (cat) {
      case 'info_piste':
        return {
          label: 'Info Piste',
          icon: Info,
          colorClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
      case 'travaux':
        return {
          label: 'Travaux',
          icon: Wrench,
          colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'briefing_course':
        return {
          label: 'Briefing Course',
          icon: Flag,
          colorClass: 'bg-primary/15 text-primary border-primary/30',
        };
      case 'vie_du_club':
      default:
        return {
          label: 'Vie du Club',
          icon: Users,
          colorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
    }
  };

  const catConfig = getCategoryConfig(announcement.category);
  const CatIcon = catConfig.icon;
  const dateFormatted = new Date(announcement.created_at).toLocaleDateString('fr-BE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="w-full border-b border-primary/30 bg-linear-to-r from-[#18120b] via-[#1f170f] to-[#141414] relative overflow-hidden shadow-[0_4px_25px_rgba(255,110,0,0.12)]">
      {/* Accent glow bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-primary to-transparent" />
      <div className="absolute -left-10 top-0 bottom-0 w-32 bg-primary/10 blur-2xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Main info & Title */}
          <div className="space-y-2 flex-1 min-w-0">
            {/* Badges line */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-primary/20 border border-primary/50 text-primary text-[10px] font-mono font-bold uppercase tracking-wider animate-pulse sport-skew shadow-[0_0_12px_rgba(255,110,0,0.25)]">
                <Pin className="w-3 h-3 text-primary" />
                <span className="transform skew-x-8">📌 ANNONCE OFFICIELLE / ÉPINGLÉ</span>
              </span>

              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${catConfig.colorClass}`}>
                <CatIcon className="w-2.5 h-2.5" />
                <span>{catConfig.label}</span>
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-foreground/45">
                <Calendar className="w-3 h-3 text-primary/70" />
                <span>{dateFormatted}</span>
              </span>
            </div>

            {/* Title & Preview */}
            <div className="space-y-1">
              <h2 className="font-anybody font-black text-sm md:text-base uppercase tracking-tight text-white line-clamp-1 sport-skew">
                <span className="transform skew-x-8">{announcement.title}</span>
              </h2>
              <p className="text-xs font-mono text-foreground/70 line-clamp-1 md:line-clamp-2 leading-relaxed">
                {announcement.content}
              </p>
            </div>
          </div>

          {/* Action CTA */}
          <div className="shrink-0 flex items-center pt-1 md:pt-0">
            <Link
              href="/pit-lane"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-primary/15 hover:bg-primary text-primary hover:text-black border border-primary/40 font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew shadow-[2px_2px_0px_rgba(0,0,0,0.8)] group cursor-pointer"
            >
              <span className="transform skew-x-8 flex items-center gap-1.5">
                <span>Lire la suite sur le Pit-Lane</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
