# GARDE-FOUS IA, QUALITÉ DU CODE & DETTE TECHNIQUE

## 1. Anti-Duplication & Refactoring (DRY & Single Source of Truth)
Pour éviter la prolifération de code dupliqué ou incohérent généré par l'IA :
- **Recherche préalable obligatoire** : Avant de créer tout composant UI, hook, utilitaire ou schéma Zod, l'IA doit vérifier s'il existe déjà dans les dossiers partagés (`src/components/ui/`, `src/hooks/`, `src/lib/`).
- **Composants atomiques** : Aucun composant métier ne doit réimplémenter des éléments d'interface basiques (boutons, modales, inputs, cartes). L'utilisation de la bibliothèque de composants partagés (`src/components/ui/`) est obligatoire.
- **Cycle de refactoring léger** : À la fin de chaque fonctionnalité, consacrer une passe systématique au nettoyage du code inutile, à la suppression des `console.log` et à la centralisation des fonctions répétées.
- **Sécurité des Refactorings (Rollback Rapide)** : Tout refactoring ou nettoyage de dette technique doit impérativement se faire sur une branche Git dédiée (ou via un commit atomique isolé). En cas de régression ou de bug bloquant après 2 essais de correction par l'IA, interdiction d'insister : on fait un `git reset` / `git revert` immédiat pour revenir à l'état stable sans perdre de temps.

---

## 2. Processus d'Audit IA (Red Team & Auto-Correction)
En l'absence de relecture par un développeur humain senior, la validation de sécurité est déléguée à un processus d'audit croisé :
- **Prompt d'Audit Obligatoire (Avant Merge / PR)** : Tout code gérant des données sensibles, des API routes, des Webhooks ou des droits d'accès doit être soumis à une passe d'audit dédiée avec le prompt suivant :
  > *"Joue le rôle d'un auditeur de sécurité Red Team. Analyse ce code et identifie au moins 3 failles potentielles concernant : 1) La fuite de données personnelles ou l'usurpation d'identité membre, 2) Le contournement de la validation Zod ou RLS, 3) Les injections ou failles XSS. Propose la correction minimale nécessaire pour chaque point."*
- **Contrôle strict des Webhooks & API** :
  - Validation obligatoire de la signature des Webhooks (Stripe, Resend).
  - Interdiction d'exposer des clés secrètes ou des données privées dans les réponses API (`DEFAULT DENY` sur la sélection de champs SQL/Supabase).

---

## 3. Stratégie de Tests Automatisés Critiques
Pour garantir la stabilité du MVP sans perdre de temps sur des tests futiles, les tests écrits par l'IA doivent se concentrer uniquement sur les risques vitaux :
- **Tests d'Étanchéité des Rôles (Sécurité RLS)** :
  - Rédiger des tests automatisés (Vitest) simulant une tentative d'accès ou modification des données du Membre A par le Membre B.
  - Le test *doit* échouer (erreur ou tableau vide) pour être validé.
- **Tests des Flux Critiques & Actions Admin** :
  - Vérifier par test que seul un `Admin ASBL` peut valider des cotisations, créer des courses ou des événements.
  - Vérifier qu'un `Membre ASBL` ne peut pas accéder aux routes ou Server Actions réservées aux administrateurs.