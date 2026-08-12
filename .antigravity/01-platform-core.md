# Règles de Développement — Socle Applicatif (SBC App)

## 1. Vision & Architecture
- **Rôle :** Application standalone pour la gestion de l'ASBL (SBC App).
- **Fonction :** Gérer les membres, l'administration de l'ASBL, les courses et événements sportifs.
- **Unification :** Il s'agit d'une application unique sans séparation de plateforme globale ou d'instances SaaS externes.
- **Code :** Fournir systématiquement le code **complet** des fichiers modifiés.

## 2. Stack Technique & Sécurité
- **Framework :** Next.js (App Router) + TypeScript (mode strict).
- **Base de données :** Supabase (tables métiers `members`, `events`, `registrations`, etc.).
- **Sécurité :** Contrôle d'accès basé sur les rôles (RBAC - Admin ASBL et Membres).
- **Validation :** Validation stricte de toutes les entrées avec **Zod**.

## 3. Conventions de Nommage — App Shell
- **App Shell (Structure globale) :**
  - Composant conteneur principal : `AppShell.tsx`
  - Composants de structure : `AppSidebar.tsx` (menu) et `AppHeader.tsx` (barre supérieure).
- **Format des fichiers :** `PascalCase` pour les composants React (`AppShell.tsx`), `kebab-case` pour les dossiers (`app-shell/`).
