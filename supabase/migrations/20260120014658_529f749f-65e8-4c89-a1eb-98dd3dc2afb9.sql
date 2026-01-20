-- إضافة أقسام جديدة
INSERT INTO public.categories (name, name_ar, slug, description, description_ar, display_order, is_active) VALUES
('Ready Boxes', 'بوكسات جاهزة', 'ready-boxes', 'Ready-made gift boxes for every occasion', 'بوكسات هدايا جاهزة لكل المناسبات', 7, true),
('Candles', 'شموع معطرة', 'candles', 'Premium scented candles', 'شموع فاخرة معطرة', 8, true),
('Incense', 'بخور ومباخر', 'incense', 'Traditional incense and burners', 'بخور تقليدي ومباخر', 9, true),
('Religious', 'هدايا دينية', 'religious', 'Beautiful religious gifts', 'هدايا دينية مميزة', 10, true),
('Accessories', 'إكسسوارات', 'accessories', 'Gift accessories and add-ons', 'إكسسوارات وإضافات للهدايا', 11, true),
('Mens Gifts', 'هدايا رجالية', 'mens-gifts', 'Special gifts for men', 'هدايا خاصة للرجال', 12, true),
('Womens Gifts', 'هدايا نسائية', 'womens-gifts', 'Special gifts for women', 'هدايا خاصة للنساء', 13, true),
('Kids Gifts', 'هدايا أطفال', 'kids-gifts', 'Fun gifts for kids', 'هدايا ممتعة للأطفال', 14, true),
('Corporate', 'هدايا شركات', 'corporate', 'Professional corporate gifts', 'هدايا شركات احترافية', 15, true),
('Quick Gifts', 'هدايا سريعة', 'quick-gifts', 'Quick and simple gift solutions', 'حلول هدايا سريعة وبسيطة', 16, true)
ON CONFLICT (slug) DO NOTHING;

-- إضافة مناسبات جديدة
INSERT INTO public.occasions (name, name_ar, slug, description, description_ar, icon, display_order, is_active) VALUES
('Engagement', 'خطوبة', 'engagement', 'Celebrate engagement moments', 'احتفل بلحظات الخطوبة', '💍', 15, true),
('Employee Appreciation', 'شكر الموظفين', 'employee-appreciation', 'Appreciate your team', 'قدّر فريق عملك', '🏆', 16, true),
('National Day', 'اليوم الوطني', 'national-day', 'Celebrate national pride', 'احتفل بالفخر الوطني', '🇸🇦', 17, true),
('Back to School', 'العودة للمدارس', 'back-to-school', 'Back to school season', 'موسم العودة للمدارس', '📓', 18, true),
('Housewarming', 'منزل جديد', 'housewarming', 'Welcome to new home', 'ترحيب بالمنزل الجديد', '🏠', 19, true),
('Self Care', 'عناية ذاتية', 'self-care', 'Wellness and self-care gifts', 'هدايا العناية بالنفس', '🧘', 20, true)
ON CONFLICT (slug) DO NOTHING;

-- إضافة حقول جديدة للمنتجات لدعم ميزات التسويق
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_tier text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_last_minute boolean DEFAULT false;