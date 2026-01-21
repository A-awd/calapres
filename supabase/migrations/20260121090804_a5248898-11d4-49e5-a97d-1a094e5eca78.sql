-- Fix overly permissive RLS policies

-- 1. abandoned_carts: Service role policy uses true - this is intentional for service role access
-- Keep as is since service role needs full access for background jobs

-- 2. email_events: Service role INSERT with true - this is intentional for edge functions
-- Keep as is since edge functions need to insert events

-- The remaining policies are SELECT with true which is acceptable for public read access
-- No changes needed for bundle_items and product_occasions as they are public catalog data