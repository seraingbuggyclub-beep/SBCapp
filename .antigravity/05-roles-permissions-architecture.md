# ARCHITECTURE DES RÔLES & PERMISSIONS (RBAC & SBC APP)

## 1. Principe Général : Sécurité d'une Application Standalone
L'architecture de sécurité de SBC App repose sur des contrôles d'accès basés sur les rôles (RBAC) au niveau de l'application unique. La protection des données est assurée directement dans la base de données via le RLS (Row Level Security) de Supabase en vérifiant l'identité et le rôle de l'utilisateur.

---

## 2. Rôles SBC App

### 2.1. Admin ASBL (Gestionnaire)
- **Accès** : Complet sur l'administration de l'application.
- **Périmètre** : Gestion de la base des membres, validation et suivi des cotisations/paiements, création et paramétrage des courses/événements, gestion des inscriptions globales, accès aux tableaux de bord financiers et de statistiques de l'ASBL.

### 2.2. Membre ASBL (Utilisateur connecté)
- **Accès** : Restreint à son espace personnel.
- **Périmètre** : Gestion de ses informations de profil, consultation de son statut de cotisation, inscription et paiement à des courses ou événements, consultation de l'historique de ses résultats et performances.
- **Sécurité** : Ne peut en aucun cas lire ou modifier les données personnelles ou financières des autres membres.

### 2.3. Visiteur / Public (Non connecté)
- **Accès** : Vues publiques exclusivement.
- **Périmètre** : Consultation de la vitrine de l'ASBL, calendrier public des événements/courses, résultats publics des compétitions passées, et formulaires de contact ou de demande d'adhésion.

---

## 3. Règles d'Implémentation Technique (Supabase / RLS)
1. **Isolation par RLS** : Toutes les requêtes SQL sur les données personnelles ou d'administration doivent vérifier l'identité de l'utilisateur via `auth.uid()`.
2. **Vérification des Rôles** : Le RLS doit valider le rôle de l'utilisateur (ex: via une fonction personnalisée vérifiant si l'utilisateur est marqué comme administrateur dans une table `profiles` ou `members`).
3. **Principe du Moindre Privilège** : Aucun accès n'est accordé par défaut (`DEFAULT DENY`).
4. **Sécurisation des Actions Admin** : Les Server Actions critiques doivent systématiquement vérifier côté serveur le rôle administrateur de l'utilisateur avant d'exécuter une mutation.