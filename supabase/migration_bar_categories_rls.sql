-- ==============================================================================
-- MIGRATION CONSOLIDÉE : Tables, RLS et Catégories du Module Buvette & Stocks
-- ==============================================================================

-- 1. Extension sbc_members pour portefeuille & ardoise buvette
ALTER TABLE public.sbc_members ADD COLUMN IF NOT EXISTS wallet_balance numeric(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.sbc_members ADD COLUMN IF NOT EXISTS tab_balance numeric(10,2) NOT NULL DEFAULT 0.00;

-- 2. Table des Catégories
CREATE TABLE IF NOT EXISTS public.bar_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 3. Table des Articles
CREATE TABLE IF NOT EXISTS public.bar_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES public.bar_categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    selling_price numeric(10,2) NOT NULL,
    cost_price numeric(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity integer NOT NULL DEFAULT 0,
    alert_threshold integer NOT NULL DEFAULT 10,
    is_active boolean NOT NULL DEFAULT true,
    image_url text,
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bar_items_category ON public.bar_items(category_id);
CREATE INDEX IF NOT EXISTS idx_bar_items_is_active ON public.bar_items(is_active);

-- 4. Sessions de Caisse
CREATE TABLE IF NOT EXISTS public.bar_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_by uuid NOT NULL REFERENCES public.sbc_members(id),
    opened_at timestamptz NOT NULL DEFAULT now(),
    opening_cash numeric(10,2) NOT NULL DEFAULT 0.00,
    closed_by uuid REFERENCES public.sbc_members(id),
    closed_at timestamptz,
    closing_cash_counted numeric(10,2),
    closing_cash_expected numeric(10,2),
    cash_difference numeric(10,2),
    status text NOT NULL CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    notes text
);

-- 5. Commandes
CREATE TABLE IF NOT EXISTS public.bar_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.bar_sessions(id) ON DELETE SET NULL,
    buyer_id uuid REFERENCES public.sbc_members(id) ON DELETE SET NULL,
    seller_id uuid REFERENCES public.sbc_members(id) ON DELETE SET NULL,
    channel text NOT NULL CHECK (channel IN ('POS', 'SELF_SERVICE')) DEFAULT 'POS',
    total_amount numeric(10,2) NOT NULL DEFAULT 0.00,
    payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'PAYCONIQ', 'WALLET', 'TAB')),
    payment_status text NOT NULL CHECK (payment_status IN ('PAID', 'PENDING_TAB')) DEFAULT 'PAID',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Lignes de Commande
