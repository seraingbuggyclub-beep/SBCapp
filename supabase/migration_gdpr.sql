-- =========================================================================
-- MODULE RGPD & CONFORMITÉ APD (BELGIQUE) - SBC
-- =========================================================================

-- 1. Ajout des colonnes de consentement et de désinscription sur sbc_members
ALTER TABLE sbc_members
    ADD COLUMN IF NOT EXISTS consent_email_club_news boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS consent_email_events boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS consent_image_rights boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS consent_whatsapp_group boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS consent_updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_members_unsub_token ON sbc_members(unsubscribe_token);

-- 2. Table du Registre des Activités de Traitement (Article 30 RGPD / APD Belgique)
CREATE TABLE IF NOT EXISTS gdpr_processing_register (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_name text NOT NULL,
    purpose text NOT NULL,
    legal_basis text NOT NULL,
    data_categories text NOT NULL,
    retention_period text NOT NULL,
    recipients text NOT NULL,
    security_measures text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gdpr_processing_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture registre traitements par tous ou admins" ON gdpr_processing_register;
CREATE POLICY "Lecture registre traitements par tous ou admins" ON gdpr_processing_register FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestion registre traitements par admins" ON gdpr_processing_register;
CREATE POLICY "Gestion registre traitements par admins" ON gdpr_processing_register FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- 3. Table des journaux d'envoi d'emails sécurisés (Admin Shield)
CREATE TABLE IF NOT EXISTS email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    subject text NOT NULL,
    category text NOT NULL CHECK (category IN ('CLUB_NEWS', 'EVENTS', 'URGENT_INFO')),
    recipients_count int NOT NULL DEFAULT 0,
    sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion journaux emails par admins" ON email_logs;
CREATE POLICY "Gestion journaux emails par admins" ON email_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- 4. Amorçage des 5 activités de traitement officielles ASBL (Art. 30)
INSERT INTO gdpr_processing_register (activity_name, purpose, legal_basis, data_categories, retention_period, recipients, security_measures)
SELECT
    'Gestion des adhésions & cotisations',
    'Gestion administrative des membres, perception des cotisations statutaires, délivrance du code cadenas et validation des droits d''accès au complexe RC.',
    'Contrat d''adhésion ASBL & Obligation légale (Loi ASBL belge)',
    'Nom, prénom, email, téléphone, adresse postale, date de naissance, statut de cotisation, mode de règlement.',
    'Durée de l''adhésion + 7 ans (obligations légales comptables et fiscales belges).',
    'Comité de gestion du SBC, Réviseurs aux comptes de l''AG.',
    'Chiffrement en transit (TLS 1.3), Row Level Security (RLS) PostgreSQL, accès strictement réservé aux administrateurs avec audit trail.'
WHERE NOT EXISTS (SELECT 1 FROM gdpr_processing_register WHERE activity_name = 'Gestion des adhésions & cotisations');

INSERT INTO gdpr_processing_register (activity_name, purpose, legal_basis, data_categories, retention_period, recipients, security_measures)
SELECT
    'Registre officiel de présence FBA & Assurances',
    'Émargement horodaté des pilotes présents sur les pistes pour activation de la couverture assurance responsabilité civile et individuelle accident.',
    'Obligation légale & Intérêt légitime (Couverture des sinistres sportifs)',
    'Identité du pilote, numéro de licence FBA, horodatages d''entrée/sortie, piste utilisée.',
    '3 ans après la fin de la saison sportive (délai de prescription des déclarations d''accident).',
    'Administrateurs SBC, Fédération Belge d''Automodélisme (FBA), Compagnie d''assurance en cas de sinistre.',
    'Horodatage serveur certifié, contrôle d''accès RBAC, restriction RLS par utilisateur.'
WHERE NOT EXISTS (SELECT 1 FROM gdpr_processing_register WHERE activity_name = 'Registre officiel de présence FBA & Assurances');

INSERT INTO gdpr_processing_register (activity_name, purpose, legal_basis, data_categories, retention_period, recipients, security_measures)
SELECT
    'Module Buvette, POS & Portefeuilles prépayés',
    'Gestion des ventes de boissons/snacks, gestion des soldes prépayés des membres et suivi des ardoises de consommation.',
    'Exécution du service & Intérêt légitime de gestion interne',
    'Identifiant membre, historique des consommations, soldes créditeurs/débiteurs, tickets de caisse.',
    '3 ans après la clôture de l''exercice comptable.',
    'Responsables de caisse SBC, Trésorier.',
    'Isolation des données de paiement, validation sécurisée par QR code, masquage des données sensibles.'
WHERE NOT EXISTS (SELECT 1 FROM gdpr_processing_register WHERE activity_name = 'Module Buvette, POS & Portefeuilles prépayés');

INSERT INTO gdpr_processing_register (activity_name, purpose, legal_basis, data_categories, retention_period, recipients, security_measures)
SELECT
    'Communications du Club & Annonces de Courses',
    'Information des membres sur la vie du club, convocations aux Assemblées Générales, calendrier des courses et journées d''entretien des pistes.',
    'Consentement explicite (Opt-in) & Intérêt légitime statutaire',
    'Adresse email, nom, préférences de notification, journaux de consentement.',
    'Jusqu''au retrait du consentement ou fin d''adhésion.',
    'Membres inscrits uniquement via envoi individualisé sans divulgation d''adresses.',
    'Système Anti-fuite d''adresses (BCC / envoi individuel), lien de désinscription unique en 1 clic (Opt-out).'
WHERE NOT EXISTS (SELECT 1 FROM gdpr_processing_register WHERE activity_name = 'Communications du Club & Annonces de Courses');

INSERT INTO gdpr_processing_register (activity_name, purpose, legal_basis, data_categories, retention_period, recipients, security_measures)
SELECT
    'Droit à l''image & Publications Médias',
    'Valorisation des activités du club, publication des photos et vidéos des courses et podiums sur le site web et les réseaux sociaux.',
    'Consentement libre et explicite',
    'Photographies, vidéos de courses et remises de prix, nom/prénom des lauréats.',
    'Durée de diffusion ou jusqu''à demande de retrait par le membre.',
    'Public général, visiteurs du site web, communauté des réseaux sociaux.',
    'Recueil préalable du consentement lors de l''inscription, possibilité de retrait immédiat à tout moment depuis le centre de confidentialité.'
WHERE NOT EXISTS (SELECT 1 FROM gdpr_processing_register WHERE activity_name = 'Droit à l''image & Publications Médias');
