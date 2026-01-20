-- Create occasion reminders table for registered customers
CREATE TABLE public.occasion_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  occasion_date DATE NOT NULL,
  reminder_days_before INTEGER NOT NULL DEFAULT 3,
  occasion_type TEXT,
  recipient_name TEXT,
  notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_reminded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.occasion_reminders ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own reminders
CREATE POLICY "Users can view own reminders"
ON public.occasion_reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
ON public.occasion_reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
ON public.occasion_reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
ON public.occasion_reminders FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_occasion_reminders_updated_at
BEFORE UPDATE ON public.occasion_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create gift boxes table for custom bundle builder
CREATE TABLE public.gift_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  price NUMERIC NOT NULL,
  image TEXT,
  max_items INTEGER NOT NULL DEFAULT 5,
  dimensions TEXT,
  dimensions_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gift boxes"
ON public.gift_boxes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage gift boxes"
ON public.gift_boxes FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create gift items for bundle builder (different from products)
CREATE TABLE public.gift_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  category_ar TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gift items"
ON public.gift_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage gift items"
ON public.gift_items FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create gift wraps table
CREATE TABLE public.gift_wraps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_wraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gift wraps"
ON public.gift_wraps FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage gift wraps"
ON public.gift_wraps FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create ribbons table
CREATE TABLE public.ribbons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price NUMERIC NOT NULL,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ribbons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ribbons"
ON public.ribbons FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage ribbons"
ON public.ribbons FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Insert sample data for gift boxes
INSERT INTO public.gift_boxes (name, name_ar, size, price, max_items, dimensions, dimensions_ar) VALUES
('Small Gift Box', 'بوكس هدايا صغير', 'small', 25, 3, '15x15x10 cm', '15×15×10 سم'),
('Medium Gift Box', 'بوكس هدايا متوسط', 'medium', 45, 5, '25x25x15 cm', '25×25×15 سم'),
('Large Gift Box', 'بوكس هدايا كبير', 'large', 75, 8, '35x35x20 cm', '35×35×20 سم');

-- Insert sample gift items
INSERT INTO public.gift_items (name, name_ar, category, category_ar, price) VALUES
('Scented Candle', 'شمعة معطرة', 'Candles', 'شموع', 35),
('Mini Perfume', 'عطر مصغر', 'Perfumes', 'عطور', 55),
('Premium Chocolate', 'شوكولاتة فاخرة', 'Chocolates', 'شوكولاتة', 45),
('Luxury Dates', 'تمور فاخرة', 'Dates', 'تمور', 40),
('Coffee Set', 'طقم قهوة', 'Coffee', 'قهوة', 65),
('Mini Plant', 'نبتة صغيرة', 'Plants', 'نباتات', 30),
('Mug', 'كوب', 'Accessories', 'إكسسوارات', 25),
('Notebook', 'دفتر', 'Stationery', 'قرطاسية', 20);

-- Insert sample gift wraps
INSERT INTO public.gift_wraps (name, name_ar, price, color) VALUES
('Classic White', 'أبيض كلاسيكي', 15, '#FFFFFF'),
('Rose Gold', 'روز قولد', 20, '#B76E79'),
('Midnight Black', 'أسود', 20, '#1A1A1A'),
('Blush Pink', 'وردي فاتح', 18, '#FFC0CB'),
('Forest Green', 'أخضر غامق', 18, '#228B22');

-- Insert sample ribbons
INSERT INTO public.ribbons (name, name_ar, price, color) VALUES
('Gold Satin', 'ساتان ذهبي', 10, '#FFD700'),
('Silver Satin', 'ساتان فضي', 10, '#C0C0C0'),
('Red Velvet', 'مخمل أحمر', 12, '#8B0000'),
('White Organza', 'أورجانزا أبيض', 8, '#FFFAFA'),
('Pink Grosgrain', 'جروسجرين وردي', 10, '#FF69B4');