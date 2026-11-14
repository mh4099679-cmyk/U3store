"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ShieldCheck, ArrowRight, ShoppingBag } from "lucide-react";
import { Language, t, formatCurrency } from "@/lib/i18n/dictionaries";
import { HydratedCart } from "@/lib/services/cart";

export function CartClient({
  initialCart,
  lang,
}: {
  initialCart: HydratedCart;
  lang: Language;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<HydratedCart>(initialCart);
  const [couponInput, setCouponInput] = useState(initialCart.couponCode || "");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function updateQuantity(itemId: string, quantity: number) {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_quantity", itemId, quantity }),
      });
      const data = await res.json();
      if (data.ok && data.cart) {
        setCart(data.cart);
        if (!data.cart.couponCode) {
          setCouponInput("");
          setCouponMsg(null);
        }
        router.refresh();
      } else if (data.error) {
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(itemId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", itemId }),
      });
      const data = await res.json();
      if (data.ok && data.cart) {
        setCart(data.cart);
        if (!data.cart.couponCode) {
          setCouponInput("");
          setCouponMsg(null);
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCouponMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_coupon", code: couponInput }),
      });
      const data = await res.json();
      if (data.ok && data.cart) {
        setCart(data.cart);
        setCouponMsg(
          lang === "ar" ? "تم تطبيق كود الخصم بنجاح." : "Coupon applied successfully."
        );
        router.refresh();
      } else {
        setCouponMsg(data.error || "Invalid coupon");
      }
    } finally {
      setLoading(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-white border border-silver/50 p-12 text-center max-w-2xl mx-auto space-y-5">
        <div className="w-14 h-14 bg-jet text-offwhite mx-auto flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-silver" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-jet">{t(lang, "cart.empty")}</h2>
        <p className="text-xs text-neutralgray flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{t(lang, "cart.session_isolated_badge")}</span>
        </p>
        <div className="pt-2">
          <Link
            href="/shop"
            className="inline-block bg-jet hover:bg-[#292B2E] text-offwhite font-heading text-xs font-bold uppercase tracking-widest px-8 py-3.5 transition-colors"
          >
            {t(lang, "cart.continue_shopping")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-jet text-offwhite px-4 py-2.5 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-silver" />
            {t(lang, "cart.session_isolated_badge")}
          </span>
          <span className="text-silver font-mono">
            {cart.ownerType === "CUSTOMER"
              ? lang === "ar"
                ? "حساب عميل مسجل"
                : "Registered Account Cart"
              : lang === "ar"
              ? "جلسة زائر خاصة"
              : "Isolated Guest Session"}
          </span>
        </div>

        {cart.items.map((item) => {
          const name = lang === "ar" ? item.nameAr || item.nameEn : item.nameEn;
          const color = lang === "ar" ? item.colorAr || item.colorEn : item.colorEn;
          return (
            <div
              key={item.id}
              className="bg-white border border-silver/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <img
                  src={item.imageUrl || "/logo.jpg"}
                  alt={name}
                  className="w-20 h-20 object-cover border border-silver/40 bg-jet/5 shrink-0"
                />
                <div className="space-y-1">
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-heading font-bold text-base text-jet hover:text-[#73777D]"
                  >
                    {name}
                  </Link>
                  <p className="text-xs text-neutralgray">
                    {item.productType && (
                      <span className="font-semibold text-[10px] uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 me-1.5 border border-silver/50">
                        {item.productType === "CLOTHING" ? (lang === "ar" ? "ملابس" : "Clothing") : (lang === "ar" ? "أحذية" : "Shoes")}
                      </span>
                    )}
                    {t(lang, "shop.color")}: <strong className="text-jet">{color}</strong> |{" "}
                    {t(lang, "shop.size")}: <strong className="text-jet">{item.productType === "CLOTHING" ? item.size : `EU ${item.size}`}</strong>
                  </p>
                  <p className="text-[11px] font-mono text-neutralgray">SKU: {item.sku}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-jet">
                      {formatCurrency(item.finalPrice, lang)}
                    </span>
                    {item.discountPerUnit > 0 && (
                      <span className="text-neutralgray line-through">
                        {formatCurrency(item.regularPrice, lang)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                <div className="flex items-center border border-silver bg-offwhite">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-3 py-1.5 text-xs font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold">{item.quantity}</span>
                  <button
                    type="button"
                    disabled={loading || item.quantity >= item.availableStock}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-3 py-1.5 text-xs font-bold"
                  >
                    +
                  </button>
                </div>

                <div className="text-right min-w-[90px]">
                  <p className="font-heading font-bold text-sm text-jet">
                    {formatCurrency(item.lineSubtotal, lang)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-neutralgray hover:text-red-700"
                  title={t(lang, "cart.remove")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary & Coupon */}
      <div className="bg-white border border-silver/50 p-6 h-fit space-y-5">
        <h2 className="font-heading text-lg font-bold text-jet border-b border-silver/50 pb-3">
          {t(lang, "checkout.order_summary")}
        </h2>

        <form onSubmit={applyCoupon} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder={t(lang, "checkout.coupon_placeholder")}
              className="flex-1 border border-silver px-3 py-2 text-xs bg-offwhite uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-jet text-offwhite px-4 py-2 text-xs font-bold uppercase tracking-wider"
            >
              {t(lang, "checkout.apply_coupon")}
            </button>
          </div>
          {couponMsg && <p className="text-xs text-emerald-700 font-medium">{couponMsg}</p>}
        </form>

        <div className="space-y-2.5 text-sm border-t border-silver/50 pt-4">
          <div className="flex justify-between">
            <span className="text-neutralgray">{t(lang, "cart.subtotal")}</span>
            <span className="font-bold text-jet">{formatCurrency(cart.subtotal, lang)}</span>
          </div>
          {cart.couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>
                {t(lang, "cart.discount")} ({cart.couponCode})
              </span>
              <span className="font-bold">- {formatCurrency(cart.couponDiscount, lang)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-silver/50 pt-3 font-heading text-base font-bold">
            <span>{t(lang, "checkout.total")}</span>
            <span>{formatCurrency(cart.finalSubtotalAfterDiscount, lang)}</span>
          </div>
          <p className="text-[11px] text-neutralgray">
            {lang === "ar"
              ? "يتم حساب رسوم الشحن تلقائياً في الخطوة التالية عند اختيار المحافظة والمدينة."
              : "Shipping fee is calculated automatically at checkout upon selecting your Governorate & City."}
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <Link
            href="/checkout"
            className="w-full bg-[#111214] hover:bg-[#292B2E] text-white font-heading text-xs font-bold uppercase tracking-widest py-4 px-6 flex items-center justify-center gap-2 transition-colors"
          >
            <span>{t(lang, "cart.proceed_checkout")}</span>
            <ArrowRight className={`w-4 h-4 ${lang === "ar" ? "rotate-180" : ""}`} />
          </Link>
          <Link
            href="/shop"
            className="block w-full text-center border border-jet py-3 text-xs font-bold uppercase tracking-widest text-jet hover:bg-jet hover:text-offwhite transition-colors"
          >
            {t(lang, "cart.continue_shopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}

