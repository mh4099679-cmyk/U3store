import React from "react";
import Link from "next/link";
import { getDb, queryAll, queryOne } from "@/lib/db";
import {
  getStorefrontLanguage,
  getCurrentCustomer,
  getOrCreateGuestSession,
} from "@/lib/auth/session";
import { t, formatCurrency } from "@/lib/i18n/dictionaries";
import { StoreShell } from "@/components/store/StoreShell";

export const dynamic = "force-dynamic";

export default async function AccountWishlistPage() {
  const lang = await getStorefrontLanguage();
  const customer = await getCurrentCustomer();
  const guest = await getOrCreateGuestSession(false);
  const db = await getDb();

  let wlId = "";
  if (customer) {
    wlId = queryOne<any>(db, `SELECT id FROM wishlists WHERE user_id = ?`, [customer.id])?.id || "";
  } else if (guest) {
    wlId =
      queryOne<any>(db, `SELECT id FROM wishlists WHERE guest_session_id = ?`, [guest.id])?.id || "";
  }

  const items = wlId
    ? queryAll<any>(
        db,
        `SELECT wi.id, wi.product_id, p.slug, p.regular_price, p.sale_price,
                pt_en.name as name_en, pt_ar.name as name_ar,
                (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) as image_url
         FROM wishlist_items wi
         JOIN products p ON p.id = wi.product_id
         LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
         LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
         WHERE wi.wishlist_id = ? AND p.status = 'ACTIVE'`,
        [wlId]
      )
    : [];

  return (
    <StoreShell>
      <div className="bg-jet text-offwhite py-10 border-b border-darkgray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold">{t(lang, "nav.wishlist")}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {items.length === 0 ? (
          <div className="bg-white border border-silver/60 p-12 text-center space-y-4">
            <p className="font-heading text-lg font-bold text-jet">
              {lang === "ar" ? "قائمة المفضلة الخاصة بك فارغة." : "Your private wishlist is empty."}
            </p>
            <Link
              href="/shop"
              className="inline-block bg-jet text-offwhite text-xs font-bold uppercase tracking-widest px-8 py-3"
            >
              {t(lang, "nav.shop")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.slug}`}
                className="bg-white border border-silver/60 hover:border-jet p-4 space-y-3 block"
              >
                <img
                  src={item.image_url || "/logo.jpg"}
                  alt=""
                  className="w-full aspect-square object-cover"
                />
                <h3 className="font-heading font-bold text-base text-jet">
                  {lang === "ar" ? item.name_ar || item.name_en : item.name_en}
                </h3>
                <p className="text-sm font-bold text-jet">
                  {formatCurrency(item.sale_price || item.regular_price, lang)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StoreShell>
  );
}

