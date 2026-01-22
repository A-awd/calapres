-- Add speed setting to announcements system
CREATE TABLE IF NOT EXISTS public.announcement_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcement_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access for the storefront
CREATE POLICY "Anyone can read announcement settings"
ON public.announcement_settings
FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage announcement settings"
ON public.announcement_settings
FOR ALL
USING (public.is_admin(auth.uid()));

-- Insert default speed setting (60 seconds for full loop)
INSERT INTO public.announcement_settings (setting_key, setting_value)
VALUES ('marquee_speed', '60')
ON CONFLICT (setting_key) DO NOTHING;