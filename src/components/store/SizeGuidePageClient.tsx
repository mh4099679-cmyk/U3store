"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footprints, Shirt, Ruler, CheckCircle2, Info, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";

export function SizeGuidePageClient({
  lang,
  visibleCategories = "BOTH",
}: {
  lang: Language;
  visibleCategories?: string;
}) {
  const searchParams = useSearchParams();
  const isShoesOnly = visibleCategories === "SHOES_ONLY";
  const isClothingOnly = visibleCategories === "CLOTHING_ONLY";
  const isBoth = !isShoesOnly && !isClothingOnly;

  const defaultTab = isClothingOnly
    ? "CLOTHING"
    : isShoesOnly
    ? "SHOES"
    : searchParams.get("tab")?.toUpperCase() === "CLOTHING"
    ? "CLOTHING"
    : "SHOES";

  const [activeTab, setActiveTab] = useState<"SHOES" | "CLOTHING">(defaultTab);
  const [unit, setUnit] = useState<"CM" | "INCH">("CM");
  const isRtl = lang === "ar";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-10">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-800">
          <Ruler className="w-3.5 h-3.5 text-neutral-600" />
          <span>{isRtl ? "دليل المقاسات المعتمد لمتجر U3 STORE" : "U3 STORE Official Sizing Specification"}</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-jet">
          {isClothingOnly
            ? isRtl
              ? "دليل مقاسات الملابس العصرية"
              : "APPAREL SIZING SPECIFICATION GUIDE"
            : isShoesOnly
            ? isRtl
              ? "دليل مقاسات الأحذية الفاخرة"
              : "FOOTWEAR SIZING SPECIFICATION GUIDE"
            : isRtl
            ? "دليل مقاسات الأحذية والملابس"
            : "SIZE & FIT SPECIFICATION GUIDE"}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto leading-relaxed">
          {isClothingOnly
            ? isRtl
              ? "جدول قياسات دقيق لقطع الملابس والستريت وير لضمان اختيار المقاس المناسب بدون أي خطأ."
              : "Detailed dimensional charts and measuring guides to ensure flawless sizing for modern streetwear and apparel."
            : isShoesOnly
            ? isRtl
              ? "جدول قياسات دقيق للأحذية بالملم والسنتيمتر مع إرشادات القياس بالمنزل لضمان اختيار المقاس المناسب بدون أي خطأ."
              : "Detailed dimensional charts and at-home measuring guides to ensure flawless sizing for sneakers."
            : isRtl
            ? "جداول قياسات دقيقة بالملم والسنتيمتر مع إرشادات القياس بالمنزل لضمان اختيار المقاس المناسب بدون أي خطأ."
            : "Detailed dimensional charts and at-home measuring guides to ensure flawless sizing for sneakers and apparel."}
        </p>

        {/* Big Department Switcher Tabs (Only shown when BOTH departments are active) */}
        {isBoth && (
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("SHOES")}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer ${
                activeTab === "SHOES"
                  ? "bg-[#111214] text-white ring-2 ring-black/20"
                  : "bg-white text-neutral-600 border border-neutral-300 hover:border-black"
              }`}
            >
              <Footprints className="w-4 h-4 text-emerald-400" />
              <span>{isRtl ? "دليل مقاسات الأحذية (SHOES)" : "FOOTWEAR SIZING"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("CLOTHING")}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer ${
                activeTab === "CLOTHING"
                  ? "bg-[#111214] text-white ring-2 ring-black/20"
                  : "bg-white text-neutral-600 border border-neutral-300 hover:border-black"
              }`}
            >
              <Shirt className="w-4 h-4 text-purple-400" />
              <span>{isRtl ? "دليل مقاسات الملابس (CLOTHING)" : "APPAREL SIZING"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-8 shadow-sm space-y-8">
        {/* Unit Selector Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              {activeTab === "SHOES"
                ? isRtl ? "جدول تحويل مقاسات الأحذية (EU / US / UK / CM)" : "Footwear Conversion Matrix"
                : isRtl ? "جدول قياسات قطع الملابس والستريت وير" : "Streetwear Garment Dimensions"}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl text-xs font-mono">
            <span className="text-[11px] font-sans font-bold text-neutral-500 px-2">
              {isRtl ? "وحدة القياس:" : "Unit:"}
            </span>
            <button
              type="button"
              onClick={() => setUnit("CM")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                unit === "CM" ? "bg-black text-white shadow-xs" : "text-neutral-600 hover:text-black"
              }`}
            >
              CM (سنتيمتر)
            </button>
            <button
              type="button"
              onClick={() => setUnit("INCH")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                unit === "INCH" ? "bg-black text-white shadow-xs" : "text-neutral-600 hover:text-black"
              }`}
            >
              INCHES (بوصة)
            </button>
          </div>
        </div>

        {/* TAB 1: SHOES */}
        {activeTab === "SHOES" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Advice Box */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3.5 text-emerald-950">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs sm:text-sm">
                  {isRtl ? "مقاسات قياسية ومطابقة تماماً (True To Size)" : "Standard European Precision Sizing"}
                </p>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {isRtl
                    ? "تلتزم جميع أحذية U3 بالمقاسات الرياضية العالمية. إذا كان مقاسك المعتاد في السنيكرز هو 42 EU، فاختر 42. لأصحاب القدم العريضة، نوصي باختيار مقاس أكبر بنصف درجة أو درجة."
                    : "All U3 footwear adheres strictly to international sneaker sizing standards. Choose your usual EU size. For wider feet, consider going up half or one full size."}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="border border-neutral-200 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-center border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-[#111214] text-white font-mono text-xs">
                    <th className="py-3 px-4 text-emerald-400 font-bold">EU</th>
                    <th className="py-3 px-4">US MEN</th>
                    <th className="py-3 px-4">US WOMEN</th>
                    <th className="py-3 px-4">UK</th>
                    <th className="py-3 px-4 bg-emerald-950 text-emerald-300 font-bold">
                      {isRtl ? `طول القدم (${unit})` : `Foot Length (${unit})`}
                    </th>
                    <th className="py-3 px-4 bg-neutral-900 text-neutral-300">
                      {isRtl ? `طول الفرش الداخلي (${unit})` : `Insole Length (${unit})`}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800 font-mono text-xs sm:text-sm">
                  {[
                    { eu: "39", usM: "6.5", usW: "8.0", uk: "6.0", cm: 24.5, insole: 25.0 },
                    { eu: "40", usM: "7.0", usW: "8.5", uk: "6.0", cm: 25.0, insole: 25.5 },
                    { eu: "41", usM: "8.0", usW: "9.5", uk: "7.0", cm: 26.0, insole: 26.5 },
                    { eu: "42", usM: "8.5", usW: "10.0", uk: "7.5", cm: 26.5, insole: 27.0 },
                    { eu: "43", usM: "9.5", usW: "11.0", uk: "8.5", cm: 27.5, insole: 28.0 },
                    { eu: "44", usM: "10.0", usW: "11.5", uk: "9.0", cm: 28.0, insole: 28.5 },
                    { eu: "45", usM: "11.0", usW: "12.5", uk: "10.0", cm: 29.0, insole: 29.5 },
                    { eu: "46", usM: "12.0", usW: "13.5", uk: "11.0", cm: 30.0, insole: 30.5 },
                  ].map((row, idx) => (
                    <tr
                      key={row.eu}
                      className={idx % 2 === 0 ? "bg-white hover:bg-neutral-50" : "bg-neutral-50/70 hover:bg-neutral-100"}
                    >
                      <td className="py-3 px-4 font-extrabold text-black font-sans text-sm">{row.eu}</td>
                      <td className="py-3 px-4">{row.usM}</td>
                      <td className="py-3 px-4">{row.usW}</td>
                      <td className="py-3 px-4">{row.uk}</td>
                      <td className="py-3 px-4 font-bold text-emerald-800 bg-emerald-50/40">
                        {unit === "CM" ? `${row.cm} cm` : `${(row.cm / 2.54).toFixed(1)}"`}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 bg-neutral-50/40">
                        {unit === "CM" ? `${row.insole} cm` : `${(row.insole / 2.54).toFixed(1)}"`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* How to Measure Step-by-Step */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {[
                {
                  step: "01",
                  titleAr: "الوقوف ملاصقاً للجدار",
                  titleEn: "Heel Against Wall",
                  descAr: "ضع ورقة بيضاء على أرض مستوية، وقف بحيث يلامس كعبك الجدار بدون ارتداء الحذاء.",
                  descEn: "Place paper on flat ground, stand upright with your heel touching the wall.",
                },
                {
                  step: "02",
                  titleAr: "تحديد أطول نقطة في أصابعك",
                  titleEn: "Mark Longest Toe",
                  descAr: "ارسم علامة بقلم عمودي عند أطول إصبع في قدمك (غالباً إصبع الإبهام أو الإصبع المجاور له).",
                  descEn: "Draw a straight mark at the tip of your longest toe using a vertical pencil.",
                },
                {
                  step: "03",
                  titleAr: "قياس المسافة بالمسطرة",
                  titleEn: "Measure Distance",
                  descAr: "قس المسافة من طرف الورقة الملاصق للجدار حتى العلامة بالسنتيمتر، وطابقها مع الجدول.",
                  descEn: "Measure the distance with a ruler in CM and match it with the EU column in our table.",
                },
              ].map((s) => (
                <div key={s.step} className="bg-[#FAFBFB] border border-neutral-200 p-5 rounded-2xl space-y-2">
                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    {s.step}
                  </span>
                  <h4 className="font-heading font-bold text-sm text-jet">
                    {isRtl ? s.titleAr : s.titleEn}
                  </h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {isRtl ? s.descAr : s.descEn}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center pt-2">
              <Link
                href="/shoes"
                className="inline-flex items-center gap-2 bg-[#111214] hover:bg-black text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>{isRtl ? "تصفح تشكيلة الأحذية الآن" : "Explore Footwear Collection"}</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
          </div>
        )}

        {/* TAB 2: CLOTHING */}
        {activeTab === "CLOTHING" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Advice Box */}
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex items-start gap-3.5 text-purple-950">
              <Shirt className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs sm:text-sm">
                  {isRtl ? "قصّة أوفرسايز ستريت وير عصرية (Oversized Streetwear Fit)" : "Modern Boxy / Oversized Fit"}
                </p>
                <p className="text-xs text-purple-900 leading-relaxed">
                  {isRtl
                    ? "تتميز تيشيرتات وهوديز U3 بأكتاف مائلة Drop Shoulder وقماش قطن مصري 100% ثقيل معالج ضد الانكماش. إذا أردت المظهر الفضفاض العصري اختر مقاسك المعتاد، وإذا أردت مظهراً مضبوطاً (Regular Fit) اختر مقاساً أصغر بدرجة."
                    : "U3 tees and hoodies feature drop-shoulder aesthetics in 100% heavy Egyptian cotton. Choose your regular size for an authentic streetwear drape, or size down one step for a classic regular fit."}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="border border-neutral-200 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-center border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-[#111214] text-white font-mono text-xs">
                    <th className="py-3 px-4 font-bold text-purple-300">{isRtl ? "المقاس" : "Size"}</th>
                    <th className="py-3 px-3 bg-purple-950 text-purple-200 font-bold">
                      {isRtl ? `محيط الصدر (${unit})` : `Chest Circumference (${unit})`}
                    </th>
                    <th className="py-3 px-3">{isRtl ? `طول القطعة (${unit})` : `Body Length (${unit})`}</th>
                    <th className="py-3 px-3">{isRtl ? `عرض الكتف (${unit})` : `Shoulder Width (${unit})`}</th>
                    <th className="py-3 px-3">{isRtl ? `طول الكم (${unit})` : `Sleeve (${unit})`}</th>
                    <th className="py-3 px-4 text-neutral-300 font-sans">
                      {isRtl ? "الوزن التقريبي المناسب" : "Recommended Weight"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800 font-mono text-xs sm:text-sm">
                  {[
                    { sz: "XS", chest: 100, len: 68, sh: 46, sl: 60, weight: "50 - 60 kg" },
                    { sz: "S", chest: 106, len: 70, sh: 48, sl: 61, weight: "60 - 70 kg" },
                    { sz: "M", chest: 112, len: 72, sh: 50, sl: 62, weight: "70 - 80 kg" },
                    { sz: "L", chest: 118, len: 74, sh: 52, sl: 63, weight: "80 - 90 kg" },
                    { sz: "XL", chest: 124, len: 76, sh: 54, sl: 64, weight: "90 - 100 kg" },
                    { sz: "2XL", chest: 130, len: 78, sh: 56, sl: 65, weight: "100 - 110 kg" },
                    { sz: "Oversized", chest: 136, len: 80, sh: 58, sl: 66, weight: "110+ kg / Ultra Baggy" },
                  ].map((row, idx) => (
                    <tr
                      key={row.sz}
                      className={idx % 2 === 0 ? "bg-white hover:bg-neutral-50" : "bg-neutral-50/70 hover:bg-neutral-100"}
                    >
                      <td className="py-3 px-4 font-extrabold text-black font-sans text-sm">{row.sz}</td>
                      <td className="py-3 px-3 font-bold text-purple-900 bg-purple-50/50">
                        {unit === "CM" ? `${row.chest} cm` : `${(row.chest / 2.54).toFixed(1)}"`}
                      </td>
                      <td className="py-3 px-3">
                        {unit === "CM" ? `${row.len} cm` : `${(row.len / 2.54).toFixed(1)}"`}
                      </td>
                      <td className="py-3 px-3">
                        {unit === "CM" ? `${row.sh} cm` : `${(row.sh / 2.54).toFixed(1)}"`}
                      </td>
                      <td className="py-3 px-3">
                        {unit === "CM" ? `${row.sl} cm` : `${(row.sl / 2.54).toFixed(1)}"`}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 font-sans text-xs">
                        {row.weight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* How to Measure Garment Step-by-Step */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {[
                {
                  step: "01",
                  titleAr: "قياس الصدر (Chest)",
                  titleEn: "Chest Width",
                  descAr: "افرد قطعة الملابس مستوية، وقس بالعرض من أسفل الإبطين بمقدار 2.5 سم واضرب في 2.",
                  descEn: "Lay garment flat, measure across the chest 2.5 cm under armholes, then double.",
                },
                {
                  step: "02",
                  titleAr: "قياس الطول (Length)",
                  titleEn: "Total Length",
                  descAr: "قس المسافة العمودية من أعلى نقطة في الكتف ملاصقة للياقة نزولاً إلى الحافة السفلية.",
                  descEn: "Measure vertically from the highest point of the shoulder down to the bottom hem.",
                },
                {
                  step: "03",
                  titleAr: "قياس الأكتاف (Shoulder)",
                  titleEn: "Shoulder Span",
                  descAr: "قس المسافة المستقيمة بين خياطتي الكتفين من الجهة الخلفية لتحديد اتساع الأكتاف.",
                  descEn: "Measure straight across from one shoulder seam to the other across the back.",
                },
              ].map((s) => (
                <div key={s.step} className="bg-[#FAFBFB] border border-neutral-200 p-5 rounded-2xl space-y-2">
                  <span className="font-mono text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                    {s.step}
                  </span>
                  <h4 className="font-heading font-bold text-sm text-jet">
                    {isRtl ? s.titleAr : s.titleEn}
                  </h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {isRtl ? s.descAr : s.descEn}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center pt-2">
              <Link
                href="/clothing"
                className="inline-flex items-center gap-2 bg-[#111214] hover:bg-black text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>{isRtl ? "تصفح تشكيلة الملابس الآن" : "Explore Apparel Collection"}</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

