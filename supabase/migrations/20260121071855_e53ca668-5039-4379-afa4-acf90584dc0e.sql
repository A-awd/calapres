-- Fix the security definer view issue by making it SECURITY INVOKER
DROP VIEW IF EXISTS public.email_stats;

CREATE OR REPLACE VIEW public.email_stats 
WITH (security_invoker = true) AS
SELECT 
  email_type,
  COUNT(*) FILTER (WHERE event_type = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE event_type = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE event_type = 'opened') as opened_count,
  COUNT(*) FILTER (WHERE event_type = 'clicked') as clicked_count,
  COUNT(*) FILTER (WHERE event_type = 'bounced') as bounced_count,
  ROUND(
    (COUNT(*) FILTER (WHERE event_type = 'opened')::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'delivered'), 0) * 100), 2
  ) as open_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE event_type = 'clicked')::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'opened'), 0) * 100), 2
  ) as click_rate
FROM public.email_events
GROUP BY email_type;