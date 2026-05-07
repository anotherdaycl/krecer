-- Tabla de códigos promocionales
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL,  -- % o monto en CLP
  max_uses INTEGER DEFAULT 1,       -- null = usos ilimitados
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,           -- null = sin vencimiento
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de usos (evita que el mismo usuario use el mismo código dos veces)
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
  user_id UUID NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id)
);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Solo el service role puede leer/escribir (validación server-side)
CREATE POLICY "Service role only" ON promo_codes
  USING (false);

CREATE POLICY "Service role only" ON promo_code_uses
  USING (false);

-- =============================================
-- EJEMPLOS DE CÓDIGOS PARA INSERTAR
-- Edita los valores según tus necesidades
-- =============================================

-- 50% de descuento, uso único
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses)
VALUES ('KREATI50', 'percent', 50, 1);

-- $5.000 CLP de descuento, uso único
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses)
VALUES ('BIENVENIDA', 'fixed', 5000, 1);

-- 100% de descuento (gratis), uso único por usuario
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses)
VALUES ('GRATIS100', 'percent', 100, 1);

-- 20% de descuento, hasta 10 usos
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses)
VALUES ('PROMO20', 'percent', 20, 10);
