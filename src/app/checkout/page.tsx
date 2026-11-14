import React from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { getDb, queryAll } from "@/lib/db";
import { getStorefrontLanguage, getCurrentCustomer } from "@/lib/auth/session";
import { getPrivateCart } from "@/lib/services/cart";
import { t } from "@/lib/i18n/dictionaries";
import { StoreShell } from "@/components/store/StoreShell";
import { CheckoutClient } from "@/components/store/CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const lang = await getStorefrontLanguage();
  const customer = await getCurrentCustomer();
  const cart = await getPrivateCart(false);
  const db = await getDb();

  const governorates = queryAll<any>(
    db,
    `SELECT id, code, name_en, name_ar, shipping_rate, is_enabled, sort_order FROM governorates ORDER BY sort_order ASC, name_en ASC`
  );
  const cities = queryAll<any>(
    db,
    `SELECT id, governorate_id, name_en, name_ar, shipping_rate, is_enabled FROM cities WHERE is_enabled = 1 ORDER BY name_en ASC`
  );

  const savedAddresses = customer
    ? queryAll<any>(
        db,
        `SELECT ca.*, g.name_en as gov_name_en, g.name_ar as gov_name_ar
         FROM customer_addresses ca
         LEFT JOIN governorates g ON g.id = ca.governorate_id
         WHERE ca.user_id = ?
         ORDER BY ca.is_default DESC, ca.created_at DESC`,
        [customer.id]
      )
    : [];

  const initialCityId = savedAddresses[0]?.city_id || "";
  const areas = initialCityId
    ? queryAll<any>(
        db,
        `SELECT id, city_id, name_en, name_ar, shipping_rate, is_enabled FROM areas WHERE city_id = ? AND is_enabled = 1 ORDER BY name_en ASC`,
        [initialCityId]
      )
    : [];
  const paymentMethods = queryAll<any>(
    db,
    `SELECT * FROM payment_methods WHERE is_enabled = 1 ORDER BY code ASC`
  );

  return (
    <StoreShell>
      {/* Compact, Luxury Secure Checkout Header */}
      <div className="bg-[#111214] text-[#F7F7F5] py-4 sm:py-6 border-b border-[#292B2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#BFC2C6] mb-1 font-semibold">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>SECURE CHECKOUT</span>
              <span className="hidden sm:inline text-[#73777D]">•</span>
              <span className="hidden sm:inline text-[#73777D]">U3 STORE — LIVE YOURS.</span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {t(lang, "checkout.title")}
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-[#1A1C1F] border border-[#30343A] px-3 py-1.5 rounded-full text-[11px] text-[#D5D7DA]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium hidden xs:inline">{lang === "ar" ? "تشفير آمن 256-bit" : "256-bit SSL"}</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{lang === "ar" ? "معتمد" : "SECURE"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <CheckoutClient
          lang={lang}
          cart={cart}
          customer={customer}
          savedAddresses={savedAddresses}
          governorates={governorates}
          cities={cities}
          areas={areas}
          paymentMethods={paymentMethods}
        />
      </div>
    </StoreShell>
  );
}
