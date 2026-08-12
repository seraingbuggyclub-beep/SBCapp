# Règles de Développement — Modules Métiers SBC App

## 1. Vision & Isolation
- **Rôle :** Fonctionnalités métiers dédiées à l'ASBL (Membres, Admin ASBL, Courses/Events).
- **Sécurité Base de Données :** Application systématique du **RLS** (Row Level Security) sur toutes les tables pour garantir l'étanchéité et le respect des rôles (ex: un membre ne peut modifier que ses propres données, l'accès admin est protégé).

## 2. Découpage Modulaire & Performance
- **Modules autonomes :** Chaque fonctionnalité (membres, administration, courses/événements) est cloisonnée sous `src/modules/`.
- **Rendu :** Priorité aux Server Components pour des temps de chargement ultrarapides.

## 3. Conventions de Nommage — Modules & Widgets
- **Modules Métiers :**
  - Dossier dans `src/modules/` (ex: `src/modules/membres`, `src/modules/events`).
  - Composant racine du module : `[Nom]Module.tsx` (ex: `MembresModule.tsx`, `EventsModule.tsx`).
- **Widgets du Dashboard :**
  - Tout composant destiné à s'insérer sur le Dashboard central doit obligatoirement se terminer par `Widget.tsx` (ex: `DerniersInscritsWidget.tsx`).
  - Emplacement obligatoire : `src/modules/[nom]/components/widgets/`.

## 4. Workflow de Validation Étape par Étape
1. Validation de la structure des données et types TypeScript du module (`src/types/database.types.ts`).
2. Construction de l'interface UI (Tailwind CSS + Lucide Icons + GSAP).
3. Connexion à la base de données avec RLS.
4. Validation fonctionnelle complète avant passage au module suivant.
