import React from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductCard, ProductSummary } from "@/components/store/ProductCard";
import { Sparkles, ArrowRight, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";

  let productTypeFilter = "";
  let categoryFilterCondition = "";
  if (visibleCategories === "SHOES_ONLY") {
    productTypeFilter = "AND p.product_type = 'SHOES'";
    categoryFilterCondition = "AND c.id IN (SELECT DISTINCT category_id FROM products WHERE product_type = 'SHOES' AND status = 'ACTIVE')";
  } else if (visibleCategories === "CLOTHING_ONLY") {
    productTypeFilter = "AND p.product_type = 'CLOTHING'";
    categoryFilterCondition = "AND c.id IN (SELECT DISTINCT category_id FROM products WHERE product_type = 'CLOTHING' AND status = 'ACTIVE')";
  }

  const categorySlug = (sp.category || "").trim();
  const sizeFilter = (sp.size || "").trim();
  const sort = (sp.sort || "newest").trim();

  const categories = queryAll<any>(
    db,
    `SELECT c.*, ct_en.name as name_en, ct_ar.name as name_ar
     FROM categories c
     LEFT JOIN category_translations ct_en ON ct_en.category_id = c.id AND ct_en.lang = 'en'
     LEFT JOIN category_translations ct_ar ON ct_ar.category_id = c.id AND ct_ar.lang = 'ar'
     WHERE c.is_active = 1 ${categoryFilterCondition}
     ORDER BY c.sort_order ASC`
  );

  const distinctSizes = queryAll<{ size: string }>(
    db,
    `SELECT DISTINCT pv.size 
     FROM product_variants pv 
     JOIN products p ON p.id = pv.product_id
     WHERE pv.is_active = 1 ${productTypeFilter}
     ORDER BY CAST(pv.size AS INTEGER) ASC, pv.size ASC`
  );

  // Fetch products prioritizing new arrivals
  let products = queryAll<ProductSummary & { category_slug?: string }>(
    db,
    `SELECT p.id, p.slug, p.regular_price, p.sale_price, p.is_new_arrival, p.is_featured, p.is_best_seller,
            c.slug as category_slug,
            pt_en.name as name_en, pt_ar.name as name_ar,
            ct_en.name as category_name_en, ct_ar.name as category_name_ar,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) as main_image,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1 OFFSET 1) as secondary_image,
            (SELECT COALESCE(SUM(inv.on_hand - inv.reserved), 0)
             FROM product_variants pv
             LEFT JOIN inventory inv ON inv.variant_id = pv.id
             WHERE pv.product_id = p.id AND pv.is_active = 1) as total_available_stock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
     LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
     LEFT JOIN category_translations ct_en ON ct_en.category_id = p.category_id AND ct_en.lang = 'en'
     LEFT JOIN category_translations ct_ar ON ct_ar.category_id = p.category_id AND ct_ar.lang = 'ar'
     WHERE p.status = 'ACTIVE' ${productTypeFilter}
     ORDER BY p.is_new_arrival DESC, p.created_at DESC`
  );

  // Filter by category or size if selected
  const filteredProducts = products.filter((p) => {
    if (categorySlug && p.category_slug !== categorySlug) return false;
    if (sizeFilter) {
      const match = queryAll<any>(
        db,
        `SELECT id FROM product_variants WHERE product_id = ? AND size = ? AND is_active = 1`,
        [p.id, sizeFilter]
      );
      if (match.length === 0) return false;
    }
    return true;
  });

  return (
    <StoreShell>
      {/* Distinct New Arrivals Hero Banner */}
      <div className="bg-[#111214] text-white py-5 sm:py-10 border-b border-[#292B2E] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white text-[#111214] text-[10px] sm:text-[11px] font-heading font-black uppercase tracking-widest px-3 py-1 rounded-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "إصدارات جديدة حصرياً" : "FRESH DROPS 2026"}</span>
            </span>
            <span className="text-xs uppercase tracking-[0.25em] text-[#BFC2C6] font-bold">
              U3 STORE — LIVE YOURS.
            </span>
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-black tracking-tight text-white">
            {lang === "ar" ? "وصل حديثاً" : "NEW ARRIVALS"}
          </h1>

          <p className="text-xs sm:text-sm text-[#A7ABB1] max-w-2xl leading-relaxed">
            {lang === "ar"
              ? "تصفح أحدث موديلات وسنيكرز الشارع العصرية فور نزولها في متجر U3 STORE. تشكيلة منتقاة بعناية لتعكس هويتك الفريدة."
              : "Discover the latest drops and contemporary streetwear footwear releases freshly added to U3 STORE. Curated to live yours."}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Navigation Switcher Bar & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-silver/60 p-4 rounded-sm shadow-xs">
          {/* Quick Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/shop"
              className="px-3.5 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all border bg-offwhite text-jet border-silver/60 hover:border-jet"
            >
              {lang === "ar" ? "← المتجر بالكامل" : "← Shop All"}
            </Link>
            <span className="px-3.5 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm bg-[#111214] text-white border border-[#111214] shadow-xs flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{lang === "ar" ? "وصل حديثاً" : "New Arrivals"}</span>
            </span>
            <Link
              href="/collections"
              className="px-3.5 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all border bg-offwhite text-jet border-silver/60 hover:border-jet"
            >
              {lang === "ar" ? "المجموعات" : "Collections"}
            </Link>
          </div>

          {/* Quick Filter Controls */}
          <form method="GET" action="/new-arrivals" className="flex flex-wrap items-center gap-2">
            <select
              name="category"
              defaultValue={categorySlug}
              className="border border-silver px-3 py-1.5 text-xs bg-offwhite rounded-xs focus:outline-none focus:border-jet"
            >
              <option value="">{lang === "ar" ? "جميع الفئات" : "All Categories"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {lang === "ar" ? c.name_ar || c.name_en : c.name_en}
                </option>
              ))}
            </select>

            <select
              name="size"
              defaultValue={sizeFilter}
              className="border border-silver px-3 py-1.5 text-xs bg-offwhite rounded-xs focus:outline-none focus:border-jet"
            >
              <option value="">{lang === "ar" ? "جميع المقاسات" : "All Sizes"}</option>
              {distinctSizes.map((s) => (
                <option key={s.size} value={s.size}>
                  EU {s.size}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold px-3.5 py-1.5 rounded-xs transition-colors"
            >
              {lang === "ar" ? "تصفية" : "Filter"}
            </button>

            {(categorySlug || sizeFilter) && (
              <Link
                href="/new-arrivals"
                className="text-xs text-neutralgray hover:text-jet underline px-1"
              >
                {lang === "ar" ? "إلغاء التصفية" : "Clear"}
              </Link>
            )}
          </form>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-silver/60 p-12 text-center space-y-4 rounded-sm">
            <p className="font-heading text-xl font-bold text-jet">
              {lang === "ar" ? "لا توجد أحذية في قسم وصل حديثاً حالياً" : "No New Arrivals at the moment"}
            </p>
            <p className="text-xs text-neutralgray max-w-md mx-auto">
              {lang === "ar"
                ? "ترقبوا تشكيلات وألوان جديدة قادمة قريباً. يمكنك الآن تصفح جميع الأحذية المتوفرة في المتجر."
                : "New styles and exclusive colorways dropping soon. Explore all available footwear in the shop."}
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                href="/shop"
                className="bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase tracking-widest px-8 py-3.5 rounded-sm transition-colors"
              >
                {lang === "ar" ? "تصفح المتجر بالكامل" : "BROWSE FULL CATALOG"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-6">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </StoreShell>
  );
}

