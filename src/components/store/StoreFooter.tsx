"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Phone,
  Send,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";

interface FooterProps {
  lang: Language;
  settings?: any;
  footerSettings?: any;
  footerLinks?: Array<{ id: string; label_en: string; label_ar: string; href: string }>;
  enabledPaymentCodes?: string[];
  isArchiveSaleActive?: boolean;
}

export function StoreFooter({
  lang,
  settings,
  footerSettings,
  footerLinks = [],
  enabledPaymentCodes = [],
  isArchiveSaleActive = false,
}: FooterProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const f = footerSettings || {};
  const newsletterEnabled = f.newsletter_enabled !== 0;

  const heading =
    lang === "ar"
      ? f.newsletter_heading_ar || "ابقَ على اطلاع"
      : f.newsletter_heading_en || "Stay in the loop";

  const desc =
    lang === "ar"
      ? f.newsletter_desc_ar ||
      "اشترك للحصول على أحدث الإصدارات الحصرية، وإعادة توفر المقاسات، والدروبات الخاصة."
      : f.newsletter_desc_en ||
      "Subscribe for exclusive releases, restocks, and private drops.";

  const placeholder =
    lang === "ar"
      ? f.newsletter_placeholder_ar || "أدخل بريدك الإلكتروني"
      : f.newsletter_placeholder_en || "Enter your email address";

  const privacyNotice =
    lang === "ar"
      ? f.newsletter_privacy_notice_ar || "بالاشتراك، أنت توافق على سياسة الخصوصية الخاصة بنا."
      : f.newsletter_privacy_notice_en || "By subscribing, you agree to our Privacy Policy.";

  // Official Business Details (Supplied)
  const instagramUrl =
    f.instagram_url || "https://www.instagram.com/u3store_/";
  const tiktokUrl =
    f.tiktok_url || "https://www.tiktok.com/@ahmedyoosrry";
  const facebookUrl =
    f.facebook_url || "https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA";
  const telegramUrl =
    f.telegram_url || "https://t.me/u3store";
  const rawPhone = f.phone_number || "01115915388";
  const phoneTel = f.phone_tel || "+201115915388";

  // Exact Google Maps embed URL
  const mapsEmbedUrl =
    f.maps_embed_url ||
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg";

  const mapsExternalUrl =
    f.maps_external_url ||
    "https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z";

  const showMap = f.maps_visible_footer !== 0;
  const showPaymentIcons = f.show_payment_icons !== 0;

  const signature =
    lang === "ar"
      ? f.brand_signature_ar || "اصنع أسلوبك الخاص."
      : f.brand_signature_en || "LIVE YOURS.";

  const copyrightText =
    lang === "ar"
      ? f.copyright_ar || "جميع الحقوق محفوظة."
      : f.copyright_en || "All rights reserved.";

  const visibleCategories = settings?.visible_categories || "BOTH";
  const showShoes = visibleCategories === "BOTH" || visibleCategories === "SHOES_ONLY";
  const showClothing = visibleCategories === "BOTH" || visibleCategories === "CLOTHING_ONLY";

  // Column 2: SHOP Links
  const shopLinks = [
    { id: "s1", label_en: "Shop All", label_ar: "جميع المنتجات", href: "/shop" },
    ...(showShoes ? [{ id: "s-shoes", label_en: "Shoes", label_ar: "الأحذية", href: "/shoes" }] : []),
    ...(showClothing ? [{ id: "s-clothing", label_en: "Clothing", label_ar: "الملابس", href: "/clothing" }] : []),
    { id: "s2", label_en: "New Arrivals", label_ar: "وصل حديثاً", href: "/new-arrivals" },
    { id: "s3", label_en: "Collections", label_ar: "المجموعات", href: "/collections" },
    ...(isArchiveSaleActive
      ? [
        {
          id: "s-archive",
          label_en: "Archive Sale",
          label_ar: "تخفيضات الأرشيف",
          href: "/shop?filter=sale",
        },
      ]
      : []),
    { id: "s4", label_en: "Track Order", label_ar: "تتبع الطلب", href: "/track-order" },
  ];

  // Column 3: PAGES Links
  const defaultPageLinks = [
    { id: "p1", label_en: "About U3 STORE", label_ar: "عن U3 STORE", href: "/about" },
    { id: "p2", label_en: "Contact Us", label_ar: "تواصل معنا", href: "/contact" },
    { id: "p3", label_en: "Size Guide", label_ar: "دليل المقاسات", href: "/size-guide" },
    { id: "p4", label_en: "Shipping Policy", label_ar: "سياسة الشحن", href: "/shipping-policy" },
    {
      id: "p5",
      label_en: "Return & Exchange Policy",
      label_ar: "سياسة الاسترجاع والاستبدال",
      href: "/return-policy",
    },
    { id: "p6", label_en: "Privacy Policy", label_ar: "سياسة الخصوصية", href: "/privacy-policy" },
    { id: "p7", label_en: "Terms & Conditions", label_ar: "الشروط والأحكام", href: "/terms" },
  ];

  const pageLinks = footerLinks.length > 0 ? footerLinks : defaultPageLinks;

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), lang }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatusMsg({
          ok: false,
          text:
            data.error ||
            (lang === "ar" ? "تعذر الاشتراك حالياً." : "Unable to subscribe at this moment."),
        });
      } else {
        const successCustom =
          lang === "ar"
            ? f.newsletter_success_ar || "تم اشتراكك بنجاح في قائمة إصدارات U3 STORE الخاصة."
            : f.newsletter_success_en || "You are now subscribed to U3 STORE private drops.";
        setStatusMsg({
          ok: true,
          text: data.message || successCustom,
        });
        setEmail("");
      }
    } catch {
      setStatusMsg({
        ok: false,
        text: lang === "ar" ? "خطأ في الاتصال بالشبكة." : "Network connection error.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Active payment method codes
  const paymentMethodsList = [
    {
      code: "INSTAPAY",
      name: "InstaPay",
      subtitle: "EGYPT",
      svg: (
        <img
          src="/instapay.jpg"
          alt="InstaPay"
          className="w-5 h-5 rounded-full object-contain bg-white p-0.5 shrink-0"
        />
      ),
    },
    {
      code: "VODAFONE_CASH",
      name: "Vodafone",
      highlight: "Cash",
      subtitle: "فودافون كاش",
      accent: "#FF3333",
      svg: (
        <img
          src="/vodafone-cash.jpg"
          alt="Vodafone Cash"
          className="w-5 h-5 rounded-full object-contain bg-white p-0.5 shrink-0"
        />
      ),
    },
    {
      code: "VISA",
      name: "VISA",
      subtitle: "CARD",
      svg: (
        <span className="font-sans font-black text-[10px] text-white tracking-tighter">VISA</span>
      ),
    },
    {
      code: "MASTERCARD",
      name: "Mastercard",
      subtitle: "CARD",
      svg: (
        <div className="flex -space-x-1">
          <div className="w-2 h-2 rounded-full bg-[#EB001B]" />
          <div className="w-2 h-2 rounded-full bg-[#F79E1B] opacity-80" />
        </div>
      ),
    },
  ];

  const activePayments = paymentMethodsList.filter((m) =>
    enabledPaymentCodes.includes(m.code)
  );

  return (
    <footer
      className="bg-[#111214] text-[#D5D7DA] border-t border-[#30343A] mt-12 sm:mt-20 pb-20 sm:pb-0 no-print select-none"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {/* ======================================================== */}
      {/* 1. MOBILE & TABLET STREAMLINED COMPACT LAYOUT (block lg:hidden) */}
      {/* Sleek, Fast, Luxury: Takes ~320px on phones, centered max-w-3xl on tablets */}
      {/* ======================================================== */}
      <div className="block lg:hidden px-4 sm:px-6 py-8 sm:py-12 space-y-6 max-w-2xl sm:max-w-3xl mx-auto">
        {/* Brand Row + Social Media on the same line */}
        <div className="flex items-center justify-between gap-3 border-b border-[#30343A]/60 pb-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="U3 STORE"
              className="h-8 w-8 rounded-full object-cover border border-[#30343A] shrink-0"
            />
            <div>
              <span className="font-heading text-sm font-bold tracking-[0.2em] text-[#FFFFFF] block leading-tight">
                U3 STORE
              </span>
              <span className="text-[9px] tracking-[0.25em] text-[#92969D] uppercase block">
                {signature}
              </span>
            </div>
          </div>

          {/* Social Icons (Compact) */}
          <div className="flex items-center gap-2">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-7 h-7 rounded-full border border-[#30343A] flex items-center justify-center text-[#D5D7DA] hover:text-white"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="w-7 h-7 rounded-full border border-[#30343A] flex items-center justify-center text-[#D5D7DA] hover:text-white"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-7 h-7 rounded-full border border-[#30343A] flex items-center justify-center text-[#D5D7DA] hover:text-white"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Compact Newsletter Bar (Single Line) */}
        {newsletterEnabled && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              {heading}
            </span>
            <form onSubmit={handleSubscribe} className="relative flex items-center">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#18191C] border border-[#30343A] rounded-lg px-3 py-2 text-xs text-white placeholder-[#92969D] focus:outline-none focus:border-white pe-9"
              />
              <button
                type="submit"
                disabled={submitting}
                aria-label="Subscribe"
                className="absolute end-1.5 p-1 text-[#D5D7DA] hover:text-white disabled:opacity-50"
              >
                <ArrowRight className={`w-3.5 h-3.5 ${lang === "ar" ? "rotate-180" : ""}`} />
              </button>
            </form>
            {statusMsg && (
              <p className={`text-[10px] ${statusMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                {statusMsg.text}
              </p>
            )}
          </div>
        )}

        {/* 2-Column Compact Links Grid (SHOP & PAGES side-by-side) */}
        <div className="grid grid-cols-2 gap-4 py-3 border-y border-[#30343A]/60 text-xs">
          {/* Shop Links */}
          <div className="space-y-2">
            <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-[#92969D] block">
              {lang === "ar" ? "التسوق" : "SHOP"}
            </span>
            <ul className="space-y-1.5">
              {shopLinks.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="hover:text-white transition-colors block py-0.5">
                    {lang === "ar" ? item.label_ar : item.label_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pages Links */}
          <div className="space-y-2">
            <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-[#92969D] block">
              {lang === "ar" ? "الصفحات" : "PAGES"}
            </span>
            <ul className="space-y-1.5">
              {pageLinks.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="hover:text-white transition-colors block py-0.5">
                    {lang === "ar" ? item.label_ar : item.label_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Compact Direct Contact Bar & Map Button */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-3 text-xs">
            <a
              href={`tel:${phoneTel}`}
              className="inline-flex items-center gap-1.5 text-white hover:underline font-mono"
            >
              <Phone className="w-3.5 h-3.5 text-[#92969D]" />
              <span>{rawPhone}</span>
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white hover:underline"
            >
              <Send className="w-3.5 h-3.5 text-[#92969D]" />
              <span>Telegram</span>
            </a>
          </div>

          {/* 1-Tap Google Maps Location Button (Replaces heavy iframe on mobile) */}
          {showMap && (
            <a
              href={mapsExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border border-[#30343A] bg-[#18191C] hover:bg-black text-[11px] font-bold text-white transition-all shadow-2xs"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                <span>{lang === "ar" ? "موقع المتجر على خرائط Google" : "Store Location on Google Maps"}</span>
              </span>
              <ExternalLink className="w-3 h-3 text-[#92969D]" />
            </a>
          )}
        </div>

        {/* Bottom Bar (Mobile) */}
        <div className="pt-3 border-t border-[#30343A]/60 flex flex-col items-center gap-3 text-[10px] text-[#92969D] text-center">
          {showPaymentIcons && activePayments.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {activePayments.map((p) => (
                <div
                  key={p.code}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18191C] border border-[#30343A] text-white"
                >
                  {p.svg}
                  <span className="font-bold text-[9px]">{p.name}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            © {new Date().getFullYear()} U3 STORE. {copyrightText}
          </div>
          <div className="text-[11px] font-medium text-[#BFC2C6] pt-1">
            {lang === "ar" ? "تصميم وتطوير: " : "Designed & Developed by: "}
            <a
              href="https://mohamedhany.kesug.com/"
              className="text-white font-bold hover:underline underline-offset-4 decoration-white/60 transition-colors"
            >
              Mohamed Hany
            </a>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DESKTOP FULL 4-COLUMN LUXURY LAYOUT (hidden lg:block) */}
      {/* ======================================================== */}
      <div className="hidden lg:block max-w-7xl 2xl:max-w-[1536px] mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-12 gap-10">
          {/* COLUMN 1: BRAND IDENTITY, NEWSLETTER & SOCIAL MEDIA (col-span-4) */}
          <div className="col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="U3 STORE"
                className="h-11 w-11 rounded-full object-cover border border-[#30343A]"
              />
              <div>
                <span className="font-heading text-lg font-bold tracking-[0.2em] text-[#FFFFFF] block leading-tight">
                  U3 STORE
                </span>
                <span className="text-[10px] tracking-[0.25em] text-[#92969D] uppercase block">
                  {signature}
                </span>
              </div>
            </div>

            {newsletterEnabled && (
              <div className="space-y-3 pt-2">
                <h3 className="font-heading text-xl font-bold text-[#FFFFFF] tracking-tight">
                  {heading}
                </h3>
                <p className="text-xs text-[#92969D] leading-relaxed">
                  {desc}
                </p>

                <form onSubmit={handleSubscribe} className="pt-1">
                  <div className="relative flex items-center border-b border-[#30343A] focus-within:border-[#FFFFFF] transition-colors pb-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-transparent text-sm text-[#FFFFFF] placeholder-[#92969D] focus:outline-none pe-10"
                      style={{ backgroundColor: "transparent", border: "none" }}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      aria-label="Subscribe"
                      className="p-1.5 text-[#D5D7DA] hover:text-[#FFFFFF] transition-transform duration-200 hover:translate-x-1 rtl:hover:-translate-x-1 disabled:opacity-50 cursor-pointer"
                    >
                      <ArrowRight className={`w-4 h-4 ${lang === "ar" ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </form>

                <p className="text-[10px] text-[#92969D]">
                  <Link
                    href="/privacy-policy"
                    className="hover:text-[#FFFFFF] transition-colors underline decoration-[#30343A] hover:decoration-[#FFFFFF]"
                  >
                    {privacyNotice}
                  </Link>
                </p>

                {statusMsg && (
                  <p
                    className={`text-xs font-medium flex items-center gap-1.5 pt-1 ${statusMsg.ok ? "text-emerald-400" : "text-red-400"
                      }`}
                  >
                    {statusMsg.ok && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{statusMsg.text}</span>
                  </p>
                )}
              </div>
            )}

            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#92969D] block mb-3">
                {lang === "ar" ? "تابعنا على" : "FOLLOW US"}
              </span>
              <div className="flex items-center gap-3">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  title="Instagram: @u3store_"
                  className="w-9 h-9 rounded-full border border-[#30343A] hover:border-[#FFFFFF] flex items-center justify-center text-[#D5D7DA] hover:text-[#FFFFFF] hover:bg-white/5 transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  title="TikTok: @ahmedyoosrry"
                  className="w-9 h-9 rounded-full border border-[#30343A] hover:border-[#FFFFFF] flex items-center justify-center text-[#D5D7DA] hover:text-[#FFFFFF] hover:bg-white/5 transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  title="Facebook: U3store"
                  className="w-9 h-9 rounded-full border border-[#30343A] hover:border-[#FFFFFF] flex items-center justify-center text-[#D5D7DA] hover:text-[#FFFFFF] hover:bg-white/5 transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* COLUMN 2: SHOP (col-span-2) */}
          <div className="col-span-2 space-y-4">
            <h4 className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-[#FFFFFF]">
              {lang === "ar" ? "التسوق" : "SHOP"}
            </h4>
            <ul className="space-y-3 text-sm text-[#D5D7DA]">
              {shopLinks.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="hover:text-[#FFFFFF] transition-colors inline-block py-0.5">
                    {lang === "ar" ? item.label_ar : item.label_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3: PAGES (col-span-3) */}
          <div className="col-span-3 space-y-4">
            <h4 className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-[#FFFFFF]">
              {lang === "ar" ? "الصفحات" : "PAGES"}
            </h4>
            <ul className="space-y-3 text-sm text-[#D5D7DA]">
              {pageLinks.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="hover:text-[#FFFFFF] transition-colors inline-block py-0.5">
                    {lang === "ar" ? item.label_ar : item.label_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 4: GET IN TOUCH & LOCATION (col-span-3) */}
          <div className="col-span-3 space-y-5">
            <h4 className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-[#FFFFFF]">
              {lang === "ar" ? "تواصل معنا" : "GET IN TOUCH"}
            </h4>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#92969D] shrink-0" />
                <a href={`tel:${phoneTel}`} className="hover:text-[#FFFFFF] font-mono tracking-wide transition-colors">
                  {rawPhone}
                </a>
                <span className="text-[10px] text-[#92969D]">
                  ({lang === "ar" ? "اتصل بنا" : "Call Us"})
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-[#92969D] shrink-0" />
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFFFFF] transition-colors flex items-center gap-1"
                >
                  <span>Telegram</span>
                  <ExternalLink className="w-3 h-3 text-[#92969D]" />
                </a>
              </div>
            </div>

            {showMap && (
              <div className="pt-2 space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#92969D] flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#D5D7DA]" />
                  <span>{lang === "ar" ? "موقعنا على الخريطة" : "FIND OUR STORE"}</span>
                </div>

                <div className="w-full h-28 rounded-xl overflow-hidden border border-[#30343A] bg-black/40 relative">
                  <iframe
                    src={mapsEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="U3 STORE Location"
                    className="w-full h-full filter grayscale contrast-125 opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  />
                </div>

                <a
                  href={mapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#D5D7DA] hover:text-[#FFFFFF] hover:underline decoration-[#30343A] transition-all pt-0.5"
                >
                  <span>{lang === "ar" ? "فتح في خرائط Google" : "OPEN IN GOOGLE MAPS"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM BAR (DESKTOP) */}
        <div className="mt-14 pt-8 border-t border-[#30343A] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#92969D]">
          {/* Left: Copyright & Signature */}
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} U3 STORE. {copyrightText}</span>
            <span className="text-[#555960]">|</span>
            <span className="font-heading text-[11px] font-bold tracking-[0.2em] text-[#D5D7DA] uppercase">
              {signature}
            </span>
          </div>

          {/* Center: Payment Badges */}
          {showPaymentIcons && activePayments.length > 0 && (
            <div className="flex items-center gap-2">
              {activePayments.map((p) => (
                <div
                  key={p.code}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18191C] border border-[#30343A] text-white shadow-2xs hover:border-[#92969D] transition-colors"
                  title={`${p.name} - ${p.subtitle}`}
                >
                  <div className="shrink-0">{p.svg}</div>
                  <div className="flex items-baseline gap-1 leading-none text-start">
                    <span className="font-heading font-bold text-xs text-white">
                      {p.name}
                    </span>
                    {p.highlight && (
                      <span className="text-[10px] font-bold" style={{ color: p.accent }}>
                        {p.highlight}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Right: Designed & Developed */}
          <div className="text-[11px] font-medium text-[#BFC2C6]">
            {lang === "ar" ? "تصميم وتطوير: " : "Designed & Developed by: "}
            <a
              href="https://mohamedhany.kesug.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold hover:text-amber-400 hover:underline underline-offset-4 decoration-white/60 transition-all inline-flex items-center gap-1"
            >
              <span>Mohamed Hany</span>
              <ExternalLink className="w-3 h-3 text-[#92969D]" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
