"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Search, ShoppingBag, User } from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";

interface MobileBottomNavProps {
  lang: Language;
  cartCount: number;
  wishlistCount: number;
  customerName?: string | null;
}

export function MobileBottomNav({
  lang,
  cartCount,
  customerName,
}: MobileBottomNavProps) {
  const pathname = usePathname() || "/";

  // Distraction-free funnel: Hide mobile bottom bar on checkout and order confirmation
  if (pathname.startsWith("/checkout") || pathname.startsWith("/order-confirmation")) {
    return null;
  }

  const isHome = pathname === "/";
  const isShop = pathname.startsWith("/shop") || pathname.startsWith("/collections") || pathname.startsWith("/new-arrivals") || pathname.startsWith("/products");
  const isSearch = pathname.startsWith("/search");
  const isCart = pathname.startsWith("/cart") || pathname.startsWith("/checkout");
  const isAccount = pathname.startsWith("/account");

  const navItems = [
    {
      id: "home",
      label: lang === "ar" ? "الرئيسية" : "Home",
      href: "/",
      icon: Home,
      active: isHome,
    },
    {
      id: "shop",
      label: lang === "ar" ? "المتجر" : "Shop",
      href: "/shop",
      icon: Compass,
      active: isShop && !isHome,
    },
    {
      id: "search",
      label: lang === "ar" ? "بحث" : "Search",
      href: "/search",
      icon: Search,
      active: isSearch,
    },
    {
      id: "cart",
      label: lang === "ar" ? "الحقيبة" : "Cart",
      href: "/cart",
      icon: ShoppingBag,
      active: isCart,
      badge: cartCount > 0 ? cartCount : null,
    },
    {
      id: "account",
      label: customerName ? (lang === "ar" ? "حسابي" : "Account") : (lang === "ar" ? "دخول" : "Login"),
      href: customerName ? "/account" : "/account/login",
      icon: User,
      active: isAccount,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-50 sm:hidden bg-[#111214]/94 backdrop-blur-xl border-t border-[#292B2E] text-white shadow-[0_-8px_30px_rgba(0,0,0,0.45)] no-print"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}
    >
      <div className="grid grid-cols-5 h-14 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex flex-col items-center justify-center h-full py-1 transition-all duration-200 active:scale-90 ${
                item.active ? "text-white" : "text-[#8E9298] hover:text-white"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    item.active ? "scale-110 text-white" : ""
                  }`}
                  strokeWidth={item.active ? 2.3 : 1.8}
                />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-white text-[#111214] font-bold text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 leading-none ${
                  item.active ? "text-white font-bold" : "text-[#8E9298]"
                }`}
              >
                {item.label}
              </span>
              {item.active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
