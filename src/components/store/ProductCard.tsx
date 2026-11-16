import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Language, formatCurrency } from "@/lib/i18n/dictionaries";

export interface ProductSummary {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  product_type?: string;
  regular_price: number;
  sale_price: number | null;
  is_new_arrival: number;
  is_featured: number;
  is_best_seller: number;
  category_name_en?: string;
  category_name_ar?: string;
  main_image?: string;
  secondary_image?: string;
  total_available_stock?: number;
}

export function ProductCard({
  product,
  lang,
}: {
  product: ProductSummary;
  lang: Language;
}) {
  const name = lang === "ar" ? product.name_ar || product.name_en : product.name_en;
  const catName =
    lang === "ar"
      ? product.category_name_ar || product.category_name_en
      : product.category_name_en;
  const hasSale =
    product.sale_price !== null &&
    product.sale_price !== undefined &&
    Number(product.sale_price) > 0 &&
    Number(product.sale_price) < Number(product.regular_price);
  const displayPrice = hasSale ? Number(product.sale_price) : Number(product.regular_price);
  const inStock = Number(product.total_available_stock || 0) > 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      prefetch={true}
      className="group bg-white dark:bg-[#1A1C1F] border border-[#E1E3E5] dark:border-[#2E3238] hover:border-[#111214] dark:hover:border-white/60 shadow-xs hover:shadow-xl transition-all duration-500 ease-out flex flex-col overflow-hidden u3-reveal u3-3d-card rounded-2xl w-full hover:-translate-y-1 transform-gpu"
    >
      {/* Product Image Frame: Balanced height & padding with sleek curved corners and smooth 3D depth */}
      <div className="relative aspect-[4/3] sm:aspect-square max-h-[180px] sm:max-h-[220px] bg-gradient-to-b from-[#F7F7F5] to-[#EFEFEA] dark:from-[#24272D] dark:to-[#1A1C1F] overflow-hidden flex items-center justify-center p-3 sm:p-4 rounded-t-2xl transition-colors">
        {/* Main Product Image with Smooth Luxury Hover Zoom & Fade */}
        <img
          src={product.main_image || "/logo.jpg"}
          alt={name}
          className={`w-full h-full max-h-[140px] sm:max-h-[175px] object-contain transition-all duration-500 ease-out transform-gpu drop-shadow-sm group-hover:drop-shadow-lg ${
            product.secondary_image
              ? "group-hover:opacity-0 group-hover:scale-105"
              : "group-hover:scale-108 group-hover:-translate-y-0.5"
          }`}
          loading="lazy"
        />

        {/* Secondary Angle Image (Smooth crossfade & reveal on hover) */}
        {product.secondary_image && (
          <img
            src={product.secondary_image}
            alt={name}
            className="absolute inset-0 m-auto w-full h-full max-h-[140px] sm:max-h-[175px] object-contain p-3 sm:p-4 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-105 drop-shadow-lg transition-all duration-500 ease-out transform-gpu pointer-events-none"
            loading="lazy"
          />
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {Boolean(product.is_new_arrival) && (
            <span className="bg-[#111214] dark:bg-white text-[#F7F7F5] dark:text-[#111214] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-xs">
              {lang === "ar" ? "جديد" : "NEW"}
            </span>
          )}
          {hasSale && (
            <span className="bg-[#292B2E] dark:bg-[#33373E] border border-[#BFC2C6]/40 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-xs">
              {lang === "ar" ? "خصم" : "SALE"}
            </span>
          )}
        </div>

        {!inStock && (
          <div className="absolute bottom-2.5 right-2.5 bg-[#111214]/90 dark:bg-black/90 text-[#BFC2C6] text-[9px] sm:text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full">
            {lang === "ar" ? "نفد المخزون" : "OUT OF STOCK"}
          </div>
        )}
      </div>

      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-1.5 border-t border-[#E9EAEC] dark:border-[#2E3238] bg-white dark:bg-[#1A1C1F] rounded-b-2xl transition-colors">
        <div>
          {catName && (
            <p className="text-[10px] uppercase tracking-wider text-neutralgray dark:text-[#9EA3AA] mb-0.5 line-clamp-1">
              {catName}
            </p>
          )}
          <h3 className="font-heading text-xs sm:text-sm font-bold text-jet dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-1">
            {name}
          </h3>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <span className="font-heading font-bold text-xs sm:text-sm text-jet dark:text-white">
            {formatCurrency(displayPrice, lang)}
          </span>
          {hasSale && (
            <span className="text-[10px] sm:text-xs text-neutralgray dark:text-[#8E939C] line-through">
              {formatCurrency(Number(product.regular_price), lang)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
