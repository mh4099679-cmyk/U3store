"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { Language, t } from "@/lib/i18n/dictionaries";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface HeaderProps {
  lang: Language;
  cartCount: number;
  wishlistCount: number;
  customerName?: string | null;
  navLinks?: Array<{ id: string; label_en: string; label_ar: string; href: string }>;
  visibleCategories?: string;
  announcementTextEn?: string;
  announcementTextAr?: string;
  announcementEnabled?: boolean;
}

export function StoreHeader({
  lang,
  cartCount,
  wishlistCount,
  customerName,
  navLinks = [],
  visibleCategories = "BOTH",
  announcementTextEn,
  announcementTextAr,
  announcementEnabled = true,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switchingLang, setSwitchingLang] = useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const toggleBtnRef = React.useRef<HTMLButtonElement>(null);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu when clicking outside anywhere on the site
  React.useEffect(() => {
    if (!mobileOpen) return;
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        drawerRef.current &&
        !drawerRef.current.contains(target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(target)
      ) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [mobileOpen]);

  async function switchLanguage(nextLang: Language) {
    if (nextLang === lang || switchingLang) return;
    setSwitchingLang(true);
    try {
      await fetch("/api/lang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: nextLang, scope: "store" }),
      });
      router.refresh();
    } finally {
      setSwitchingLang(false);
    }
  }

  // Clean, minimal primary links without category crowding
  const defaultLinks = [
    { id: "home", label_en: "Home", label_ar: "الرئيسية", href: "/" },
    { id: "collections", label_en: "Collections", label_ar: "المجموعات", href: "/collections" },
    { id: "shop", label_en: "Shop All", label_ar: "جميع المنتجات", href: "/shop" },
    { id: "track-order", label_en: "Track Order", label_ar: "تتبع الطلب", href: "/track-order" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    const baseHref = href.split("?")[0];
    if (baseHref === "/shop") {
      return pathname === "/shop";
    }
    if (pathname === baseHref) return true;
    return pathname.startsWith(`${baseHref}/`);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#111214]/95 backdrop-blur-md text-[#F7F7F5] border-b border-[#292B2E] no-print">
      {/* Top Announcement Bar */}
      {announcementEnabled && (
        <div className="bg-[#1A1C1F] text-[#E1E3E5] text-[10px] sm:text-[11px] py-1 sm:py-1.5 px-3 sm:px-4 border-b border-[#292B2E]">
          <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-[#BFC2C6] shrink-0" />
              <span className="tracking-wide truncate">
                {lang === "ar"
                  ? announcementTextAr || "U3 STORE — LIVE YOURS. | شحن لجميع محافظات مصر الـ ٢٧"
                  : announcementTextEn ||
                    "U3 STORE — LIVE YOURS. | Shipping Across All 27 Egyptian Governorates"}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-4 shrink-0">
              <Link
                href="/track-order"
                className="u3-link-underline text-[#BFC2C6] hover:text-white transition-colors text-xs"
              >
                {t(lang, "nav.track_order")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Header Navigation */}
      <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Official Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            ref={toggleBtnRef}
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 text-[#BFC2C6] hover:text-white transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <img
              src="/logo.png"
              alt="U3 STORE Official Logo"
              className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover border border-[#BFC2C6]/40 shadow-sm group-hover:border-white transition-colors"
            />
            <div className="flex flex-col">
              <span className="font-heading text-base sm:text-xl font-bold tracking-[0.16em] sm:tracking-[0.18em] text-white leading-tight">
                U3 STORE
              </span>
              <span className="text-[8px] sm:text-[9px] tracking-[0.22em] text-[#BFC2C6] uppercase">
                {lang === "ar" ? "اصنع أسلوبك الخاص" : "LIVE YOURS."}
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Primary Navigation Links with Active & Hover Indicator */}
        <nav className="hidden lg:flex items-center gap-8">
          {defaultLinks.map((item) => {
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative py-1 text-xs font-heading font-semibold tracking-[0.15em] uppercase transition-colors ${
                  active
                    ? "text-white"
                    : "text-[#BFC2C6] hover:text-white u3-link-underline"
                }`}
              >
                {lang === "ar" ? item.label_ar : item.label_en}
                {active && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-[1.5px] bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Theme Switcher (Light/Dark) + Language Switcher (EN/AR) + Icons */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <div className="hidden sm:block">
            <ThemeSwitcher scope="storefront" lang={lang} />
          </div>

          {/* Visible EN / AR Switcher */}
          <div className="flex items-center border border-[#44474C] bg-[#1A1C1F] rounded-sm p-0.5 text-[9px] sm:text-[10px] font-bold">
            <button
              type="button"
              onClick={() => switchLanguage("en")}
              disabled={switchingLang}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm transition-colors ${
                lang === "en"
                  ? "bg-white text-[#111214]"
                  : "text-[#BFC2C6] hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => switchLanguage("ar")}
              disabled={switchingLang}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm transition-colors ${
                lang === "ar"
                  ? "bg-white text-[#111214]"
                  : "text-[#BFC2C6] hover:text-white"
              }`}
            >
              AR
            </button>
          </div>

          <Link
            href="/search"
            className="p-1.5 sm:p-2 text-[#BFC2C6] hover:text-white transition-colors"
            title={t(lang, "nav.search")}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>

          <Link
            href="/account/wishlist"
            className="relative p-1.5 sm:p-2 text-[#BFC2C6] hover:text-white transition-colors"
            title={t(lang, "nav.wishlist")}
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-white text-[#111214] text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            className="relative p-1.5 sm:p-2 text-[#BFC2C6] hover:text-white transition-colors flex items-center gap-1"
            title={t(lang, "nav.bag")}
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="bg-[#292B2E] border border-[#BFC2C6]/40 text-white text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-sm tabular-nums">
              {cartCount}
            </span>
          </Link>

          <Link
            href={customerName ? "/account" : "/account/login"}
            className="p-1.5 sm:p-2 text-[#BFC2C6] hover:text-white transition-colors flex items-center relative"
            title={customerName ? (lang === "ar" ? `حسابي (${customerName})` : `My Account (${customerName})`) : t(lang, "nav.my_account")}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            {customerName && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Backdrop Overlay - Closes menu when tapping anywhere on the site */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-16 sm:top-20 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Drawer - Premium Streetwear Style */}
      {mobileOpen && (
        <div
          ref={drawerRef}
          className="relative z-50 lg:hidden bg-[#111214]/98 backdrop-blur-2xl border-t border-[#292B2E] px-4 pt-4 pb-8 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200"
        >
          <div className="pb-3 border-b border-[#292B2E] flex items-center justify-between">
            <span className="text-xs font-bold text-[#BFC2C6] uppercase tracking-wider font-heading">
              {lang === "ar" ? "المظهر والهوية" : "Theme & Appearance"}
            </span>
            <ThemeSwitcher scope="storefront" lang={lang} />
          </div>

          <div className="space-y-1">
            {defaultLinks.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between py-3 px-3.5 rounded-xl text-sm font-heading font-semibold transition-all ${
                    active
                      ? "bg-white text-[#111214] shadow-sm font-bold"
                      : "text-[#E1E3E5] hover:bg-[#1A1C1F] hover:text-white"
                  }`}
                >
                  <span>{lang === "ar" ? item.label_ar : item.label_en}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111214]" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#292B2E] grid grid-cols-2 gap-2 text-xs">
            <Link
              href={customerName ? "/account" : "/account/login"}
              onClick={() => setMobileOpen(false)}
              className="p-3 rounded-xl bg-[#1A1C1F] border border-[#292B2E] text-center text-[#E1E3E5] hover:text-white font-medium"
            >
              {customerName ? (lang === "ar" ? "حسابي الشخصي" : "My Account") : t(lang, "nav.login")}
            </Link>
            <Link
              href="/track-order"
              onClick={() => setMobileOpen(false)}
              className="p-3 rounded-xl bg-[#1A1C1F] border border-[#292B2E] text-center text-[#E1E3E5] hover:text-white font-medium"
            >
              {t(lang, "nav.track_order")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
