import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { t, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background" dir={direction}>
      <div className="text-center px-4">
        <h1 className="mb-4 text-8xl font-display font-bold text-primary">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-foreground">
          {t('الصفحة غير موجودة', 'Page Not Found')}
        </h2>
        <p className="mb-8 text-muted-foreground max-w-md mx-auto">
          {t(
            'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
            'Sorry, the page you are looking for does not exist or has been moved.'
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              {t('العودة للرئيسية', 'Back to Home')}
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/collections">
              {t('تصفح المنتجات', 'Browse Products')}
              <Arrow className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;