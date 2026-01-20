import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (authLoading || !user) return;

      try {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        if (roles && roles.length > 0) {
          navigate('/admin/dashboard');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    checkAdminAccess();
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError('فشل تسجيل الدخول. حاول مرة أخرى.');
        setIsLoading(false);
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id);

      if (rolesError) {
        console.error('Error checking roles:', rolesError);
        setError('فشل التحقق من صلاحيات الوصول');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (!roles || roles.length === 0) {
        setError('الوصول مرفوض. ليس لديك صلاحيات الإدارة.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      toast.success('مرحباً بعودتك!');
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('حدث خطأ غير متوقع');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <img src={logo} alt="كالابريز" className="h-10 w-auto brightness-150" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              لوحة تحكم كالابريز
            </h1>
            <p className="text-gray-500 mt-2">
              سجل دخولك لإدارة المتجر
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@calapres.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ps-10 border-gray-200 rounded-xl"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ps-10 pe-10 border-gray-200 rounded-xl"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 rounded-xl h-11"
              disabled={isLoading || authLoading}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 me-2" />
                  تسجيل الدخول
                </>
              )}
            </Button>
          </form>

          {/* Info note */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 text-center">
              يمكن للمسؤولين المصرح لهم فقط الوصول إلى هذه اللوحة.
              <br />
              تواصل مع الدعم إذا كنت بحاجة للوصول.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
