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
      { label: t("المجموعات", "Collections"), href: "/collections" },
      { label: t("صمم هديتك", "Build"), href: "/bundle-builder" },
      { label: t("تتبع الطلب", "Track"), href: "/track-order" },
    ],
    [t]
  );

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const DesktopNavLink = ({ label, href }: { label: string; href: string }) => (
    <Link to={href} className="group relative px-1 py-2">
      <span
        className={`text-[12px] tracking-[0.18em] uppercase transition-colors duration-300 ${
          isActive(href)
            ? "text-foreground"
            : "text-foreground/55 group-hover:text-foreground"
        }`}
      >
        {label}
      </span>
      <span
        className={`absolute left-1/2 -translate-x-1/2 -bottom-0.5 h-px bg-foreground transition-all duration-300 ${
          isActive(href) ? "w-6" : "w-0 group-hover:w-6"
        }`}
      />
    </Link>
  );

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-background/92 backdrop-blur-xl shadow-[0_1px_0_0_hsl(var(--border)/0.22)]"
            : "bg-transparent"
        }`}
      >
        <div className="container-luxury">
          {/* Ultra-minimal luxury bar */}
          <div
            className={`grid items-center h-14 lg:h-16 ${
              language === "ar" ? "[grid-template-columns:1fr_auto_1fr]" : "[grid-template-columns:1fr_auto_1fr]"
            }`}
          >
            {/* Left */}
            <div
              className={`flex items-center gap-1 ${
                language === "ar" ? "justify-start" : "justify-start"
              }`}
            >
              <button
                className="lg:hidden p-2 text-foreground/60 hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Menu"
              >
                <Menu className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>

              <nav className="hidden lg:flex items-center gap-6">
                <DesktopNavLink label={navItems[0].label} href={navItems[0].href} />
                <DesktopNavLink label={navItems[1].label} href={navItems[1].href} />
              </nav>
            </div>

            {/* Center - Brand */}
            <div className="flex items-center justify-center">
              <Link to="/" aria-label="CALAPRES">
                <motion.div
                  initial={false}
                  animate={{ y: isScrolled ? 0 : 1, letterSpacing: isScrolled ? "0.18em" : "0.22em" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="font-display text-[17px] lg:text-[19px] font-light text-foreground tracking-[0.22em]"
                >
                  CALAPRES
                </motion.div>
              </Link>
            </div>

            {/* Right */}
            <div
              className={`flex items-center justify-end gap-1 lg:gap-2 ${
                language === "ar" ? "justify-end" : "justify-end"
              }`}
            >
              {/* Desktop: one link on right to balance */}
              <nav className="hidden lg:flex items-center me-1">
                <DesktopNavLink label={navItems[2].label} href={navItems[2].href} />
              </nav>

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
                to={user ? "/account" : "/auth"}
                className="p-2 text-foreground/60 hover:text-foreground transition-colors"
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
                    className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 bg-foreground text-background text-[9px] flex items-center justify-center rounded-full font-medium"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>

              {/* Language */}
              <button
                onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                className="hidden lg:inline-flex items-center h-8 px-3 text-[11px] tracking-[0.22em] uppercase text-foreground/55 hover:text-foreground transition-colors"
                aria-label="Language"
              >
                {language === "ar" ? "EN" : "AR"}
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
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-50"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: language === "ar" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: language === "ar" ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className={`fixed top-0 ${
                language === "ar" ? "right-0" : "left-0"
              } h-full w-[22rem] max-w-[86vw] bg-background z-50 shadow-2xl`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 h-14 border-b border-border/30">
                  <span className="font-display tracking-[0.18em] text-sm">CALAPRES</span>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 text-foreground/60 hover:text-foreground transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                <nav className="flex-1 px-5 py-6 space-y-1">
                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className={`block py-3 text-sm tracking-[0.16em] uppercase transition-colors ${
                      location.pathname === "/" ? "text-foreground" : "text-foreground/60"
                    }`}
                  >
                    {t("الرئيسية", "Home")}
                  </Link>

                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block py-3 text-sm tracking-[0.16em] uppercase transition-colors ${
                        isActive(item.href) ? "text-foreground" : "text-foreground/60"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="px-5 py-5 border-t border-border/30 space-y-4">
                  <Link
                    to={user ? "/account" : "/auth"}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <User className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-sm">{t("حسابي", "My Account")}</span>
                  </Link>

                  <button
                    onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                    className="flex items-center justify-between w-full text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <span className="text-sm">{t("اللغة", "Language")}</span>
                    <span className="text-xs tracking-[0.18em] uppercase">
                      {language === "ar" ? "EN" : "AR"}
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
            className="fixed inset-0 bg-background/96 backdrop-blur-xl z-50 flex items-start justify-center pt-[18vh]"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              transition={{ delay: 0.08 }}
              className="w-full max-w-xl px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                placeholder={t("ابحث...", "Search...")}
                className="w-full px-0 py-4 bg-transparent border-b border-foreground/20 focus:border-foreground text-2xl lg:text-3xl font-display tracking-wide focus:outline-none transition-colors text-center placeholder:text-foreground/30"
                autoFocus
              />
              <p className="text-xs text-foreground/40 mt-6 text-center tracking-[0.22em] uppercase">
                {t("اضغط Esc للإغلاق", "Press Esc to close")}
              </p>
            </motion.div>

            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-6 end-6 p-2 text-foreground/40 hover:text-foreground transition-colors"
              aria-label="Close search"
            >
              <X className="w-6 h-6" strokeWidth={1} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer (keeps layout stable under fixed header) */}
      <div className="h-14 lg:h-16" />
    </>
  );
};

export default Header;

