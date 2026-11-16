"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, Maximize2 } from "lucide-react";
import type { Language } from "@/lib/i18n/dictionaries";

interface ProductImage {
  id: string;
  url: string;
  is_main?: number;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  lang: Language;
  isSoldOut?: boolean;
  soldOutText?: string;
  initialActiveUrl?: string;
}

export function ProductImageGallery({
  images,
  productName,
  lang,
  isSoldOut = false,
  soldOutText = "SOLD OUT",
  initialActiveUrl,
}: ProductImageGalleryProps) {
  const isRtl = lang === "ar";

  // Ensure there is always at least one fallback image
  const galleryImages: ProductImage[] =
    images && images.length > 0
      ? images
      : [{ id: "default-img", url: "/logo.png", is_main: 1 }];

  const hasMultipleImages = galleryImages.length > 1;

  // Active slide index
  const initialIndex = initialActiveUrl
    ? Math.max(0, galleryImages.findIndex((img) => img.url === initialActiveUrl))
    : 0;
  const [activeIndex, setActiveIndex] = useState<number>(initialIndex);

  // Real-time touch/mouse swipe state
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  // Lightbox / Zoom modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isHorizontalGesture = useRef<boolean | null>(null);
  const wasDragged = useRef<boolean>(false);

  // Preload all product images immediately for 0-latency swiping
  useEffect(() => {
    galleryImages.forEach((img) => {
      if (img.url) {
        const pre = new Image();
        pre.src = img.url;
      }
    });
  }, [galleryImages]);

  // Navigate to previous slide
  const goToPrev = useCallback(() => {
    if (!hasMultipleImages) return;
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1));
  }, [galleryImages.length, hasMultipleImages]);

  // Navigate to next slide
  const goToNext = useCallback(() => {
    if (!hasMultipleImages) return;
    setActiveIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
  }, [galleryImages.length, hasMultipleImages]);

  // ==========================================
  // ULTRA-FAST & NATURAL TOUCH EVENT HANDLERS
  // ==========================================
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isHorizontalGesture.current = null;
    wasDragged.current = false;
    setIsInteracting(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!hasMultipleImages || !isInteracting) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;

    // Lock axis on first move (> 6px)
    if (isHorizontalGesture.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalGesture.current = Math.abs(diffX) >= Math.abs(diffY);
      }
    }

    // If vertical gesture, allow native document scroll
    if (isHorizontalGesture.current === false) return;

    // Horizontal swipe active
    wasDragged.current = true;
    let offset = diffX;

    // Rubber-band resistance at boundaries (iOS physics)
    if (
      (activeIndex === 0 && offset > 0) ||
      (activeIndex === galleryImages.length - 1 && offset < 0)
    ) {
      offset = offset * 0.32;
    }

    setDragOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!isInteracting) return;
    setIsInteracting(false);

    if (!hasMultipleImages || isHorizontalGesture.current === false) {
      setDragOffset(0);
      return;
    }

    const elapsed = Math.max(1, Date.now() - touchStartTime.current);
    const velocity = Math.abs(dragOffset) / elapsed; // px per ms
    const containerWidth = containerRef.current?.offsetWidth || 350;

    // Very easy, natural threshold: just 15% of width OR quick flick velocity
    const distanceThreshold = Math.min(containerWidth * 0.15, 38);

    if (dragOffset < -distanceThreshold || (dragOffset < -15 && velocity > 0.22)) {
      // Swiped Left -> Advance to next image
      if (activeIndex < galleryImages.length - 1) {
        setActiveIndex((prev) => prev + 1);
      }
    } else if (dragOffset > distanceThreshold || (dragOffset > 15 && velocity > 0.22)) {
      // Swiped Right -> Back to previous image
      if (activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    }

    setDragOffset(0);
    isHorizontalGesture.current = null;
  };

  // ==========================================
  // DESKTOP MOUSE DRAG SUPPORT
  // ==========================================
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hasMultipleImages) return;
    touchStartX.current = e.clientX;
    touchStartTime.current = Date.now();
    wasDragged.current = false;
    setIsInteracting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isInteracting || !hasMultipleImages) return;
    const diffX = e.clientX - touchStartX.current;
    if (Math.abs(diffX) > 5) {
      wasDragged.current = true;
    }

    let offset = diffX;
    if (
      (activeIndex === 0 && offset > 0) ||
      (activeIndex === galleryImages.length - 1 && offset < 0)
    ) {
      offset = offset * 0.32;
    }
    setDragOffset(offset);
  };

  const handleMouseUp = () => {
    if (!isInteracting) return;
    setIsInteracting(false);

    if (!hasMultipleImages) {
      setDragOffset(0);
      return;
    }

    const elapsed = Math.max(1, Date.now() - touchStartTime.current);
    const velocity = Math.abs(dragOffset) / elapsed;
    const containerWidth = containerRef.current?.offsetWidth || 350;
    const distanceThreshold = Math.min(containerWidth * 0.15, 38);

    if (dragOffset < -distanceThreshold || (dragOffset < -15 && velocity > 0.22)) {
      if (activeIndex < galleryImages.length - 1) {
        setActiveIndex((prev) => prev + 1);
      }
    } else if (dragOffset > distanceThreshold || (dragOffset > 15 && velocity > 0.22)) {
      if (activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    }

    setDragOffset(0);
  };

  // Tap on image opens Lightbox (only if not dragged)
  const handleImageClick = (idx: number) => {
    if (!wasDragged.current) {
      setActiveIndex(idx);
      setLightboxZoom(1);
      setIsLightboxOpen(true);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLightboxOpen, goToNext, goToPrev]);

  return (
    <div className="space-y-3.5 select-none" dir="ltr">
      {/* Main Image Gallery Card */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative aspect-square w-full bg-[#FAFAFA] dark:bg-[#181A1D] border border-silver/50 dark:border-[#2E3238] rounded-2xl overflow-hidden group shadow-sm touch-pan-y cursor-grab active:cursor-grabbing transition-colors"
      >
        {/* Continuous 1:1 Horizontal Slide Strip with Hardware Acceleration */}
        <div
          className="flex w-full h-full will-change-transform"
          style={{
            transform: `translate3d(calc(-${activeIndex * 100}% + ${dragOffset}px), 0, 0)`,
            transition: isInteracting
              ? "none"
              : "transform 250ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {galleryImages.map((img, idx) => (
            <div
              key={img.id || idx}
              onClick={() => handleImageClick(idx)}
              className="w-full h-full shrink-0 flex items-center justify-center relative select-none"
            >
              <img
                src={img.url}
                alt={`${productName} - ${idx + 1}`}
                draggable={false}
                loading={idx <= 1 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : "auto"}
                className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
            </div>
          ))}
        </div>

        {/* Sold Out Badge */}
        {isSoldOut && (
          <span className="absolute top-4 start-4 z-20 bg-[#111214] text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md shadow-md pointer-events-none">
            {soldOutText}
          </span>
        )}

        {/* Zoom Cue Icon (Top-End corner) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxZoom(1);
            setIsLightboxOpen(true);
          }}
          aria-label={lang === "ar" ? "تكبير الصورة" : "Zoom Image"}
          className="absolute top-3.5 end-3.5 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Image Index Counter Pill (Bottom-End corner) */}
        {hasMultipleImages && (
          <span className="absolute bottom-3.5 end-3.5 z-20 text-[11px] font-mono font-bold text-white bg-black/55 backdrop-blur-md px-2.5 py-1 rounded-full pointer-events-none shadow-sm">
            {activeIndex + 1} / {galleryImages.length}
          </span>
        )}

        {/* Desktop Prev / Next Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              aria-label={lang === "ar" ? "الصورة السابقة" : "Previous Image"}
              className="hidden sm:flex absolute top-1/2 -translate-y-1/2 start-3.5 z-20 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-jet shadow-lg items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label={lang === "ar" ? "الصورة التالية" : "Next Image"}
              className="hidden sm:flex absolute top-1/2 -translate-y-1/2 end-3.5 z-20 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-jet shadow-lg items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Pagination Dots (Instant, Snappy & Tap-Friendly) */}
      {hasMultipleImages && (
        <div className="flex items-center justify-center gap-1.5 pt-1 pb-0.5">
          {galleryImages.map((_, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to image ${idx + 1}`}
                className={`h-1.5 transition-all duration-200 rounded-full cursor-pointer ${
                  isActive
                    ? "w-6 bg-[#111214] dark:bg-white"
                    : "w-1.5 bg-[#D1D5DB] dark:bg-white/30 hover:bg-[#9CA3AF] dark:hover:bg-white/60"
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Thumbnail Bar */}
      {hasMultipleImages && (
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
          {galleryImages.map((img, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`${productName} thumbnail ${idx + 1}`}
                className={`w-16 h-16 sm:w-20 sm:h-20 aspect-square rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "border-[#111214] dark:border-white ring-2 ring-[#111214]/25 dark:ring-white/30 scale-[1.03] shadow-sm"
                    : "border-silver/60 dark:border-[#383C44] hover:border-silver opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={img.url}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox / Zoom Fullscreen Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between items-center p-4 sm:p-6 select-none animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Header Bar */}
          <div
            className="w-full max-w-4xl flex items-center justify-between text-white z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-start">
              <h2 className="text-sm sm:text-base font-heading font-bold text-white truncate max-w-xs sm:max-w-md">
                {productName}
              </h2>
              {hasMultipleImages && (
                <p className="text-xs text-[#BFC2C6] font-mono">
                  {activeIndex + 1} / {galleryImages.length}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => (z === 1 ? 1.7 : 1))}
                aria-label="Toggle Zoom"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                aria-label={lang === "ar" ? "إغلاق" : "Close"}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Zoomable Image in Lightbox */}
          <div
            className="relative w-full max-w-3xl flex-1 flex items-center justify-center overflow-hidden my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[activeIndex]?.url}
              alt={productName}
              draggable={false}
              style={{
                transform: `scale(${lightboxZoom})`,
                transition: "transform 0.25s ease",
              }}
              className="max-h-[75vh] max-w-full object-contain cursor-zoom-out select-none"
              onClick={() => setLightboxZoom((z) => (z > 1 ? 1 : 1.7))}
            />

            {/* Modal Next / Prev controls */}
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={() => goToPrev()}
                  className="absolute start-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => goToNext()}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm transition-all cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip in Lightbox */}
          {hasMultipleImages && (
            <div
              className="flex gap-2 max-w-full overflow-x-auto pb-2 z-30"
              onClick={(e) => e.stopPropagation()}
            >
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setLightboxZoom(1);
                  }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeIndex === idx
                      ? "border-white ring-2 ring-white/50 scale-105"
                      : "border-white/30 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt="" draggable={false} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
