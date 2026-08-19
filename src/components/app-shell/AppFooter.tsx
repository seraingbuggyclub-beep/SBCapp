'use client';

import React, { useState } from 'react';
import {
  FileText,
  Lock,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  Scale,
} from 'lucide-react';
import { CLUB_CONFIG } from '@/config/club';

type LegalDocType = 'cgu_roi' | 'privacy_rgpd' | 'legal_notices' | null;

export default function AppFooter() {
  const [activeModal, setActiveModal] = useState<LegalDocType>(null);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="border-t border-[#2a2a2a] bg-[#0c0c0c] text-foreground/60 font-mono text-xs py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Section : Identité ASBL & Coordonnées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-[#222] pb-6">
            {/* Colonne 1 : Raison Sociale & Affiliation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="font-anybody font-black text-sm uppercase text-white tracking-wider sport-skew">
                  {CLUB_CONFIG.name}
                </span>
              </div>
              <p className="text-[11px] text-foreground/50 leading-relaxed font-sans">
                {CLUB_CONFIG.legalForm} • Fondée en {CLUB_CONFIG.foundationYear}
                <br />
                Club officiel affilié à la <strong>{CLUB_CONFIG.affiliation.name}</strong>.
              </p>
            </div>

            {/* Colonne 2 : Coordonnées Officielles & BCE */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-start gap-2">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>N° BCE / TVA :</strong> {CLUB_CONFIG.bce} ({CLUB_CONFIG.rpm})
                </span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Siège social :</strong> {CLUB_CONFIG.address.full}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                <a
                  href={`tel:${CLUB_CONFIG.contact.phoneRaw}`}
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {CLUB_CONFIG.contact.phone}
                </a>
              </div>
            </div>

            {/* Colonne 3 : Liens Légaux & Conformité */}
            <div className="space-y-2">
              <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-wider block">
                Transparence & Cadre Légal
              </span>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <button
                    onClick={() => setActiveModal('cgu_roi')}
                    className="hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-primary" />
                    <span>Règlement d'Ordre Intérieur (ROI) & CGU</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('privacy_rgpd')}
                    className="hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3 h-3 text-primary" />
                    <span>Politique de Confidentialité & RGPD</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('legal_notices')}
                    className="hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <Scale className="w-3 h-3 text-primary" />
                    <span>Mentions Légales & Statuts ASBL</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar : Copyright & Signature */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-foreground/40 pt-1">
            <div>
              © {currentYear} <strong>{CLUB_CONFIG.name}</strong> • BCE {CLUB_CONFIG.bce} • Tous droits réservés.
            </div>
            <div className="flex items-center gap-2">
              <span>Plateforme Officielle Membres & Terrains</span>
              <span className="text-primary font-bold">{CLUB_CONFIG.appVersion}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modale d'Affichage des Documents Légaux */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
          <div className="absolute inset-0" onClick={() => setActiveModal(null)} />

          <div className="relative z-10 w-full max-w-2xl bg-[#121212] border border-[#353535] rounded-2xl p-6 md:p-8 text-foreground/80 space-y-5 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  {activeModal === 'cgu_roi' && <FileText className="w-4 h-4" />}
                  {activeModal === 'privacy_rgpd' && <Lock className="w-4 h-4" />}
                  {activeModal === 'legal_notices' && <Scale className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-anybody font-black text-lg uppercase tracking-tight text-white sport-skew">
                    {activeModal === 'cgu_roi' && 'Règlement d’Ordre Intérieur (ROI) & CGU'}
                    {activeModal === 'privacy_rgpd' && 'Politique de Confidentialité & RGPD'}
                    {activeModal === 'legal_notices' && 'Mentions Légales ASBL'}
                  </h3>
                  <p className="text-[10px] text-primary">{CLUB_CONFIG.name} • BCE {CLUB_CONFIG.bce}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded hover:bg-surface text-foreground/50 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu spécifique du document sélectionné */}
            {activeModal === 'cgu_roi' && (
              <div className="space-y-4 font-sans text-xs text-foreground/90 leading-relaxed">
                <div className="p-3 rounded-lg bg-[#181818] border border-[#2c2c2c] space-y-1 font-mono text-[11px]">
                  <p><strong>Association :</strong> {CLUB_CONFIG.name}</p>
                  <p><strong>Siège social :</strong> {CLUB_CONFIG.address.full}</p>
                  <p><strong>Affiliation fédérale :</strong> {CLUB_CONFIG.affiliation.name}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    Article 1 — Accès aux Pistes & Infrastructures
                  </h4>
                  <p>
                    L'accès aux tracés (Astro 1/10, Crawler / Scale, Multi 1/8, Vintage) et aux infrastructures du club est strictement subordonné à l'adhésion annuelle en règle ou à l'acquittement d'un pass journalier (One Day).
                  </p>

                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    Article 2 — Enregistrement Obligatoire & Couverture Assurance FBA
                  </h4>
                  <p>
                    Pour bénéficier de la couverture d'assurance responsabilité civile et corporelle de la {CLUB_CONFIG.affiliation.name}, chaque pilote (adhérent ou visiteur) a l'obligation légale de s'enregistrer via le module de check-in de l'application à chaque session de roulage.
                  </p>

                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    Article 3 — Sécurité, Bruit & Motorisations
                  </h4>
                  <p>
                    Sont admis exclusivement les modèles réduits radiocommandés conformes aux normes techniques et sonores fédérales FBA. Le port du gilet haute visibilité est obligatoire lors du ramassage sur piste.
                  </p>

                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    Article 4 — Cadenas d'Accès & Clés
                  </h4>
                  <p>
                    Les détenteurs de clés ou de codes d'accès s'engagent personnellement à ne pas les divulguer et à reverrouiller systématiquement le cadenas d'entrée ainsi que les tableaux électriques lors de la fermeture des installations.
                  </p>
                </div>
              </div>
            )}

            {activeModal === 'privacy_rgpd' && (
              <div className="space-y-4 font-sans text-xs text-foreground/90 leading-relaxed">
                <div className="p-3 rounded-lg bg-[#181818] border border-[#2c2c2c] space-y-1 font-mono text-[11px]">
                  <p><strong>Responsable de Traitement :</strong> {CLUB_CONFIG.name}</p>
                  <p><strong>N° BCE :</strong> {CLUB_CONFIG.bce} • {CLUB_CONFIG.rpm}</p>
                  <p><strong>Délégué / Contact RGPD :</strong> {CLUB_CONFIG.contact.email} / {CLUB_CONFIG.contact.phone}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    1. Finalités du Traitement des Données
                  </h4>
                  <p>
                    Les données à caractère personnel collectées (nom, prénom, coordonnées, date de naissance, numéro de licence FBA, historique des présences) sont traitées pour la gestion des affiliations, l'établissement du registre légal de présence exigé par l'assureur FBA, et l'organisation des courses et assemblées générales.
                  </p>

                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    2. Durée de Conservation & Sécurité
                  </h4>
                  <p>
                    Les données administratives sont conservées pendant la durée de l'adhésion augmentée des délais légaux de prescription comptable et d'assurance (5 ans). La base de données est hébergée sur des infrastructures sécurisées chiffrées (Supabase / PostgreSQL) avec contrôle d'accès strict (RLS).
                  </p>

                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    3. Vos Droits (RGPD / APD Belgique)
                  </h4>
                  <p>
                    Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression de vos données, ainsi que du droit d'introduire une réclamation auprès de l'Autorité de Protection des Données (APD Belgique). Pour toute demande : <strong>{CLUB_CONFIG.contact.email}</strong>.
                  </p>
                </div>
              </div>
            )}

            {activeModal === 'legal_notices' && (
              <div className="space-y-4 font-sans text-xs text-foreground/90 leading-relaxed">
                <div className="space-y-3">
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    Éditeur & Organe d'Administration
                  </h4>
                  <ul className="space-y-1 font-mono text-[11px] bg-[#181818] p-3 rounded-lg border border-[#2c2c2c]">
                    <li><strong>Dénomination :</strong> {CLUB_CONFIG.name}</li>
                    <li><strong>Forme juridique :</strong> {CLUB_CONFIG.legalForm} de droit belge</li>
                    <li><strong>Date de constitution :</strong> Fondée en {CLUB_CONFIG.foundationYear}</li>
                    <li><strong>Numéro d'Entreprise BCE :</strong> {CLUB_CONFIG.bce}</li>
                    <li><strong>Registre des Personnes Morales :</strong> {CLUB_CONFIG.rpm}</li>
                    <li><strong>Siège Social :</strong> {CLUB_CONFIG.address.full}</li>
                    <li><strong>Téléphone légal :</strong> {CLUB_CONFIG.contact.phone}</li>
                    <li><strong>Email officiel :</strong> {CLUB_CONFIG.contact.email}</li>
                  </ul>

                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    Affiliation & Fédération
                  </h4>
                  <p>
                    Le club est affilié à la {CLUB_CONFIG.affiliation.name}, organisme national régissant la pratique de l'automodélisme radiocommandé en Belgique.
                  </p>

                  <h4 className="font-bold text-white uppercase font-mono text-[11px] border-b border-[#282828] pb-1">
                    Propriété Intellectuelle & Hébergement
                  </h4>
                  <p>
                    L'ensemble des contenus, marques, logos et applications logicielles de la plateforme SBC sont la propriété exclusive de l'ASBL {CLUB_CONFIG.shortName}. Hébergement cloud sécurisé conforme RGPD.
                  </p>
                </div>
              </div>
            )}

            {/* Footer de la modale */}
            <div className="pt-3 border-t border-[#2c2c2c] flex items-center justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded bg-primary text-black font-anybody font-black uppercase text-xs sport-skew cursor-pointer"
              >
                <span className="transform skew-x-8">Fermer la lecture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
