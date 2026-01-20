-- Fix the overly permissive INSERT policy for coupon_usages
DROP POLICY IF EXISTS "Users can insert coupon usage" ON public.coupon_usages;

-- Create a more restrictive policy - only allow insert when creating an order
CREATE POLICY "Users can insert coupon usage with order" 
ON public.coupon_usages 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND order_id IS NOT NULL)
);