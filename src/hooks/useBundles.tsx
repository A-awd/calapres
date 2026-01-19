import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Bundle {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  description: string | null;
  description_ar: string | null;
  occasion_id: string | null;
  tier: 'basic' | 'premium' | 'luxury' | null;
  price: number;
  original_price: number | null;
  image: string | null;
  images: string[];
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  occasion?: {
    id: string;
    name: string;
    name_ar: string;
  } | null;
  items?: BundleItem[];
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    name_ar: string;
    image: string | null;
    price: number;
  };
}

export interface BundleFormData {
  name: string;
  name_ar: string;
  slug: string;
  description?: string;
  description_ar?: string;
  occasion_id?: string;
  tier?: 'basic' | 'premium' | 'luxury';
  price: number;
  original_price?: number;
  image?: string;
  images?: string[];
  tags?: string[];
  is_featured: boolean;
  is_active: boolean;
  display_order?: number;
  items?: { product_id: string; quantity: number }[];
}

export const useBundles = (includeInactive = false) => {
  return useQuery({
    queryKey: ['bundles', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('bundles')
        .select(`
          *,
          occasion:occasions(id, name, name_ar)
        `)
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Bundle[];
    },
  });
};

export const useBundle = (id: string) => {
  return useQuery({
    queryKey: ['bundle', id],
    queryFn: async () => {
      const { data: bundle, error: bundleError } = await supabase
        .from('bundles')
        .select(`
          *,
          occasion:occasions(id, name, name_ar)
        `)
        .eq('id', id)
        .single();

      if (bundleError) throw bundleError;

      const { data: items, error: itemsError } = await supabase
        .from('bundle_items')
        .select(`
          *,
          product:products(id, name, name_ar, image, price)
        `)
        .eq('bundle_id', id);

      if (itemsError) throw itemsError;

      return { ...bundle, items } as Bundle;
    },
    enabled: !!id,
  });
};

export const useCreateBundle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, ...bundle }: BundleFormData) => {
      const { data, error } = await supabase
        .from('bundles')
        .insert(bundle)
        .select()
        .single();

      if (error) throw error;

      if (items && items.length > 0) {
        const bundleItems = items.map(item => ({
          bundle_id: data.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('bundle_items')
          .insert(bundleItems);

        if (itemsError) throw itemsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bundle: ${error.message}`);
    },
  });
};

export const useUpdateBundle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, items, ...bundle }: BundleFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('bundles')
        .update(bundle)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Delete existing items and re-insert
      await supabase.from('bundle_items').delete().eq('bundle_id', id);

      if (items && items.length > 0) {
        const bundleItems = items.map(item => ({
          bundle_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('bundle_items')
          .insert(bundleItems);

        if (itemsError) throw itemsError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      queryClient.invalidateQueries({ queryKey: ['bundle', variables.id] });
      toast.success('Bundle updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bundle: ${error.message}`);
    },
  });
};

export const useDeleteBundle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bundles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete bundle: ${error.message}`);
    },
  });
};
