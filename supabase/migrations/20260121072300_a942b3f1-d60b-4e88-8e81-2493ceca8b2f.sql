-- Create table for tracking abandoned carts
CREATE TABLE public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  cart_items JSONB NOT NULL DEFAULT '[]',
  cart_total NUMERIC NOT NULL DEFAULT 0,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_abandoned_carts_email ON public.abandoned_carts(email);
CREATE INDEX idx_abandoned_carts_user_id ON public.abandoned_carts(user_id);
CREATE INDEX idx_abandoned_carts_reminder_sent ON public.abandoned_carts(reminder_sent);
CREATE INDEX idx_abandoned_carts_created_at ON public.abandoned_carts(created_at);

-- Enable RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own abandoned carts
CREATE POLICY "Users can view own abandoned carts"
  ON public.abandoned_carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own abandoned carts"
  ON public.abandoned_carts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own abandoned carts"
  ON public.abandoned_carts FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all abandoned carts
CREATE POLICY "Admins can view all abandoned carts"
  ON public.abandoned_carts FOR SELECT
  USING (is_admin(auth.uid()));

-- Service role can manage all (for cron job)
CREATE POLICY "Service role can manage abandoned carts"
  ON public.abandoned_carts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_abandoned_carts_updated_at
  BEFORE UPDATE ON public.abandoned_carts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;