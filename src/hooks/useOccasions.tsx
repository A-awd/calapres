import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Occasion {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OccasionFormData {
  name: string;
  name_ar: string;
  slug: string;
  description?: string;
  description_ar?: string;
  icon?: string;
  display_order?: number;
  is_active: boolean;
}

export const useOccasions = (includeInactive = false) => {
  return useQuery({
    queryKey: ['occasions', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('occasions')
        .select('*')
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Occasion[];
    },
  });
};

export const useOccasion = (id: string) => {
  return useQuery({
    queryKey: ['occasion', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('occasions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Occasion;
    },
    enabled: !!id,
  });
};

export const useCreateOccasion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (occasion: OccasionFormData) => {
      const { data, error } = await supabase
        .from('occasions')
        .insert(occasion)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occasions'] });
      toast.success('Occasion created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create occasion: ${error.message}`);
    },
  });
};

export const useUpdateOccasion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...occasion }: OccasionFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('occasions')
        .update(occasion)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['occasions'] });
      queryClient.invalidateQueries({ queryKey: ['occasion', variables.id] });
      toast.success('Occasion updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update occasion: ${error.message}`);
    },
  });
};

export const useDeleteOccasion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('occasions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occasions'] });
      toast.success('Occasion deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete occasion: ${error.message}`);
    },
  });
};
