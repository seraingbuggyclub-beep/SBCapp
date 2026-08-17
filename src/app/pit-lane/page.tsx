'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getAnnouncements } from '@/modules/announcements/actions';
import { ClubAnnouncement, AnnouncementCategory } from '@/types/models';
import { useAuth } from '@/hooks/useAuth';
import {
  Radio,
  Pin,
  Wrench,
  Flag,
  Users,
  Info,
  Calendar,
  User,
  Shield,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function PitLanePage() {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchNews = async () => {
    setLoading(true);
    const { data } = await getAnnouncements();
    setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

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

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.author_name.toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (selectedCategory === 'all') return true;
      return item.category === selectedCategory;
    });
  }, [announcements, selectedCategory, searchQuery]);

  const categoriesList = [
    { id: 'all', label: 'Toutes les communications' },
    { id: 'info_piste', label: 'Info Piste' },
    { id: 'travaux', label: 'Travaux' },
    { id: 'briefing_course', label: 'Briefing Course' },
    { id: 'vie_du_club', label: 'Vie du Club' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* 1. Header Babillard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#353535] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-primary animate-pulse" />
            <h1 className="font-anybody font-black text-2xl md:text-3xl uppercase tracking-tight sport-skew text-white">
              Pit-Lane : <span className="text-primary">Le Babillard</span>
            </h1>
          </div>
          <p className="text-xs font-mono text-foreground/50 mt-1">
            Communications officielles, état de la piste et briefings du Comité SBC
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin?tab=communications"
              className="premium-btn text-xs px-4 py-2 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="transform skew-x-8">Publier une annonce</span>
            </Link>
          )}

          <button
            onClick={fetchNews}
            disabled={loading}
            className="p-2.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            title="Actualiser le flux"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-dim p-4 rounded-lg border border-[#353535]">
        {/* Recherche textuelle */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une annonce..."
            className="w-full bg-background border border-[#353535] rounded pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
          />
        </div>

        {/* Boutons de filtres */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded font-mono text-xs whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-primary text-black font-bold shadow-[0_0_10px_rgba(255,110,0,0.3)]'
                  : 'bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Flux d'annonces */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 font-mono text-xs text-foreground/50">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Chargement des communications officielles...</span>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="premium-card p-12 rounded-lg border border-[#353535] text-center font-mono text-xs text-foreground/45 space-y-2">
          <Info className="w-8 h-8 text-foreground/30 mx-auto" />
          <p>Aucune communication ne correspond à votre sélection.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAnnouncements.map((item) => {
            const catConfig = getCategoryConfig(item.category);
            const CatIcon = catConfig.icon;
            const dateFormatted = new Date(item.created_at).toLocaleDateString('fr-BE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <article
                key={item.id}
                className={`premium-card p-6 md:p-8 rounded-lg border transition-all relative overflow-hidden ${
                  item.is_pinned
                    ? 'border-primary/50 shadow-[0_0_25px_rgba(255,110,0,0.1)] ring-1 ring-primary/20'
                    : 'border-[#353535] hover:border-[#454545]'
                }`}
              >
                {/* Ligne supérieure : Catégorie, Épinglé, Date */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${catConfig.colorClass}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{catConfig.label}</span>
                    </span>

                    {item.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary/20 border border-secondary/40 text-secondary text-[10px] font-mono font-bold uppercase tracking-wider animate-pulse">
                        <Pin className="w-3 h-3" />
                        <span>Épinglé</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-foreground/45">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {dateFormatted}
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {item.author_name}
                    </span>
                  </div>
                </div>

                {/* Titre */}
                <h2 className="font-anybody font-black text-lg md:text-xl uppercase tracking-tight sport-skew text-white mb-3 leading-snug">
                  {item.title}
                </h2>

                {/* Contenu */}
                <div className="text-foreground/80 font-mono text-xs leading-relaxed whitespace-pre-line border-t border-[#353535]/40 pt-4">
                  {item.content}
                </div>

                {/* Signature mobile */}
                <div className="sm:hidden mt-4 pt-3 border-t border-[#353535]/30 flex items-center gap-1 text-[10px] font-mono text-foreground/40">
                  <User className="w-3 h-3 text-primary" />
                  <span>Publié par {item.author_name}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
