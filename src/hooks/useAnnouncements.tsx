import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Announcement {
  id: string;
  text: string;
  text_ar: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AnnouncementInsert = Omit<Announcement, 'id' | 'created_at' | 'updated_at'>;
export type AnnouncementUpdate = Partial<AnnouncementInsert>;

export const useAnnouncements = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Announcement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (announcement: AnnouncementInsert) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert(announcement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({ title: 'تم إضافة الإعلان بنجاح' });
    },
    onError: (error) => {
      toast({ title: 'خطأ في إضافة الإعلان', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AnnouncementUpdate) => {
      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({ title: 'تم تحديث الإعلان بنجاح' });
    },
    onError: (error) => {
      toast({ title: 'خطأ في تحديث الإعلان', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({ title: 'تم حذف الإعلان بنجاح' });
    },
    onError: (error) => {
      toast({ title: 'خطأ في حذف الإعلان', description: error.message, variant: 'destructive' });
    },
  });

  return {
    announcements,
    isLoading,
    createAnnouncement: createMutation.mutate,
    updateAnnouncement: updateMutation.mutate,
    deleteAnnouncement: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook for storefront (only active announcements)
export const useActiveAnnouncements = () => {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Announcement[];
    },
  });

  return { announcements, isLoading };
};
