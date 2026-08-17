-- =========================================================================
-- MODULE BUVETTE, POS TACTILE & GESTION DE STOCKS (SBC)
-- =========================================================================

-- 1. Extension de la table des membres pour les portefeuilles et ardoises
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS wallet_balance numeric(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS tab_balance numeric(10,2) NOT NULL DEFAULT 0.00;

-- 2. Catégories de la Buvette
CREATE TABLE IF NOT EXISTS bar_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 3. Articles de la Buvette
CREATE TABLE IF NOT EXISTS bar_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES bar_categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    selling_price numeric(10,2) NOT NULL,
    cost_price numeric(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity integer NOT NULL DEFAULT 0,
    alert_threshold integer NOT NULL DEFAULT 10,
    is_active boolean NOT NULL DEFAULT true,
    image_url text,
    updated_at timestamptz DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_bar_items_category ON bar_items(category_id);
CREATE INDEX IF NOT EXISTS idx_bar_items_is_active ON bar_items(is_active);

-- 4. Sessions de Caisse (POS Événements / Courses)
CREATE TABLE IF NOT EXISTS bar_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_by uuid NOT NULL REFERENCES sbc_members(id),
    opened_at timestamptz NOT NULL DEFAULT now(),
    opening_cash numeric(10,2) NOT NULL DEFAULT 0.00,
    closed_by uuid REFERENCES sbc_members(id),
    closed_at timestamptz,
    closing_cash_counted numeric(10,2),
    closing_cash_expected numeric(10,2),
    cash_difference numeric(10,2),
    status text NOT NULL CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    notes text
);

-- 5. Commandes & Ventes (POS et Libre-service)
CREATE TABLE IF NOT EXISTS bar_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES bar_sessions(id) ON DELETE SET NULL,
    buyer_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    seller_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    channel text NOT NULL CHECK (channel IN ('POS', 'SELF_SERVICE')) DEFAULT 'POS',
    total_amount numeric(10,2) NOT NULL DEFAULT 0.00,
    payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'PAYCONIQ', 'WALLET', 'TAB')),
    payment_status text NOT NULL CHECK (payment_status IN ('PAID', 'PENDING_TAB')) DEFAULT 'PAID',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les statistiques et requêtes
CREATE INDEX IF NOT EXISTS idx_bar_orders_session ON bar_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_bar_orders_buyer ON bar_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bar_orders_created ON bar_orders(created_at);

