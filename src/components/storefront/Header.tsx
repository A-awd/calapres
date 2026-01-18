import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingBag, Search, User, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { itemCount } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: t('المجموعات', 'Shop'), href: '/collections' },
    { label: t('صمم هديتك', 'Custom'), href: '/bundle-builder' },
    { label: t('تتبع الطلب', 'Track'), href: '/track-order' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out ${
          isScrolled 
            ? 'bg-background/95 backdrop-blur-xl shadow-[0_1px_0_0_hsl(var(--border)/0.1)]' 
            : 'bg-transparent'
        }`}
      >
        {/* Top Announcement Bar */}
        <AnimatePresence>
          {!isScrolled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-foreground text-background overflow-hidden"
            >
              <div className="container-luxury py-2 text-center">
                <p className="text-xs tracking-widest uppercase">
                  {t('توصيل مجاني للطلبات فوق ٣٠٠ ر.س', 'Free delivery on orders over 300 SAR')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Header */}
        <div className="container-luxury">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Left - Mobile Menu */}
            <div className="flex items-center gap-2 w-32 lg:w-40">
              <button
                className="lg:hidden p-1.5 text-foreground/70 hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" strokeWidth={1.5} />
              </button>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="group relative"
                  >
                    <span className={`text-[13px] uppercase tracking-[0.15em] transition-colors duration-300 ${
                      isActive(item.href)
                        ? 'text-foreground'
                        : 'text-foreground/60 group-hover:text-foreground'
                    }`}>
                      {item.label}
                    </span>
                    <span className={`absolute -bottom-0.5 left-0 h-px bg-foreground transition-all duration-300 ${
                      isActive(item.href) ? 'w-full' : 'w-0 group-hover:w-full'
                    }`} />
                  </Link>
                ))}
              </nav>
            </div>

            {/* Center - Logo */}
            <Link 
              to="/" 
              className="absolute left-1/2 -translate-x-1/2"
            >
              <motion.div
                initial={false}
                animate={{ scale: isScrolled ? 0.9 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="font-display text-xl lg:text-2xl tracking-[0.2em] text-foreground font-light">
                  CALAPRES
                </h1>
              </motion.div>
            </Link>

            {/* Right - Actions */}
            <div className="flex items-center justify-end gap-1 lg:gap-3 w-32 lg:w-40">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className="hidden lg:flex items-center gap-1 px-2 py-1 text-[11px] uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors"
              >
                {language === 'ar' ? 'EN' : 'ع'}
              </button>

              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>

              {/* Account */}
              <Link
                to={user ? '/account' : '/auth'}
                className="hidden lg:block p-2 text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Account"
              >
                <User className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-foreground text-background text-[9px] flex items-center justify-center rounded-full font-medium"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ x: language === 'ar' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: language === 'ar' ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`fixed top-0 ${language === 'ar' ? 'right-0' : 'left-0'} h-full w-80 max-w-[85vw] bg-background z-50 shadow-2xl`}
            >
              <div className="flex flex-col h-full">
                {/* Menu Header */}
                <div className="flex items-center justify-between p-5 border-b border-border/30">
                  <span className="font-display text-lg tracking-[0.15em]">CALAPRES</span>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 text-foreground/60 hover:text-foreground"
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Menu Links */}
                <nav className="flex-1 py-6 px-5 space-y-1">
                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className={`block py-3 text-sm uppercase tracking-[0.15em] transition-colors ${
                      location.pathname === '/' ? 'text-foreground' : 'text-foreground/60'
                    }`}
                  >
                    {t('الرئيسية', 'Home')}
                  </Link>
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block py-3 text-sm uppercase tracking-[0.15em] transition-colors ${
                        isActive(item.href) ? 'text-foreground' : 'text-foreground/60'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Menu Footer */}
                <div className="p-5 border-t border-border/30 space-y-4">
                  <Link
                    to={user ? '/account' : '/auth'}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <User className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-sm">{t('حسابي', 'My Account')}</span>
                  </Link>
                  <button
                    onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                    className="flex items-center gap-3 text-foreground/60 hover:text-foreground transition-colors w-full"
                  >
                    <span className="w-4 h-4 flex items-center justify-center text-xs font-medium">
                      {language === 'ar' ? 'EN' : 'ع'}
                    </span>
                    <span className="text-sm">{language === 'ar' ? 'English' : 'العربية'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/98 backdrop-blur-xl z-50 flex items-start justify-center pt-[20vh]"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-xl px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('ابحث...', 'Search...')}
                  className="w-full px-0 py-4 bg-transparent border-b border-foreground/20 focus:border-foreground text-2xl lg:text-3xl font-display tracking-wide focus:outline-none transition-colors text-center placeholder:text-foreground/30"
                  autoFocus
                />
              </div>
              <p className="text-xs text-foreground/40 mt-6 text-center tracking-widest uppercase">
                {t('اضغط Esc للإغلاق', 'Press Esc to close')}
              </p>
            </motion.div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-6 end-6 p-2 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={1} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Spacer */}
      <div className={`${isScrolled ? 'h-14 lg:h-16' : 'h-[calc(2rem+3.5rem)] lg:h-[calc(2rem+4rem)]'} transition-all duration-300`} />
    </>
  );
};

export default Header;
