import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingBag, Search, User, Globe } from 'lucide-react';
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
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: t('الرئيسية', 'Home'), href: '/' },
    { label: t('المجموعات', 'Collections'), href: '/collections' },
    { label: t('صمم هديتك', 'Build Gift'), href: '/bundle-builder' },
    { label: t('تتبع الطلب', 'Track Order'), href: '/track-order' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/98 backdrop-blur-md shadow-sm' 
          : 'bg-white'
      }`}
    >
      <div className="container-luxury">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Left - Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8 flex-1">
            {navItems.slice(0, 2).map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`relative text-sm tracking-wide transition-colors duration-300 ${
                  isActive(item.href)
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <motion.span
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-foreground"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 -ms-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Center - Logo */}
          <Link 
            to="/" 
            className="absolute left-1/2 -translate-x-1/2 flex items-center"
          >
            <span className="font-display text-2xl lg:text-3xl tracking-[0.15em] text-foreground">
              CALAPRES
            </span>
          </Link>

          {/* Right - Navigation (Desktop) + Icons */}
          <div className="hidden lg:flex items-center gap-8 flex-1 justify-end">
            {navItems.slice(2).map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`relative text-sm tracking-wide transition-colors duration-300 ${
                  isActive(item.href)
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <motion.span
                    layoutId="activeNav2"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-foreground"
                  />
                )}
              </Link>
            ))}
            
            <div className="flex items-center gap-1 ps-4 border-s border-border/50">
              <button
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                title={language === 'ar' ? 'English' : 'عربي'}
              >
                <Globe className="w-[18px] h-[18px]" />
              </button>
              
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>

              <Link
                to={user ? '/account' : '/auth'}
                className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Account"
              >
                <User className="w-[18px] h-[18px]" />
              </Link>

              <Link
                to="/cart"
                className="relative p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag className="w-[18px] h-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute top-1 end-1 w-4 h-4 bg-foreground text-background text-[10px] flex items-center justify-center rounded-full font-medium">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Icons */}
          <div className="flex lg:hidden items-center gap-1">
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="p-2 text-muted-foreground"
            >
              <Globe className="w-5 h-5" />
            </button>
            <Link to="/cart" className="relative p-2 text-muted-foreground">
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute top-0.5 end-0.5 w-4 h-4 bg-foreground text-background text-[10px] flex items-center justify-center rounded-full font-medium">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-border/30 overflow-hidden"
          >
            <nav className="container-luxury py-6 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block py-3 text-base transition-colors ${
                    isActive(item.href)
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-border/30 flex gap-4">
                <Link
                  to={user ? '/account' : '/auth'}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <User className="w-5 h-5" />
                  {t('حسابي', 'Account')}
                </Link>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsSearchOpen(true);
                  }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Search className="w-5 h-5" />
                  {t('بحث', 'Search')}
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="container-luxury py-8">
                <div className="max-w-2xl mx-auto">
                  <div className="relative">
                    <Search className="absolute start-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('ابحث عن الهدايا المثالية...', 'Search for the perfect gift...')}
                      className="w-full ps-10 pe-4 py-4 bg-transparent border-b-2 border-foreground/20 focus:border-foreground text-lg focus:outline-none transition-colors font-display"
                      autoFocus
                    />
                    <button
                      onClick={() => setIsSearchOpen(false)}
                      className="absolute end-0 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    {t('اضغط Enter للبحث أو Esc للإغلاق', 'Press Enter to search or Esc to close')}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
