import React from "react";
import Link from "next/link";
import { Flame, Star, Tag, SlidersHorizontal, ChevronDown } from "lucide-react";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { t } from "@/lib/i18n/dictionaries";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductCard, ProductSummary } from "@/components/store/ProductCard";
import { matchesBilingualSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const q = (sp.q || "").trim();
  const categorySlug = (sp.category || "").trim();
  const collectionSlug = (sp.collection || "").trim();
  const sizeFilter = (sp.size || "").trim();
  const colorFilter = (sp.color || "").trim();
  const minPrice = sp.minPrice ? Number(sp.minPrice) : null;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : null;
  const inStockOnly = sp.inStock === "1";
  const filterFlag = (sp.filter || "").trim(); // 'new' | 'featured' | 'bestsellers'
  const sort = (sp.sort || "newest").trim();
  const typeFilter = (sp.type || "").trim().toUpperCase();

  const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";
  const showShoesOption = visibleCategories === "BOTH" || visibleCategories === "SHOES_ONLY";
  const showClothingOption = visibleCategories === "BOTH" || visibleCategories === "CLOTHING_ONLY";

  let productTypeFilter = "";
  let categoryFilterCondition = "";
  let collectionFilterCondition = "";
  if (visibleCategories === "SHOES_ONLY") {
    productTypeFilter = "AND p.product_type = 'SHOES'";
    categoryFilterCondition = "AND c.id IN (SELECT DISTINCT category_id FROM products WHERE product_type = 'SHOES' AND status = 'ACTIVE')";
    collectionFilterCondition = "AND product_type = 'SHOES'";
  } else if (visibleCategories === "CLOTHING_ONLY") {
    productTypeFilter = "AND p.product_type = 'CLOTHING'";
    categoryFilterCondition = "AND c.id IN (SELECT DISTINCT category_id FROM products WHERE product_type = 'CLOTHING' AND status = 'ACTIVE')";
    collectionFilterCondition = "AND product_type = 'CLOTHING'";
  }

  const categories = queryAll<any>(
    db,
    `SELECT c.*, ct_en.name as name_en, ct_ar.name as name_ar
     FROM categories c
     LEFT JOIN category_translations ct_en ON ct_en.category_id = c.id AND ct_en.lang = 'en'
     LEFT JOIN category_translations ct_ar ON ct_ar.category_id = c.id AND ct_ar.lang = 'ar'
     WHERE c.is_active = 1 ${categoryFilterCondition}
     ORDER BY c.sort_order ASC`
  );

  const collections = queryAll<any>(
    db,
    `SELECT * FROM collections WHERE is_active = 1 ${collectionFilterCondition} ORDER BY sort_order ASC`
  );

  const distinctSizes = queryAll<{ size: string }>(
    db,
    `SELECT DISTINCT pv.size 
     FROM product_variants pv 
     JOIN products p ON p.id = pv.product_id 
     WHERE pv.is_active = 1 ${productTypeFilter}
     ORDER BY CAST(pv.size AS INTEGER) ASC, pv.size ASC`
  );
  const distinctColors = queryAll<{ color_en: string; color_ar: string }>(
    db,
    `SELECT DISTINCT color_en, color_ar FROM product_variants WHERE is_active = 1 ORDER BY color_en ASC`
  );

  let allProducts = queryAll<ProductSummary & { collection_slug?: string; category_slug?: string; product_type: string }>(
    db,
    `SELECT p.id, p.slug, p.product_type, p.regular_price, p.sale_price, p.is_new_arrival, p.is_featured, p.is_best_seller,
            c.slug as category_slug, col.slug as collection_slug,
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
     LEFT JOIN collections col ON col.id = p.collection_id
     LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
     LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
     LEFT JOIN category_translations ct_en ON ct_en.category_id = p.category_id AND ct_en.lang = 'en'
     LEFT JOIN category_translations ct_ar ON ct_ar.category_id = p.category_id AND ct_ar.lang = 'ar'
     WHERE p.status = 'ACTIVE' ${productTypeFilter}
     ORDER BY p.created_at DESC`
  );

  // Filter in-memory using variant matching where needed
  const filteredProducts = allProducts.filter((p) => {
    // Check Store Display Category Visibility
    if (visibleCategories === "SHOES_ONLY" && p.product_type !== "SHOES") return false;
    if (visibleCategories === "CLOTHING_ONLY" && p.product_type !== "CLOTHING") return false;
    if (typeFilter && p.product_type !== typeFilter) return false;

    const effectivePrice =
      p.sale_price !== null && p.sale_price !== undefined && Number(p.sale_price) > 0
        ? Number(p.sale_price)
        : Number(p.regular_price);

    if (q) {
      const variantTokens = queryAll<any>(
        db,
        `SELECT sku, size, color_en, color_ar FROM product_variants WHERE product_id = ? AND is_active = 1`,
        [p.id]
      ).flatMap((v) => [v.sku, v.size, v.color_en, v.color_ar]);

      const matches = matchesBilingualSearch(
        q,
        p.name_en,
        p.name_ar,
        p.category_name_en,
        p.category_name_ar,
        ...variantTokens
      );
      if (!matches) return false;
    }

    if (categorySlug && p.category_slug !== categorySlug) return false;
    if (collectionSlug && p.collection_slug !== collectionSlug) return false;
    if (filterFlag === "new") {
      const hasAnyNew = allProducts.some((x) => Boolean(x.is_new_arrival));
      if (hasAnyNew && !p.is_new_arrival) return false;
    }
    if (filterFlag === "featured" && !p.is_featured) return false;
    if (filterFlag === "bestsellers" && !p.is_best_seller) return false;
    if (
      filterFlag === "sale" &&
      !(
        p.sale_price !== null &&
        p.sale_price !== undefined &&
        Number(p.sale_price) > 0 &&
        Number(p.sale_price) < Number(p.regular_price)
      )
    )
      return false;
    if (minPrice !== null && effectivePrice < minPrice) return false;
    if (maxPrice !== null && effectivePrice > maxPrice) return false;
    if (inStockOnly && Number(p.total_available_stock || 0) <= 0) return false;

    if (sizeFilter || colorFilter) {
      const matchingVars = queryAll<any>(
        db,
        `SELECT pv.id
         FROM product_variants pv
         LEFT JOIN inventory inv ON inv.variant_id = pv.id
         WHERE pv.product_id = ?
           AND pv.is_active = 1
           AND (? = '' OR pv.size = ?)
           AND (? = '' OR LOWER(pv.color_en) = LOWER(?))`,
        [p.id, sizeFilter, sizeFilter, colorFilter, colorFilter]
      );
      if (matchingVars.length === 0) return false;
    }

    return true;
  });

  if (sort === "price_asc") {
    filteredProducts.sort((a, b) => {
      const pa = a.sale_price && a.sale_price > 0 ? a.sale_price : a.regular_price;
      const pb = b.sale_price && b.sale_price > 0 ? b.sale_price : b.regular_price;
      return pa - pb;
    });
  } else if (sort === "price_desc") {
    filteredProducts.sort((a, b) => {
      const pa = a.sale_price && a.sale_price > 0 ? a.sale_price : a.regular_price;
      const pb = b.sale_price && b.sale_price > 0 ? b.sale_price : b.regular_price;
      return pb - pa;
    });
  }

  // Dynamic banner title and subtitle based on filterFlag
  let pageTitle = t(lang, "shop.title");
  let pageSubtitle =
    lang === "ar"
      ? "تصفح أحدث موديلات وسنيكرز U3 STORE | شحن لجميع محافظات مصر"
      : "Browse U3 STORE contemporary footwear | Shipping across all Egypt";

  if (filterFlag === "new") {
    pageTitle = lang === "ar" ? "وصل حديثاً — أحدث الإصدارات" : "NEW ARRIVALS — FRESH DROPS";
    pageSubtitle =
      lang === "ar"
        ? "أحدث موديلات السنيكرز والأحذية التي وصلت حديثاً لمتجر U3 STORE"
        : "Discover the newest footwear drops and releases just added to U3 STORE";
  } else if (filterFlag === "bestsellers") {
    pageTitle = lang === "ar" ? "الأكثر مبيعاً" : "BEST SELLERS";
    pageSubtitle =
      lang === "ar"
        ? "الأحذية الأكثر طلباً وإعجاباً من عملاء U3 STORE"
        : "The most wanted and highest rated footwear by U3 STORE customers";
  } else if (filterFlag === "sale") {
    pageTitle = lang === "ar" ? "العروض والتخفيضات" : "SPECIAL OFFERS & SALE";
    pageSubtitle =
      lang === "ar"
        ? "أقوى التخفيضات والعروض الحصرية على أفضل الموديلات"
        : "Limited-time offers and seasonal discounts on premium footwear";
  }

  const hasActiveFilters = Boolean(
    q || categorySlug || collectionSlug || sizeFilter || colorFilter || minPrice || maxPrice || inStockOnly
  );

  const filtersFormContent = (
    <form method="GET" action="/shop" className="space-y-4">
      <input type="hidden" name="filter" value={filterFlag} />
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-jet mb-1.5">
          {t(lang, "nav.search")}
        </label>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t(lang, "shop.search_placeholder")}
          className="w-full border border-silver px-3 py-2 text-sm bg-offwhite focus:outline-none focus:border-jet"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-jet mb-1.5">
          {t(lang, "shop.category")}
        </label>
        <select
          name="category"
          defaultValue={categorySlug}
          className="w-full border border-silver px-3 py-2 text-sm bg-offwhite"
        >
          <option value="">{t(lang, "shop.all")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {lang === "ar" ? c.name_ar || c.name_en : c.name_en}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-jet mb-1.5">
          {t(lang, "shop.collection")}
        </label>
        <select
          name="collection"
          defaultValue={collectionSlug}
          className="w-full border border-silver px-3 py-2 text-sm bg-offwhite"
        >
          <option value="">{t(lang, "shop.all")}</option>
          {collections.map((col) => (
            <option key={col.id} value={col.slug}>
              {lang === "ar" ? col.name_ar || col.name_en : col.name_en}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-jet mb-1.5">
            {t(lang, "shop.size")}
          </label>
          <select
            name="size"
            defaultValue={sizeFilter}
            className="w-full border border-silver px-2.5 py-2 text-sm bg-offwhite"
          >
            <option value="">{t(lang, "shop.all")}</option>
            {distinctSizes.map((s) => (
              <option key={s.size} value={s.size}>
                EU {s.size}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-jet mb-1.5">
            {t(lang, "shop.color")}
          </label>
          <select
            name="color"
            defaultValue={colorFilter}
            className="w-full border border-silver px-2.5 py-2 text-sm bg-offwhite"
          >
            <option value="">{t(lang, "shop.all")}</option>
            {distinctColors.map((c) => (
              <option key={c.color_en} value={c.color_en}>
                {lang === "ar" ? c.color_ar || c.color_en : c.color_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-jet mb-1.5">
          {t(lang, "shop.price_range")} (EGP)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            name="minPrice"
            defaultValue={minPrice ?? ""}
            placeholder="Min"
            className="w-full border border-silver px-2.5 py-1.5 text-sm bg-offwhite"
          />
          <input
            type="number"
            name="maxPrice"
            defaultValue={maxPrice ?? ""}
            placeholder="Max"
            className="w-full border border-silver px-2.5 py-1.5 text-sm bg-offwhite"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="inStock"
          name="inStock"
          value="1"
          defaultChecked={inStockOnly}
          className="w-4 h-4 accent-[#111214]"
        />
        <label htmlFor="inStock" className="text-xs font-medium text-jet">
          {t(lang, "shop.in_stock_only")}
        </label>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-jet mb-1.5">
          {t(lang, "shop.sort_by")}
        </label>
        <select
          name="sort"
          defaultValue={sort}
          className="w-full border border-silver px-3 py-2 text-sm bg-offwhite"
        >
          <option value="newest">{t(lang, "shop.sort.newest")}</option>
          <option value="price_asc">{t(lang, "shop.sort.price_asc")}</option>
          <option value="price_desc">{t(lang, "shop.sort.price_desc")}</option>
        </select>
      </div>

      <div className="pt-2 flex flex-col gap-2">
        <button
          type="submit"
          className="w-full bg-[#111214] hover:bg-[#292B2E] active:scale-95 text-white font-heading text-xs font-bold uppercase tracking-widest py-3 transition-all rounded-sm"
        >
          {lang === "ar" ? "تطبيق الفلاتر" : "APPLY FILTERS"}
        </button>
        <Link
          href="/shop"
          className="w-full text-center border border-silver py-2 text-xs font-semibold text-neutralgray hover:text-jet rounded-sm transition-colors"
        >
          {t(lang, "shop.clear_filters")}
        </Link>
      </div>
    </form>
  );

  return (
    <StoreShell>
      {/* Shop Header Banner: Compact & Sleek */}
      <div className="bg-[#111214] text-[#F7F7F5] py-4 sm:py-8 border-b border-[#292B2E] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#BFC2C6] font-bold">
                U3 STORE — LIVE YOURS.
              </span>
              {filterFlag === "new" && (
                <span className="bg-white text-[#111214] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  {lang === "ar" ? "أحدث المنتجات" : "FRESH DROPS"}
                </span>
              )}
            </div>
            <h1 className="font-heading text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">{pageTitle}</h1>
            <p className="text-xs sm:text-sm text-[#A7ABB1] max-w-2xl">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-10 grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-8">
        {/* Mobile Collapsible Filter Drawer (Hidden on Desktop) */}
        <details className="lg:hidden bg-white border border-silver/60 rounded-xl overflow-hidden shadow-xs group">
          <summary className="flex items-center justify-between p-3.5 cursor-pointer list-none select-none text-xs font-heading font-bold uppercase tracking-wider text-jet bg-[#FAFBFB]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-jet" />
              <span>{lang === "ar" ? "تصفية المنتجات والبحث" : "Filter & Search Footwear"}</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-neutralgray group-open:rotate-180 transition-transform duration-200" />
          </summary>
          <div className="p-4 border-t border-silver/40 bg-white">
            {filtersFormContent}
          </div>
        </details>

        {/* Desktop Sticky Sidebar Filters Form (Hidden on Mobile) */}
        <aside className="hidden lg:block bg-white border border-silver/50 p-6 h-fit space-y-5 rounded-2xl shadow-xs">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-jet flex items-center gap-2 border-b border-silver/40 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-jet" />
            <span>{lang === "ar" ? "تصفية المنتجات" : "FILTER PRODUCTS"}</span>
          </h2>
          {filtersFormContent}
        </aside>

        {/* Product Grid & Top Category Switcher */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick-Switch Pills Bar */}
          <div className="flex flex-col gap-3 bg-white border border-silver/50 p-4 rounded-xl shadow-xs">
            {/* Department Type Pills (when both are visible) */}
            {visibleCategories === "BOTH" && (
              <div className="flex items-center gap-2 pb-3 border-b border-silver/40 w-full overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutralgray shrink-0">
                  {lang === "ar" ? "القسم:" : "Department:"}
                </span>
                <Link
                  href="/shop"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    !typeFilter
                      ? "bg-[#111214] text-white"
                      : "bg-[#FAFBFB] text-jet border border-silver/80 hover:border-jet"
                  }`}
                >
                  {lang === "ar" ? "كل الأقسام" : "All Departments"}
                </Link>
                <Link
                  href="/shop?type=SHOES"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    typeFilter === "SHOES"
                      ? "bg-[#111214] text-white"
                      : "bg-[#FAFBFB] text-jet border border-silver/80 hover:border-jet"
                  }`}
                >
                  {lang === "ar" ? "الأحذية" : "Shoes"}
                </Link>
                <Link
                  href="/shop?type=CLOTHING"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    typeFilter === "CLOTHING"
                      ? "bg-[#111214] text-white"
                      : "bg-[#FAFBFB] text-jet border border-silver/80 hover:border-jet"
                  }`}
                >
                  {lang === "ar" ? "الملابس" : "Clothing"}
                </Link>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/shop"
                  className={`px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-lg transition-all border ${
                    !filterFlag
                      ? "bg-[#111214] text-white border-[#111214] shadow-xs"
                      : "bg-offwhite text-jet border-silver/60 hover:border-jet"
                  }`}
                >
                  {lang === "ar" ? "الكل" : "All Products"}
                </Link>
              <Link
                href="/new-arrivals"
                className={`px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all border inline-flex items-center gap-1.5 ${
                  filterFlag === "new"
                    ? "bg-[#111214] text-white border-[#111214] shadow-xs"
                    : "bg-offwhite text-jet border-silver/60 hover:border-jet"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{lang === "ar" ? "وصل حديثاً" : "New Arrivals"}</span>
              </Link>
              <Link
                href="/shop?filter=bestsellers"
                className={`px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all border inline-flex items-center gap-1.5 ${
                  filterFlag === "bestsellers"
                    ? "bg-[#111214] text-white border-[#111214] shadow-xs"
                    : "bg-offwhite text-jet border-silver/60 hover:border-jet"
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                <span>{lang === "ar" ? "الأكثر طلباً" : "Best Sellers"}</span>
              </Link>
              <Link
                href="/shop?filter=sale"
                className={`px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all border inline-flex items-center gap-1.5 ${
                  filterFlag === "sale"
                    ? "bg-[#111214] text-white border-[#111214] shadow-xs"
                    : "bg-offwhite text-jet border-silver/60 hover:border-jet"
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-silver shrink-0" />
                <span>{lang === "ar" ? "التخفيضات" : "Sale"}</span>
              </Link>
            </div>
            <div className="text-xs text-neutralgray font-medium">
              {filteredProducts.length}{" "}
              {lang === "ar" ? "منتج متوفر" : "products"}
            </div>
          </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-silver/50 p-12 text-center space-y-4 rounded-sm">
              <p className="font-heading text-lg font-bold text-jet">{t(lang, "shop.no_results")}</p>
              <p className="text-xs text-neutralgray">
                {lang === "ar"
                  ? "لا توجد نتائج مطابقة لهذا الفلتر حالياً."
                  : "No products matched this filter currently."}
              </p>
              <div className="pt-2">
                <Link
                  href="/shop"
                  className="inline-block bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-sm transition-colors"
                >
                  {lang === "ar" ? "عرض جميع المنتجات" : "View All Products"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-6">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </div>
    </StoreShell>
  );
}

