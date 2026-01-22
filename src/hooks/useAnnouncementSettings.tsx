import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAnnouncementSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: speed = 60, isLoading } = useQuery({
    queryKey: ['announcement-settings', 'speed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcement_settings')
        .select('setting_value')
        .eq('setting_key', 'marquee_speed')
        .single();

      if (error) {
        console.error('Error fetching speed setting:', error);
        return 60;
      }
      return parseInt(data.setting_value) || 60;
    },
  });

  const updateSpeed = useMutation({
    mutationFn: async (newSpeed: number) => {
      const { error } = await supabase
        .from('announcement_settings')
        .upsert(
          { setting_key: 'marquee_speed', setting_value: String(newSpeed) },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;
      return newSpeed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-settings'] });
      toast({ title: 'تم تحديث سرعة الشريط' });
    },
    onError: (error) => {
      toast({ title: 'خطأ في تحديث السرعة', description: error.message, variant: 'destructive' });
    },
  });

  return {
    speed,
    isLoading,
    updateSpeed: updateSpeed.mutate,
    isUpdating: updateSpeed.isPending,
  };
};
