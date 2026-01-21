-- Create table for tracking email events
CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_email_type ON public.email_events(email_type);
CREATE INDEX idx_email_events_created_at ON public.email_events(created_at DESC);
CREATE INDEX idx_email_events_order_id ON public.email_events(order_id);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all email events
CREATE POLICY "Admins can view email events"
  ON public.email_events FOR SELECT
  USING (is_admin(auth.uid()));

-- Allow insert from service role (webhook)
CREATE POLICY "Service role can insert email events"
  ON public.email_events FOR INSERT
  WITH CHECK (true);

-- Create aggregate view for email stats
CREATE OR REPLACE VIEW public.email_stats AS
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