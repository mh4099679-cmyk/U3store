import React from "react";
import { notFound } from "next/navigation";
import { getDb, queryOne, queryAll } from "@/lib/db";
import {
  getStorefrontLanguage,
  getCurrentCustomer,
  getOrCreateGuestSession,
} from "@/lib/auth/session";
import { t } from "@/lib/i18n/dictionaries";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductDetailClient } from "@/components/store/ProductDetailClient";
import { ProductCard, ProductSummary } from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const product = queryOne<any>(
    db,
    `SELECT p.*,
            pt_en.name as name_en, pt_en.description as description_en,
            pt_ar.name as name_ar, pt_ar.description as description_ar,
            ct_en.name as category_name_en, ct_ar.name as category_name_ar
     FROM products p
     LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
     LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
     LEFT JOIN category_translations ct_en ON ct_en.category_id = p.category_id AND ct_en.lang = 'en'
     LEFT JOIN category_translations ct_ar ON ct_ar.category_id = p.category_id AND ct_ar.lang = 'ar'
     WHERE p.slug = ? AND p.status = 'ACTIVE'`,
    [slug]
  );

  if (!product) {
    notFound();
  }

  // Security & display rule: If the product's type is hidden by Admin Store Display Settings, do not reveal it
  const settings = queryOne<any>(db, `SELECT visible_categories FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";
  if (visibleCategories === "SHOES_ONLY" && product.product_type === "CLOTHING") {
    notFound();
  }
  if (visibleCategories === "CLOTHING_ONLY" && product.product_type === "SHOES") {
    notFound();
  }

  const images = queryAll<any>(
    db,
    `SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC`,
    [product.id]
  );

  const variants = queryAll<any>(
    db,
    `SELECT pv.*, COALESCE(inv.on_hand, 0) as on_hand, COALESCE(inv.reserved, 0) as reserved
     FROM product_variants pv
     LEFT JOIN inventory inv ON inv.variant_id = pv.id
     WHERE pv.product_id = ? AND pv.is_active = 1
     ORDER BY pv.color_en ASC, pv.size ASC`,
    [product.id]
  );

  // Check if wishlisted by current private session
  const customer = await getCurrentCustomer();
  const guest = await getOrCreateGuestSession(false);
  let wishlisted = false;
  if (customer) {
    const row = queryOne<any>(
      db,
      `SELECT wi.id FROM wishlist_items wi JOIN wishlists w ON w.id = wi.wishlist_id WHERE w.user_id = ? AND wi.product_id = ?`,
      [customer.id, product.id]
    );
    wishlisted = Boolean(row);
  } else if (guest) {
    const row = queryOne<any>(
      db,
      `SELECT wi.id FROM wishlist_items wi JOIN wishlists w ON w.id = wi.wishlist_id WHERE w.guest_session_id = ? AND wi.product_id = ?`,
      [guest.id, product.id]
    );
    wishlisted = Boolean(row);
  }

  const targetProductType = product.product_type || "SHOES";

  // Strict Department Visibility Constraint:
  // If SHOES_ONLY -> only SHOES. If CLOTHING_ONLY -> only CLOTHING. If BOTH -> match the viewing product's type.
  let targetDepartment = targetProductType;
  if (visibleCategories === "SHOES_ONLY") {
    targetDepartment = "SHOES";
  } else if (visibleCategories === "CLOTHING_ONLY") {
    targetDepartment = "CLOTHING";
  }

  const relatedProducts = queryAll<ProductSummary>(
    db,
    `SELECT p.id, p.slug, p.product_type, p.regular_price, p.sale_price, p.is_new_arrival, p.is_featured, p.is_best_seller,
            pt_en.name as name_en, pt_ar.name as name_ar,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) as main_image,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1 OFFSET 1) as secondary_image,
            (SELECT COALESCE(SUM(inv.on_hand - inv.reserved), 0)
             FROM product_variants pv
             LEFT JOIN inventory inv ON inv.variant_id = pv.id
             WHERE pv.product_id = p.id AND pv.is_active = 1) as total_available_stock
     FROM products p
     LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
     LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
     WHERE p.status = 'ACTIVE' AND p.id != ? AND p.product_type = ?
     ORDER BY CASE WHEN p.category_id = ? THEN 0 ELSE 1 END, p.created_at DESC
     LIMIT 4`,
    [product.id, targetDepartment, product.category_id || ""]
  );

  const relatedTitle =
    targetProductType === "CLOTHING"
      ? (lang === "ar" ? "قطع ملابس ذات صلة" : "Related Apparel")
      : (lang === "ar" ? "أحذية ذات صلة" : "Related Footwear");

  return (
    <StoreShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <ProductDetailClient
          lang={lang}
          product={product}
          images={images}
          variants={variants}
          initialWishlisted={wishlisted}
        />

        {relatedProducts.length > 0 && (
          <section className="space-y-6 border-t border-silver/50 pt-12">
            <h2 className="font-heading text-2xl font-bold text-jet">
              {relatedTitle}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {relatedProducts.map((rp) => (
                <ProductCard key={rp.id} product={rp} lang={lang} />
              ))}
            </div>
          </section>
        )}
      </div>
    </StoreShell>
  );
}

