"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Heart,
  Check,
  Ruler,
  Truck,
  RotateCcw,
} from "lucide-react";
import { Language, t, formatCurrency } from "@/lib/i18n/dictionaries";
import { ProductImageGallery } from "@/components/store/ProductImageGallery";
import { SizeGuideModal } from "@/components/store/SizeGuideModal";
import { isColorLight } from "@/lib/search";

interface VariantInfo {
  id: string;
  sku: string;
  size: string;
  color_en: string;
  color_ar: string;
  color_hex: string;
  on_hand: number;
  reserved: number;
}

interface ProductDetailClientProps {
  lang: Language;
  product: any;
  images: Array<{ id: string; url: string; is_main: number }>;
  variants: VariantInfo[];
  initialWishlisted: boolean;
}

export function ProductDetailClient({
  lang,
  product,
  images,
  variants,
  initialWishlisted,
}: ProductDetailClientProps) {
  const router = useRouter();

  // Extract unique colors and calculate total available stock per color
  const colors = useMemo(() => {
    const map = new Map<string, { en: string; ar: string; hex: string; totalAvailable: number }>();
    for (const v of variants) {
      const avail = Math.max(0, Number(v.on_hand || 0));
      const existing = map.get(v.color_en);
      if (!existing) {
        map.set(v.color_en, {
          en: v.color_en,
          ar: v.color_ar || v.color_en,
          hex: v.color_hex || "#111214",
          totalAvailable: avail,
        });
      } else {
        existing.totalAvailable += avail;
      }
    }
    return Array.from(map.values());
  }, [variants]);

  const initialColor = useMemo(() => {
    const withStock = colors.find((c) => c.totalAvailable > 0);
    return withStock?.en || colors[0]?.en || "";
  }, [colors]);

  const [selectedColor, setSelectedColor] = useState(initialColor);

  const sizesForColor = useMemo(() => {
    return variants.filter((v) => v.color_en === selectedColor);
  }, [variants, selectedColor]);

  const initialVariantId = useMemo(() => {
    const firstInStock = sizesForColor.find(
      (v) => Math.max(0, Number(v.on_hand || 0)) > 0
    );
    return firstInStock?.id || sizesForColor[0]?.id || variants[0]?.id || "";
  }, [sizesForColor, variants]);

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);

  const activeVariant = useMemo(
    () =>
      variants.find((v) => v.id === selectedVariantId) ||
      sizesForColor[0] ||
      variants[0] ||
      null,
    [variants, selectedVariantId, sizesForColor]
  );

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [showSizeGuideModal, setShowSizeGuideModal] = useState(false);

  // Pre-fetch high-intent checkout & cart routes for lightning-fast transitions
  React.useEffect(() => {
    try {
      router.prefetch("/checkout");
      router.prefetch("/cart");
    } catch {}
  }, [router]);

  const availableStock = activeVariant
    ? Math.max(0, Number(activeVariant.on_hand || 0))
    : 0;

  const totalProductAvailable = useMemo(
    () =>
      variants.reduce(
        (sum, v) => sum + Math.max(0, Number(v.on_hand || 0)),
        0
      ),
    [variants]
  );

  const hasSale =
    product.sale_price !== null &&
    product.sale_price !== undefined &&
    Number(product.sale_price) > 0 &&
    Number(product.sale_price) < Number(product.regular_price);
  const finalPrice = hasSale ? Number(product.sale_price) : Number(product.regular_price);

  async function handleAddToBag(buyNow = false) {
    if (!activeVariant || availableStock <= 0) return;
    setAdding(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          productId: product.id,
          variantId: activeVariant.id,
          quantity,
          buyNow,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setFeedback({ type: "err", msg: data.error || "Could not add to bag" });
      } else {
        if (buyNow) {
          router.push("/checkout");
        } else {
          setFeedback({
            type: "ok",
            msg:
              lang === "ar"
                ? product.product_type === "CLOTHING"
                  ? "تمت إضافة القطعة إلى حقيبة التسوق الخاصة بك."
                  : "تمت إضافة الحذاء إلى حقيبة التسوق الخاصة بك."
                : "Added to your shopping bag.",
          });
          router.refresh();
        }
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleWishlist() {
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    const data = await res.json();
    if (data.ok) {
      setWishlisted(Boolean(data.saved));
      router.refresh();
    }
  }

  const name = lang === "ar" ? product.name_ar || product.name_en : product.name_en;
  const description =
    lang === "ar"
      ? product.description_ar || product.description_en
      : product.description_en;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Left: Mobile Finger Swipe & Desktop Gallery */}
      <ProductImageGallery
        images={images}
        productName={name}
        lang={lang}
        isSoldOut={totalProductAvailable <= 0}
        soldOutText={lang === "ar" ? "نفد المخزون بالكامل" : "SOLD OUT"}
      />

      {/* Right: Product Info & Variant Matrix */}
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutralgray font-bold mb-1">
            {lang === "ar"
              ? product.category_name_ar || product.category_name_en || "U3 STORE"
              : product.category_name_en || "U3 STORE"}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-jet">{name}</h1>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-4 border-b border-silver/50 pb-5">
          <span className="font-heading text-2xl font-bold text-jet">
            {formatCurrency(finalPrice, lang)}
          </span>
          {hasSale && (
            <span className="text-base text-neutralgray line-through">
              {formatCurrency(Number(product.regular_price), lang)}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-neutralgray leading-relaxed whitespace-pre-line">
            {description}
          </p>
        )}

        {/* Material & Craftsmanship */}
        {((lang === "ar" && product.material_ar) || product.material_en) && (
          <div className="bg-[#FAFBFB] dark:bg-[#1A1C1F] border border-silver/60 dark:border-[#2E3238] rounded-xl p-3 text-xs space-y-1 transition-colors">
            <span className="font-bold uppercase tracking-wider text-jet dark:text-white">
              {lang === "ar" ? "الخامات وتفاصيل التصنيع:" : "Material & Details:"}
            </span>
            <p className="text-neutralgray dark:text-[#A7ABB1]">
              {lang === "ar" ? product.material_ar || product.material_en : product.material_en}
            </p>
          </div>
        )}

        {/* Color Selector — Prominent Visual Swatches */}
        {colors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-jet dark:text-white flex items-center gap-2">
                <span>{t(lang, "product.select_color")}:</span>
                <span className="text-jet dark:text-white bg-neutral-100 dark:bg-[#2A2D32] border border-silver/60 dark:border-[#383C44] px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold">
                  {lang === "ar"
                    ? colors.find((c) => c.en === selectedColor)?.ar || selectedColor
                    : selectedColor}
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {colors.map((c) => {
                const isSelected = c.en === selectedColor;
                const colorSoldOut = c.totalAvailable <= 0;
                const light = isColorLight(c.hex);
                return (
                  <button
                    key={c.en}
                    type="button"
                    title={lang === "ar" ? c.ar : c.en}
                    disabled={colorSoldOut}
                    onClick={() => {
                      setSelectedColor(c.en);
                      const colorVars = variants.filter((v) => v.color_en === c.en);
                      const firstAvail =
                        colorVars.find(
                          (v) => Math.max(0, Number(v.on_hand || 0)) > 0
                        ) || colorVars[0];
                      if (firstAvail) setSelectedVariantId(firstAvail.id);
                    }}
                    className={`group relative flex items-center gap-2.5 p-1.5 pe-3.5 rounded-full border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "border-jet dark:border-white bg-[#111214] dark:bg-white text-white dark:text-[#111214] shadow-md ring-2 ring-jet dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-[#111214] scale-105"
                        : colorSoldOut
                        ? "border-silver/40 dark:border-white/10 bg-neutral-100/70 dark:bg-white/5 text-neutral-400 opacity-50 cursor-not-allowed line-through"
                        : "border-silver/80 dark:border-[#383C44] bg-white dark:bg-[#1E2024] text-jet dark:text-white hover:border-jet dark:hover:border-white hover:shadow-xs hover:scale-[1.02]"
                    }`}
                  >
                    {/* Visual Color Circle Swatch */}
                    <span
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-inner shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 border ${
                        light ? "border-neutral-300" : "border-white/20"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 stroke-[2.5] ${
                            light ? "text-neutral-900" : "text-white"
                          }`}
                        />
                      )}
                    </span>

                    {/* Color Name */}
                    <span className="text-xs font-bold tracking-wide">
                      {lang === "ar" ? c.ar : c.en}
                    </span>

                    {colorSoldOut && (
                      <span className="text-[10px] text-neutral-400 ms-0.5">
                        {lang === "ar" ? "(غير متوفر)" : "(Sold Out)"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size Selector — Shoes vs Clothing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-jet">
              {product.product_type === "CLOTHING"
                ? (lang === "ar" ? "اختر المقاس:" : "SELECT SIZE:")
                : (lang === "ar" ? "اختر المقاس (EU):" : "SELECT SIZE (EU):")}
            </label>
            <button
              type="button"
              onClick={() => setShowSizeGuideModal(true)}
              className="text-xs text-jet hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Ruler className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t(lang, "product.size_guide")}</span>
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {sizesForColor.map((v) => {
              const stock = Math.max(0, Number(v.on_hand || 0));
              const isSoldOut = stock <= 0;
              const isSelected = activeVariant?.id === v.id && !isSoldOut;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => {
                    if (!isSoldOut) {
                      setSelectedVariantId(v.id);
                      setQuantity(1);
                    }
                  }}
                  title={
                    isSoldOut
                      ? lang === "ar"
                        ? `مقاس ${v.size} نفد مؤقتاً`
                        : `Size ${v.size} Sold Out`
                      : product.product_type === "CLOTHING"
                      ? `Size ${v.size}`
                      : `EU ${v.size}`
                  }
                  className={`py-2.5 px-2 border text-xs font-bold transition-all flex flex-col items-center justify-center ${
                    isSoldOut
                      ? "bg-black/5 dark:bg-white/5 text-neutralgray/60 dark:text-white/30 border-silver/40 dark:border-white/10 cursor-not-allowed opacity-60"
                      : isSelected
                      ? "bg-[#111214] dark:bg-white text-white dark:text-[#111214] border-[#111214] dark:border-white shadow-sm"
                      : "bg-white dark:bg-[#1E2024] text-jet dark:text-white border-silver dark:border-[#383C44] hover:border-jet dark:hover:border-white"
                  }`}
                >
                  <span className={isSoldOut ? "line-through" : ""}>
                    {product.product_type === "CLOTHING" ? v.size : `EU ${v.size}`}
                  </span>
                  {isSoldOut && (
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-neutralgray dark:text-neutral-400 mt-0.5">
                      {lang === "ar" ? "نفد" : "Sold Out"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Marketing-Driven Real-Time Stock Status */}
        {activeVariant && (
          <div className="bg-white dark:bg-[#1A1C1F] border border-[#E1E3E5] dark:border-[#2E3238] rounded-2xl p-4 shadow-xs u3-glow-interactive transition-all">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutralgray dark:text-[#A7ABB1]">{t(lang, "product.sku")}:</span>
                <span className="font-mono font-bold text-xs bg-neutral-100 dark:bg-[#25282F] text-jet dark:text-white px-2 py-0.5 rounded-md border border-silver/50 dark:border-[#383C44]">
                  {activeVariant.sku}
                </span>
              </div>

              <div>
                {availableStock <= 0 ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
                    <span className="w-2 h-2 rounded-full bg-neutral-400" />
                    <span>{lang === "ar" ? "نفدت الكمية لهذا المقاس" : "Sold Out For This Size"}</span>
                  </span>
                ) : availableStock <= 3 ? (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>{lang === "ar" ? "متبقي قطع أخيرة جاهزة للشحن" : "Only few pairs left in stock"}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{lang === "ar" ? "متوفر — جاهز للشحن الفوري" : "In Stock — Ready For Immediate Shipping"}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Micro-incentive banner */}
            <div className="mt-2.5 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutralgray">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lang === "ar" ? "منتج أصلي 100%" : "100% Authentic Quality"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lang === "ar" ? "شحن لجميع المحافظات خلال 2 - 4 أيام" : "Express 2-4 Days Shipping Across Egypt"}</span>
              </span>
            </div>
          </div>
        )}

        {/* Quantity & Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-silver dark:border-[#383C44] bg-white dark:bg-[#1A1C1F] text-jet dark:text-white">
              <button
                type="button"
                disabled={availableStock <= 0}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3.5 py-3 text-sm font-bold disabled:opacity-40"
              >
                -
              </button>
              <span className="px-4 py-3 text-sm font-bold">{quantity}</span>
              <button
                type="button"
                disabled={availableStock <= 0}
                onClick={() => setQuantity(Math.min(Math.max(1, availableStock), quantity + 1))}
                className="px-3.5 py-3 text-sm font-bold disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={adding || availableStock <= 0}
              onClick={() => handleAddToBag(false)}
              className="flex-1 bg-[#111214] hover:bg-[#292B2E] dark:bg-white dark:hover:bg-[#E1E3E5] text-white dark:text-[#111214] disabled:bg-neutralgray/50 disabled:cursor-not-allowed font-heading text-xs font-bold uppercase tracking-widest py-4 px-6 flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {availableStock <= 0
                  ? lang === "ar"
                    ? "نفد المخزون"
                    : "Sold Out"
                  : t(lang, "product.add_to_bag")}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={adding || availableStock <= 0}
              onClick={() => handleAddToBag(true)}
              className="bg-[#292B2E] hover:bg-[#111214] dark:bg-[#24272D] dark:hover:bg-[#2F333B] text-white disabled:bg-neutralgray/50 disabled:cursor-not-allowed font-heading text-xs font-bold uppercase tracking-widest py-3.5 px-6 transition-colors border border-transparent dark:border-[#383C44]"
            >
              {t(lang, "product.buy_now")}
            </button>

            <button
              type="button"
              onClick={toggleWishlist}
              className="border border-jet dark:border-white/40 bg-white dark:bg-[#1E2024] hover:bg-[#111214] dark:hover:bg-white text-jet dark:text-white dark:hover:text-[#111214] font-heading text-xs font-bold uppercase tracking-widest py-3.5 px-6 flex items-center justify-center gap-2 transition-colors"
            >
              <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
              <span>
                {wishlisted
                  ? t(lang, "product.remove_wishlist")
                  : t(lang, "product.add_to_wishlist")}
              </span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3.5 text-xs font-semibold flex items-center justify-between ${
              feedback.type === "ok"
                ? "bg-[#111214] text-white"
                : "bg-red-900 text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              {feedback.msg}
            </span>
            {feedback.type === "ok" && (
              <Link href="/cart" className="underline font-bold">
                {lang === "ar" ? "عرض الحقيبة ←" : "View Bag →"}
              </Link>
            )}
          </div>
        )}

        {/* Shipping & Return Policy Links */}
        <div className="border-t border-silver/50 pt-5 space-y-3 text-xs text-neutralgray">
          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-jet shrink-0" />
            <Link href="/shipping-policy" className="hover:underline font-medium">
              {t(lang, "product.shipping_policy")}
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-4 h-4 text-jet shrink-0" />
            <Link href="/return-policy" className="hover:underline font-medium">
              {t(lang, "product.return_policy")}
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Buy Bar (Floating above MobileBottomNav on small screens) */}
      <div className="fixed bottom-14 inset-x-0 z-40 sm:hidden bg-[#111214]/95 backdrop-blur-xl border-t border-[#292B2E] p-3 shadow-2xl flex items-center justify-between gap-3 no-print">
        <div className="min-w-0">
          <span className="text-[10px] text-[#BFC2C6] block font-mono">
            {activeVariant
              ? product.product_type === "CLOTHING" || isNaN(Number(activeVariant.size))
                ? activeVariant.size
                : `EU ${activeVariant.size}`
              : ""}
          </span>
          <span className="font-heading font-bold text-sm text-white truncate block">
            {formatCurrency(finalPrice, lang)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={adding || availableStock <= 0}
            onClick={() => handleAddToBag(true)}
            className="bg-white hover:bg-neutral-200 text-[#111214] font-heading font-bold text-xs uppercase px-3.5 py-2.5 rounded-xl disabled:opacity-50"
          >
            {t(lang, "product.buy_now")}
          </button>
          <button
            type="button"
            disabled={adding || availableStock <= 0}
            onClick={() => handleAddToBag(false)}
            className="bg-[#292B2E] hover:bg-[#1A1C1F] border border-[#BFC2C6]/40 text-white font-heading font-bold text-xs uppercase px-3 py-2.5 rounded-xl disabled:opacity-50 flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{availableStock <= 0 ? (lang === "ar" ? "نفد" : "Sold Out") : (lang === "ar" ? "أضف" : "Add")}</span>
          </button>
        </div>
      </div>

      {/* Embedded Sizing Guide Modal (Shoes vs Clothing) */}
      <SizeGuideModal
        isOpen={showSizeGuideModal}
        onClose={() => setShowSizeGuideModal(false)}
        lang={lang}
        defaultType={product.product_type === "CLOTHING" ? "CLOTHING" : "SHOES"}
        hideSwitcher={true}
      />
    </div>
  );
}
