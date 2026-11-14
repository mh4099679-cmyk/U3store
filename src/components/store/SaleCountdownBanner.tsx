"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";

export interface SaleCampaignProps {
  name_en?: string;
  name_ar?: string;
  message_en?: string;
  message_ar?: string;
  banner_subtitle_en?: string;
  banner_subtitle_ar?: string;
  starts_at?: string;
  ends_at?: string;
  is_active?: number;
  show_countdown?: number;
}

export function SaleCountdownBanner({
  lang,
  campaign,
}: {
  lang: Language;
  campaign?: SaleCampaignProps | null;
}) {
  const [remaining, setRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!campaign || !campaign.is_active || !campaign.ends_at) {
      setRemaining(null);
      return;
    }

    const startMs = campaign.starts_at ? new Date(campaign.starts_at).getTime() : 0;
    const endMs = new Date(campaign.ends_at).getTime();

    const update = () => {
      const now = Date.now();
      if ((startMs && now < startMs) || now >= endMs) {
        setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const diff = Math.max(0, endMs - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setRemaining({ days, hours, minutes, seconds, expired: false });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [campaign]);

  if (!campaign || !campaign.is_active || !remaining || remaining.expired) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="bg-[#111214] text-[#F7F7F5] border-b border-[#292B2E] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center lg:text-start">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#BFC2C6]">
            {lang === "ar"
              ? campaign.banner_subtitle_ar || "إصدارات محدودة لفترة مؤقتة"
              : campaign.banner_subtitle_en || "LIMITED TIME ARCHIVE RELEASE"}
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {lang === "ar"
              ? campaign.message_ar || "تخفيضات الأرشيف — متاحة الآن"
              : campaign.message_en || "ARCHIVE SALE — LIVE NOW"}
          </h2>
        </div>

        {campaign.show_countdown !== 0 && (
          <div className="flex items-center gap-3 sm:gap-4" dir="ltr">
            {[
              { val: pad(remaining.days), en: "DAYS", ar: "يوم" },
              { val: pad(remaining.hours), en: "HRS", ar: "ساعة" },
              { val: pad(remaining.minutes), en: "MIN", ar: "دقيقة" },
              { val: pad(remaining.seconds), en: "SEC", ar: "ثانية" },
            ].map((unit, idx) => (
              <React.Fragment key={unit.en}>
                <div className="bg-[#1A1C1F] border border-[#30343A] px-3.5 py-2.5 min-w-[64px] text-center">
                  <div className="font-heading text-xl sm:text-2xl font-bold text-white tabular-nums">
                    {unit.val}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-[#BFC2C6] mt-0.5">
                    {lang === "ar" ? unit.ar : unit.en}
                  </div>
                </div>
                {idx < 3 && (
                  <span className="text-[#73777D] font-bold text-lg select-none">:</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <Link
          href="/shop?filter=sale"
          className="group bg-white hover:bg-[#E1E3E5] text-[#111214] font-heading font-bold text-xs uppercase tracking-widest px-6 py-3.5 inline-flex items-center gap-2.5 transition-all"
        >
          <span>{lang === "ar" ? "تسوق الأرشيف" : "SHOP ARCHIVE SALE"}</span>
          <ArrowRight
            className={`w-4 h-4 transition-transform duration-200 ${
              lang === "ar"
                ? "rotate-180 group-hover:-translate-x-1"
                : "group-hover:translate-x-1"
            }`}
          />
        </Link>
      </div>
    </section>
  );
}

