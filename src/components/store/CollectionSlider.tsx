"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Layers, ArrowRight, ArrowLeft } from "lucide-react";
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
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  const name = isRtl
    ? collection.name_ar || collection.name_en
    : collection.name_en;
  const description = isRtl
    ? collection.description_ar || collection.description_en
    : collection.description_en;

  const viewAllLink = viewAllHref || `/collections/${collection.slug}`;
  const viewAllLabel = viewAllText || (isRtl ? "عرض المجموعة بالكامل" : "VIEW COLLECTION");

  const displayProducts = products;

  // Smoothly scroll to target card using native element alignment (100% RTL & LTR compatible)
  const scrollToIndex = useCallback(
    (targetIndex: number) => {
      const container = scrollRef.current;
      if (!container || displayProducts.length === 0) return;

      const boundedIndex = (targetIndex + displayProducts.length) % displayProducts.length;
      setCurrentIndex(boundedIndex);

      const targetCard = container.children[boundedIndex] as HTMLElement;
      if (targetCard) {
        targetCard.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
      }
    },
    [displayProducts.length]
  );

  const handleNext = useCallback(() => {
    scrollToIndex(currentIndexRef.current + 1);
  }, [scrollToIndex]);

  const handlePrev = useCallback(() => {
    scrollToIndex(currentIndexRef.current - 1);
  }, [scrollToIndex]);

  // Automatic smooth rotation loop every 3.5 seconds (Pauses gently on hover or touch)
  useEffect(() => {
    if (displayProducts.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % displayProducts.length;
      const container = scrollRef.current;
      if (container && container.children && container.children[nextIndex]) {
        (container.children[nextIndex] as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
      }
      setCurrentIndex(nextIndex);
    }, 3500);

    return () => clearInterval(interval);
  }, [displayProducts.length, isHovered]);

  // Track active slide accurately when user drags/swipes manually
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || container.children.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    let closestIndex = 0;
    let minDistance = Infinity;

    Array.from(container.children).forEach((child, index) => {
      const childRect = (child as HTMLElement).getBoundingClientRect();
      const distance = isRtl
        ? Math.abs(childRect.right - containerRect.right)
        : Math.abs(childRect.left - containerRect.left);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== currentIndexRef.current) {
      setCurrentIndex(closestIndex);
    }
  }, [isRtl]);

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6 u3-reveal border-b border-silver/40 dark:border-white/10 pb-12 last:border-b-0">
      {/* Collection Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-silver/50 dark:border-white/10 pb-4">
        <div className="space-y-1.5">
          {!hideCategoryTag && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-heading font-bold uppercase tracking-[0.2em] text-[#73777D] dark:text-[#A7ABB1]">
                <Layers className="w-3.5 h-3.5 text-jet dark:text-white" />
                <span>{categoryTag || (isRtl ? "كوليكشن حصري" : "EXCLUSIVE COLLECTION")}</span>
              </span>
            </div>
          )}

          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-jet dark:text-white tracking-tight">
            {name}
          </h2>

          {description && (
            <p className="text-xs sm:text-sm text-[#73777D] dark:text-[#A7ABB1] max-w-xl line-clamp-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls: Smooth Arrow Buttons & View All Link */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Link
            href={viewAllLink}
            className="u3-link-underline text-xs font-bold uppercase tracking-wider text-jet dark:text-white hover:text-black dark:hover:text-white flex items-center gap-1 transition-all group"
          >
            <span>{viewAllLabel}</span>
            {isRtl ? (
              <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            )}
          </Link>

          {displayProducts.length > 1 && (
            <div className="flex items-center gap-2 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-silver/60 dark:border-[#30343A]">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous product"
                className="w-8 h-8 rounded-full border border-silver/80 dark:border-[#383C44] hover:border-jet dark:hover:border-white bg-white dark:bg-[#1E2024] hover:bg-jet dark:hover:bg-white hover:text-white dark:hover:text-[#111214] flex items-center justify-center text-jet dark:text-white transition-all duration-300 hover:scale-110 active:scale-90 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next product"
                className="w-8 h-8 rounded-full border border-silver/80 dark:border-[#383C44] hover:border-jet dark:hover:border-white bg-white dark:bg-[#1E2024] hover:bg-jet dark:hover:bg-white hover:text-white dark:hover:text-[#111214] flex items-center justify-center text-jet dark:text-white transition-all duration-300 hover:scale-110 active:scale-90 shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Carousel Track with Pause on Hover */}
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
          className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-3 px-1 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {displayProducts.map((p, idx) => (
            <div
              key={p.id}
              className={`w-[56vw] max-w-[210px] sm:w-[230px] md:w-[250px] shrink-0 snap-start transition-all duration-500 transform-gpu ${
                idx === currentIndex ? "scale-[1.01]" : "opacity-95"
              }`}
            >
              <ProductCard product={p} lang={lang} />
            </div>
          ))}
        </div>

        {/* Carousel Pagination Indicator Dots (Elongating Luxury Active Pill) */}
        {displayProducts.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {displayProducts.map((_, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`transition-all duration-500 ease-out rounded-full ${
                    isActive
                      ? "w-8 h-2 bg-[#111214] dark:bg-white shadow-xs scale-105"
                      : "w-2 h-2 bg-silver/60 dark:bg-white/20 hover:bg-jet/60 dark:hover:bg-white/60 hover:scale-125 cursor-pointer"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
