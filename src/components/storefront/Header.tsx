import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, User, X, Heart, MapPin } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import SearchOverlay from "./SearchOverlay";

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 8);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navItems = useMemo(() => [
    { label: t("المجموعات", "Shop"), href: "/collections" },
    { label: t("صمم هديتك", "Build"), href: "/bundle-builder" },
    { label: t("تتبع", "Track"), href: "/track-order" },
    { label: t("من نحن", "About"), href: "/about" },
  ], [t]);

  const isActive = (href: string) => href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  return (
    <>
      <header className={`sticky top-0 z-50 transition-shadow duration-300 bg-background ${isScrolled ? "shadow-sm" : ""}`}>
        <div className="container-luxury">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <span className="font-display text-base sm:text-lg tracking-[0.25em] text-foreground font-light">CALAPRES</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} className="group relative py-1">
                  <span className={`text-[11px] tracking-[0.18em] uppercase transition-colors ${isActive(item.href) ? "text-foreground" : "text-foreground/50 group-hover:text-foreground"}`}>{item.label}</span>
                  <span className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-px bg-foreground transition-all ${isActive(item.href) ? "w-4" : "w-0 group-hover:w-4"}`} />
                </Link>
              ))}
            </nav>

            {/* Icons */}
            <div className="flex items-center">
              {/* Riyadh indicator */}
              <span className="hidden sm:flex items-center gap-1 text-xs text-foreground/40 me-3">
                <MapPin className="w-3 h-3" /> {t('الرياض', 'Riyadh')}
              </span>

              {/* Language */}
              <button onClick={() => setLanguage(language === "ar" ? "en" : "ar")} className="hidden lg:flex h-9 w-9 items-center justify-center text-xs text-foreground/40 hover:text-foreground transition-colors">
                {language === "ar" ? "EN" : "ع"}
              </button>

              <button onClick={() => setIsSearchOpen(true)} className="h-9 w-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors">
                <Search className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>

              <Link to="/account?tab=wishlist" className="relative h-9 w-9 hidden sm:flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors">
                <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
                {wishlistCount > 0 && <span className="absolute top-1 end-1 min-w-3.5 h-3.5 px-1 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full">{wishlistCount}</span>}
              </Link>

              <Link to={user ? "/account" : "/auth"} className="h-9 w-9 hidden sm:flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors">
                <User className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </Link>

              <Link to="/cart" className="relative h-9 w-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors">
                <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
                {itemCount > 0 && <span className="absolute top-1 end-1 min-w-3.5 h-3.5 px-1 bg-foreground text-background text-[8px] flex items-center justify-center rounded-full">{itemCount}</span>}
              </Link>

              <button onClick={() => setIsMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors">
                <Menu className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 z-[60]" onClick={() => setIsMenuOpen(false)} />
            <motion.aside
              initial={{ x: language === "ar" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: language === "ar" ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className={`fixed top-0 ${language === "ar" ? "right-0" : "left-0"} h-full w-72 max-w-[80vw] bg-background z-[70] shadow-xl`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 h-14 border-b border-border/20">
                  <span className="font-display tracking-[0.2em] text-sm">CALAPRES</span>
                  <button onClick={() => setIsMenuOpen(false)} className="p-1 text-foreground/50"><X className="w-5 h-5" /></button>
                </div>
                <nav className="flex-1 px-5 py-6 space-y-1">
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className={`block py-2.5 text-sm ${location.pathname === "/" ? "text-foreground font-medium" : "text-foreground/50"}`}>{t("الرئيسية", "Home")}</Link>
                  {navItems.map((item) => (
                    <Link key={item.href} to={item.href} onClick={() => setIsMenuOpen(false)} className={`block py-2.5 text-sm ${isActive(item.href) ? "text-foreground font-medium" : "text-foreground/50"}`}>{item.label}</Link>
                  ))}
                </nav>
                <div className="px-5 py-5 border-t border-border/20 space-y-3">
                  <Link to={user ? "/account" : "/auth"} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 text-foreground/50"><User className="w-4 h-4" /><span className="text-sm">{t("حسابي", "Account")}</span></Link>
                  <button onClick={() => setLanguage(language === "ar" ? "en" : "ar")} className="flex items-center justify-between w-full text-foreground/50">
                    <span className="text-sm">{t("اللغة", "Language")}</span><span className="text-xs">{language === "ar" ? "EN" : "ع"}</span>
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
    </>
  );
};

export default Header;
