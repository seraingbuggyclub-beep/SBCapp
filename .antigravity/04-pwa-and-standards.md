# Règles de Développement — PWA, Design & Standards

## 1. Ergonomie Mobile-First & Normes PWA
- **Approche Mobile-First :** Conçu d'abord pour smartphone, puis adapté aux grands écrans via breakpoints Tailwind (`md:`, `lg:`).
- **Zones tactiles :** Boutons et champs de formulaire d'au moins **44px x 44px** pour une utilisation au pouce.
- **Support PWA :** Présence d'un fichier `manifest.json` valide (`display: standalone`) et indicateur visuel de perte de connexion internet.

## 2. Standards de Communication Données (Data Fetching & Mutations)
- **Lecture :** Se fait **exclusivement** dans les *Server Components*.
- **Écriture / Modification :** Se fait **exclusivement** via des *Server Actions* Next.js.
- **Sécurisation par Wrapper :** Obligation d'utiliser un wrapper ou utilitaire configuré localement avec `next-safe-action` (ex: `src/lib/safe-action.ts`) pour envelopper toutes les Server Actions, garantissant la validation des entrées et la gestion des droits.
- **Typage des Retours :** Typage obligatoire de tous les retours de Server Actions au format strict `{ success: boolean, data?: T, error?: string }`.
- **Validation :** Toute *Server Action* doit valider les données reçues avec un schéma **Zod** (intégré via le wrapper).
- **Feedback :** Gestion obligatoire d'un état de chargement (*pending state*) et d'un *Toast* de confirmation/erreur dans l'UI.

## 3. Source de Vérité Base de Données (Anti-Hallucination DB)
- **Interdiction de typer manuellement :** Interdiction de créer manuellement des interfaces TS pour les tables Supabase.
- **Fichier de référence unique :** Seule source de vérité : `src/types/database.types.ts`.
- **Utilisation :** Importer systématiquement via `Tables<'nom_de_table'>` ou types générés.

## 4. Path Aliases & Clean Imports
- **Interdiction des chemins relatifs profonds (`../../..`).**
- **Alias unique obligatoire :**
  - Le seul alias autorisé est `@/*` pointant vers le dossier `src/*` (ex: `@/components/ui/*`, `@/modules/*`, `@/types/*`, `@/lib/*`, `@/hooks/*`).

## 5. Animations & Standards UI/UX (GSAP & UI/UX Pro Max)
- **Design (UI/UX Pro Max) :** Interfaces épurées, contrastes élevés, composants sobres.
- **Animations (GSAP) :**
  - Utiliser **GSAP** pour les micro-interactions et transitions complexes (durée recommandée : 0.2s à 0.4s).
  - Exécution côté client (`'use client'`) avec nettoyage via `useGSAP` ou `gsap.context()`.
