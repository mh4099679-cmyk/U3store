import React from "react";
import { redirect } from "next/navigation";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { getStorefrontLanguage, getCurrentCustomer } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { AccountDashboardClient } from "@/components/store/AccountDashboardClient";

export async function renderAccountPage(initialTab = "orders") {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const orders = queryAll<any>(
    db,
    `SELECT o.*,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
     FROM orders o
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [customer.id]
  );

  const addresses = queryAll<any>(
    db,
    `SELECT ca.*, g.name_en as gov_name_en, g.name_ar as gov_name_ar
     FROM customer_addresses ca
     LEFT JOIN governorates g ON g.id = ca.governorate_id
     WHERE ca.user_id = ?
     ORDER BY ca.is_default DESC, ca.created_at DESC`,
    [customer.id]
  );

  const wl = queryOne<any>(db, `SELECT id FROM wishlists WHERE user_id = ?`, [customer.id]);
  const wishlistItems = wl
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
        [wl.id]
      )
    : [];

  const returns = queryAll<any>(
    db,
    `SELECT rr.*, o.order_number
     FROM return_requests rr
     JOIN orders o ON o.id = rr.order_id
     WHERE rr.user_id = ?
     ORDER BY rr.created_at DESC`,
    [customer.id]
  );

  const notifications = queryAll<any>(
    db,
    `SELECT * FROM notifications
     WHERE recipient_type = 'CUSTOMER' AND recipient_user_id = ?
     ORDER BY created_at DESC LIMIT 50`,
    [customer.id]
  );

  const governorates = queryAll<any>(db, `SELECT * FROM governorates ORDER BY sort_order ASC`);
  const cities = queryAll<any>(db, `SELECT * FROM cities WHERE is_enabled = 1`);
  const areas = queryAll<any>(db, `SELECT * FROM areas WHERE is_enabled = 1`);

  return (
    <StoreShell>
      <div className="bg-jet text-offwhite py-10 border-b border-darkgray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.25em] text-silver mb-1">
            U3 STORE — PRIVATE CUSTOMER ACCOUNT
          </p>
          <h1 className="font-heading text-3xl font-bold">{customer.fullName}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AccountDashboardClient
          lang={lang}
          initialTab={initialTab}
          customer={customer}
          orders={orders}
          addresses={addresses}
          wishlistItems={wishlistItems}
          returns={returns}
          notifications={notifications}
          governorates={governorates}
          cities={cities}
          areas={areas}
        />
      </div>
    </StoreShell>
  );
}

