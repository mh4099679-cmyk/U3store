import React from "react";
import Link from "next/link";
import { Search as SearchIcon, X, SlidersHorizontal, ArrowRight } from "lucide-react";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { t } from "@/lib/i18n/dictionaries";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductCard, ProductSummary } from "@/components/store/ProductCard";
import { matchesBilingualSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type = "" } = await searchParams;
  const query = q.trim();
  const selectedType = type.trim().toUpperCase();
  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const settings = queryOne<any>(db, `SELECT visible_categories FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";

  // Popular search terms suggestions aligned with store visibility
  let popularKeywords: string[] = [];
  if (visibleCategories === "SHOES_ONLY") {
    popularKeywords = lang === "ar"
      ? ["Nike Dunk", "Air Jordan", "Air Max", "Panda", "أحذية كاجوال", "أحذية رياضية"]
      : ["Nike Dunk", "Air Jordan", "Air Max", "Panda", "Sneakers", "Running Shoes"];
  } else if (visibleCategories === "CLOTHING_ONLY") {
    popularKeywords = lang === "ar"
      ? ["T-Shirt", "Hoodie", "سويت شيرت", "تيشيرت أوفر سايز", "ملابس ستريت وير"]
      : ["T-Shirt", "Hoodie", "Sweatshirt", "Oversized Tee", "Streetwear"];
  } else {
    popularKeywords = lang === "ar"
      ? ["Nike Dunk", "Air Jordan", "Air Max", "Panda", "أحذية رياضية", "T-Shirt", "هودي"]
      : ["Nike Dunk", "Air Jordan", "Air Max", "Panda", "Sneakers", "T-Shirt", "Hoodie"];
  }

  let results: (ProductSummary & { product_type?: string })[] = [];
  if (query) {
    let departmentFilter = "";
    if (visibleCategories === "SHOES_ONLY") {
      departmentFilter = "AND p.product_type = 'SHOES'";
    } else if (visibleCategories === "CLOTHING_ONLY") {
      departmentFilter = "AND p.product_type = 'CLOTHING'";
    }

    const allActiveCandidates = queryAll<ProductSummary & { product_type: string; category_name_en?: string; category_name_ar?: string; collection_name_en?: string; collection_name_ar?: string }>(
      db,
      `SELECT p.id, p.slug, p.product_type, p.regular_price, p.sale_price, p.is_new_arrival, p.is_featured, p.is_best_seller,
              pt_en.name as name_en, pt_ar.name as name_ar,
              ct_en.name as category_name_en, ct_ar.name as category_name_ar,
              col.name_en as collection_name_en, col.name_ar as collection_name_ar,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) as main_image,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1 OFFSET 1) as secondary_image,
              (SELECT COALESCE(SUM(inv.on_hand - inv.reserved), 0)
               FROM product_variants pv2
               LEFT JOIN inventory inv ON inv.variant_id = pv2.id
               WHERE pv2.product_id = p.id AND pv2.is_active = 1) as total_available_stock
       FROM products p
       LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
       LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
       LEFT JOIN category_translations ct_en ON ct_en.category_id = p.category_id AND ct_en.lang = 'en'
       LEFT JOIN category_translations ct_ar ON ct_ar.category_id = p.category_id AND ct_ar.lang = 'ar'
       LEFT JOIN collections col ON col.id = p.collection_id
       WHERE p.status = 'ACTIVE' ${departmentFilter}
       ORDER BY p.created_at DESC`
    );

    // Apply bilingual search & variant matching
    results = allActiveCandidates.filter((p) => {
      if (selectedType && p.product_type !== selectedType) return false;

      const variantTokens = queryAll<any>(
        db,
        `SELECT sku, size, color_en, color_ar FROM product_variants WHERE product_id = ? AND is_active = 1`,
        [p.id]
      ).flatMap((v) => [v.sku, v.size, v.color_en, v.color_ar]);

      return matchesBilingualSearch(
        query,
        p.name_en,
        p.name_ar,
        p.category_name_en,
        p.category_name_ar,
        p.collection_name_en,
        p.collection_name_ar,
        ...variantTokens
      );
    });
  }

  return (
    <StoreShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Modern Search Hero Header */}
        <div className="bg-white border border-silver/60 rounded-2xl p-4 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-silver/40 pb-3">
            <div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-jet">
                {lang === "ar" ? "البحث في المتجر" : "Search Store"}
              </h1>
              <p className="text-xs text-neutralgray mt-0.5">
                {lang === "ar"
                  ? "ابحث بالاسم، الموديل، الماركة، أو كود المنتج (SKU)"
                  : "Search by model name, silhouette, collection, or SKU"}
              </p>
            </div>
            {query && (
              <span className="text-xs font-bold text-jet bg-neutral-100 px-3 py-1 rounded-full border border-silver/60 self-start sm:self-auto">
                {results.length} {lang === "ar" ? "منتج متطابق" : "items found"}
              </span>
            )}
          </div>

          {/* Search Input Bar with Icon and Mobile Clear */}
          <form method="GET" action="/search" className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <SearchIcon className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutralgray pointer-events-none" />
              <input
                type="search"
                name="q"
                autoFocus
                defaultValue={query}
                placeholder={t(lang, "shop.search_placeholder")}
                className="w-full border border-silver/80 rounded-xl ps-10 pe-10 py-3 text-sm bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-jet focus:ring-1 focus:ring-jet transition-all"
              />
              {query && (
                <Link
                  href="/search"
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-neutralgray hover:text-jet p-1"
                  title={lang === "ar" ? "مسح البحث" : "Clear search"}
                >
                  <X className="w-4 h-4" />
                </Link>
              )}
            </div>
            <button
              type="submit"
              className="bg-[#111214] hover:bg-[#292B2E] text-offwhite font-heading text-xs font-bold uppercase tracking-widest px-8 py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <SearchIcon className="w-4 h-4" />
              <span>{t(lang, "nav.search")}</span>
            </button>
          </form>

          {/* Quick Filter Keyword Pills */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-bold text-neutralgray uppercase tracking-wider">
              {lang === "ar" ? "كلمات شائعة:" : "Trending:"}
            </span>
            {popularKeywords.map((kw) => (
              <Link
                key={kw}
                href={`/search?q=${encodeURIComponent(kw)}`}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  query.toLowerCase() === kw.toLowerCase()
                    ? "bg-jet text-white border-jet"
                    : "bg-white text-jet border-silver/80 hover:border-jet"
                }`}
              >
                {kw}
              </Link>
            ))}
          </div>
        </div>

        {/* Results Section */}
        {query ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-silver/40 pb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-neutralgray">
                {lang === "ar"
                  ? `نتائج البحث عن: "${query}"`
                  : `Search results for: "${query}"`}
              </p>
              <span className="text-xs text-neutralgray">
                {results.length} {lang === "ar" ? "منتج" : "results"}
              </span>
            </div>

            {results.length === 0 ? (
              <div className="bg-white border border-silver/50 rounded-2xl p-10 sm:p-14 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutralgray">
                  <SearchIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-base font-bold text-jet">
                    {lang === "ar" ? "لم نجد أي منتجات تطابق بحثك" : "No matching products found"}
                  </h3>
                  <p className="text-xs text-neutralgray max-w-sm mx-auto">
                    {lang === "ar"
                      ? "جرب كتابة اسم الحذاء بطريقة مختلفة أو تصفح أحدث الكولكشنات المتوفرة."
                      : "Try different keywords or explore our newest collection releases."}
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 bg-[#111214] text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#292B2E] transition-colors"
                >
                  <span>{lang === "ar" ? "تصفح كل المنتجات" : "Browse All Sneakers"}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${lang === "ar" ? "rotate-180" : ""}`} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} lang={lang} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-silver/40 rounded-2xl p-8 sm:p-12 text-center space-y-4">
            <SearchIcon className="w-10 h-10 mx-auto text-neutralgray/60" />
            <div className="space-y-1">
              <h2 className="font-heading text-base font-bold text-jet">
                {lang === "ar" ? "ما الذي تبحث عنه اليوم؟" : "What are you looking for?"}
              </h2>
              <p className="text-xs text-neutralgray">
                {lang === "ar"
                  ? "اكتب اسم السنيكرز المفضل لديك أو اضغط على أحد الكلمات الشائعة أعلاه."
                  : "Type your favorite sneaker name or pick a trending keyword above."}
              </p>
            </div>
          </div>
        )}
      </div>
    </StoreShell>
  );
}

