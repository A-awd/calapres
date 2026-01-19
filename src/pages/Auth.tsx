import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import logo from '@/assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Auth = () => {
  const { language, t } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  
  // Signup form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  // Check if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    setError('');
    
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach(error => {
          if (error.path[0]) {
            errors[error.path[0] as string] = error.message;
          }
        });
        setLoginErrors(errors);
        return;
      }
    }

    setIsLoading(true);
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError(t('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'Invalid email or password'));
      } else {
        setError(authError.message);
      }
      setIsLoading(false);
      return;
    }

    toast.success(t('مرحباً بعودتك!', 'Welcome back!'));
    navigate('/');
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    setError('');
    
    try {
      signupSchema.parse({
        firstName,
        lastName,
        email: signupEmail,
        phone,
        password: signupPassword,
        confirmPassword,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach(error => {
          if (error.path[0]) {
            errors[error.path[0] as string] = error.message;
          }
        });
        setSignupErrors(errors);
        return;
      }
    }

    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { error: authError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError(t('هذا البريد الإلكتروني مسجل بالفعل', 'This email is already registered'));
      } else {
        setError(authError.message);
      }
      setIsLoading(false);
      return;
    }

    // Update profile with additional info
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      }).eq('id', user.id);
    }

    toast.success(t('تم إنشاء الحساب بنجاح', 'Account created successfully'));
    navigate('/');
    setIsLoading(false);
  };

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
              {t('مرحباً بك في كالابريز', 'Welcome to Calapres')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('اكتشف أجمل الهدايا والزهور الفاخرة', 'Discover the finest gifts and luxury flowers')}
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'login' | 'signup'); setError(''); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{t('تسجيل الدخول', 'Login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('حساب جديد', 'Sign Up')}</TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('البريد الإلكتروني', 'Email')}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="ps-10"
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-destructive text-sm">{loginErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('كلمة المرور', 'Password')}</Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="ps-10 pe-10"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-destructive text-sm">{loginErrors.password}</p>
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
                    <>
                      <Sparkles className="w-5 h-5 me-2" />
                      {t('تسجيل الدخول', 'Sign In')}
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('الاسم الأول', 'First Name')}</Label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder={t('أحمد', 'John')}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="ps-10"
                        disabled={isLoading}
                      />
                    </div>
                    {signupErrors.firstName && (
                      <p className="text-destructive text-sm">{signupErrors.firstName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('الاسم الأخير', 'Last Name')}</Label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder={t('محمد', 'Doe')}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="ps-10"
                        disabled={isLoading}
                      />
                    </div>
                    {signupErrors.lastName && (
                      <p className="text-destructive text-sm">{signupErrors.lastName}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('البريد الإلكتروني', 'Email')}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="ps-10"
                      disabled={isLoading}
                    />
                  </div>
                  {signupErrors.email && (
                    <p className="text-destructive text-sm">{signupErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('رقم الهاتف', 'Phone')} <span className="text-muted-foreground">({t('اختياري', 'optional')})</span></Label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+966 50 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="ps-10"
                      dir="ltr"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('كلمة المرور', 'Password')}</Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="ps-10 pe-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {signupErrors.password && (
                    <p className="text-destructive text-sm">{signupErrors.password}</p>
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {signupErrors.confirmPassword && (
                    <p className="text-destructive text-sm">{signupErrors.confirmPassword}</p>
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
                    <>
                      <Sparkles className="w-5 h-5 me-2" />
                      {t('إنشاء حساب', 'Create Account')}
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Back to store link */}
          <div className="mt-8 p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              {t('استمتع بأفضل تجربة تسوق للهدايا والزهور', 'Enjoy the best shopping experience for gifts and flowers')}
              <br />
              <Link to="/" className="text-gold hover:underline font-medium">
                {t('تصفح المتجر', 'Browse Store')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          © {new Date().getFullYear()} {t('كالابريز - جميع الحقوق محفوظة', 'Calapres - All rights reserved')}
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
