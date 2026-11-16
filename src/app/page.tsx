import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, CreditCard, Sparkles, Footprints, Shirt } from "lucide-react";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { t } from "@/lib/i18n/dictionaries";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductCard, ProductSummary } from "@/components/store/ProductCard";
import { CollectionSlider, CollectionItem } from "@/components/store/CollectionSlider";
import { SaleCountdownBanner } from "@/components/store/SaleCountdownBanner";
import { MagneticButton } from "@/components/store/MagneticButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";
  const showShoes = visibleCategories === "BOTH" || visibleCategories === "SHOES_ONLY";
  const showClothing = visibleCategories === "BOTH" || visibleCategories === "CLOTHING_ONLY";

  const sections = queryAll<any>(
    db,
    `SELECT * FROM website_sections WHERE is_visible = 1 ORDER BY sort_order ASC`
  );

  const saleCampaign = queryOne<any>(
    db,
    `SELECT * FROM sale_campaigns WHERE id = 'archive_sale'`
  );

  // Fetch active products with category visibility filter
  let productTypeFilter = "";
  if (visibleCategories === "SHOES_ONLY") {
    productTypeFilter = "AND p.product_type = 'SHOES'";
  } else if (visibleCategories === "CLOTHING_ONLY") {
    productTypeFilter = "AND p.product_type = 'CLOTHING'";
  }

  const products = queryAll<ProductSummary & { collection_id?: string | null; product_type: string }>(
    db,
    `SELECT p.id, p.slug, p.collection_id, p.product_type, p.regular_price, p.sale_price, p.is_new_arrival, p.is_featured, p.is_best_seller,
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
     WHERE p.status = 'ACTIVE' ${productTypeFilter}
     ORDER BY p.created_at DESC`
  );

  const collections = queryAll<CollectionItem & { product_type: string; show_on_homepage: number }>(
    db,
    `SELECT id, slug, name_en, name_ar, description_en, description_ar, banner_desktop_url, product_type, show_on_homepage
     FROM collections
     WHERE is_active = 1
     ORDER BY homepage_sort_order ASC, sort_order ASC`
  );

  const heroSection = sections.find((s) => s.section_type === "HERO") || {
    title_en: "U3 STORE — LIVE YOURS.",
    title_ar: "U3 STORE — LIVE YOURS.",
    subtitle_en: "STEP INTO YOUR OWN LANE.",
    subtitle_ar: "اخطُ في مسارك الخاص.",
    description_en: "DISCOVER THE COLLECTION.",
    description_ar: "اكتشف المجموعة.",
    button_text_en: "SHOP NOW",
    button_text_ar: "تسوق الآن",
    button_link: "/shop",
    desktop_image_url: "",
  };

  const newArrivals = products.filter((p) => Boolean(p.is_new_arrival));

  // Separate Shoes and Clothing collections for vertical stacking
  const shoesCollections = collections.filter(
    (c) => c.product_type === "SHOES" && c.show_on_homepage !== 0
  );
  const clothingCollections = collections.filter(
    (c) => c.product_type === "CLOTHING" && c.show_on_homepage !== 0
  );

  // Best sellers sorting: Best seller first (is_best_seller = 1), then featured, then new arrival
  const sortedShoes = [...products.filter((p) => p.product_type === "SHOES")].sort((a, b) => {
    if (b.is_best_seller !== a.is_best_seller) return b.is_best_seller - a.is_best_seller;
    if (b.is_featured !== a.is_featured) return b.is_featured - a.is_featured;
    if (b.is_new_arrival !== a.is_new_arrival) return b.is_new_arrival - a.is_new_arrival;
    return 0;
  });

  const sortedClothing = [...products.filter((p) => p.product_type === "CLOTHING")].sort((a, b) => {
    if (b.is_best_seller !== a.is_best_seller) return b.is_best_seller - a.is_best_seller;
    if (b.is_featured !== a.is_featured) return b.is_featured - a.is_featured;
    if (b.is_new_arrival !== a.is_new_arrival) return b.is_new_arrival - a.is_new_arrival;
    return 0;
  });

  const isRtl = lang === "ar";
  const shopByCategoryEnabled = settings?.shop_by_category_enabled !== 0;

  // Dynamic high-converting luxury marketing copy tailored to store category mode (SHOES_ONLY vs CLOTHING_ONLY vs BOTH)
  let heroHeadline = isRtl ? "فخامة في كل خطوة." : "STEP INTO LUXURY.";
  let heroSubtitle = isRtl
    ? "سنيكرز وأحذية حصرية بتصاميم استثنائية وأداء يجمع بين الأناقة والراحة المطلقة."
    : "Exclusive sneakers & premium footwear engineered for bold presence and supreme comfort.";
  let heroButtonText = isRtl ? "تسوق الأحذية" : "SHOP FOOTWEAR";
  let heroButtonLink = "/shoes";

  if (visibleCategories === "BOTH") {
    heroHeadline = isRtl ? "اخطُ في مسارك الخاص." : "STEP INTO YOUR OWN LANE.";
    heroSubtitle = isRtl
      ? "أحذية فاخرة وملابس ستريت وير عصرية تعبّر عن هويتك المتفردة وأسلوبك الاستثنائي."
      : "Premium footwear & modern luxury streetwear crafted for distinct individuality.";
    heroButtonText = isRtl ? "تسوق المجموعة" : "SHOP COLLECTION";
    heroButtonLink = "/shop";
  } else if (visibleCategories === "CLOTHING_ONLY") {
    heroHeadline = isRtl ? "أناقة تعبّر عن حضورك." : "WEAR YOUR IDENTITY.";
    heroSubtitle = isRtl
      ? "ملابس ستريت وير عصرية وتصاميم فاخرة صُممت لتبرز تفرد أسلوبك في كل إطلالة."
      : "Modern luxury streetwear & premium apparel designed for distinctive street presence.";
    heroButtonText = isRtl ? "تسوق الملابس" : "SHOP CLOTHING";
    heroButtonLink = "/clothing";
  }

  // Allow custom CMS headline/subtitle if admin explicitly customized them beyond initial defaults
  const customHeadline = isRtl ? heroSection.subtitle_ar : heroSection.subtitle_en;
  if (
    customHeadline &&
    customHeadline.trim() !== "" &&
    customHeadline !== "اخطُ في مسارك الخاص." &&
    customHeadline !== "STEP INTO YOUR OWN LANE."
  ) {
    heroHeadline = customHeadline;
  }

  const customSubtitle = isRtl ? heroSection.description_ar : heroSection.description_en;
  if (
    customSubtitle &&
    customSubtitle.trim() !== "" &&
    !customSubtitle.startsWith("اكتشف المجموعة") &&
    !customSubtitle.startsWith("DISCOVER THE COLLECTION")
  ) {
    heroSubtitle = customSubtitle;
  }

  if (heroSection.button_text_ar && heroSection.button_text_en && heroSection.button_text_en !== "SHOP NOW") {
    heroButtonText = isRtl ? heroSection.button_text_ar : heroSection.button_text_en;
  }
  if (heroSection.button_link && heroSection.button_link !== "/shop") {
    heroButtonLink = heroSection.button_link;
  }

  return (
    <StoreShell>
      {/* Optional Live Sale Countdown Banner */}
      <SaleCountdownBanner lang={lang} campaign={saleCampaign} />

      {/* Hero Campaign Section - Preserved Exactly with 3D Metallic Emblem */}
      <section className="relative bg-[#111214] text-[#F7F7F5] overflow-hidden border-b border-[#292B2E]">
        {heroSection.desktop_image_url && (
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <img
              src={heroSection.desktop_image_url}
              alt="U3 STORE Campaign"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* MOBILE & TABLETS ONLY (< lg): 3D Metallic Emblem in the background (Watermark) */}
        <div className="lg:hidden absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
          <div className="relative flex items-center justify-center u3-floating">
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative p-4 sm:p-6 rounded-full bg-gradient-to-tr from-[#1A1C1F]/70 via-[#111214]/50 to-[#292B2E]/70 border border-white/10 shadow-[0_0_60px_rgba(255,255,255,0.08)]">
              <img
                src="/logo.jpg"
                alt=""
                className="w-64 h-64 sm:w-88 sm:h-88 rounded-full object-contain opacity-25 sm:opacity-30 drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)]"
              />
            </div>
          </div>
        </div>

        {/* Hero Content: 2-Columns on Desktop (lg:flex-row), Centered on Mobile (flex-col) */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-24 lg:py-28 flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 u3-reveal">
          {/* Text & Buttons Column */}
          <div className="max-w-2xl space-y-5 sm:space-y-6 text-center lg:text-start flex flex-col items-center lg:items-start">
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
              {heroHeadline}
            </h1>

            <p className="text-base sm:text-xl text-[#BFC2C6] font-light leading-relaxed">
              {heroSubtitle}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
              <MagneticButton
                href={heroButtonLink}
                className="group u3-btn-solid-white u3-keep-white bg-white hover:bg-[#E1E3E5] text-[#111214] font-heading font-bold text-xs sm:text-sm uppercase tracking-widest px-8 py-3.5 sm:py-4 inline-flex items-center justify-center gap-3 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
              >
                <span>{heroButtonText}</span>
                <ArrowRight
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isRtl
                      ? "rotate-180 group-hover:-translate-x-1.5"
                      : "group-hover:translate-x-1.5"
                  }`}
                />
              </MagneticButton>

              <Link
                href="/track-order"
                className="bg-[#1A1C1F]/80 hover:bg-[#292B2E] text-[#BFC2C6] hover:text-white font-heading font-semibold text-xs sm:text-sm uppercase tracking-widest px-7 py-3.5 sm:py-4 rounded-xl border border-[#44474C] hover:border-white transition-all duration-300 backdrop-blur-xs inline-flex items-center justify-center w-full sm:w-auto"
              >
                {t(lang, "nav.track_order")}
              </Link>
            </div>
          </div>

          {/* DESKTOP ONLY (lg:flex): 3D Metallic Emblem Side-by-Side as in Screenshot */}
          <div className="hidden lg:flex flex-col items-center justify-center u3-floating shrink-0">
            <div className="relative p-5 sm:p-6 lg:p-7 rounded-full bg-gradient-to-tr from-[#1A1C1F] via-[#111214] to-[#292B2E] border-2 border-[#BFC2C6]/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] group hover:border-white hover:shadow-[0_25px_70px_rgba(255,255,255,0.12)] transition-all duration-700">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent blur-md pointer-events-none" />
              <img
                src="/logo.jpg"
                alt="U3 STORE Official Emblem"
                className="w-48 h-48 lg:w-64 lg:h-64 rounded-full object-contain relative z-10 transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Benefits Strip with Sleek Curved Panels (Restored exact design from screenshot) */}
      <section className="bg-white dark:bg-[#16181B] border-y border-[#E1E3E5] dark:border-[#2A2D32] py-5 sm:py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
          <div className="flex items-center gap-3.5 p-4 sm:p-5 border border-[#E9EAEC] dark:border-[#2E3238] bg-gradient-to-br from-[#F7F7F5] to-white dark:from-[#1E2024] dark:to-[#181A1D] hover:to-[#F7F7F5] dark:hover:to-[#22252A] rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#111214] dark:bg-white text-white dark:text-[#111214] flex items-center justify-center shrink-0 shadow-sm">
              <Truck className="w-5 h-5 text-[#BFC2C6] dark:text-[#111214]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-[#111214] dark:text-white text-xs sm:text-sm tracking-wide">
                {isRtl ? "توصيل لجميع محافظات مصر الـ 27" : "DELIVERY ACROSS ALL 27 GOVERNORATES"}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#73777D] dark:text-[#A7ABB1] mt-0.5 sm:mt-1 leading-snug">
                {isRtl
                  ? "شحن سريع ومباشر لباب بيتك مع حساب فوري لسعر التوصيل وتتبع لحظي."
                  : "Direct door-to-door shipping with automated zone rates & live tracking."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 sm:p-5 border border-[#E9EAEC] dark:border-[#2E3238] bg-gradient-to-br from-[#F7F7F5] to-white dark:from-[#1E2024] dark:to-[#181A1D] hover:to-[#F7F7F5] dark:hover:to-[#22252A] rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#111214] dark:bg-white text-white dark:text-[#111214] flex items-center justify-center shrink-0 shadow-sm">
              <CreditCard className="w-5 h-5 text-[#BFC2C6] dark:text-[#111214]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-[#111214] dark:text-white text-xs sm:text-sm tracking-wide">
                {isRtl ? "إنستاباي وفودافون كاش + فاتورة رقمية" : "INSTAPAY & VODAFONE CASH + DIGITAL INVOICE"}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#73777D] dark:text-[#A7ABB1] mt-0.5 sm:mt-1 leading-snug">
                {isRtl
                  ? "تحويل إلكتروني فوري وآمن مع مراجعة دقيقة وتتبع مباشر لحالة طلبك."
                  : "Instant mobile transfer with rapid verification & live order tracker."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 sm:p-5 border border-[#E9EAEC] dark:border-[#2E3238] bg-gradient-to-br from-[#F7F7F5] to-white dark:from-[#1E2024] dark:to-[#181A1D] hover:to-[#F7F7F5] dark:hover:to-[#22252A] rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#111214] dark:bg-white text-white dark:text-[#111214] flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-[#BFC2C6] dark:text-[#111214]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-[#111214] dark:text-white text-xs sm:text-sm tracking-wide">
                {isRtl ? "تسوق حر وسريع بدون تسجيل" : "FRICTIONLESS GUEST CHECKOUT"}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#73777D] dark:text-[#A7ABB1] mt-0.5 sm:mt-1 leading-snug">
                {isRtl
                  ? "سلة تسوق خاصة وتجربة شراء سلسة وفورية كزائر بدون الحاجة لإنشاء حساب."
                  : "Private cart and smooth instant checkout with complete visitor privacy."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">
        
        {/* ======================================================== */}
        {/* 5. SHOP BY CATEGORY (ONLY SHOWN WHEN BOTH DEPARTMENTS ARE LIVE) */}
        {/* ======================================================== */}
        {shopByCategoryEnabled && showShoes && showClothing && (
          <section className="space-y-6 u3-reveal">
            <div className="flex items-end justify-between border-b border-silver/50 pb-4">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-jet tracking-tight">
                  {isRtl ? "تسوق حسب القسم" : "SHOP BY CATEGORY"}
                </h2>
              </div>
              <Link
                href="/shop"
                className="u3-link-underline text-xs font-bold uppercase tracking-wider text-jet hover:text-black hidden sm:flex items-center gap-1.5"
              >
                <span>{isRtl ? "تصفح كل المنتجات" : "SHOP ALL"}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
            </div>

            {/* Side-by-Side Category Cards (Clean 2-columns) */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* 1. SHOES CATEGORY CARD */}
              <Link
                href={settings?.category_shoes_link || "/shoes"}
                className="group relative block aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-2xl bg-[#111214] border border-[#292B2E] hover:border-[#111214] shadow-md hover:shadow-2xl transition-all duration-500"
              >
                <img
                  src={settings?.category_shoes_image_url || "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80"}
                  alt={isRtl ? "أحذية" : "SHOES"}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-95 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                <div className="absolute inset-0 p-4 sm:p-7 flex flex-col justify-end">
                  <div className="space-y-1.5">
                    <h3 className="font-heading text-xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                      {isRtl ? "الأحذية" : "SHOES"}
                    </h3>
                    <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors uppercase tracking-wider">
                      <span>{isRtl ? "استكشف الأحذية" : "Explore Shoes"}</span>
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isRtl ? "rotate-180 group-hover:-translate-x-1.5" : "group-hover:translate-x-1.5"}`} />
                    </div>
                  </div>
                </div>
              </Link>

              {/* 2. CLOTHING CATEGORY CARD */}
              <Link
                href={settings?.category_clothing_link || "/clothing"}
                className="group relative block aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-2xl bg-[#111214] border border-[#292B2E] hover:border-[#111214] shadow-md hover:shadow-2xl transition-all duration-500"
              >
                <img
                  src={settings?.category_clothing_image_url || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80"}
                  alt={isRtl ? "ملابس" : "CLOTHING"}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-95 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                <div className="absolute inset-0 p-4 sm:p-7 flex flex-col justify-end">
                  <div className="space-y-1.5">
                    <h3 className="font-heading text-xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                      {isRtl ? "الملابس" : "CLOTHING"}
                    </h3>
                    <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors uppercase tracking-wider">
                      <span>{isRtl ? "استكشف الملابس" : "Explore Clothing"}</span>
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isRtl ? "rotate-180 group-hover:-translate-x-1.5" : "group-hover:translate-x-1.5"}`} />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* ======================================================== */}
        {/* CASE A: BOTH DEPARTMENTS ACTIVE (أحذية ثم ملابس مرتبة بالأكثر مبيعاً) */}
        {/* ======================================================== */}
        {showShoes && showClothing && (
          <>
            {/* 1. SHOES: Sorted by Best Sellers */}
            {sortedShoes.length > 0 && settings?.homepage_shoes_enabled !== 0 && (
              <section className="u3-reveal border-t border-silver/40 pt-10">
                <CollectionSlider
                  collection={{
                    id: "main-shoes",
                    slug: "shoes",
                    name_en: "SHOES",
                    name_ar: "الأحذية",
                    description_en: "Top trending silhouettes & best-selling footwear.",
                    description_ar: "الموديلات الأكثر طلباً والأعلى مبيعاً من الأحذية الفاخرة.",
                    product_type: "SHOES",
                  }}
                  products={sortedShoes}
                  lang={lang}
                  viewAllText={isRtl ? "عرض كل الأحذية" : "VIEW ALL SHOES"}
                  viewAllHref="/shoes"
                  hideCategoryTag={true}
                />
              </section>
            )}

            {/* 2. CLOTHING: Directly beneath Shoes, Sorted by Best Sellers */}
            {sortedClothing.length > 0 && settings?.homepage_clothing_enabled !== 0 && (
              <section className="u3-reveal border-t border-silver/40 pt-10">
                <CollectionSlider
                  collection={{
                    id: "main-clothing",
                    slug: "clothing",
                    name_en: "CLOTHING",
                    name_ar: "الملابس",
                    description_en: "Streetwear essentials & top-rated apparel.",
                    description_ar: "أساسيات الستريت وير العصرية والملابس الأكثر طلباً ومبيعاً.",
                    product_type: "CLOTHING",
                  }}
                  products={sortedClothing}
                  lang={lang}
                  viewAllText={isRtl ? "عرض كل الملابس" : "VIEW ALL CLOTHING"}
                  viewAllHref="/clothing"
                  hideCategoryTag={true}
                />
              </section>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* CASE B: SHOES ONLY ACTIVE (عرض جميع كوليكشنات الأحذية)   */}
        {/* ======================================================== */}
        {showShoes && !showClothing && (
          <section className="space-y-12 u3-reveal border-t border-silver/40 pt-10">
            {shoesCollections.map((col) => {
              const colProducts = products.filter((p) => p.collection_id === col.id);
              if (colProducts.length === 0) return null;
              return (
                <CollectionSlider
                  key={col.id}
                  collection={col}
                  products={colProducts}
                  lang={lang}
                />
              );
            })}

            {/* Other Shoes Not in Collections */}
            {(() => {
              const otherShoes = products.filter((p) => p.product_type === "SHOES" && !p.collection_id);
              if (otherShoes.length === 0) return null;
              return (
                <CollectionSlider
                  collection={{
                    id: "other-shoes",
                    slug: "shoes",
                    name_en: "Signature Shoes",
                    name_ar: "أحذية مميزة",
                    description_en: "Essential silhouettes ready for immediate dispatch.",
                    description_ar: "موديلات وإصدارات جاهزة للشحن الفوري.",
                    product_type: "SHOES",
                  }}
                  products={otherShoes}
                  lang={lang}
                  viewAllText={isRtl ? "عرض كل الأحذية" : "VIEW ALL SHOES"}
                  viewAllHref="/shoes"
                />
              );
            })()}
          </section>
        )}

        {/* ======================================================== */}
        {/* CASE C: CLOTHING ONLY ACTIVE (عرض جميع كوليكشنات الملابس) */}
        {/* ======================================================== */}
        {showClothing && !showShoes && (
          <section className="space-y-12 u3-reveal border-t border-silver/40 pt-10">
            {clothingCollections.map((col) => {
              const colProducts = products.filter((p) => p.collection_id === col.id);
              if (colProducts.length === 0) return null;
              return (
                <CollectionSlider
                  key={col.id}
                  collection={col}
                  products={colProducts}
                  lang={lang}
                />
              );
            })}

            {/* Other Clothing Not in Collections */}
            {(() => {
              const otherClothing = products.filter((p) => p.product_type === "CLOTHING" && !p.collection_id);
              if (otherClothing.length === 0) return null;
              return (
                <CollectionSlider
                  collection={{
                    id: "other-clothing",
                    slug: "clothing",
                    name_en: "Streetwear Drops",
                    name_ar: "إصدارات ملابس حديثة",
                    description_en: "Everyday luxury apparel crafted with premium heavyweight cotton.",
                    description_ar: "أزياء عصرية فاخرة مصنوعة من خامات قطنية ثقيلة ومريحة.",
                    product_type: "CLOTHING",
                  }}
                  products={otherClothing}
                  lang={lang}
                  viewAllText={isRtl ? "عرض كل الملابس" : "VIEW ALL CLOTHING"}
                  viewAllHref="/clothing"
                />
              );
            })()}
          </section>
        )}

        {/* Dynamic Custom Sections from Homepage Editor */}
        {sections
          .filter(
            (s) =>
              s.section_type === "BRAND_STATEMENT" ||
              s.section_type === "BANNER" ||
              s.section_type === "PROMO"
          )
          .map((sec) => (
            <section
              key={sec.id}
              className="relative overflow-hidden bg-gradient-to-br from-[#16181B] via-[#111214] to-[#0D0E10] text-white p-8 sm:p-12 lg:p-14 border border-white/10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8 u3-reveal shadow-2xl"
            >
              <div className="absolute top-0 end-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="max-w-2xl space-y-3.5 relative z-10 text-center md:text-start flex flex-col items-center md:items-start">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono uppercase tracking-[0.2em] text-[#BFC2C6]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isRtl ? sec.subtitle_ar || sec.subtitle_en : sec.subtitle_en}</span>
                </div>
                <h2 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {isRtl ? sec.title_ar || sec.title_en : sec.title_en}
                </h2>
                <p className="text-xs sm:text-sm text-[#E1E3E5] leading-relaxed font-light">
                  {isRtl ? sec.description_ar || sec.description_en : sec.description_en}
                </p>
              </div>
              {sec.button_link && (
                <Link
                  href={sec.button_link}
                  className="relative z-10 group bg-white hover:bg-[#E1E3E5] text-[#111214] font-heading text-xs sm:text-sm font-bold uppercase tracking-widest px-8 py-4 rounded-xl shrink-0 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 inline-flex items-center gap-3 u3-btn-solid-white cursor-pointer"
                >
                  <span className="text-[#111214]">{isRtl ? sec.button_text_ar || sec.button_text_en : sec.button_text_en}</span>
                  <ArrowRight
                    className={`w-4 h-4 text-[#111214] transition-transform duration-200 ${
                      isRtl ? "rotate-180 group-hover:-translate-x-1.5" : "group-hover:translate-x-1.5"
                    }`}
                  />
                </Link>
              )}
            </section>
          ))}
      </div>
    </StoreShell>
  );
}
