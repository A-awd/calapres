-- Ensure RLS is enabled on customer_addresses table
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper security
DROP POLICY IF EXISTS "Users can view own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.customer_addresses;

-- Create strict SELECT policy - users can only view their own addresses
CREATE POLICY "Users can view own addresses" 
ON public.customer_addresses 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create strict INSERT policy - users can only insert addresses for themselves
CREATE POLICY "Users can insert own addresses" 
ON public.customer_addresses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create strict UPDATE policy - users can only update their own addresses
-- WITH CHECK prevents changing user_id to another user
CREATE POLICY "Users can update own addresses" 
ON public.customer_addresses 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create strict DELETE policy - users can only delete their own addresses
CREATE POLICY "Users can delete own addresses" 
ON public.customer_addresses 
FOR DELETE 
USING (auth.uid() = user_id);