CREATE TABLE IF NOT EXISTS public.bar_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.bar_orders(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.bar_items(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL
);

-- 7. Mouvements de Stock
CREATE TABLE IF NOT EXISTS public.bar_stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.bar_items(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('ENTRY', 'SALE_POS', 'SALE_SELF', 'LOSS', 'ADJUSTMENT')),
    quantity integer NOT NULL,
    cost_price_at_time numeric(10,2) NOT NULL DEFAULT 0.00,
    reason text,
    admin_id uuid REFERENCES public.sbc_members(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Insertion des catégories prédéfinies
INSERT INTO public.bar_categories (name, display_order)
VALUES
    ('Boissons', 1),
    ('Snacks', 2),
    ('Restauration', 3),
    ('Divers', 4)
ON CONFLICT (name) DO NOTHING;

-- 9. Activation du Row Level Security (RLS)
ALTER TABLE public.bar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_stock_movements ENABLE ROW LEVEL SECURITY;

-- 10. Politiques RLS pour bar_categories
DROP POLICY IF EXISTS "Lecture publique des catégories bar" ON public.bar_categories;
CREATE POLICY "Lecture publique des catégories bar" 
ON public.bar_categories FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Gestion catégories par les admins" ON public.bar_categories;
CREATE POLICY "Gestion catégories par les admins" 
ON public.bar_categories FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.sbc_members 
        WHERE public.sbc_members.id = auth.uid() 
        AND (
            public.sbc_members.role::text = 'admin'
            OR public.sbc_members.email = 'stefga1@gmail.com'
            OR (
                public.sbc_members.role::text = 'referent' 
                AND (public.sbc_members.referent_permissions->>'can_manage_bar')::boolean = true
            )
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sbc_members 
        WHERE public.sbc_members.id = auth.uid() 
        AND (
            public.sbc_members.role::text = 'admin'
            OR public.sbc_members.email = 'stefga1@gmail.com'
            OR (
                public.sbc_members.role::text = 'referent' 
                AND (public.sbc_members.referent_permissions->>'can_manage_bar')::boolean = true
            )
        )
    )
);

-- 11. Politiques RLS pour bar_items
DROP POLICY IF EXISTS "Lecture publique des articles bar" ON public.bar_items;
CREATE POLICY "Lecture publique des articles bar" 
ON public.bar_items FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Gestion articles par les admins" ON public.bar_items;
CREATE POLICY "Gestion articles par les admins" 
ON public.bar_items FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.sbc_members 
        WHERE public.sbc_members.id = auth.uid() 
        AND (
            public.sbc_members.role::text = 'admin'
            OR public.sbc_members.email = 'stefga1@gmail.com'
            OR (
                public.sbc_members.role::text = 'referent' 
                AND (public.sbc_members.referent_permissions->>'can_manage_bar')::boolean = true
            )
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sbc_members 
        WHERE public.sbc_members.id = auth.uid() 
        AND (
            public.sbc_members.role::text = 'admin'
            OR public.sbc_members.email = 'stefga1@gmail.com'
            OR (
                public.sbc_members.role::text = 'referent' 
                AND (public.sbc_members.referent_permissions->>'can_manage_bar')::boolean = true
            )
        )
    )
);

-- 12. Politiques RLS pour les autres tables de buvette
DROP POLICY IF EXISTS "Gestion sessions bar par les admins" ON public.bar_sessions;
CREATE POLICY "Gestion sessions bar par les admins" 
ON public.bar_sessions FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.sbc_members 
        WHERE public.sbc_members.id = auth.uid() 
        AND (
            public.sbc_members.role::text = 'admin'
            OR public.sbc_members.email = 'stefga1@gmail.com'
            OR (
                public.sbc_members.role::text = 'referent' 
                AND (public.sbc_members.referent_permissions->>'can_manage_bar')::boolean = true
            )
        )
    )
);

DROP POLICY IF EXISTS "Lecture commandes bar" ON public.bar_orders;
CREATE POLICY "Lecture commandes bar" 
ON public.bar_orders FOR SELECT 
USING (
    buyer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.sbc_members 
        WHERE public.sbc_members.id = auth.uid() 
        AND (
            public.sbc_members.role::text = 'admin'
            OR public.sbc_members.email = 'stefga1@gmail.com'
            OR public.sbc_members.role::text = 'referent'
        )
    )
);

DROP POLICY IF EXISTS "Création commandes bar" ON public.bar_orders;
CREATE POLICY "Création commandes bar" 
ON public.bar_orders FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Lecture lignes commandes bar" ON public.bar_order_items;
CREATE POLICY "Lecture lignes commandes bar" 
ON public.bar_order_items FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Insertion lignes commandes bar" ON public.bar_order_items;
CREATE POLICY "Insertion lignes commandes bar" 
ON public.bar_order_items FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion mouvements stock bar" ON public.bar_stock_movements;
CREATE POLICY "Gestion mouvements stock bar" 
ON public.bar_stock_movements FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.sbc_members 
        WHERE public.sbc_members.id = auth.uid() 
        AND (
            public.sbc_members.role::text = 'admin'
            OR public.sbc_members.email = 'stefga1@gmail.com'
            OR (
                public.sbc_members.role::text = 'referent' 
                AND (public.sbc_members.referent_permissions->>'can_manage_bar')::boolean = true
            )
        )
    )
);
