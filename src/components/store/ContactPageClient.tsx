"use client";

import React, { useState } from "react";
import {
  Phone,
  Send,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Mail,
  User,
  MessageSquare,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";

interface ContactPageClientProps {
  lang: Language;
  footerSettings?: any;
}

export function ContactPageClient({ lang, footerSettings }: ContactPageClientProps) {
  const f = footerSettings || {};

  const [form, setForm] = useState({
    name: "",
    contactInfo: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  // Official Business Details (Supplied)
  const rawPhone = f.phone_number || "01115915388";
  const phoneTel = f.phone_tel || "+201115915388";
  const telegramUrl = f.telegram_url || "https://t.me/u3store";
  const instagramUrl = f.instagram_url || "https://www.instagram.com/u3store_/";
  const tiktokUrl = f.tiktok_url || "https://www.tiktok.com/@ahmedyoosrry";
  const facebookUrl = f.facebook_url || "https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA";

  // Exact Google Maps embed URL
  const mapsEmbedUrl =
    f.maps_embed_url ||
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg";

  const mapsExternalUrl =
    f.maps_external_url ||
    "https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.contactInfo || !form.message || submitting) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lang }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatus({
          ok: false,
          text:
            data.error ||
            (lang === "ar"
              ? "تعذر إرسال الرسالة. يرجى المحاولة لاحقاً."
              : "Failed to submit message. Please try again later."),
        });
      } else {
        setStatus({
          ok: true,
          text:
            data.message ||
            (lang === "ar"
              ? "تم استلام رسالتك بنجاح. سيتواصل معك فريق U3 STORE في أقرب وقت."
              : "Your message has been received. U3 STORE team will reach out shortly."),
        });
        setForm({ name: "", contactInfo: "", subject: "", message: "" });
      }
    } catch {
      setStatus({
        ok: false,
        text:
          lang === "ar"
            ? "حدث خطأ في الاتصال بالسيرفر."
            : "Network error occurred while sending.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0E0F12] text-[#111214] dark:text-[#F3F4F6] pb-24">
      {/* HEADER BANNER */}
      <div className="bg-[#111214] text-white py-16 border-b border-[#30343A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/logo.jpg"
              alt="U3 STORE"
              className="h-10 w-10 rounded-full border border-[#30343A] object-contain"
            />
            <div>
              <span className="font-heading font-bold text-sm tracking-[0.2em] block">
                U3 STORE
              </span>
              <span className="text-[10px] tracking-[0.25em] text-[#92969D] uppercase block">
                LIVE YOURS.
              </span>
            </div>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {lang === "ar" ? "تواصل معنا" : "Contact Us"}
          </h1>
          <p className="text-xs sm:text-sm text-[#92969D] mt-2 max-w-xl">
            {lang === "ar"
              ? "فريق U3 STORE جاهز دائماً للإجابة على جميع استفساراتك حول المقاسات، الطلبات، والشحن."
              : "The U3 STORE team is available to assist you with inquiries regarding orders, sizing, releases, and shipping."}
          </p>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* ======================================================== */}
          {/* LEFT: OFFICIAL CONTACT CHANNELS & INTERACTIVE FORM (col-span-7) */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-10">
            {/* Direct Official Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Card */}
              <div className="bg-white dark:bg-[#151619] border border-neutral-200 dark:border-[#30343A] p-5 rounded-2xl shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[#111214] dark:text-white">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#92969D]">
                    {lang === "ar" ? "الهاتف الرسمي" : "Official Phone"}
                  </h3>
                  <a
                    href={`tel:${phoneTel}`}
                    className="font-mono text-base font-bold text-[#111214] dark:text-white hover:underline block mt-0.5"
                  >
                    {rawPhone}
                  </a>
                </div>
                <a
                  href={`tel:${phoneTel}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white pt-1"
                >
                  <span>{lang === "ar" ? "اتصل بنا الآن" : "Call Us Now"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Telegram Card */}
              <div className="bg-white dark:bg-[#151619] border border-neutral-200 dark:border-[#30343A] p-5 rounded-2xl shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[#111214] dark:text-white">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#92969D]">
                    {lang === "ar" ? "قناة تيليجرام" : "Telegram Channel"}
                  </h3>
                  <p className="text-sm font-bold text-[#111214] dark:text-white mt-0.5">
                    @u3store
                  </p>
                </div>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white pt-1"
                >
                  <span>{lang === "ar" ? "الانضمام للقناة" : "Join Channel"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Official Social Media Profiles */}
            <div className="bg-white dark:bg-[#151619] border border-neutral-200 dark:border-[#30343A] p-6 rounded-2xl shadow-2xs space-y-4">
              <h3 className="font-heading font-bold text-xs uppercase tracking-widest text-[#92969D]">
                {lang === "ar" ? "منصات التواصل الاجتماعي الرسمية" : "OFFICIAL SOCIAL CHANNELS"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Instagram */}
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-[#30343A] hover:border-black dark:hover:border-white transition-all text-xs font-bold"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>Instagram</span>
                </a>

                {/* TikTok */}
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-[#30343A] hover:border-black dark:hover:border-white transition-all text-xs font-bold"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                  <span>TikTok</span>
                </a>

                {/* Facebook */}
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-[#30343A] hover:border-black dark:hover:border-white transition-all text-xs font-bold"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </a>
              </div>
            </div>

            {/* Interactive Contact Form */}
            <div className="bg-white dark:bg-[#151619] border border-neutral-200 dark:border-[#30343A] p-6 sm:p-8 rounded-2xl shadow-2xs space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold tracking-tight text-[#111214] dark:text-white">
                  {lang === "ar" ? "أرسل لنا رسالة مباشرة" : "Send Us a Message"}
                </h2>
                <p className="text-xs text-[#92969D] mt-1">
                  {lang === "ar"
                    ? "املأ النموذج التالي وسيقوم فريق الدعم بالرد عليك في أسرع وقت."
                    : "Fill out the form below and our support team will reply promptly."}
                </p>
              </div>

              {status && (
                <div
                  className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
                    status.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {status.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{status.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="font-bold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <User className="w-3.5 h-3.5" />
                      <span>{lang === "ar" ? "الاسم بالكامل *" : "Full Name *"}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={lang === "ar" ? "محمد أحمد" : "John Doe"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-[#30343A] bg-neutral-50 dark:bg-[#1D1F23] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    />
                  </div>

                  {/* Email or Phone */}
                  <div className="space-y-1.5">
                    <label className="font-bold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <Mail className="w-3.5 h-3.5" />
                      <span>
                        {lang === "ar" ? "رقم الهاتف أو البريد الإلكتروني *" : "Email or Phone *"}
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.contactInfo}
                      onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                      placeholder="01xxxxxxxxx / name@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-[#30343A] bg-neutral-50 dark:bg-[#1D1F23] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="font-bold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{lang === "ar" ? "موضوع الرسالة" : "Subject"}</span>
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder={
                      lang === "ar"
                        ? "استفسار عن مقاس / تتبع شحنة / أخرى"
                        : "Sizing inquiry / Order tracking / General"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-[#30343A] bg-neutral-50 dark:bg-[#1D1F23] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="font-bold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{lang === "ar" ? "نص الرسالة *" : "Message *"}</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={
                      lang === "ar"
                        ? "اكتب استفسارك بالتفصيل وسيقوم الفريق بمساعدتك..."
                        : "Describe your inquiry in detail..."
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-[#30343A] bg-neutral-50 dark:bg-[#1D1F23] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white resize-y"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-[#111214] hover:bg-black text-white px-8 py-3 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                >
                  {submitting
                    ? lang === "ar"
                      ? "جاري الإرسال..."
                      : "Submitting..."
                    : lang === "ar"
                    ? "إرسال الرسالة"
                    : "Submit Message"}
                </button>
              </form>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT: EXACT SUPPLIED GOOGLE MAPS LOCATION (col-span-5) */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#151619] border border-neutral-200 dark:border-[#30343A] p-6 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#92969D] block">
                    {lang === "ar" ? "الموقع على الخريطة" : "OFFICIAL LOCATION"}
                  </span>
                  <h3 className="font-heading text-lg font-bold text-[#111214] dark:text-white mt-0.5">
                    {lang === "ar" ? "موقع متجر U3 STORE" : "U3 STORE Location"}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[#111214] dark:text-white">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>

              {/* Exact Google Maps Embed */}
              <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#30343A] bg-black/10 relative">
                <iframe
                  src={mapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="U3 STORE Official Business Location"
                  className="w-full h-full"
                />
              </div>

              {/* Open in Google Maps Action */}
              <div className="pt-1">
                <a
                  href={mapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#111214] hover:bg-black text-white text-xs font-bold font-heading uppercase tracking-wider transition-all shadow-xs"
                >
                  <MapPin className="w-4 h-4" />
                  <span>
                    {lang === "ar" ? "فتح في خرائط Google" : "OPEN IN GOOGLE MAPS"}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

