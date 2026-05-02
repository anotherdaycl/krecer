-- =============================================
-- POSTPRO - Supabase Schema UPDATE for Flow.cl
-- Run this in SQL Editor (DESPUÉS del schema original)
-- =============================================

-- Agrega columna flow_order si no existe
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS flow_order TEXT DEFAULT '';

-- Las columnas de Stripe pueden quedar (no molestan)
-- stripe_customer_id y stripe_subscription_id simplemente no se usan
