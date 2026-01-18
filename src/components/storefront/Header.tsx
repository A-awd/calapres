import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingBag, Search, User, Globe, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import logo from '@/assets/logo.png';

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { itemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { label: t('الرئيسية', 'Home'), href: '/' },
    { label: t('المناسبات', 'Occasions'), href: '/collections' },
    { label: t('التصنيفات', 'Categories'), href: '/collections' },
    { label: t('الباقات', 'Bundles'), href: '/collections' },
    { label: t('صمم هديتك', 'Build Your Gift'), href: '/bundle-builder' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border/30">
      {/* Top bar - Minimal */}
      <div className="bg-charcoal text-white/90">
        <div className="container-luxury flex items-center justify-between py-2.5 text-xs tracking-wider">
          <span className="hidden md:block">
            {t('توصيل مجاني للطلبات فوق ٥٠٠ ريال', 'FREE DELIVERY ON ORDERS ABOVE 500 SAR')}
          </span>
          <div className="flex items-center gap-6 mx-auto md:mx-0">
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'ENGLISH' : 'عربي'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main header - Ultra minimal */}
      <div className="container-luxury py-5">
        <div className="flex items-center justify-between">
          {/* Left - Menu & Search */}
          <div className="flex items-center gap-4 w-1/3">
            <button
              className="lg:hidden p-1.5 hover:bg-secondary transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 hover:bg-secondary transition-colors hidden sm:block"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Center - Logo */}
          <Link to="/" className="flex flex-col items-center gap-1">
            <img src={logo} alt="Calapres" className="h-14 w-auto" />
            <span className="font-display text-xl tracking-wider text-foreground hidden sm:block">
              CALAPRES
            </span>
          </Link>

          {/* Right - Icons */}
          <div className="flex items-center justify-end gap-3 w-1/3">
            <Link
              to="/wishlist"
              className="p-1.5 hover:bg-secondary transition-colors hidden sm:block"
            >
              <Heart className="w-5 h-5" />
            </Link>

            <Link
              to="/account"
              className="p-1.5 hover:bg-secondary transition-colors hidden sm:block"
            >
              <User className="w-5 h-5" />
            </Link>

            <Link
              to="/cart"
              className="relative p-1.5 hover:bg-secondary transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-charcoal text-white text-[10px] flex items-center justify-center font-medium">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop Navigation - Centered */}
      <nav className="hidden lg:block border-t border-border/30">
        <div className="container-luxury">
          <ul className="flex items-center justify-center gap-10 py-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className="text-sm tracking-wider text-foreground/70 hover:text-foreground transition-colors duration-300 uppercase"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-t border-border overflow-hidden bg-white"
          >
            <nav className="container-luxury py-6">
              <ul className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-3 text-sm tracking-wider text-foreground hover:text-foreground/70 transition-colors uppercase border-b border-border/30"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
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
            className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-32"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white p-8 w-full max-w-2xl mx-4 shadow-elegant"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search className="absolute start-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('ابحث عن الهدايا...', 'Search for gifts...')}
                  className="w-full ps-8 pe-4 py-4 bg-transparent border-b border-border text-lg focus:outline-none focus:border-foreground transition-colors"
                  autoFocus
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
