import React from "react";
import { notFound } from "next/navigation";
import { Footprints, Shirt } from "lucide-react";
import { getDb, queryOne, queryAll } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductCard, ProductSummary } from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const collection = queryOne<any>(
    db,
    `SELECT * FROM collections WHERE slug = ? AND is_active = 1`,
    [slug]
  );
  if (!collection) notFound();

  const settings = queryOne<any>(db, `SELECT visible_categories FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";
  if (visibleCategories === "SHOES_ONLY" && collection.product_type === "CLOTHING") {
    notFound();
  }
  if (visibleCategories === "CLOTHING_ONLY" && collection.product_type === "SHOES") {
    notFound();
  }

  const products = queryAll<ProductSummary>(
    db,
    `SELECT p.id, p.slug, p.product_type, p.regular_price, p.sale_price, p.is_new_arrival, p.is_featured, p.is_best_seller,
            pt_en.name as name_en, pt_ar.name as name_ar,
            ct_en.name as category_name_en, ct_ar.name as category_name_ar,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) as main_image,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1 OFFSET 1) as secondary_image,
            (SELECT COALESCE(SUM(inv.on_hand - inv.reserved), 0)
             FROM product_variants pv
             LEFT JOIN inventory inv ON inv.variant_id = pv.id
             WHERE pv.product_id = p.id AND pv.is_active = 1) as total_available_stock
     FROM products p
     LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
     LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
     LEFT JOIN category_translations ct_en ON ct_en.category_id = p.category_id AND ct_en.lang = 'en'
     LEFT JOIN category_translations ct_ar ON ct_ar.category_id = p.category_id AND ct_ar.lang = 'ar'
     WHERE p.collection_id = ? AND p.status = 'ACTIVE' AND p.product_type = ?
     ORDER BY p.created_at DESC`,
    [collection.id, collection.product_type || "SHOES"]
  );

  const isRtl = lang === "ar";
  const isClothing = collection.product_type === "CLOTHING";

  return (
    <StoreShell>
      <div className="bg-[#111214] text-[#F7F7F5] py-8 sm:py-12 border-b border-[#292B2E] relative overflow-hidden">
        {collection.banner_desktop_url && (
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <img src={collection.banner_desktop_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#BFC2C6] border border-white/10">
            {isClothing ? <Shirt className="w-3 h-3" /> : <Footprints className="w-3 h-3" />}
            <span>{isClothing ? (isRtl ? "تشكيلة ملابس" : "APPAREL COLLECTION") : (isRtl ? "تشكيلة أحذية" : "FOOTWEAR COLLECTION")}</span>
          </div>

          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isRtl ? collection.name_ar || collection.name_en : collection.name_en}
          </h1>

          {collection.description_en && (
            <p className="text-xs sm:text-sm text-[#A7ABB1] max-w-2xl">
              {isRtl ? collection.description_ar || collection.description_en : collection.description_en}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {products.length === 0 ? (
          <div className="bg-white border border-silver/50 p-10 text-center text-sm text-neutralgray rounded-2xl">
            {isRtl
              ? "لا توجد منتجات منشورة داخل هذه المجموعة حالياً."
              : "No active products assigned to this collection yet."}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </StoreShell>
  );
}
