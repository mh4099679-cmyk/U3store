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

  const scrollToIndex = useCallback(
    (targetIndex: number) => {
      const container = scrollRef.current;
      if (!container || displayProducts.length === 0) return;

      const boundedIndex = Math.max(0, Math.min(targetIndex, displayProducts.length - 1));
      const cardStep = container.clientWidth < 640 ? container.clientWidth * 0.58 : 250;

      if (isRtl) {
        // RTL negative scroll
        container.scrollTo({
          left: -boundedIndex * cardStep,
          behavior: "smooth",
        });
      } else {
        container.scrollTo({
          left: boundedIndex * cardStep,
          behavior: "smooth",
        });
      }
      setCurrentIndex(boundedIndex);
    },
    [displayProducts.length, isRtl]
  );

  const handleNext = useCallback(() => {
    if (displayProducts.length <= 1) return;
    const next = (currentIndex + 1) % displayProducts.length;
    scrollToIndex(next);
  }, [currentIndex, displayProducts.length, scrollToIndex]);

  const handlePrev = useCallback(() => {
    if (displayProducts.length <= 1) return;
    const prev = (currentIndex - 1 + displayProducts.length) % displayProducts.length;
    scrollToIndex(prev);
  }, [currentIndex, displayProducts.length, scrollToIndex]);

  // Auto-scroll loop every 3.2 seconds
  useEffect(() => {
    if (displayProducts.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      handleNext();
    }, 3200);

    return () => clearInterval(timer);
  }, [displayProducts.length, isHovered, handleNext]);

  // Handle manual scroll update for indicator dots
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const cardStep = container.clientWidth < 640 ? container.clientWidth * 0.75 : 290;
    const scrollPos = isRtl ? Math.abs(container.scrollLeft) : container.scrollLeft;
    const estimatedIndex = Math.round(scrollPos / cardStep);
    const bounded = Math.max(0, Math.min(estimatedIndex, displayProducts.length - 1));
    if (bounded !== currentIndex) {
      setCurrentIndex(bounded);
    }
  };

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5 u3-reveal border-b border-silver/40 pb-12 last:border-b-0">
      {/* Collection Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-silver/50 pb-4">
        <div className="space-y-1">
          {!hideCategoryTag && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-heading font-bold uppercase tracking-[0.2em] text-[#73777D]">
                <Layers className="w-3.5 h-3.5 text-jet" />
                <span>{categoryTag || (isRtl ? "كوليكشن مميز" : "EXCLUSIVE COLLECTION")}</span>
              </span>
            </div>
          )}

          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-jet tracking-tight">
            {name}
          </h2>

          {description && (
            <p className="text-xs sm:text-sm text-[#73777D] max-w-xl line-clamp-1">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls: Arrow Buttons & View All Link */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Link
            href={viewAllLink}
            className="u3-link-underline text-xs font-bold uppercase tracking-wider text-jet hover:text-black flex items-center gap-1"
          >
            <span>{viewAllLabel}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
          </Link>

          {displayProducts.length > 1 && (
            <div className="flex items-center gap-1.5 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-silver/60">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous product"
                className="w-8 h-8 rounded-full border border-silver/80 hover:border-jet bg-white hover:bg-jet hover:text-white flex items-center justify-center text-jet transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next product"
                className="w-8 h-8 rounded-full border border-silver/80 hover:border-jet bg-white hover:bg-jet hover:text-white flex items-center justify-center text-jet transition-colors shadow-2xs"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Carousel Track */}
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
              className="w-[52vw] max-w-[210px] sm:w-[230px] md:w-[245px] shrink-0 snap-center sm:snap-start"
            >
              <ProductCard product={p} lang={lang} />
            </div>
          ))}
        </div>

        {/* Carousel Pagination Indicator Dots (نقط تحت تبين اللف والدوران) */}
        {displayProducts.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {displayProducts.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? "w-7 h-2 bg-[#111214] shadow-xs"
                    : "w-2 h-2 bg-silver/60 hover:bg-jet cursor-pointer"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
