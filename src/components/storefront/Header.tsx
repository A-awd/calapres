import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, User, X, Moon, Settings, Heart, MapPin, ChevronDown } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCity } from "@/contexts/CityContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import SearchOverlay from "./SearchOverlay";

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { itemCount } = useCart();
  const { selectedCity, setShowCityModal } = useCity();
  const { itemCount: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSearchOpen(false);
    };
    if (isSearchOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSearchOpen]);

  const navItems = useMemo(
    () => [
      { label: t("رمضان", "Ramadan"), href: "/ramadan" },
      { label: t("المجموعات", "Shop"), href: "/collections" },
      { label: t("صمم هديتك", "Build"), href: "/bundle-builder" },
      { label: t("تتبع", "Track"), href: "/track-order" },
      { label: t("من نحن", "About"), href: "/about" },
    ],
    [t]
  );

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <header
        className={`fixed top-10 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-background/95 backdrop-blur-lg shadow-[0_1px_0_0_hsl(var(--border)/0.15)]"
            : "bg-background/80 backdrop-blur-sm"
        }`}
      >
        {/* City Bar */}
        <div className="border-b border-border/20">
          <div className="container-luxury">
            <div className="flex items-center justify-between h-8">
              <button
                onClick={() => setShowCityModal(true)}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs text-foreground/60 hover:text-foreground transition-colors"
              >
                <MapPin className="w-3 h-3 text-gold" />
                <span>
                  {t('التوصيل إلى', 'Deliver to')}{' '}
                  <span className="font-medium text-foreground">
                    {selectedCity
                      ? (language === 'ar' ? selectedCity.nameAr : selectedCity.name)
                      : t('اختر المدينة', 'Select city')
                    }
                  </span>
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                  className="text-[10px] tracking-[0.2em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                >
                  {language === "ar" ? "EN" : "عربي"}
                </button>
                {isAdmin && (
                  <Link to="/admin/announcements" className="flex items-center gap-1 text-[10px] text-gold hover:text-gold/80 transition-colors">
                    <Settings className="w-3 h-3" />
                    <span className="hidden sm:inline">{t('لوحة التحكم', 'Admin')}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="container-luxury">
          <div className="flex items-center justify-between h-12 sm:h-14 lg:h-16">
            <Link to="/" className="flex-shrink-0" aria-label="CALAPRES">
              <span className="font-display text-sm sm:text-base lg:text-lg tracking-[0.2em] sm:tracking-[0.25em] text-foreground font-light">
                CALAPRES
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} className="group relative py-1">
                  <span className="flex items-center gap-1.5">
                    {item.href === '/ramadan' && <Moon className="w-3 h-3 text-gold" />}
                    <span className={`text-[11px] tracking-[0.2em] uppercase transition-colors duration-200 ${
                      isActive(item.href) ? "text-foreground"
                        : item.href === '/ramadan' ? "text-gold group-hover:text-gold/80"
                        : "text-foreground/50 group-hover:text-foreground"
                    }`}>{item.label}</span>
                    {item.href === '/ramadan' && (
                      <span className="px-1.5 py-0.5 text-[8px] bg-gold text-charcoal rounded-full font-medium tracking-wider">{t('موسمي', 'SEASON')}</span>
                    )}
                  </span>
                  <span className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-px transition-all duration-200 ${
                    item.href === '/ramadan' ? 'bg-gold' : 'bg-foreground'
                  } ${isActive(item.href) ? "w-4" : "w-0 group-hover:w-4"}`} />
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-0.5 lg:gap-1">
              <button onClick={() => setIsSearchOpen(true)} className="h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors" aria-label="Search">
                <Search className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <Link to="/account?tab=wishlist" className="relative h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors" aria-label="Wishlist">
                <Heart className="w-4 h-4" strokeWidth={1.5} />
                {wishlistCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-0.5 end-0.5 min-w-3.5 h-3.5 px-1 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full font-medium">{wishlistCount}</motion.span>
                )}
              </Link>
              <Link to={user ? "/account" : "/auth"} className="h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors" aria-label="Account">
                <User className="w-4 h-4" strokeWidth={1.5} />
              </Link>
              <Link to="/cart" className="relative h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors" aria-label="Cart">
                <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                {itemCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-0.5 end-0.5 min-w-3.5 h-3.5 px-1 bg-foreground text-background text-[8px] flex items-center justify-center rounded-full font-medium">{itemCount}</motion.span>
                )}
              </Link>
              <button onClick={() => setIsMenuOpen(true)} className="lg:hidden h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors" aria-label="Menu">
                <Menu className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-foreground/5 backdrop-blur-sm z-50" onClick={() => setIsMenuOpen(false)} />
            <motion.aside
              initial={{ x: language === "ar" ? "100%" : "-100%" }} animate={{ x: 0 }} exit={{ x: language === "ar" ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className={`fixed top-0 ${language === "ar" ? "right-0" : "left-0"} h-full w-72 max-w-[80vw] bg-background z-50 shadow-xl`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 h-12 border-b border-border/20">
                  <span className="font-display tracking-[0.2em] text-sm">CALAPRES</span>
                  <button onClick={() => setIsMenuOpen(false)} className="p-1 text-foreground/50 hover:text-foreground" aria-label="Close">
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
                <button onClick={() => { setIsMenuOpen(false); setShowCityModal(true); }} className="flex items-center gap-2 px-5 py-3 border-b border-border/10 text-sm text-foreground/60">
                  <MapPin className="w-4 h-4 text-gold" />
                  <span>{selectedCity ? (language === 'ar' ? selectedCity.nameAr : selectedCity.name) : t('اختر المدينة', 'Select city')}</span>
                  <ChevronDown className="w-3 h-3 ms-auto" />
                </button>
                <nav className="flex-1 px-5 py-6 space-y-1">
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className={`block py-2.5 text-sm tracking-[0.12em] transition-colors ${location.pathname === "/" ? "text-foreground" : "text-foreground/50"}`}>{t("الرئيسية", "Home")}</Link>
                  {navItems.map((item) => (
                    <Link key={item.href} to={item.href} onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-2 py-2.5 text-sm tracking-[0.12em] transition-colors ${item.href === '/ramadan' ? "text-gold" : isActive(item.href) ? "text-foreground" : "text-foreground/50"}`}>
                      {item.href === '/ramadan' && <Moon className="w-4 h-4" />}
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="px-5 py-5 border-t border-border/20 space-y-3">
                  <Link to={user ? "/account" : "/auth"} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 text-foreground/50 hover:text-foreground transition-colors">
                    <User className="w-4 h-4" strokeWidth={1.5} /><span className="text-sm">{t("حسابي", "Account")}</span>
                  </Link>
                  <button onClick={() => setLanguage(language === "ar" ? "en" : "ar")} className="flex items-center justify-between w-full text-foreground/50 hover:text-foreground transition-colors">
                    <span className="text-sm">{t("اللغة", "Language")}</span>
                    <span className="text-xs tracking-[0.15em]">{language === "ar" ? "EN" : "ع"}</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </AnimatePresence>

      <div className="h-[calc(56px+40px+32px)] sm:h-[calc(64px+40px+32px)] lg:h-[calc(72px+40px+32px)]" />
    </>
  );
};

export default Header;
