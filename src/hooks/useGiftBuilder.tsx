import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GiftBox {
  id: string;
  name: string;
  name_ar: string;
  size: 'small' | 'medium' | 'large';
  price: number;
  image: string | null;
  max_items: number;
  dimensions: string | null;
  dimensions_ar: string | null;
  is_active: boolean;
  display_order: number;
}

export interface GiftItem {
  id: string;
  name: string;
  name_ar: string;
  category: string;
  category_ar: string;
  price: number;
  image: string | null;
  is_active: boolean;
  display_order: number;
}

export interface GiftWrap {
  id: string;
  name: string;
  name_ar: string;
  price: number;
  image: string | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Ribbon {
  id: string;
  name: string;
  name_ar: string;
  price: number;
  color: string | null;
  is_active: boolean;
  display_order: number;
}

export const useGiftBoxes = () => {
  return useQuery({
    queryKey: ['gift-boxes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_boxes')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as GiftBox[];
    },
  });
};

export const useGiftItems = () => {
  return useQuery({
    queryKey: ['gift-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as GiftItem[];
    },
  });
};

export const useGiftWraps = () => {
  return useQuery({
    queryKey: ['gift-wraps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_wraps')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as GiftWrap[];
    },
  });
};

export const useRibbons = () => {
  return useQuery({
    queryKey: ['ribbons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ribbons')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Ribbon[];
    },
  });
};
