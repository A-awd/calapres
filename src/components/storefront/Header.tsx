import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { itemCount } = useCart();
  const { user } = useAuth();
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-background/95 backdrop-blur-lg shadow-[0_1px_0_0_hsl(var(--border)/0.15)]"
            : "bg-transparent"
        }`}
      >
        <div className="container-luxury">
          <div className="flex items-center justify-between h-12 lg:h-14">
            {/* Left - Logo */}
            <Link to="/" className="flex-shrink-0" aria-label="CALAPRES">
              <span className="font-display text-base lg:text-lg tracking-[0.25em] text-foreground font-light">
                CALAPRES
              </span>
            </Link>

            {/* Center - Nav Links (desktop only) */}
            <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group relative py-1"
                >
                  <span
                    className={`text-[11px] tracking-[0.2em] uppercase transition-colors duration-200 ${
                      isActive(item.href)
                        ? "text-foreground"
                        : "text-foreground/50 group-hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-px bg-foreground transition-all duration-200 ${
                      isActive(item.href) ? "w-4" : "w-0 group-hover:w-4"
                    }`}
                  />
                </Link>
              ))}
            </nav>

            {/* Right - Icons */}
            <div className="flex items-center gap-0.5 lg:gap-1">
              {/* Language (desktop) */}
              <button
                onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                className="hidden lg:flex h-8 w-8 items-center justify-center text-[10px] tracking-[0.2em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Language"
              >
                {language === "ar" ? "EN" : "ع"}
              </button>

              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" strokeWidth={1.5} />
              </button>

              {/* Account */}
              <Link
                to={user ? "/account" : "/auth"}
                className="h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Account"
              >
                <User className="w-4 h-4" strokeWidth={1.5} />
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0.5 end-0.5 min-w-3.5 h-3.5 px-1 bg-foreground text-background text-[8px] flex items-center justify-center rounded-full font-medium"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>

              {/* Mobile Menu */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden h-8 w-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Menu"
              >
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-foreground/5 backdrop-blur-sm z-50"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: language === "ar" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: language === "ar" ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className={`fixed top-0 ${
                language === "ar" ? "right-0" : "left-0"
              } h-full w-72 max-w-[80vw] bg-background z-50 shadow-xl`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 h-12 border-b border-border/20">
                  <span className="font-display tracking-[0.2em] text-sm">CALAPRES</span>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 text-foreground/50 hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                <nav className="flex-1 px-5 py-6 space-y-1">
                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className={`block py-2.5 text-sm tracking-[0.12em] transition-colors ${
                      location.pathname === "/" ? "text-foreground" : "text-foreground/50"
                    }`}
                  >
                    {t("الرئيسية", "Home")}
                  </Link>

                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block py-2.5 text-sm tracking-[0.12em] transition-colors ${
                        isActive(item.href) ? "text-foreground" : "text-foreground/50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="px-5 py-5 border-t border-border/20 space-y-3">
                  <Link
                    to={user ? "/account" : "/auth"}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 text-foreground/50 hover:text-foreground transition-colors"
                  >
                    <User className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-sm">{t("حسابي", "Account")}</span>
                  </Link>

                  <button
                    onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                    className="flex items-center justify-between w-full text-foreground/50 hover:text-foreground transition-colors"
                  >
                    <span className="text-sm">{t("اللغة", "Language")}</span>
                    <span className="text-xs tracking-[0.15em]">
                      {language === "ar" ? "EN" : "ع"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.aside>
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
            className="fixed inset-0 bg-background/97 backdrop-blur-xl z-50 flex items-start justify-center pt-[18vh]"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ delay: 0.05 }}
              className="w-full max-w-md px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                placeholder={t("ابحث...", "Search...")}
                className="w-full px-0 py-3 bg-transparent border-b border-foreground/15 focus:border-foreground text-xl font-display tracking-wide focus:outline-none transition-colors text-center placeholder:text-foreground/25"
                autoFocus
              />
              <p className="text-[10px] text-foreground/30 mt-5 text-center tracking-[0.2em] uppercase">
                {t("Esc للإغلاق", "Esc to close")}
              </p>
            </motion.div>

            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-5 end-5 p-2 text-foreground/30 hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="h-12 lg:h-14" />
    </>
  );
};

export default Header;
