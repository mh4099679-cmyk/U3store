"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Layers, ArrowRight } from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";
import { ProductCard, ProductSummary } from "./ProductCard";

export interface CollectionItem {
  id: string;
  slug: string;
  name_en: string;
  name_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  banner_desktop_url?: string | null;
  product_type?: string | null;
}

interface CollectionSliderProps {
  collection: CollectionItem;
  products: ProductSummary[];
  lang: Language;
  viewAllText?: string;
  viewAllHref?: string;
  categoryTag?: string;
  hideCategoryTag?: boolean;
}

export function CollectionSlider({
  collection,
  products,
  lang,
  viewAllText,
  viewAllHref,
  categoryTag,
  hideCategoryTag = false,
}: CollectionSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const isRtl = lang === "ar";

  const name = isRtl
    ? collection.name_ar || collection.name_en
    : collection.name_en;
  const description = isRtl
    ? collection.description_ar || collection.description_en
    : collection.description_en;

  const viewAllLink = viewAllHref || `/collections/${collection.slug}`;
  const viewAllLabel = viewAllText || (isRtl ? "عرض المجموعة بالكامل" : "VIEW COLLECTION");

  const displayProducts = products;

  // Purely horizontal navigation: moves ONLY the products inside the container with ZERO vertical page movement
  const handleNext = useCallback(() => {
    const container = scrollRef.current;
    if (!container || displayProducts.length <= 1) return;

    const firstCard = container.firstElementChild as HTMLElement | null;
    const cardStep = firstCard ? firstCard.offsetWidth + 20 : 250;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = Math.abs(container.scrollLeft);

    if (currentScroll >= maxScroll - 15) {
      container.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    } else {
      const delta = isRtl ? -cardStep : cardStep;
      container.scrollBy({ left: delta, top: 0, behavior: "smooth" });
    }
  }, [displayProducts.length, isRtl]);

  const handlePrev = useCallback(() => {
    const container = scrollRef.current;
    if (!container || displayProducts.length <= 1) return;

    const firstCard = container.firstElementChild as HTMLElement | null;
    const cardStep = firstCard ? firstCard.offsetWidth + 20 : 250;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = Math.abs(container.scrollLeft);

    if (currentScroll <= 15) {
      container.scrollTo({ left: isRtl ? -maxScroll : maxScroll, top: 0, behavior: "smooth" });
    } else {
      const delta = isRtl ? cardStep : -cardStep;
      container.scrollBy({ left: delta, top: 0, behavior: "smooth" });
    }
  }, [displayProducts.length, isRtl]);

  // Smooth automatic horizontal rotation: advances only products sideways, pauses on hover/touch
  useEffect(() => {
    if (displayProducts.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      handleNext();
    }, 3400);

    return () => clearInterval(timer);
  }, [displayProducts.length, isHovered, handleNext]);

  // Update dots indicator strictly from horizontal scroll position
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || displayProducts.length <= 1) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;
    const currentScroll = Math.abs(container.scrollLeft);
    const progress = Math.min(1, Math.max(0, currentScroll / maxScroll));
    const activeDot = Math.round(progress * (displayProducts.length - 1));
    setCurrentIndex(activeDot);
  }, [displayProducts.length]);

  const scrollToDot = (idx: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const target = (idx / (displayProducts.length - 1)) * maxScroll;
    container.scrollTo({
      left: isRtl ? -target : target,
      top: 0,
      behavior: "smooth",
    });
    setCurrentIndex(idx);
  };

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5 u3-reveal border-b border-silver/40 dark:border-white/10 pb-12 last:border-b-0">
      {/* Collection Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-silver/50 dark:border-white/10 pb-4">
        <div className="space-y-1">
          {!hideCategoryTag && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-heading font-bold uppercase tracking-[0.2em] text-[#73777D] dark:text-[#A7ABB1]">
                <Layers className="w-3.5 h-3.5 text-jet dark:text-white" />
                <span>{categoryTag || (isRtl ? "كوليكشن مميز" : "EXCLUSIVE COLLECTION")}</span>
              </span>
            </div>
          )}

          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-jet dark:text-white tracking-tight">
            {name}
          </h2>

          {description && (
            <p className="text-xs sm:text-sm text-[#73777D] dark:text-[#A7ABB1] max-w-xl line-clamp-1">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls: Arrow Buttons & View All Link */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Link
            href={viewAllLink}
            className="u3-link-underline text-xs font-bold uppercase tracking-wider text-jet dark:text-white hover:text-black dark:hover:text-white flex items-center gap-1"
          >
            <span>{viewAllLabel}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
          </Link>

          {displayProducts.length > 1 && (
            <div className="flex items-center gap-1.5 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-silver/60 dark:border-[#30343A]">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous product"
                className="w-8 h-8 rounded-full border border-silver/80 dark:border-[#383C44] hover:border-jet dark:hover:border-white bg-white dark:bg-[#1E2024] hover:bg-jet dark:hover:bg-white hover:text-white dark:hover:text-[#111214] flex items-center justify-center text-jet dark:text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next product"
                className="w-8 h-8 rounded-full border border-silver/80 dark:border-[#383C44] hover:border-jet dark:hover:border-white bg-white dark:bg-[#1E2024] hover:bg-jet dark:hover:bg-white hover:text-white dark:hover:text-[#111214] flex items-center justify-center text-jet dark:text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Carousel Track: strictly horizontal overflow */}
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-2 px-1 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {displayProducts.map((p) => (
            <div
              key={p.id}
              className="w-[52vw] max-w-[210px] sm:w-[230px] md:w-[245px] shrink-0 snap-start"
            >
              <ProductCard product={p} lang={lang} />
            </div>
          ))}
        </div>

        {/* Carousel Pagination Indicator Dots */}
        {displayProducts.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {displayProducts.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToDot(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? "w-7 h-2 bg-[#111214] dark:bg-white shadow-xs"
                    : "w-2 h-2 bg-silver/60 dark:bg-white/20 hover:bg-jet dark:hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
