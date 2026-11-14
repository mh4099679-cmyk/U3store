import React from "react";
import Link from "next/link";
import { Footprints, Shirt, Layers } from "lucide-react";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { getStorefrontLanguage } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const lang = await getStorefrontLanguage();
  const db = await getDb();

  const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
  const visibleCategories = settings?.visible_categories || "BOTH";

  let colFilter = "";
  if (visibleCategories === "SHOES_ONLY") {
    colFilter = "AND col.product_type = 'SHOES'";
  } else if (visibleCategories === "CLOTHING_ONLY") {
    colFilter = "AND col.product_type = 'CLOTHING'";
  }

  const collections = queryAll<any>(
    db,
    `SELECT col.*,
            (SELECT COUNT(*) FROM products p WHERE p.collection_id = col.id AND p.status = 'ACTIVE') as products_count
     FROM collections col
     WHERE col.is_active = 1 ${colFilter}
     ORDER BY col.sort_order ASC, col.created_at DESC`
  );

  const isRtl = lang === "ar";

  return (
    <StoreShell>
      <div className="bg-[#111214] text-[#F7F7F5] py-5 sm:py-10 border-b border-[#292B2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#BFC2C6] mb-1 font-semibold">
            U3 STORE — LIVE YOURS.
          </p>
          <h1 className="font-heading text-xl sm:text-3xl font-bold tracking-tight text-white">
            {isRtl ? "المجموعات الحصرية" : "EXCLUSIVE COLLECTIONS"}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        {collections.length === 0 ? (
          <div className="bg-white border border-[#E1E3E5] p-12 text-center space-y-4 max-w-2xl mx-auto shadow-sm rounded-2xl">
            <h2 className="font-heading text-xl font-bold text-[#111214]">
              {isRtl ? "قريباً تشكيلات حصرية جديدة" : "Exclusive Drops Coming Soon"}
            </h2>
            <p className="text-xs text-[#73777D] leading-relaxed">
              {isRtl
                ? "نعمل حالياً على تجهيز وإطلاق تشكيلات جديدة وحصرية. يمكنك تصفح المنتجات المتوفرة الآن في المتجر."
                : "We are curating limited-edition drops. Explore all currently available items in our shop."}
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-block bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase tracking-widest px-8 py-3.5 rounded-xl transition-colors"
              >
                {isRtl ? "تصفح المتجر الآن" : "EXPLORE THE SHOP"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {collections.map((col) => {
              const isClothing = col.product_type === "CLOTHING";
              return (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="bg-[#111214] text-white border border-[#292B2E] hover:border-[#BFC2C6] p-8 sm:p-10 flex flex-col justify-between min-h-[240px] group transition-all rounded-2xl shadow-sm relative overflow-hidden"
                >
                  {col.banner_desktop_url && (
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
                      <img src={col.banner_desktop_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#BFC2C6] border border-white/10">
                        {isClothing ? <Shirt className="w-3 h-3" /> : <Footprints className="w-3 h-3" />}
                        <span>{isClothing ? (isRtl ? "ملابس" : "APPAREL") : (isRtl ? "أحذية" : "FOOTWEAR")}</span>
                      </span>

                      <span className="text-[11px] font-mono text-[#BFC2C6] font-semibold">
                        {col.products_count} {isRtl ? "منتج" : "PRODUCTS"}
                      </span>
                    </div>

                    <h2 className="font-heading text-2xl font-bold group-hover:text-[#BFC2C6] transition-colors">
                      {isRtl ? col.name_ar || col.name_en : col.name_en}
                    </h2>

                    <p className="text-xs sm:text-sm text-[#A7ABB1] line-clamp-2">
                      {isRtl ? col.description_ar || col.description_en : col.description_en}
                    </p>
                  </div>

                  <span className="text-xs font-bold uppercase tracking-widest text-white group-hover:text-emerald-300 underline underline-offset-4 pt-6 relative z-10 transition-colors">
                    {isRtl ? "استكشف المجموعة ←" : "EXPLORE COLLECTION →"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </StoreShell>
  );
}
