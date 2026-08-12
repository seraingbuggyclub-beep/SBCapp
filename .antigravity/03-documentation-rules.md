# Règles de Documentation, Anti-Hallucination & Audit Tech

## 1. Règle d'Or Anti-Hallucination (Strict)

- **Interdiction d'inventer :** Si une variable, un nom de table, une clé API ou une structure de données n'est pas explicitement documentée ou présente dans le code, Antigravity **DOIT POSER LA QUESTION** au lieu d'inventer.
- **Lecture obligatoire :** Avant d'écrire ou modifier du code dans un module, Antigravity doit lire le fichier `README.md` du module et la structure des types TypeScript.

## 2. Intégration au Dashboard Principal (App Shell)

Chaque module doit documenter la façon dont il se greffe au Dashboard central :

- **Point d'entrée Menu :** Quel nom, quelle icône et quelle route (URL) le module ajoute au menu principal (`AppSidebar.tsx`).
- **Widgets de Bord :** Quels composants le module fournit pour la page d'accueil (ex: `DerniersInscritsWidget.tsx`).
- **Droits d'accès :** Quel rôle est nécessaire pour voir le module sur le Dashboard (Admin ASBL ou Membre).

## 3. Fiche Documentation du Module (`README.md`)

Chaque module dans `src/modules/` aura son fichier `README.md` structuré ainsi :

- **A. Rôle du Module :** Description courte de la valeur métier.
- **B. Connexion au Dashboard Principal :** Liens vers le menu principal et widgets exposés.
- **C. Contrat de Données & Base de Données :** Tables Supabase (noms exacts), règles RLS appliquées, types TypeScript référencés dans `src/types/database.types.ts`.
- **D. Variables d'Environnement (`.env`) :** Liste stricte des clés nécessaires (ex: Stripe, Resend).

## 4. Discipline & Confinement (Anti-Dérive v3.6)

- **Interdiction de créer de nouveaux fichiers ou composants** sauf demande explicite.
- **Refactoring sur l'existant uniquement :** Modifie exclusivement les fichiers ciblés sans toucher au design system (Tailwind / shadcn/ui).
- **Pas de doublons :** Réutilise ce qui existe (modules, hooks, fonctions).
- **Analyse préalable :** Explique ton intention avant d'écrire si la modification touche à la structure ou aux imports.

## 5. Audit de Validation

Auditer la demande selon 3 piliers avant toute validation :

- **Sécurité (Supabase/RLS) :** Politiques RLS respectées (étanchéité des rôles Admin/Membre), zéro secret exposé, validation des entrées via Zod.
- **Performance & Scalabilité (Next.js) :** Server Components en priorité, types générés automatiquement depuis Supabase, logique métier lourde déportée en fonctions SQL (`RPC`).
- **Propreté du code :** Responsabilité unique (DRY), code répété déporté dans `utils/` ou hooks. Pause requise si le code devient complexe.
- **Action obligatoire :** Signaler toute dette technique potentielle et proposer un refactoring immédiat.

## 6. Sécurité & Prévention d'Injections

- **Injection SQL :** Interdiction absolue de concaténer des variables dans les requêtes SQL. Utiliser uniquement le client Supabase (`.eq()`, `.in()`) ou `RPC` typés.
- **Injection de Code & XSS :** Traiter toutes les entrées utilisateurs comme non fiables via Zod/sanitisation. Jamais de `dangerouslySetInnerHTML` sans validation extrême.
- **Injection de Prompt (LLM/IA) :** Ne jamais injecter le contenu utilisateur directement dans le System Prompt (utiliser du Prompt Templating avec séparateurs).
- **Audit de Faille :** Bloquer la validation et corriger immédiatement toute faille potentielle détectée.

## 7. Gestion des Migrations Base de Données (Supabase)

- **Interdiction des exécutions SQL manuelles :** Toute modification de la structure de la base de données (création/modification de tables, colonnes, contraintes, types, fonctions, RLS, etc.) doit obligatoirement être effectuée via un fichier de migration SQL versionné.
- **Création de fichiers de migration :** Obligation de créer un fichier de migration versionné dans `supabase/migrations/` pour chaque modification.
- **Zéro SQL direct en console :** Interdiction absolue de modifier la base directement depuis la console Supabase ou l'éditeur SQL sans en enregistrer la migration dans le dépôt de code.
