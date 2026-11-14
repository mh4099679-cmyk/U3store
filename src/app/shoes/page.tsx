import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footprints, SlidersHorizontal, ChevronDown } from "lucide-react";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductCard, ProductSummary } from "@/components/store/ProductCard";
import { DepartmentFilterBar } from "@/components/store/DepartmentFilterBar";

export const dynamic = "force-dynamic";

export default async function ShoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";
  if (visibleCategories === "CLOTHING_ONLY") {
    redirect("/clothing");
  }

  const collectionSlug = (sp.collection || "").trim();
  const sizeFilter = (sp.size || "").trim();
  const colorFilter = (sp.color || "").trim();
  const sort = (sp.sort || "newest").trim();
  const inStockOnly = sp.inStock === "1";

  // Shoes collections
  const collections = queryAll<any>(
    db,
    `SELECT * FROM collections WHERE product_type = 'SHOES' AND is_active = 1 ORDER BY sort_order ASC`
  );

  // Distinct shoe sizes
  const distinctSizes = queryAll<{ size: string }>(
    db,
    `SELECT DISTINCT pv.size 
     FROM product_variants pv 
     JOIN products p ON p.id = pv.product_id 
     WHERE p.product_type = 'SHOES' AND pv.is_active = 1 
     ORDER BY CAST(pv.size AS INTEGER) ASC, pv.size ASC`
  );

  // Distinct shoe colors
  const distinctColors = queryAll<{ color_en: string; color_ar: string }>(
    db,
    `SELECT DISTINCT pv.color_en, pv.color_ar 
     FROM product_variants pv 
     JOIN products p ON p.id = pv.product_id 
     WHERE p.product_type = 'SHOES' AND pv.is_active = 1 
     ORDER BY pv.color_en ASC`
  );

  // Fetch all shoes products
  let allShoes = queryAll<ProductSummary & { collection_slug?: string }>(
    db,
    `SELECT p.id, p.slug, p.product_type, p.regular_price, p.sale_price, p.is_new_arrival, p.is_featured, p.is_best_seller,
            col.slug as collection_slug,
            pt_en.name as name_en, pt_ar.name as name_ar,
            ct_en.name as category_name_en, ct_ar.name as category_name_ar,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) as main_image,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1 OFFSET 1) as secondary_image,
            (SELECT COALESCE(SUM(inv.on_hand - inv.reserved), 0)
             FROM product_variants pv
             LEFT JOIN inventory inv ON inv.variant_id = pv.id
             WHERE pv.product_id = p.id AND pv.is_active = 1) as total_available_stock
     FROM products p
     LEFT JOIN collections col ON col.id = p.collection_id
     LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
     LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
     LEFT JOIN category_translations ct_en ON ct_en.category_id = p.category_id AND ct_en.lang = 'en'
     LEFT JOIN category_translations ct_ar ON ct_ar.category_id = p.category_id AND ct_ar.lang = 'ar'
     WHERE p.status = 'ACTIVE' AND p.product_type = 'SHOES'
     ORDER BY p.created_at DESC`
  );

  const filteredShoes = allShoes.filter((p) => {
    if (collectionSlug && p.collection_slug !== collectionSlug) return false;
    if (inStockOnly && Number(p.total_available_stock || 0) <= 0) return false;

    if (sizeFilter || colorFilter) {
      const match = queryAll<any>(
        db,
        `SELECT pv.id FROM product_variants pv 
         WHERE pv.product_id = ? AND pv.is_active = 1
           AND (? = '' OR pv.size = ?)
           AND (? = '' OR LOWER(pv.color_en) = LOWER(?))`,
        [p.id, sizeFilter, sizeFilter, colorFilter, colorFilter]
      );
      if (match.length === 0) return false;
    }
    return true;
  });

  // Sorting
  if (sort === "price-asc") {
    filteredShoes.sort((a, b) => {
      const pA = a.sale_price ? Number(a.sale_price) : Number(a.regular_price);
      const pB = b.sale_price ? Number(b.sale_price) : Number(b.regular_price);
      return pA - pB;
    });
  } else if (sort === "price-desc") {
    filteredShoes.sort((a, b) => {
      const pA = a.sale_price ? Number(a.sale_price) : Number(a.regular_price);
      const pB = b.sale_price ? Number(b.sale_price) : Number(b.regular_price);
      return pB - pA;
    });
  }

  const isRtl = lang === "ar";

  return (
    <StoreShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Page Header */}
        <div className="border-b-2 border-jet pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-heading font-extrabold uppercase tracking-[0.2em] text-neutralgray">
              <Footprints className="w-4 h-4 text-jet" />
              <span>{isRtl ? "قسم الأحذية الفاخرة" : "FOOTWEAR CATALOG"}</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black text-jet tracking-tight mt-1">
              {isRtl ? "الأحذية" : "SHOES"}
            </h1>
            <p className="text-xs sm:text-sm text-neutralgray mt-1">
              {isRtl
                ? "تصفح تشكيلة الأحذية والسنيكرز الفاخرة بالكامل."
                : "Explore the complete contemporary streetwear sneaker collection."}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-neutralgray">
            <span>
              {isRtl
                ? `${filteredShoes.length} موديل متوفر`
                : `${filteredShoes.length} styles available`}
            </span>
          </div>
        </div>

        {/* Filter & Collections Bar */}
        <div className="space-y-4">
          {/* Collections Pills */}
          {collections.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <Link
                href="/shoes"
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-colors ${
                  !collectionSlug
                    ? "bg-[#111214] text-white"
                    : "bg-white text-jet border border-silver/80 hover:border-jet"
                }`}
              >
                {isRtl ? "جميع الأحذية" : "All Shoes"}
              </Link>
              {collections.map((c) => {
                const active = collectionSlug === c.slug;
                return (
                  <Link
                    key={c.id}
                    href={`/shoes?collection=${c.slug}`}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-colors ${
                      active
                        ? "bg-[#111214] text-white"
                        : "bg-white text-jet border border-silver/80 hover:border-jet"
                    }`}
                  >
                    {isRtl ? c.name_ar || c.name_en : c.name_en}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Secondary Controls: Size Filter, Color Filter, In Stock Toggle, Sort */}
          <DepartmentFilterBar
            distinctSizes={distinctSizes}
            distinctColors={distinctColors}
            sizeFilter={sizeFilter}
            colorFilter={colorFilter}
            inStockOnly={inStockOnly}
            sort={sort}
            isRtl={isRtl}
            productType="SHOES"
          />
        </div>

        {/* Products Grid */}
        {filteredShoes.length === 0 ? (
          <div className="bg-white border border-silver/60 p-12 text-center rounded-2xl space-y-4">
            <Footprints className="w-10 h-10 text-neutralgray mx-auto" />
            <h3 className="font-heading text-lg font-bold text-jet">
              {isRtl ? "لم يتم العثور على أحذية مطابقة" : "No shoes match your selected filters"}
            </h3>
            <p className="text-xs text-neutralgray">
              {isRtl
                ? "جرب إزالة بعض الفلاتر لعرض الموديلات الأخرى المتوفرة."
                : "Try clearing filters to see all available footwear."}
            </p>
            <Link
              href="/shoes"
              className="inline-block bg-[#111214] text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              {isRtl ? "إعادة ضبط الفلاتر" : "Reset Filters"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredShoes.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </StoreShell>
  );
}

