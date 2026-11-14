import React from "react";
import { ShoppingBag } from "lucide-react";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { getPrivateCart } from "@/lib/services/cart";
import { t } from "@/lib/i18n/dictionaries";
import { StoreShell } from "@/components/store/StoreShell";
import { CartClient } from "@/components/store/CartClient";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const lang = await getStorefrontLanguage();
  const cart = await getPrivateCart(false);

  return (
    <StoreShell>
      {/* Sleek, Compact Header */}
      <div className="bg-[#111214] text-[#F7F7F5] py-4 sm:py-6 border-b border-[#292B2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#BFC2C6] mb-1 font-semibold">
              U3 STORE — LIVE YOURS.
            </p>
            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {t(lang, "cart.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-[#1A1C1F] border border-[#30343A] px-3 py-1.5 rounded-full text-xs text-[#D5D7DA]">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono font-bold">{cart.items.length}</span>
            <span className="text-[11px] text-[#92969D]">{lang === "ar" ? "منتجات" : "items"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <CartClient initialCart={cart} lang={lang} />
      </div>
    </StoreShell>
  );
}
