'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  EmailCategory,
  EmailLogItem,
  SecuredEmailAudience,
} from '@/types/models';
import {
  getSecuredEmailAudience,
  sendSecuredAdminEmail,
  getEmailLogs,
} from '../actions';
import {
  ShieldAlert,
  ShieldCheck,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Lock,
  FileText,
  RefreshCw,
} from 'lucide-react';

export default function AdminEmailShield() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<EmailCategory>('CLUB_NEWS');
  const [body, setBody] = useState('');

  const [audience, setAudience] = useState<SecuredEmailAudience>({
    count: 0,
    excludedCount: 0,
    category: 'CLUB_NEWS',
  });
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAudience = useCallback(async () => {
    setLoadingAudience(true);
    const [audRes, logsRes] = await Promise.all([
      getSecuredEmailAudience(category),
      getEmailLogs(),
    ]);

    if (audRes.audience) setAudience(audRes.audience);
    if (logsRes.data) setLogs(logsRes.data);
    setLoadingAudience(false);
  }, [category]);

  useEffect(() => {
    loadAudience();
  }, [loadAudience]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setMsg({ type: 'error', text: 'Veuillez saisir un objet et un message.' });
      return;
    }

    if (!confirm(`Confirmez-vous l'envoi sécurisé de cet email à ${audience.count} membres consentants ?`)) {
      return;
    }

    setSending(true);
    setMsg(null);

    const res = await sendSecuredAdminEmail(subject, body, category);
    setSending(false);

    if (res.success) {
      setMsg({
        type: 'success',
        text: `Email envoyé avec succès et consigné dans le registre sécurisé (${res.recipientsCount} destinataires).`,
      });
      setSubject('');
      setBody('');
      loadAudience();
    } else {
      setMsg({ type: 'error', text: res.error || 'Erreur lors de l\'envoi.' });
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs animate-fade-in">
      {/* 1. Bouclier de Sécurité Admin (Explications & Garanties) */}
      <div className="p-4 rounded-xl bg-surface border border-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[3px_3px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <strong className="font-anybody font-black text-sm uppercase text-white tracking-wide block sport-skew">
              Admin Shield : Protection Anti-Fuite d'Adresses
            </strong>
            <p className="text-[11px] text-foreground/60 mt-0.5 leading-relaxed">
              Vos envois sont automatiquement individualisés. Les adresses des membres ne sont jamais visibles entre elles,
              et chaque email intègre les mentions légales ASBL ainsi qu'un lien de désinscription unique en 1 clic.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between animate-fade-in ${
            msg.type === 'success'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary/15 border-secondary/40 text-secondary'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-foreground/40 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* 2. Rédacteur d'Email Sécurisé */}
      <div className="p-6 rounded-xl bg-surface border border-[#353535] space-y-4 shadow-[4px_4px_0px_#000]">
        <div className="flex items-center justify-between border-b border-[#353535] pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h3 className="font-anybody font-black text-sm uppercase text-white tracking-wide">
              Composer une Communication Sécurisée
            </h3>
          </div>

          {/* Badge Audience en direct */}
          <div className="flex items-center gap-2 bg-background border border-[#353535] px-3 py-1.5 rounded-lg">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-white font-bold">{audience.count} membres ciblés</span>
            {audience.excludedCount > 0 && (
              <span className="text-secondary text-[10px]">
                ({audience.excludedCount} opt-out exclus)
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Catégorie */}
            <div className="space-y-1.5">
              <label className="text-foreground/70 block uppercase text-[10px]">Catégorie de communication * :</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EmailCategory)}
                className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="CLUB_NEWS">Infos Officielles Club (AG, Cotisations)</option>
                <option value="EVENTS">Courses, Compétitions & Travaux</option>
                <option value="URGENT_INFO">Alerte Météo / Piste Fermée</option>
              </select>
            </div>

            {/* Objet */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-foreground/70 block uppercase text-[10px]">Objet du message * :</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Convocation à l'Assemblée Générale 2026 / Course amicale de reprise"
                className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary font-sans"
                required
              />
            </div>
          </div>

          {/* Corps de l'email */}
          <div className="space-y-1.5">
            <label className="text-foreground/70 block uppercase text-[10px]">Contenu du message * :</label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Bonjour chers pilotes,&#10;&#10;Nous avons le plaisir de vous annoncer..."
              className="w-full bg-background border border-[#353535] rounded-xl p-3 text-white focus:outline-none focus:border-primary font-sans leading-relaxed text-xs"
              required
            />
          </div>

          {/* Aperçu du Footer Légal automatique */}
          <div className="p-3 rounded-xl bg-background border border-[#353535] text-[10px] text-foreground/50 space-y-1">
            <strong className="text-foreground/70 block uppercase">
              Pied de page légal injecté automatiquement :
            </strong>
            <p>
              Seraing Buggy Club ASBL • Complexe RC de Seraing • contact@seraingbuggyclub.be
            </p>
            <p className="italic text-foreground/40">
              « Vous recevez cet email car vous êtes membre du Seraing Buggy Club. Pour vous désinscrire : [Lien sécurisé individualisé] »
            </p>
          </div>

          {/* Bouton d'envoi */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending || audience.count === 0}
              className="premium-btn text-xs px-6 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span className="transform skew-x-8">
                {sending ? 'Envoi sécurisé en cours...' : `Envoyer à ${audience.count} membres`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Journal d'Audit des Envois Récents */}
      <div className="p-5 rounded-xl bg-surface border border-[#353535] space-y-3 shadow-[4px_4px_0px_#000]">
        <div className="flex items-center justify-between border-b border-[#353535] pb-2">
          <h4 className="font-anybody font-bold text-xs uppercase text-white">
            Journal d'Audit des Communications
          </h4>
          <span className="text-[10px] text-foreground/40">{logs.length} envois récents</span>
        </div>

        {logs.length === 0 ? (
          <p className="text-foreground/40 py-4 text-center">Aucun journal d'envoi pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#353535] text-[10px] text-foreground/50 uppercase">
                  <th className="py-2">Date & Heure</th>
                  <th className="py-2">Objet</th>
                  <th className="py-2">Catégorie</th>
                  <th className="py-2 text-right">Destinataires</th>
                  <th className="py-2 text-right">Expéditeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#353535]/40">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-high/30">
                    <td className="py-2.5 text-foreground/80 whitespace-nowrap">
                      {new Date(log.sent_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 text-white font-bold font-sans">{log.subject}</td>
                    <td className="py-2.5 text-foreground/60 text-[10px] uppercase">{log.category}</td>
                    <td className="py-2.5 text-right font-bold text-primary">{log.recipients_count}</td>
                    <td className="py-2.5 text-right text-foreground/60">
                      {log.sender ? `${log.sender.first_name} ${log.sender.last_name}` : 'Admin'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