-- 6. Lignes de Commande
CREATE TABLE IF NOT EXISTS bar_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES bar_orders(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES bar_items(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL
);

-- Index sur les lignes de commande
CREATE INDEX IF NOT EXISTS idx_bar_order_items_order ON bar_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_bar_order_items_item ON bar_order_items(item_id);

-- 7. Mouvements de Stock (Traçabilité complète)
CREATE TABLE IF NOT EXISTS bar_stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES bar_items(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('ENTRY', 'SALE_POS', 'SALE_SELF', 'LOSS', 'ADJUSTMENT')),
    quantity integer NOT NULL,
    cost_price_at_time numeric(10,2) NOT NULL DEFAULT 0.00,
    reason text,
    admin_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bar_stock_movements_item ON bar_stock_movements(item_id);

-- =========================================================================
-- DONNEES INITIALES (SEED)
-- =========================================================================

-- Insertion des Catégories
INSERT INTO bar_categories (id, name, display_order)
VALUES 
    ('11111111-1111-1111-1111-111111111101', 'Boissons fraîches', 1),
    ('11111111-1111-1111-1111-111111111102', 'Bières', 2),
    ('11111111-1111-1111-1111-111111111103', 'Snacks & Douceurs', 3),
    ('11111111-1111-1111-1111-111111111104', 'Chaud & Restauration', 4)
ON CONFLICT (name) DO NOTHING;

-- Insertion des Articles par défaut
INSERT INTO bar_items (category_id, name, selling_price, cost_price, stock_quantity, alert_threshold)
SELECT id, 'Coca-Cola 33cl', 2.00, 0.65, 48, 12 FROM bar_categories WHERE name = 'Boissons fraîches'
UNION ALL
SELECT id, 'Coca-Cola Zéro 33cl', 2.00, 0.65, 36, 12 FROM bar_categories WHERE name = 'Boissons fraîches'
UNION ALL
SELECT id, 'Fanta Orange 33cl', 2.00, 0.65, 24, 8 FROM bar_categories WHERE name = 'Boissons fraîches'
UNION ALL
SELECT id, 'Ice Tea Pêche 33cl', 2.00, 0.70, 24, 8 FROM bar_categories WHERE name = 'Boissons fraîches'
UNION ALL
SELECT id, 'Eau Plate (Chaudfontaine 50cl)', 1.50, 0.40, 48, 15 FROM bar_categories WHERE name = 'Boissons fraîches'
UNION ALL
SELECT id, 'Eau Pétillante 50cl', 1.50, 0.40, 36, 12 FROM bar_categories WHERE name = 'Boissons fraîches'
UNION ALL
SELECT id, 'Red Bull Energy 25cl', 3.00, 1.15, 24, 6 FROM bar_categories WHERE name = 'Boissons fraîches'
UNION ALL
SELECT id, 'Jupiler 33cl', 2.00, 0.75, 72, 24 FROM bar_categories WHERE name = 'Bières'
UNION ALL
SELECT id, 'Leffe Blonde 33cl', 3.50, 1.40, 36, 12 FROM bar_categories WHERE name = 'Bières'
UNION ALL
SELECT id, 'Duvel 33cl', 4.00, 1.65, 24, 8 FROM bar_categories WHERE name = 'Bières'
UNION ALL
SELECT id, 'Chips Paprika (Lays)', 1.50, 0.50, 30, 10 FROM bar_categories WHERE name = 'Snacks & Douceurs'
UNION ALL
SELECT id, 'Chips Sel (Lays)', 1.50, 0.50, 30, 10 FROM bar_categories WHERE name = 'Snacks & Douceurs'
UNION ALL
SELECT id, 'Snickers / Mars / Twix', 1.50, 0.55, 36, 12 FROM bar_categories WHERE name = 'Snacks & Douceurs'
UNION ALL
SELECT id, 'Gaufre de Liège artisanale', 2.00, 0.80, 20, 6 FROM bar_categories WHERE name = 'Snacks & Douceurs'
UNION ALL
SELECT id, 'Pain Saucisse / Hot-Dog', 4.50, 1.80, 25, 8 FROM bar_categories WHERE name = 'Chaud & Restauration'
UNION ALL
SELECT id, 'Croque-Monsieur', 3.50, 1.20, 20, 6 FROM bar_categories WHERE name = 'Chaud & Restauration'
UNION ALL
SELECT id, 'Café Expresso / Senseo', 1.50, 0.30, 60, 15 FROM bar_categories WHERE name = 'Chaud & Restauration'
ON CONFLICT DO NOTHING;

-- =========================================================================
-- POLITIQUES RLS (ROW LEVEL SECURITY)
-- =========================================================================

ALTER TABLE bar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_stock_movements ENABLE ROW LEVEL SECURITY;

-- Categories & Items : Tout le monde peut lire le catalogue
DROP POLICY IF EXISTS "Lecture publique des catégories bar" ON bar_categories;
CREATE POLICY "Lecture publique des catégories bar" ON bar_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestion catégories par les admins" ON bar_categories;
CREATE POLICY "Gestion catégories par les admins" ON bar_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Lecture publique des articles bar" ON bar_items;
CREATE POLICY "Lecture publique des articles bar" ON bar_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestion articles par les admins" ON bar_items;
CREATE POLICY "Gestion articles par les admins" ON bar_items FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- Sessions : Admins uniquement
DROP POLICY IF EXISTS "Gestion sessions bar par les admins" ON bar_sessions;
CREATE POLICY "Gestion sessions bar par les admins" ON bar_sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- Orders : Les membres peuvent créer des commandes libre-service et voir leurs propres commandes, admins voient tout
DROP POLICY IF EXISTS "Lecture commandes bar" ON bar_orders;
CREATE POLICY "Lecture commandes bar" ON bar_orders FOR SELECT USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Création commandes bar" ON bar_orders;
CREATE POLICY "Création commandes bar" ON bar_orders FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Gestion commandes par les admins" ON bar_orders;
CREATE POLICY "Gestion commandes par les admins" ON bar_orders FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- Order items : Lecture et insertion
DROP POLICY IF EXISTS "Lecture lignes commandes bar" ON bar_order_items;
CREATE POLICY "Lecture lignes commandes bar" ON bar_order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertion lignes commandes bar" ON bar_order_items;
CREATE POLICY "Insertion lignes commandes bar" ON bar_order_items FOR INSERT WITH CHECK (true);

-- Stock movements : Admins uniquement
DROP POLICY IF EXISTS "Gestion mouvements stock bar par admins" ON bar_stock_movements;
CREATE POLICY "Gestion mouvements stock bar par admins" ON bar_stock_movements FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);
