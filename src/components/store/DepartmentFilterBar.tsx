"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface DepartmentFilterBarProps {
  distinctSizes: Array<{ size: string }>;
  distinctColors: Array<{ color_en: string; color_ar?: string }>;
  sizeFilter: string;
  colorFilter: string;
  inStockOnly: boolean;
  sort: string;
  isRtl: boolean;
  productType: "SHOES" | "CLOTHING";
}

export function DepartmentFilterBar({
  distinctSizes,
  distinctColors,
  sizeFilter,
  colorFilter,
  inStockOnly,
  sort,
  isRtl,
  productType,
}: DepartmentFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function updateQuery(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-silver/60">
      <div className="flex flex-wrap items-center gap-3">
        {/* Size Dropdown */}
        <div className="relative">
          <select
            value={sizeFilter}
            onChange={(e) => updateQuery("size", e.target.value || null)}
            className="appearance-none bg-[#FAFBFB] border border-silver/80 hover:border-jet px-3 py-2 pe-8 rounded-xl text-xs font-bold text-jet outline-none cursor-pointer"
          >
            <option value="">
              {isRtl
                ? productType === "SHOES"
                  ? "المقاس (الكل)"
                  : "المقاس (الكل)"
                : productType === "SHOES"
                ? "Size (All EU)"
                : "Size (All)"}
            </option>
            {distinctSizes.map((s) => (
              <option key={s.size} value={s.size}>
                {productType === "SHOES" ? `EU ${s.size}` : s.size}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-neutralgray absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Color Dropdown */}
        <div className="relative">
          <select
            value={colorFilter}
            onChange={(e) => updateQuery("color", e.target.value || null)}
            className="appearance-none bg-[#FAFBFB] border border-silver/80 hover:border-jet px-3 py-2 pe-8 rounded-xl text-xs font-bold text-jet outline-none cursor-pointer"
          >
            <option value="">{isRtl ? "اللون (الكل)" : "Color (All)"}</option>
            {distinctColors.map((c) => (
              <option key={c.color_en} value={c.color_en}>
                {isRtl ? c.color_ar || c.color_en : c.color_en}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-neutralgray absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* In-Stock Only Pill */}
        <button
          type="button"
          onClick={() => updateQuery("inStock", inStockOnly ? null : "1")}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            inStockOnly
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
              : "bg-[#FAFBFB] text-neutralgray border border-silver/80 hover:border-jet"
          }`}
        >
          {isRtl ? "المتوفر بالمخزن فقط" : "In Stock Only"}
        </button>
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <select
          value={sort}
          onChange={(e) => updateQuery("sort", e.target.value)}
          className="appearance-none bg-[#FAFBFB] border border-silver/80 hover:border-jet px-3 py-2 pe-8 rounded-xl text-xs font-bold text-jet outline-none cursor-pointer"
        >
          <option value="newest">{isRtl ? "الأحدث أولاً" : "Newest Arrivals"}</option>
          <option value="price-asc">{isRtl ? "السعر: من الأقل للأعلى" : "Price: Low to High"}</option>
          <option value="price-desc">{isRtl ? "السعر: من الأعلى للأقل" : "Price: High to Low"}</option>
          <option value="bestseller">{isRtl ? "الأكثر طلباً" : "Best Sellers"}</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-neutralgray absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

