"use client";

import React, { useState } from "react";
import { X, Ruler, Footprints, Shirt, CheckCircle2, Info } from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";

export interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  defaultType?: "SHOES" | "CLOTHING";
  hideSwitcher?: boolean;
}

export function SizeGuideModal({
  isOpen,
  onClose,
  lang,
  defaultType = "SHOES",
  hideSwitcher = false,
}: SizeGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"SHOES" | "CLOTHING">(defaultType);
  const [unit, setUnit] = useState<"CM" | "INCH">("CM");
  const isRtl = lang === "ar";

  React.useEffect(() => {
    setActiveTab(defaultType);
  }, [defaultType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-[#111214] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base tracking-wide text-white">
                {isRtl ? "دليل المقاسات الرسمي — U3 STORE" : "OFFICIAL SIZE & FIT GUIDE"}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {isRtl
                  ? "قياسات دقيقة بالملم والسنتيمتر لاختيار مقاسك المثالي"
                  : "Precision measurements to guarantee your perfect fit"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Department Switcher Tabs & Units Toggle */}
        <div className="px-5 py-3 border-b border-neutral-200 bg-[#FAFBFB] flex flex-wrap items-center justify-between gap-3">
          {hideSwitcher ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-neutral-200/80 text-jet">
                {activeTab === "CLOTHING" ? <Shirt className="w-3.5 h-3.5 text-purple-600" /> : <Footprints className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{activeTab === "CLOTHING" ? (isRtl ? "دليل مقاسات الملابس" : "Apparel Sizing") : (isRtl ? "دليل مقاسات الأحذية" : "Footwear Sizing")}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-neutral-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("SHOES")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "SHOES"
                    ? "bg-[#111214] text-white shadow-sm"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>{isRtl ? "مقاسات الأحذية (Shoes)" : "Footwear"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("CLOTHING")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "CLOTHING"
                    ? "bg-[#111214] text-white shadow-sm"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>{isRtl ? "مقاسات الملابس (Clothing)" : "Apparel"}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setUnit("CM")}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                unit === "CM" ? "bg-black text-white" : "text-neutral-600"
              }`}
            >
              CM
            </button>
            <button
              type="button"
              onClick={() => setUnit("INCH")}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                unit === "INCH" ? "bg-black text-white" : "text-neutral-600"
              }`}
            >
              INCH
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === "SHOES" ? (
            /* FOOTWEAR GUIDE */
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">
                    {isRtl ? "مقاسات مطابقة للمعايير الأوروبية (True to Size)" : "Fits True to Size"}
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    {isRtl
                      ? "جميع أحذية U3 STORE تعتمد المقاسات القياسية EU. ننصح باختيار مقاسك المعتاد في الأحذية الرياضية."
                      : "All footwear follows standard European sizing. We recommend selecting your usual sneaker size."}
                  </p>
                </div>
              </div>

              {/* Shoes Conversion Table */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-[#111214] text-white font-mono text-[11px]">
                      <th className="py-2.5 px-3">EU</th>
                      <th className="py-2.5 px-3">US MEN</th>
                      <th className="py-2.5 px-3">US WOMEN</th>
                      <th className="py-2.5 px-3">UK</th>
                      <th className="py-2.5 px-3 bg-emerald-950 text-emerald-300">
                        {isRtl ? `طول القدم (${unit})` : `Foot Length (${unit})`}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-neutral-800 font-mono text-xs">
                    {[
                      { eu: "39", usM: "6.5", usW: "8.0", uk: "6.0", cm: 24.5 },
                      { eu: "40", usM: "7.0", usW: "8.5", uk: "6.0", cm: 25.0 },
                      { eu: "41", usM: "8.0", usW: "9.5", uk: "7.0", cm: 26.0 },
                      { eu: "42", usM: "8.5", usW: "10.0", uk: "7.5", cm: 26.5 },
                      { eu: "43", usM: "9.5", usW: "11.0", uk: "8.5", cm: 27.5 },
                      { eu: "44", usM: "10.0", usW: "11.5", uk: "9.0", cm: 28.0 },
                      { eu: "45", usM: "11.0", usW: "12.5", uk: "10.0", cm: 29.0 },
                      { eu: "46", usM: "12.0", usW: "13.5", uk: "11.0", cm: 30.0 },
                    ].map((row, idx) => (
                      <tr
                        key={row.eu}
                        className={idx % 2 === 0 ? "bg-white hover:bg-neutral-50" : "bg-neutral-50/70 hover:bg-neutral-100"}
                      >
                        <td className="py-2.5 px-3 font-bold text-black font-sans">{row.eu}</td>
                        <td className="py-2.5 px-3">{row.usM}</td>
                        <td className="py-2.5 px-3">{row.usW}</td>
                        <td className="py-2.5 px-3">{row.uk}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-800 bg-emerald-50/50">
                          {unit === "CM" ? `${row.cm} cm` : `${(row.cm / 2.54).toFixed(1)} in`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Foot Measurement Tips */}
              <div className="bg-[#FAFBFB] border border-neutral-200/80 p-4 rounded-2xl space-y-2">
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-jet flex items-center gap-2">
                  <Info className="w-4 h-4 text-neutral-500" />
                  {isRtl ? "كيف تقيس طول قدمك بدقة في المنزل؟" : "How to measure your foot length?"}
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-600 leading-relaxed ps-1">
                  <li>
                    {isRtl
                      ? "ضع ورقة بيضاء على أرض مستوية ملاصقة للجدار تماماً."
                      : "Place a piece of paper on a hard floor against a flat wall."}
                  </li>
                  <li>
                    {isRtl
                      ? "قف على الورقة مع ملامسة كعبك للجدار وارسم خطاً عند أطول أصابع قدمك."
                      : "Stand barefoot with your heel against the wall and mark your longest toe."}
                  </li>
                  <li>
                    {isRtl
                      ? "قس المسافة بالمسطرة من حافة الورقة حتى العلامة، وقارنها بالجدول أعلاه."
                      : "Measure the distance with a ruler and compare against the table above."}
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            /* CLOTHING GUIDE */
            <div className="space-y-5">
              <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl flex items-start gap-3 text-purple-950">
                <Shirt className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">
                    {isRtl ? "قصّة ستريت وير عصرية وفضفاضة (Oversized Streetwear Fit)" : "Oversized Streetwear Silhouette"}
                  </p>
                  <p className="text-[11px] text-purple-900 mt-0.5">
                    {isRtl
                      ? "تيشيرتات وهوديز U3 مصممة بأكتاف مائلة (Drop-Shoulder) وقماش قطن مصري 100% ثقيل معالج ضد الانكماش. إذا كنت تفضل مظهراً مضبوطاً (Regular Fit)، يمكنك اختيار مقاس أصغر بدرجة."
                      : "U3 apparel is tailored with drop-shoulders and dense heavyweight Egyptian cotton. For a more standard fit, choose one size down."}
                  </p>
                </div>
              </div>

              {/* Clothing Measurements Table */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-[#111214] text-white font-mono text-[11px]">
                      <th className="py-2.5 px-3">{isRtl ? "المقاس" : "Size"}</th>
                      <th className="py-2.5 px-2 bg-purple-950 text-purple-200">
                        {isRtl ? `الصدر (${unit})` : `Chest (${unit})`}
                      </th>
                      <th className="py-2.5 px-2">{isRtl ? `الطول (${unit})` : `Length (${unit})`}</th>
                      <th className="py-2.5 px-2">{isRtl ? `الكتف (${unit})` : `Shoulder (${unit})`}</th>
                      <th className="py-2.5 px-2">{isRtl ? `الكم (${unit})` : `Sleeve (${unit})`}</th>
                      <th className="py-2.5 px-3 text-neutral-400 font-sans hidden sm:table-cell">
                        {isRtl ? "الوزن التقريبي" : "Rec. Weight"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-neutral-800 font-mono text-xs">
                    {[
                      { sz: "XS", chest: 100, len: 68, sh: 46, sl: 60, weight: "50 - 60 kg" },
                      { sz: "S", chest: 106, len: 70, sh: 48, sl: 61, weight: "60 - 70 kg" },
                      { sz: "M", chest: 112, len: 72, sh: 50, sl: 62, weight: "70 - 80 kg" },
                      { sz: "L", chest: 118, len: 74, sh: 52, sl: 63, weight: "80 - 90 kg" },
                      { sz: "XL", chest: 124, len: 76, sh: 54, sl: 64, weight: "90 - 100 kg" },
                      { sz: "2XL", chest: 130, len: 78, sh: 56, sl: 65, weight: "100 - 110 kg" },
                      { sz: "Oversized", chest: 136, len: 80, sh: 58, sl: 66, weight: "110+ kg / Baggy" },
                    ].map((row, idx) => (
                      <tr
                        key={row.sz}
                        className={idx % 2 === 0 ? "bg-white hover:bg-neutral-50" : "bg-neutral-50/70 hover:bg-neutral-100"}
                      >
                        <td className="py-2.5 px-3 font-bold text-black font-sans">{row.sz}</td>
                        <td className="py-2.5 px-2 font-bold text-purple-900 bg-purple-50/50">
                          {unit === "CM" ? `${row.chest} cm` : `${(row.chest / 2.54).toFixed(1)}"`}
                        </td>
                        <td className="py-2.5 px-2">
                          {unit === "CM" ? `${row.len} cm` : `${(row.len / 2.54).toFixed(1)}"`}
                        </td>
                        <td className="py-2.5 px-2">
                          {unit === "CM" ? `${row.sh} cm` : `${(row.sh / 2.54).toFixed(1)}"`}
                        </td>
                        <td className="py-2.5 px-2">
                          {unit === "CM" ? `${row.sl} cm` : `${(row.sl / 2.54).toFixed(1)}"`}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-500 font-sans hidden sm:table-cell">
                          {row.weight}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Apparel Measurement Guide */}
              <div className="bg-[#FAFBFB] border border-neutral-200/80 p-4 rounded-2xl space-y-2">
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-jet flex items-center gap-2">
                  <Info className="w-4 h-4 text-neutral-500" />
                  {isRtl ? "طريقة قياس قطعة ملابس مفضلة لديك:" : "How to measure your favourite t-shirt or hoodie?"}
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-neutral-600 leading-relaxed ps-1">
                  <li>
                    <strong>{isRtl ? "محيط الصدر (Chest):" : "Chest:"}</strong>{" "}
                    {isRtl
                      ? "افرد التيشيرت على سطح مستوٍ وقس المسافة بين أسفل الإبطين واضرب في 2."
                      : "Lay garment flat, measure across chest 2.5 cm below armholes, then double."}
                  </li>
                  <li>
                    <strong>{isRtl ? "الطول (Length):" : "Length:"}</strong>{" "}
                    {isRtl
                      ? "قس المسافة من أعلى نقطة في الكتف بجانب الياقة وحتى الحافة السفلية."
                      : "Measure from highest point of shoulder beside collar down to bottom hem."}
                  </li>
                  <li>
                    <strong>{isRtl ? "الكتف (Shoulder):" : "Shoulder:"}</strong>{" "}
                    {isRtl
                      ? "قس المسافة المستقيمة بين درزتي الكتف من الخلف."
                      : "Measure straight across from one shoulder seam to the other."}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3.5 border-t border-neutral-200 bg-[#FAFBFB] flex items-center justify-between text-[11px] text-neutral-500">
          <span>{isRtl ? "U3 STORE — خامات مصرية بمعايير عالمية" : "U3 STORE Official Sizing Specification"}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#111214] hover:bg-black text-white font-bold rounded-lg cursor-pointer"
          >
            {isRtl ? "تم / فهمت" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

