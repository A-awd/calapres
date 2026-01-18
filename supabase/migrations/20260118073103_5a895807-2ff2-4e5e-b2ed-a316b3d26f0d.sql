-- Fix function search path issues for security
ALTER FUNCTION public.generate_order_number() SET search_path = public;
ALTER FUNCTION public.create_order_timeline_entry() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;