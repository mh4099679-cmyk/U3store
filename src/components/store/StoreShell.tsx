import React from "react";
import { getDb, queryAll, queryOne } from "@/lib/db";
import {
  getStorefrontLanguage,
  getCurrentCustomer,
  getOrCreateGuestSession,
} from "@/lib/auth/session";
import { getPrivateCart } from "@/lib/services/cart";
import { StoreHeader } from "./StoreHeader";
import { StoreFooter } from "./StoreFooter";
import { MarqueeStrip } from "./MarqueeStrip";
import { MobileBottomNav } from "./MobileBottomNav";
import { SplashScreen } from "./SplashScreen";

export async function StoreShell({ children }: { children: React.ReactNode }) {
  const lang = await getStorefrontLanguage();
  const customer = await getCurrentCustomer();
  const guest = await getOrCreateGuestSession(false);
  const cart = await getPrivateCart(false);
  const db = await getDb();

  let wishlistCount = 0;
  if (customer) {
    const wl = queryOne<any>(db, `SELECT id FROM wishlists WHERE user_id = ?`, [customer.id]);
    if (wl) {
      wishlistCount =
        queryOne<{ c: number }>(
          db,
          `SELECT COUNT(*) as c FROM wishlist_items WHERE wishlist_id = ?`,
          [wl.id]
        )?.c || 0;
    }
  } else if (guest) {
    const wl = queryOne<any>(db, `SELECT id FROM wishlists WHERE guest_session_id = ?`, [guest.id]);
    if (wl) {
      wishlistCount =
        queryOne<{ c: number }>(
          db,
          `SELECT COUNT(*) as c FROM wishlist_items WHERE wishlist_id = ?`,
          [wl.id]
        )?.c || 0;
    }
  }

  const navLinks = queryAll<any>(
    db,
    `SELECT * FROM navigation_links WHERE location = 'HEADER' AND is_visible = 1 ORDER BY sort_order ASC`
  );
  const footerLinks = queryAll<any>(
    db,
    `SELECT * FROM navigation_links WHERE location = 'FOOTER' AND is_visible = 1 ORDER BY sort_order ASC`
  );
  const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
  const appearance = queryOne<any>(db, `SELECT * FROM appearance_settings WHERE id = 'default'`);
  const footerSettings = queryOne<any>(db, `SELECT * FROM footer_settings WHERE id = 'default'`);
  const marqueeSettings = queryOne<any>(db, `SELECT * FROM marquee_settings WHERE id = 'default'`);
  const saleCampaign = queryOne<any>(db, `SELECT * FROM sale_campaigns WHERE id = 'archive_sale'`);
  const enabledPaymentMethods = queryAll<{ code: string }>(
    db,
    `SELECT code FROM payment_methods WHERE is_enabled = 1 ORDER BY code ASC`
  );

  const nowMs = Date.now();
  const campEndMs = saleCampaign?.ends_at ? new Date(saleCampaign.ends_at).getTime() : 0;
  const campStartMs = saleCampaign?.starts_at ? new Date(saleCampaign.starts_at).getTime() : 0;
  const isArchiveSaleActive =
    Boolean(saleCampaign?.is_active) &&
    saleCampaign?.show_in_footer !== 0 &&
    (!campStartMs || nowMs >= campStartMs) &&
    (!campEndMs || nowMs < campEndMs);

  const totalBagCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-offwhite text-jet">
      <SplashScreen />
      <StoreHeader
        lang={lang}
        cartCount={totalBagCount}
        wishlistCount={wishlistCount}
        customerName={customer?.fullName || null}
        navLinks={navLinks}
        visibleCategories={settings?.visible_categories || "BOTH"}
        announcementEnabled={appearance?.announcement_enabled !== 0}
        announcementTextEn={appearance?.announcement_en}
        announcementTextAr={appearance?.announcement_ar}
      />
      <MarqueeStrip lang={lang} config={marqueeSettings} campaign={saleCampaign} />
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      <StoreFooter
        lang={lang}
        settings={settings}
        footerSettings={footerSettings}
        footerLinks={footerLinks}
        enabledPaymentCodes={enabledPaymentMethods.map((m) => m.code)}
        isArchiveSaleActive={isArchiveSaleActive}
      />
      <MobileBottomNav
        lang={lang}
        cartCount={totalBagCount}
        wishlistCount={wishlistCount}
        customerName={customer?.fullName || null}
      />
    </div>
  );
}
