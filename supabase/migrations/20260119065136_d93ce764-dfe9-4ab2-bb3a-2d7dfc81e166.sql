-- إضافة عمود lookup_token للطلبات الضيف
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS lookup_token uuid DEFAULT gen_random_uuid();

-- إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_orders_lookup_token ON public.orders(lookup_token);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- حذف السياسة غير الآمنة
DROP POLICY IF EXISTS "Anyone can view order by order number" ON public.orders;

-- إنشاء سياسة آمنة للطلبات الضيف (تتطلب order_number و lookup_token معاً)
-- سنستخدم edge function للتحقق من الطلبات الضيف بدلاً من RLS مباشر

-- تحديث سياسة order_items لتكون أكثر أماناً
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;

CREATE POLICY "Users can view own order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- سياسة للأدمن لرؤية جميع عناصر الطلبات
CREATE POLICY "Admins can view all order items"
ON public.order_items FOR SELECT
USING (is_admin(auth.uid()));

-- تحديث سياسة order_timeline
DROP POLICY IF EXISTS "Users can view own order timeline" ON public.order_timeline;

CREATE POLICY "Users can view own order timeline"
ON public.order_timeline FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_timeline.order_id
    AND orders.user_id = auth.uid()
  )
);

-- سياسة للأدمن لرؤية جميع سجلات الطلبات
CREATE POLICY "Admins can view all order timeline"
ON public.order_timeline FOR SELECT
USING (is_admin(auth.uid()));

-- تحديث سياسة orders لإزالة الوصول العام
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
USING (auth.uid() = user_id);

-- سياسة للأدمن لرؤية جميع الطلبات
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (is_admin(auth.uid()));

-- سياسة للأدمن لتحديث الطلبات
CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
USING (is_admin(auth.uid()));

-- سياسة للأدمن لإضافة سجلات التايملاين
CREATE POLICY "Admins can insert order timeline"
ON public.order_timeline FOR INSERT
WITH CHECK (is_admin(auth.uid()));