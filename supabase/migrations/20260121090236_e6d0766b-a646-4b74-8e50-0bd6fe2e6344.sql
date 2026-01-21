-- Create announcements table for the marquee bar
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  text_ar TEXT NOT NULL,
  icon TEXT DEFAULT 'sparkles',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active announcements
CREATE POLICY "Anyone can view active announcements"
ON public.announcements
FOR SELECT
USING (is_active = true);

-- Policy: Admins can manage announcements
CREATE POLICY "Admins can manage announcements"
ON public.announcements
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default announcements
INSERT INTO public.announcements (text, text_ar, icon, display_order) VALUES
('Fast delivery within 24 hours', 'توصيل سريع خلال 24 ساعة', 'truck', 1),
('Free shipping on orders over 500 SAR', 'شحن مجاني للطلبات فوق 500 ريال', 'gift', 2),
('Discounts up to 30%', 'خصومات تصل إلى 30%', 'percent', 3),
('Free gift wrapping', 'تغليف هدايا مجاني', 'package', 4),
('100% authentic products', 'منتجات أصلية 100%', 'shield-check', 5),
('Quality guarantee', 'ضمان الجودة', 'badge-check', 6),
('Secure payment', 'دفع آمن', 'lock', 7),
('Delivery to all regions', 'توصيل لجميع المناطق', 'map-pin', 8),
('24/7 customer service', 'خدمة عملاء على مدار الساعة', 'headphones', 9),
('Easy return within 14 days', 'إرجاع سهل خلال 14 يوم', 'rotate-ccw', 10),
('Exclusive offers for subscribers', 'عروض حصرية للمشتركين', 'star', 11);