import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface OccasionReminder {
  id: string;
  user_id: string;
  title: string;
  title_ar: string;
  occasion_date: string;
  reminder_days_before: number;
  occasion_type: string | null;
  recipient_name: string | null;
  notes: string | null;
  is_recurring: boolean;
  is_active: boolean;
  last_reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OccasionReminderFormData {
  title: string;
  title_ar: string;
  occasion_date: string;
  reminder_days_before?: number;
  occasion_type?: string;
  recipient_name?: string;
  notes?: string;
  is_recurring?: boolean;
  is_active?: boolean;
}

export const useOccasionReminders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['occasion-reminders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('occasion_reminders')
        .select('*')
        .order('occasion_date', { ascending: true });

      if (error) throw error;
      return data as OccasionReminder[];
    },
    enabled: !!user?.id,
  });
};

export const useUpcomingReminders = (daysAhead = 30) => {
  const { user } = useAuth();
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  return useQuery({
    queryKey: ['upcoming-reminders', user?.id, daysAhead],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('occasion_reminders')
        .select('*')
        .eq('is_active', true)
        .gte('occasion_date', today.toISOString().split('T')[0])
        .lte('occasion_date', futureDate.toISOString().split('T')[0])
        .order('occasion_date', { ascending: true });

      if (error) throw error;
      return data as OccasionReminder[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateOccasionReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminder: OccasionReminderFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('occasion_reminders')
        .insert({ ...reminder, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occasion-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      toast.success('Reminder created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create reminder: ${error.message}`);
    },
  });
};

export const useUpdateOccasionReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...reminder }: OccasionReminderFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('occasion_reminders')
        .update(reminder)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occasion-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      toast.success('Reminder updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update reminder: ${error.message}`);
    },
  });
};

export const useDeleteOccasionReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('occasion_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occasion-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      toast.success('Reminder deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete reminder: ${error.message}`);
    },
  });
};
