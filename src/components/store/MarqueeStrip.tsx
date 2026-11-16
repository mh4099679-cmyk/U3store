"use client";

import React from "react";
import { Language } from "@/lib/i18n/dictionaries";

export interface MarqueeConfig {
  is_enabled?: number;
  segments_en_json?: string;
  segments_ar_json?: string;
  separator_symbol?: string;
  speed_seconds?: number;
  direction?: string;
  visual_preset?: string;
  pause_on_hover?: number;
  desktop_font_size?: string;
  mobile_font_size?: string;
}

export interface CampaignConfig {
  is_active?: number;
  message_en?: string;
  message_ar?: string;
  starts_at?: string;
  ends_at?: string;
  show_in_marquee?: number;
}

export function MarqueeStrip({
  lang,
  config,
  campaign,
  visibleCategories = "BOTH",
}: {
  lang: Language;
  config?: MarqueeConfig | null;
  campaign?: CampaignConfig | null;
  visibleCategories?: string;
}) {
  if (config && config.is_enabled === 0) return null;

  let defaultFootwearEn = "PREMIUM FOOTWEAR & STREETWEAR";
  let defaultFootwearAr = "أحذية وملابس فاخرة";
  if (visibleCategories === "SHOES_ONLY") {
    defaultFootwearEn = "PREMIUM FOOTWEAR";
    defaultFootwearAr = "أحذية فاخرة";
  } else if (visibleCategories === "CLOTHING_ONLY") {
    defaultFootwearEn = "LUXURY STREETWEAR";
    defaultFootwearAr = "ملابس ستريت وير فاخرة";
  }

  let baseSegmentsEn = [
    "U3 STORE",
    "LIVE YOURS",
    "NEW ARRIVALS",
    defaultFootwearEn,
    "DISCOVER THE COLLECTION",
  ];
  let baseSegmentsAr = [
    "U3 STORE",
    "LIVE YOURS",
    "وصل حديثاً",
    defaultFootwearAr,
    "اكتشف المجموعة",
  ];

  try {
    if (config?.segments_en_json) {
      const parsed = JSON.parse(config.segments_en_json);
      if (Array.isArray(parsed) && parsed.length > 0) baseSegmentsEn = parsed;
    }
  } catch {
    // use default
  }

  try {
    if (config?.segments_ar_json) {
      const parsed = JSON.parse(config.segments_ar_json);
      if (Array.isArray(parsed) && parsed.length > 0) baseSegmentsAr = parsed;
    }
  } catch {
    // use default
  }

  // Only inject Archive Sale message when campaign is genuinely active and within valid date window
  const nowMs = Date.now();
  const campEndMs = campaign?.ends_at ? new Date(campaign.ends_at).getTime() : 0;
  const campStartMs = campaign?.starts_at ? new Date(campaign.starts_at).getTime() : 0;
  const isCampaignLive =
    Boolean(campaign?.is_active) &&
    campaign?.show_in_marquee !== 0 &&
    (!campStartMs || nowMs >= campStartMs) &&
    (!campEndMs || nowMs < campEndMs);

  let segments = lang === "ar" ? [...baseSegmentsAr] : [...baseSegmentsEn];
  if (isCampaignLive) {
    const saleMsg =
      lang === "ar"
        ? campaign?.message_ar || "تخفيضات الأرشيف — متاحة الآن"
        : campaign?.message_en || "ARCHIVE SALE — LIVE NOW";
    if (!segments.includes(saleMsg)) {
      segments.splice(1, 0, saleMsg);
    }
  } else {
    // Filter out any accidental "ARCHIVE SALE" text when campaign is inactive
    segments = segments.filter(
      (s) => !s.toUpperCase().includes("ARCHIVE SALE") && !s.includes("تخفيضات الأرشيف")
    );
  }

  if (segments.length === 0) {
    segments = ["U3 STORE", "LIVE YOURS"];
  }

  const separator = config?.separator_symbol || "✦";
  const speed = Math.max(10, Math.min(90, Number(config?.speed_seconds || 28)));
  const preset = config?.visual_preset || "OPTION_B_BLACK";
  const pauseOnHover = config?.pause_on_hover !== 0;

  const isRtlAnim =
    config?.direction === "RIGHT" || (config?.direction !== "LEFT" && lang === "ar");

  const containerStyle =
    preset === "OPTION_A_OFFWHITE" || preset === "MIXED_BADGE"
      ? "bg-[#F7F7F5] dark:bg-[#1A1C1F] text-[#111214] dark:text-[#F5F5F5] border-y border-[#E1E3E5] dark:border-[#30343A]"
      : "bg-[#111214] text-[#FFFFFF] border-y border-[#292B2E]";

  const repeatedGroup = [...segments, ...segments, ...segments, ...segments];

  const renderGroup = (keyPrefix: string) => (
    <div className="flex items-center shrink-0">
      {repeatedGroup.map((seg, idx) => {
        const isBadge =
          preset === "MIXED_BADGE" &&
          (seg.toUpperCase().includes("LIVE YOURS") ||
            seg.toUpperCase().includes("ARCHIVE SALE") ||
            seg.includes("تخفيضات"));
        return (
          <React.Fragment key={`${keyPrefix}-${idx}`}>
            <span
              className={`mx-5 font-heading font-bold uppercase tracking-[0.2em] whitespace-nowrap text-xs sm:text-sm ${
                isBadge
                  ? "bg-[#111214] text-white dark:bg-white dark:text-[#111214] px-2.5 py-0.5"
                  : ""
              }`}
            >
              {seg}
            </span>
            <span
              className="text-[#BFC2C6] text-xs select-none shrink-0"
              aria-hidden="true"
            >
              {separator}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div
      dir="ltr"
      className={`w-full overflow-hidden py-3 select-none no-print ${containerStyle} ${
        pauseOnHover ? "u3-marquee-pause" : ""
      }`}
      style={{ ["--marquee-duration" as any]: `${speed}s` }}
    >
      <div className={isRtlAnim ? "u3-marquee-track-rtl" : "u3-marquee-track-ltr"}>
        {renderGroup("a")}
        {renderGroup("b")}
      </div>
    </div>
  );
}

