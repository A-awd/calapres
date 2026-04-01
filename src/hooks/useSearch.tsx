import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  price: number;
  original_price: number | null;
  image: string | null;
  category?: {
    name: string;
    name_ar: string;
  } | null;
  is_bestseller: boolean;
  is_express: boolean;
}

export const useSearch = (query: string, enabled = true) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query || query.trim().length < 2) return [];

      const trimmed = query.trim();

      // Search in both name and name_ar using ilike for flexibility
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, name_ar, slug, price, original_price, image,
          is_bestseller, is_express,
          category:categories(name, name_ar)
        `)
        .eq('is_active', true)
        .eq('in_stock', true)
        .or(`name.ilike.%${trimmed}%,name_ar.ilike.%${trimmed}%,tags.cs.{${trimmed}}`)
        .order('is_bestseller', { ascending: false })
        .limit(8);

      if (error) throw error;
      return (data || []) as SearchResult[];
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30_000,
  });
};

export const useSearchSuggestions = () => {
  return useQuery({
    queryKey: ['search-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name, name_ar')
        .eq('is_active', true)
        .eq('is_bestseller', true)
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000 * 5,
  });
};

export const useDebouncedSearch = (delay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    clearSearch,
    isTyping: searchTerm !== debouncedTerm,
  };
};
