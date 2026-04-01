import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import StorefrontLayout from '@/components/storefront/StorefrontLayout';

const NotFound: React.FC = () => {
  const { t } = useLanguage();

  return (
    <StorefrontLayout>
      <div className="container-luxury py-20 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg mx-auto"
        >
          {/* 404 Number */}
          <div className="font-display text-[120px] sm:text-[160px] leading-none font-medium text-border/40 select-none mb-4">
            404
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-medium text-foreground mb-3">
            {t('الصفحة غير موجودة', 'Page Not Found')}
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base mb-8 leading-relaxed">
            {t(
              'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
              "Sorry, the page you're looking for doesn't exist or has been moved."
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-charcoal text-white px-6 py-3 text-sm tracking-wider hover:bg-charcoal/90 transition-colors w-full sm:w-auto justify-center"
            >
              <Home className="w-4 h-4" />
              {t('الصفحة الرئيسية', 'Go Home')}
            </Link>
            <Link
              to="/collections"
              className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 text-sm tracking-wider hover:bg-sand transition-colors w-full sm:w-auto justify-center"
            >
              <Search className="w-4 h-4" />
              {t('تصفح المنتجات', 'Browse Products')}
            </Link>
          </div>
        </motion.div>
      </div>
    </StorefrontLayout>
  );
};

export default NotFound;
