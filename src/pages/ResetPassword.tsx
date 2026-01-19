import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import logo from '@/assets/logo.png';

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const ResetPassword = () => {
  const { language, t } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL hash for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      if (type === 'recovery' && accessToken) {
        // Set the session from the recovery link
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (!error) {
          setIsValidSession(true);
        }
      } else if (session) {
        setIsValidSession(true);
      }
      
      setIsCheckingSession(false);
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setIsCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');
    
    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(error => {
          if (error.path[0]) {
            newErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    toast.success(t('تم تغيير كلمة المرور بنجاح', 'Password changed successfully'));
    
    // Sign out and redirect to login
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/auth');
    }, 2000);
  };

  if (isCheckingSession) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-champagne via-ivory to-sand flex items-center justify-center p-4" 
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!isValidSession && !isCheckingSession) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-champagne via-ivory to-sand flex items-center justify-center p-4" 
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-background rounded-2xl shadow-elegant p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              {t('رابط غير صالح', 'Invalid Link')}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية', 'The password reset link is invalid or has expired')}
            </p>
            <Button asChild>
              <Link to="/auth">{t('العودة لتسجيل الدخول', 'Back to Login')}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-champagne via-ivory to-sand flex items-center justify-center p-4" 
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 start-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 end-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-background rounded-2xl shadow-elegant p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/">
              <img src={logo} alt="كالابريز" className="h-20 w-auto mx-auto mb-4 hover:scale-105 transition-transform" />
            </Link>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {t('إعادة تعيين كلمة المرور', 'Reset Password')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('أدخل كلمة المرور الجديدة', 'Enter your new password')}
            </p>
          </div>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t('تم بنجاح!', 'Success!')}
              </h2>
              <p className="text-muted-foreground">
                {t('جاري تحويلك لصفحة تسجيل الدخول...', 'Redirecting to login page...')}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">{t('كلمة المرور الجديدة', 'New Password')}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ps-10 pe-10"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('تأكيد كلمة المرور', 'Confirm Password')}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="ps-10 pe-10"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-sm">{errors.confirmPassword}</p>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                  />
                ) : (
                  t('تغيير كلمة المرور', 'Change Password')
                )}
              </Button>
            </form>
          )}

          {/* Back to login link */}
          <div className="mt-6 text-center">
            <Link to="/auth" className="text-sm text-gold hover:underline">
              {t('العودة لتسجيل الدخول', 'Back to Login')}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          © {new Date().getFullYear()} {t('كالابريز - جميع الحقوق محفوظة', 'Calapres - All rights reserved')}
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
