import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'orders_manager' | 'content_editor' | 'customer_support';

interface AdminUser {
  id: string;
  email: string;
  roles: AppRole[];
}

export const useAdminAuth = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        setAdminUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        if (roles && roles.length > 0) {
          setAdminUser({
            id: user.id,
            email: user.email || '',
            roles: roles.map(r => r.role as AppRole),
          });
        } else {
          setAdminUser(null);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setAdminUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, authLoading]);

  const isAdmin = !!adminUser;
  const hasRole = (role: AppRole) => adminUser?.roles.includes(role) ?? false;

  const requireAdmin = () => {
    if (!loading && !isAdmin) {
      navigate('/admin');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  return {
    adminUser,
    isAdmin,
    hasRole,
    loading: loading || authLoading,
    requireAdmin,
    logout,
  };
};
