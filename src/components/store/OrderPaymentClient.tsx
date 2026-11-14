"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  KeyRound,
  PackageCheck,
  Boxes,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCcw,
  RefreshCw,
  ArrowLeftRight,
} from "lucide-react";
import { Language, t, formatCurrency } from "@/lib/i18n/dictionaries";

interface OrderPaymentClientProps {
  lang: Language;
  order: any;
  items: any[];
  history: any[];
  paymentMethod: any;
  submissions: any[];
  invoice: any;
  accessToken: string;
  revisions?: any[];
}

export function OrderPaymentClient({
  lang,
  order,
  items,
  history,
  paymentMethod,
  submissions,
  invoice,
  accessToken,
  revisions = [],
}: OrderPaymentClientProps) {
  const router = useRouter();
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Extract exchange details if present in revisions
  const exchangeData = React.useMemo(() => {
    if (!revisions || revisions.length === 0) return null;
    for (const rev of revisions) {
      try {
        const prevSnap =
          typeof rev.previous_snapshot_json === "string"
            ? JSON.parse(rev.previous_snapshot_json)
            : rev.previous_snapshot_json;
        const nextSnap =
          typeof rev.new_snapshot_json === "string"
            ? JSON.parse(rev.new_snapshot_json)
            : rev.new_snapshot_json;

        if (nextSnap?.replacementItem && nextSnap?.previousItem) {
          return {
            replacedItems: [nextSnap.previousItem],
            replacementItems: [nextSnap.replacementItem],
            reason: rev.reason,
            date: rev.created_at,
          };
        }

        const prevItems = prevSnap?.items || [];
        const nextItems = nextSnap?.items || [];
        if (prevItems.length > 0 && nextItems.length > 0) {
          const replaced = prevItems.filter(
            (pi: any) =>
              !nextItems.some(
                (ni: any) =>
                  ni.variant_id === pi.variant_id &&
                  ni.size_snapshot === pi.size_snapshot
              )
          );
          const replacements = nextItems.filter(
            (ni: any) =>
              !prevItems.some(
                (pi: any) =>
                  pi.variant_id === ni.variant_id &&
                  pi.size_snapshot === ni.size_snapshot
              )
          );
          if (replaced.length > 0 || replacements.length > 0) {
            return {
              replacedItems: replaced.length > 0 ? replaced : prevItems,
              replacementItems: replacements.length > 0 ? replacements : nextItems,
              reason: rev.reason,
              date: rev.created_at,
            };
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  }, [revisions]);

  // Payment report form
  const [showReportForm, setShowReportForm] = useState(false);
  const [transactionReference, setTransactionReference] = useState("");
  const [senderIdentifier, setSenderIdentifier] = useState(order.customer_phone || "");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [transferAmount, setTransferAmount] = useState(String(order.total_amount));
  const [receiptBase64, setReceiptBase64] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  // Auto-refresh order status live every 4 seconds so when Admin confirms payment, the customer sees it immediately!
  React.useEffect(() => {
    if (order.payment_status === "PAID" && ["DELIVERED", "CANCELLED"].includes(order.order_status)) {
      return;
    }
    const timer = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [order.payment_status, order.order_status, router]);

  function copyText(val: string, setter: (v: boolean) => void) {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptBase64(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  async function submitPaymentReport(e: React.FormEvent) {
    e.preventDefault();
    setReportError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_payment",
          orderNumber: order.order_number,
          accessToken: accessToken || order.guest_access_token_plain || "",
          transactionReference,
          senderIdentifier,
          transferDate,
          transferAmount: Number(transferAmount),
          receiptBase64,
          receiptFileName,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setReportError(data.error || "Failed to submit payment report.");
      } else {
        setReportSuccess(true);
        setShowReportForm(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const effectiveToken = accessToken || order.guest_access_token_plain || "";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between no-print">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/account/orders");
            }
          }}
          className="inline-flex items-center gap-2 bg-white hover:bg-neutral-100 text-jet border border-silver/80 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
          aria-label={lang === "ar" ? "الرجوع للصفحة السابقة" : "Back to previous page"}
        >
          {lang === "ar" ? (
            <ArrowRight className="w-4 h-4 text-jet" />
          ) : (
            <ArrowLeft className="w-4 h-4 text-jet" />
          )}
          <span>{lang === "ar" ? "الرجوع للصفحة السابقة" : "Back to Previous Page"}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-bold">
          <Link
            href="/account/orders"
            className="text-neutralgray hover:text-jet underline hidden sm:inline"
          >
            {lang === "ar" ? "سجل طلباتي" : "My Orders"}
          </Link>
          <span className="text-silver hidden sm:inline">•</span>
          <Link
            href="/shop"
            className="text-neutralgray hover:text-jet underline"
          >
            {lang === "ar" ? "مواصلة التسوق" : "Continue Shopping"}
          </Link>
        </div>
      </div>

      {/* Top Order Reference & Guest Key Banner */}
      <div className="bg-jet text-offwhite p-6 sm:p-8 border border-darkgray flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <span
            className={`inline-block border text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${
              order.order_status === "RETURNED"
                ? "bg-amber-950/90 border-amber-500 text-amber-200"
                : order.order_status === "EXCHANGED"
                ? "bg-blue-950/90 border-blue-500 text-blue-200"
                : order.order_status === "CANCELLED"
                ? "bg-red-950/90 border-red-500 text-red-200"
                : "bg-[#292B2E] border-silver/40 text-offwhite"
            }`}
          >
            {t(lang, `status.order.${order.order_status}`)}
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold">
            {t(lang, "order.number")}: <span className="text-silver">{order.order_number}</span>
          </h1>
          {invoice && (
            <p className="text-xs text-silver">
              {t(lang, "invoice.number")}: <span className="font-mono">{invoice.invoice_number}</span>
            </p>
          )}
        </div>

        {/* Official View-Only Badge (No Print or Download PDF) */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-xs text-silver no-print shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-heading font-medium tracking-wide">
            {lang === "ar"
              ? "فاتورة إلكترونية معتمدة (للعرض والمتابعة فقط)"
              : "Official Digital Invoice (View Only)"}
          </span>
        </div>
      </div>

      {/* Private Guest Tracking Key Box */}
      {effectiveToken && (
        <div className="bg-[#111214]/[0.03] border border-silver/80 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-jet flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <span>{t(lang, "order.access_token")}</span>
            </p>
            <p className="text-xs text-neutralgray">{t(lang, "order.save_token_warning")}</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-silver px-3 py-2 rounded-xl">
            <code className="text-xs font-mono font-bold text-jet">{effectiveToken}</code>
            <button
              type="button"
              onClick={() => copyText(effectiveToken, setCopiedToken)}
              className="text-xs font-bold text-jet hover:underline flex items-center gap-1"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedToken ? t(lang, "payment.copied") : t(lang, "payment.copy")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Customer Live Visual Order Status Tracker - Ultra Modern ("بشكل روش وبدون إيموجي") */}
      {(() => {
        const currentStep =
          order.order_status === "DELIVERED"
            ? 5
            : order.order_status === "SHIPPED"
            ? 4
            : order.order_status === "PROCESSING"
            ? 3
            : order.payment_status === "PAID" || ["CONFIRMED"].includes(order.order_status)
            ? 2
            : order.payment_status === "UNDER_REVIEW"
            ? 2
            : 1;

        const getTrackerHeader = () => {
          if (order.order_status === "CANCELLED") {
            return {
              icon: XCircle,
              iconBg: "bg-red-50 text-red-600 border border-red-200",
              titleAr: "تم إلغاء الطلب",
              titleEn: "Order Cancelled",
              subtitleAr: order.cancellation_reason
                ? `سبب الإلغاء: ${order.cancellation_reason}`
                : "تم إلغاء هذا الطلب من قبل إدارة المتجر وحفظ سجلاته",
              subtitleEn: order.cancellation_reason
                ? `Cancellation Reason: ${order.cancellation_reason}`
                : "This order has been cancelled by store administration",
            };
          }
          if (order.order_status === "RETURNED") {
            return {
              icon: RotateCcw,
              iconBg: "bg-amber-50 text-amber-600 border border-amber-200",
              titleAr: "تم إرجاع الطلب",
              titleEn: "Order Returned",
              subtitleAr: "تم إرجاع هذا الطلب واسترداد المنتجات إلى المخزون بنجاح",
              subtitleEn: "This order has been returned and products restocked successfully",
            };
          }
          if (order.order_status === "EXCHANGED") {
            return {
              icon: RefreshCw,
              iconBg: "bg-blue-50 text-blue-600 border border-blue-200",
              titleAr: "تم استبدال المنتجات في طلبك",
              titleEn: "Items in your order have been exchanged",
              subtitleAr: "تم تنفيذ عملية الاستبدال بنجاح وتحديث منتجات طلبك",
              subtitleEn: "The exchange process has been completed successfully and your order items updated",
            };
          }
          if (order.order_status === "DELIVERED") {
            return {
              icon: CheckCircle2,
              iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200",
              titleAr: "تم تسليم طلبك بنجاح",
              titleEn: "Order Delivered Successfully",
              subtitleAr: "شحنتك تم استلامها بالكامل. شكراً لثقتك بـ U3 STORE!",
              subtitleEn: "Your package has been delivered. Thank you for shopping with U3 STORE!",
            };
          }
          if (order.order_status === "SHIPPED") {
            return {
              icon: Truck,
              iconBg: "bg-sky-50 text-sky-600 border border-sky-200",
              titleAr: "طلبك في الطريق إليك مع مندوب التوصيل",
              titleEn: "Order In Transit for Delivery",
              subtitleAr: "خرجت الشحنة وسيقوم المندوب بالتواصل معك قبل الوصول",
              subtitleEn: "Out with carrier, courier will contact you upon arrival",
            };
          }
          if (order.order_status === "PROCESSING") {
            return {
              icon: PackageCheck,
              iconBg: "bg-amber-50 text-amber-600 border border-amber-200",
              titleAr: "جاري تجهيز وتغليف طلبك للشحن",
              titleEn: "Order Being Prepared & Packaged",
              subtitleAr: "نقوم الآن بفحص جودة الحذاء والتغليف بعناية قبل التسليم للمندوب",
              subtitleEn: "Quality check and premium packaging in progress",
            };
          }
          if (order.payment_status === "PAID" || order.order_status === "CONFIRMED") {
            return {
              icon: CheckCircle2,
              iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200",
              titleAr: "تم استلام وتأكيد دفعتك بنجاح",
              titleEn: "Payment Verified & Confirmed",
              subtitleAr: "تم حجز المنتجات وجاري إحالة الطلب لقسم التجهيز",
              subtitleEn: "Inventory reserved, queueing for packaging",
            };
          }
          if (order.payment_status === "UNDER_REVIEW") {
            return {
              icon: Clock,
              iconBg: "bg-amber-50 text-amber-600 border border-amber-200",
              titleAr: "إيصال الدفع قيد المراجعة والتحقق",
              titleEn: "Payment Receipt Under Verification",
              subtitleAr: "تم استلام بيانات التحويل، وجاري التدقيق من قبل إدارة المتجر",
              subtitleEn: "Receipt submitted, administrator verifying details",
            };
          }
          return {
            icon: CreditCard,
            iconBg: "bg-neutral-100 text-jet border border-silver/60",
            titleAr: "بانتظار تحويل المبلغ وتأكيد الطلب",
            titleEn: "Awaiting Payment Transfer",
            subtitleAr: "يرجى تحويل إجمالي الطلب ورفع إيصال السداد لتثبيت الحجز",
            subtitleEn: "Please transfer the total amount to confirm your reservation",
          };
        };

        const trackerHeader = getTrackerHeader();
        const HeaderIcon = trackerHeader.icon;

        const trackerSteps = [
          {
            num: 1,
            titleAr: "تم استلام الطلب",
            titleEn: "Order Placed",
            descAr: "حجز المنتجات",
            descEn: "Items reserved",
            icon: ShoppingBag,
          },
          {
            num: 2,
            titleAr: "تأكيد الدفع",
            titleEn: "Payment Verified",
            descAr: "اعتماد التحويل",
            descEn: "Transfer approved",
            icon: CreditCard,
          },
          {
            num: 3,
            titleAr: "جاري التجهيز",
            titleEn: "Processing",
            descAr: "فحص الجودة والتغليف",
            descEn: "Quality check & pack",
            icon: PackageCheck,
          },
          {
            num: 4,
            titleAr: "في الطريق",
            titleEn: "Out for Delivery",
            descAr: "مع مندوب الشحن",
            descEn: "With courier",
            icon: Truck,
          },
          {
            num: 5,
            titleAr: "تم التسليم",
            titleEn: "Delivered",
            descAr: "استلام العميل للشحنة",
            descEn: "Package delivered",
            icon: CheckCircle2,
          },
        ];

        return (
          <div className="bg-white border border-silver/70 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm no-print">
            {/* Header with Lucide Icon and Live Pulse */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-silver/40 pb-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${trackerHeader.iconBg}`}>
                  <HeaderIcon className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutralgray font-heading">
                      {lang === "ar" ? "المسار المباشر لحالة الطلب" : "LIVE ORDER STATUS TRACKER"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      {lang === "ar" ? "متابعة حية" : "LIVE SYNC"}
                    </span>
                  </div>
                  <h2 className="font-heading text-lg sm:text-xl font-bold text-jet mt-0.5">
                    {lang === "ar" ? trackerHeader.titleAr : trackerHeader.titleEn}
                  </h2>
                  <p className="text-xs text-neutralgray mt-0.5">
                    {lang === "ar" ? trackerHeader.subtitleAr : trackerHeader.subtitleEn}
                  </p>
                </div>
              </div>
              {order.tracking_number && (
                <div className="bg-[#111214] text-white px-4 py-2 font-mono text-xs rounded-xl shadow-xs border border-white/10 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-silver" />
                  <span>{lang === "ar" ? "رقم الشحنة:" : "Tracking #:"} {order.tracking_number}</span>
                </div>
              )}
            </div>

            {/* Desktop / Tablet / Mobile: Connected Stepper Line or Status Banner */}
            {order.order_status === "CANCELLED" ? (
              <div className="bg-red-50/70 border border-red-200 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{lang === "ar" ? "تم إلغاء الطلب" : "Your order has been cancelled"}</span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  {order.cancellation_reason
                    ? (lang === "ar" ? `سبب الإلغاء: ${order.cancellation_reason}` : `Cancellation reason: ${order.cancellation_reason}`)
                    : (lang === "ar" ? "تم إلغاء هذا الطلب من قبل إدارة المتجر." : "This order has been cancelled by store administration.")}
                </p>
                {(order.cancelled_at || order.updated_at) && (
                  <p className="text-[11px] text-neutral-500 font-mono">
                    {lang === "ar" ? "تاريخ الإلغاء: " : "Cancellation Date: "}
                    {new Date(order.cancelled_at || order.updated_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                  </p>
                )}
              </div>
            ) : order.order_status === "RETURNED" ? (
              <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <RotateCcw className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>{lang === "ar" ? "مرتجع — تم إرجاع الطلب" : "Returned — Order has been returned"}</span>
                </div>
                <p className="text-xs text-amber-950 leading-relaxed">
                  {lang === "ar"
                    ? "تم إرجاع هذا الطلب بنجاح واسترداد المنتجات للمخزون وفق الإجراءات المعتمدة."
                    : "This order has been returned and products restocked successfully."}
                </p>
                {order.updated_at && (
                  <p className="text-[11px] text-neutral-600 font-mono">
                    {lang === "ar" ? "تاريخ الإرجاع: " : "Return Date: "}
                    {new Date(order.updated_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                  </p>
                )}
              </div>
            ) : order.order_status === "EXCHANGED" ? (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <RefreshCw className="w-5 h-5 text-blue-700 shrink-0" />
                    <span>{lang === "ar" ? "تم الاستبدال — تم استبدال المنتجات في طلبك" : "Exchanged — Items in your order have been exchanged"}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                    {lang === "ar" ? "طلب مستبدل معتمد" : "Official Exchange"}
                  </span>
                </div>
                <p className="text-xs text-blue-950 leading-relaxed">
                  {lang === "ar"
                    ? "تم تنفيذ عملية الاستبدال لطلبك بنجاح. فيما يلي بيان بالمنتجات المستبدلة السابقة والمنتجات البديلة الحالية المعتمدة."
                    : "The exchange for your order has been processed. Below is the breakdown of replaced and current replacement items."}
                </p>
                {order.updated_at && (
                  <p className="text-[11px] text-neutral-500 font-mono">
                    {lang === "ar" ? "تاريخ الاستبدال: " : "Exchange Date: "}
                    {new Date(order.updated_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="hidden sm:block relative pt-3 pb-2">
              {/* Background Grey Track */}
              <div className="absolute top-9 left-12 right-12 h-1 bg-silver/40 -z-0 rounded-full" />
              {/* Active Dark Progress Bar */}
              <div
                className="absolute top-9 h-1 bg-gradient-to-r from-jet via-neutral-800 to-jet -z-0 rounded-full transition-all duration-700"
                style={{
                  [lang === "ar" ? "right" : "left"]: "48px",
                  width: `calc(${((Math.min(currentStep, 5) - 1) / 4) * 100}% * ((100% - 96px) / 100%))`,
                }}
              />

              <div className="grid grid-cols-5 relative z-10">
                {trackerSteps.map((st) => {
                  const isDone = st.num < currentStep;
                  const isCurrent = st.num === currentStep;
                  const StepIcon = st.icon;

                  return (
                    <div key={st.num} className="flex flex-col items-center text-center px-1">
                      {/* Step Badge */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isCurrent
                            ? "bg-jet text-white shadow-xl ring-4 ring-neutral-300 ring-offset-2 scale-110"
                            : isDone
                            ? "bg-jet text-white shadow-md"
                            : "bg-white text-silver/70 border-2 border-silver/50"
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                        ) : (
                          <StepIcon className={`w-5 h-5 ${isCurrent ? "text-white" : "text-neutralgray/60"}`} />
                        )}
                      </div>

                      {/* Step Labels */}
                      <div className="mt-3 space-y-0.5">
                        <span
                          className={`block font-heading text-xs font-bold ${
                            isCurrent ? "text-jet" : isDone ? "text-neutral-800" : "text-neutralgray/60"
                          }`}
                        >
                          {lang === "ar" ? st.titleAr : st.titleEn}
                        </span>
                        {isCurrent ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-jet border border-silver/60">
                            {lang === "ar" ? "المرحلة الحالية" : "Active Stage"}
                          </span>
                        ) : (
                          <p className="text-[10px] text-neutralgray/80 line-clamp-1">
                            {lang === "ar" ? st.descAr : st.descEn}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile: Responsive Connected Cards */}
            <div className="sm:hidden space-y-2.5">
              {trackerSteps.map((st) => {
                const isDone = st.num < currentStep;
                const isCurrent = st.num === currentStep;
                const StepIcon = st.icon;

                return (
                  <div
                    key={st.num}
                    className={`p-3.5 rounded-xl border transition-all flex items-center gap-3.5 ${
                      isCurrent
                        ? "bg-[#111214] text-white border-jet shadow-md ring-2 ring-jet/20"
                        : isDone
                        ? "bg-neutral-50 text-jet border-silver/60"
                        : "bg-white text-neutralgray/60 border-silver/30 opacity-70"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? "bg-white text-jet ring-2 ring-white/50"
                          : isDone
                          ? "bg-jet text-white"
                          : "bg-silver/20 text-neutralgray/50"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-heading text-xs font-bold ${isCurrent ? "text-white" : "text-jet"}`}>
                          {lang === "ar" ? st.titleAr : st.titleEn}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {lang === "ar" ? "قيد التنفيذ" : "Active"}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 truncate ${isCurrent ? "text-neutral-300" : "text-neutralgray"}`}>
                        {lang === "ar" ? st.descAr : st.descEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  })()}

      {/* Exchange Breakdown Section: Replaced Items vs Current Replacement Items */}
      {(order.order_status === "EXCHANGED" || exchangeData) && (
        <div className="bg-white border border-silver/70 rounded-2xl p-5 sm:p-7 space-y-5 shadow-xs no-print">
          <div className="flex items-center justify-between gap-3 border-b border-silver/40 pb-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-jet">
                  {lang === "ar" ? "تفاصيل المنتجات المستبدلة والبديلة" : "Exchange Breakdown Details"}
                </h3>
                <p className="text-[11px] text-neutralgray">
                  {lang === "ar"
                    ? "بيان مقارن يوضح المنتج الذي تم استبداله والمنتج البديل المعتمد حالياً في طلبك"
                    : "Side-by-side view of the replaced item and active replacement"}
                </p>
              </div>
            </div>
            {exchangeData?.reason && (
              <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full border border-silver/60">
                {lang === "ar" ? `سبب الاستبدال: ${exchangeData.reason}` : `Reason: ${exchangeData.reason}`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Old Replaced Items */}
            <div className="bg-[#FAF9F6] border border-silver/70 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{lang === "ar" ? "المنتجات السابقة (المستبدلة)" : "Previous (Replaced) Items"}</span>
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                  {lang === "ar" ? "تم الاسترجاع للمخزون" : "Restocked in Warehouse"}
                </span>
              </div>

              <div className="space-y-2">
                {(exchangeData?.replacedItems && exchangeData.replacedItems.length > 0 ? exchangeData.replacedItems : []).map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-silver/50 opacity-80">
                    {it.image_url || it.product_image_snapshot ? (
                      <img
                        src={it.image_url || it.product_image_snapshot}
                        alt={it.product_name_en || it.product_name_en_snapshot}
                        className="w-12 h-12 object-cover rounded-md border border-silver/50 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-jet line-through truncate">
                        {lang === "ar" ? (it.product_name_ar || it.product_name_ar_snapshot || it.product_name_en || it.product_name_en_snapshot) : (it.product_name_en || it.product_name_en_snapshot)}
                      </p>
                      <p className="text-neutralgray text-[11px] mt-0.5">
                        {lang === "ar" ? "المقاس: " : "Size: "}
                        <strong className="font-mono">{it.size || it.size_snapshot}</strong>
                        <span className="mx-1.5">•</span>
                        {lang === "ar" ? "اللون: " : "Color: "}
                        <strong>{lang === "ar" ? (it.color_ar || it.color_ar_snapshot || it.color_en || it.color_en_snapshot) : (it.color_en || it.color_en_snapshot)}</strong>
                        <span className="mx-1.5">•</span>
                        {lang === "ar" ? "الكمية: " : "Qty: "}
                        <strong>{it.quantity}</strong>
                      </p>
                    </div>
                  </div>
                ))}
                {(!exchangeData?.replacedItems || exchangeData.replacedItems.length === 0) && (
                  <p className="text-xs text-neutralgray italic p-2">
                    {lang === "ar" ? "تم استرجاع المنتج السابق للمخزون واعتماد البديل." : "Previous item restocked in warehouse."}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Current Replacement Items */}
            <div className="bg-blue-50/50 border-2 border-blue-400/70 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === "ar" ? "المنتجات البديلة (الحالية)" : "Replacement (Active) Items"}</span>
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                  {lang === "ar" ? "المنتج البديل الحالي المعتمد" : "Active Replacement"}
                </span>
              </div>

              <div className="space-y-2">
                {(exchangeData?.replacementItems && exchangeData.replacementItems.length > 0 ? exchangeData.replacementItems : items).map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-blue-200 shadow-xs">
                    {it.image_url || it.product_image_snapshot ? (
                      <img
                        src={it.image_url || it.product_image_snapshot}
                        alt={it.product_name_en || it.product_name_en_snapshot}
                        className="w-12 h-12 object-cover rounded-md border border-blue-200 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-jet truncate">
                        {lang === "ar" ? (it.product_name_ar || it.product_name_ar_snapshot || it.product_name_en || it.product_name_en_snapshot) : (it.product_name_en || it.product_name_en_snapshot)}
                      </p>
                      <p className="text-blue-950 text-[11px] mt-0.5">
                        {lang === "ar" ? "المقاس: " : "Size: "}
                        <strong className="font-mono bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded">{it.size || it.size_snapshot}</strong>
                        <span className="mx-1.5">•</span>
                        {lang === "ar" ? "اللون: " : "Color: "}
                        <strong>{lang === "ar" ? (it.color_ar || it.color_ar_snapshot || it.color_en || it.color_en_snapshot) : (it.color_en || it.color_en_snapshot)}</strong>
                        <span className="mx-1.5">•</span>
                        {lang === "ar" ? "الكمية: " : "Qty: "}
                        <strong>{it.quantity}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Payment Instructions + I HAVE PAID + Printable Invoice Snapshot */}
        <div className="lg:col-span-2 space-y-8">
          {/* Manual Payment Instructions (InstaPay / Vodafone Cash) */}
          <div className="bg-white border border-silver/60 p-6 sm:p-8 space-y-5 no-print rounded-2xl shadow-xs">
            <div className="flex items-center justify-between border-b border-silver/50 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    order.payment_method_code === "VODAFONE_CASH"
                      ? "/vodafone-cash.jpg"
                      : "/instapay.jpg"
                  }
                  alt={order.payment_method_code}
                  className="w-12 h-12 rounded-2xl object-contain bg-white border border-silver/60 p-1 shadow-xs"
                />
                <div>
                  <p className="text-xs uppercase tracking-widest text-neutralgray font-bold">
                    {order.payment_method_code === "VODAFONE_CASH" ? "Vodafone Cash" : "InstaPay Egypt"}
                  </p>
                  <h2 className="font-heading text-xl font-bold text-jet">
                    {t(lang, "payment.instructions_title")}
                  </h2>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                  order.payment_status === "PAID"
                    ? "bg-emerald-900 text-white"
                    : order.payment_status === "REJECTED"
                    ? "bg-red-900 text-white"
                    : "bg-amber-800 text-white"
                }`}
              >
                {t(lang, `status.payment.${order.payment_status}`)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-offwhite p-4 border border-silver/50">
              <div>
                <p className="text-xs text-neutralgray">{t(lang, "payment.receiving_account")}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-base font-bold text-jet">
                    {paymentMethod?.receiving_account ||
                      (lang === "ar"
                        ? "لم يتم ضبط الرقم بعد (لوحة الإدارة ← المدفوعات)"
                        : "Not configured yet (Admin → Payments)")}
                  </span>
                  {paymentMethod?.receiving_account && (
                    <button
                      type="button"
                      onClick={() =>
                        copyText(paymentMethod.receiving_account, setCopiedAccount)
                      }
                      className="text-xs bg-jet text-offwhite px-2.5 py-1 inline-flex items-center gap-1"
                    >
                      {copiedAccount ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>
                        {copiedAccount ? t(lang, "payment.copied") : t(lang, "payment.copy")}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-neutralgray">{t(lang, "payment.recipient_name")}</p>
                <p className="font-bold text-sm text-jet mt-1">
                  {paymentMethod?.recipient_name || "U3 STORE"}
                </p>
              </div>
            </div>

            <p className="text-sm text-darkgray leading-relaxed">
              {lang === "ar"
                ? paymentMethod?.instructions_ar || paymentMethod?.instructions_en
                : paymentMethod?.instructions_en}
            </p>

            {/* I HAVE PAID Workflow */}
            {order.order_status === "CANCELLED" ? (
              <div className="pt-2">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-red-900">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>{lang === "ar" ? "الطلب ملغي" : "Order Cancelled"}</span>
                  </p>
                  <p>
                    {lang === "ar"
                      ? "تم إلغاء هذا الطلب ولا يتطلب أي عملية دفع إضافية."
                      : "This order has been cancelled and does not require payment."}
                  </p>
                </div>
              </div>
            ) : order.order_status === "RETURNED" ? (
              <div className="pt-2">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    <span>{lang === "ar" ? "طلب مرتجع" : "Returned Order"}</span>
                  </p>
                  <p>
                    {lang === "ar"
                      ? "تم استرجاع هذا الطلب بالفعل وإعادة منتجاته للمخزون."
                      : "This order has been returned and products restocked."}
                  </p>
                </div>
              </div>
            ) : (order.payment_status !== "PAID" && order.payment_status !== "UNDER_REVIEW" && submissions.length === 0 && !["CANCELLED", "RETURNED"].includes(order.order_status)) ? (
              <div className="pt-2">
                {!showReportForm ? (
                  <button
                    type="button"
                    onClick={() => setShowReportForm(true)}
                    className="w-full bg-[#111214] hover:bg-[#292B2E] text-offwhite font-heading text-xs font-bold uppercase tracking-widest py-4 px-6 transition-colors"
                  >
                    {t(lang, "payment.i_have_paid")}
                  </button>
                ) : (
                  <form
                    onSubmit={submitPaymentReport}
                    className="bg-offwhite border border-silver p-5 space-y-4"
                  >
                    <h3 className="font-heading text-sm font-bold uppercase text-jet">
                      {t(lang, "payment.i_have_paid")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-jet mb-1">
                          {t(lang, "payment.tx_ref")} *
                        </label>
                        <input
                          type="text"
                          required
                          value={transactionReference}
                          onChange={(e) => setTransactionReference(e.target.value)}
                          placeholder="e.g. 43129847129"
                          className="w-full border border-silver px-3 py-2 text-sm bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-jet mb-1">
                          {t(lang, "payment.sender_number")} *
                        </label>
                        <input
                          type="text"
                          required
                          value={senderIdentifier}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d+$/.test(val)) {
                              setSenderIdentifier(val.slice(0, 11));
                            } else {
                              setSenderIdentifier(val);
                            }
                          }}
                          placeholder={order.payment_method_code === "VODAFONE_CASH" ? "01xxxxxxxxx" : "01xxxxxxxxx / username@instapay"}
                          className="w-full border border-silver px-3 py-2 text-sm bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-jet mb-1">
                          {t(lang, "payment.transfer_date")} *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={transferDate}
                          onChange={(e) => setTransferDate(e.target.value)}
                          className="w-full border border-silver px-3 py-2 text-sm bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-jet mb-1">
                          {t(lang, "payment.transfer_amount")} *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          className="w-full border border-silver px-3 py-2 text-sm bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-jet mb-1">
                        {t(lang, "payment.receipt_upload")}
                      </label>
                      <label className="flex items-center gap-2 border border-dashed border-silver bg-white px-4 py-3 cursor-pointer text-xs text-neutralgray hover:border-jet">
                        <Upload className="w-4 h-4 text-neutralgray" />
                        <span>
                          {receiptFileName ||
                            (lang === "ar"
                              ? "اختر صورة إيصال التحويل..."
                              : "Choose screenshot/receipt image...")}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {reportError && (
                      <p className="text-xs text-red-700 font-bold">{reportError}</p>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-[#111214] hover:bg-[#292B2E] text-offwhite font-heading text-xs font-bold uppercase tracking-widest px-6 py-3 transition-colors"
                      >
                        {submitting
                          ? "..."
                          : t(lang, "payment.submit_report")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReportForm(false)}
                        className="border border-silver bg-white px-4 py-3 text-xs font-bold text-jet"
                      >
                        {lang === "ar" ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}

            {/* Payment & Order Status Feedback Banner */}
            {order.order_status === "CANCELLED" ? (
              <div className="space-y-3 border-t border-silver/50 pt-4">
                <div className="bg-red-50 border-2 border-red-500 p-5 rounded-2xl space-y-2 text-red-950 shadow-xs">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-8 h-8 text-red-600 shrink-0" />
                    <div>
                      <h4 className="font-heading font-black text-base text-red-950">
                        {lang === "ar" ? "تم إلغاء الطلب / Your order has been cancelled" : "Your order has been cancelled"}
                      </h4>
                      <p className="text-xs text-red-800 font-medium mt-0.5">
                        {order.cancellation_reason
                          ? (lang === "ar" ? `سبب الإلغاء: ${order.cancellation_reason}` : `Reason: ${order.cancellation_reason}`)
                          : (lang === "ar" ? "تم إلغاء هذا الطلب من قبل إدارة المتجر." : "This order has been cancelled.")}
                      </p>
                      {(order.cancelled_at || order.updated_at) && (
                        <p className="text-[11px] text-neutral-500 font-mono mt-1">
                          {lang === "ar" ? "تاريخ الإلغاء: " : "Cancellation Date: "}
                          {new Date(order.cancelled_at || order.updated_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : order.payment_status === "PAID" || ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.order_status) ? (
              <div className="space-y-3 border-t border-silver/50 pt-4">
                <div className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-2xl space-y-2 text-emerald-950 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-base text-emerald-950">
                        {lang === "ar" ? "تم استلام وتأكيد الطلب والدفع بنجاح!" : "Order Received & Payment Confirmed Successfully!"}
                      </h3>
                      <p className="text-xs text-emerald-800 font-medium mt-0.5">
                        {lang === "ar"
                          ? "تم مراجعة التحويل واعتماد الدفع من قبل إدارة U3 STORE. طلبك الآن مؤكد وجاري تجهيزه للشحن."
                          : "Your payment has been verified and approved by U3 STORE. Your order is confirmed and being prepared."}
                      </p>
                    </div>
                  </div>
                </div>

                {submissions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#73777D]">
                      {lang === "ar" ? "إيصال التحويل المعتمد:" : "Approved Payment Receipt:"}
                    </p>
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-offwhite border border-silver/60 p-3.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-jet">Ref: {sub.transaction_reference}</span>
                          <span className="text-neutralgray mx-2">|</span>
                          <span>{formatCurrency(sub.transfer_amount, lang)}</span>
                          <span className="text-neutralgray mx-2">|</span>
                          <span>From: {sub.sender_identifier}</span>
                        </div>
                        <span className="font-bold uppercase px-3 py-1 rounded-full text-[10px] bg-emerald-700 text-white flex items-center gap-1.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{lang === "ar" ? "تم تأكيد الدفع" : "PAID & VERIFIED"}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : order.payment_status === "REJECTED" ? (
              <div className="space-y-3 border-t border-silver/50 pt-4">
                <div className="bg-red-50 border-2 border-red-500 p-5 rounded-2xl space-y-2 text-red-950 shadow-xs">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-9 h-9 text-red-600 shrink-0" />
                    <div>
                      <h3 className="font-heading font-black text-base text-red-950">
                        {lang === "ar" ? "لم يتم قبول التحويل / إيصال غير مطابق" : "Payment Verification Rejected"}
                      </h3>
                      <p className="text-xs text-red-800 mt-0.5">
                        {lang === "ar"
                          ? "يرجى مراجعة إدارة المتجر عبر الواتساب أو إعادة رفع إيصال تحويل صحيح."
                          : "Please contact support via WhatsApp or re-upload a valid transfer receipt."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (reportSuccess || submissions.length > 0) ? (
              <div className="space-y-3 border-t border-silver/50 pt-4">
                <div className="bg-[#111214] text-white border border-[#292B2E] p-5 rounded-2xl space-y-2.5 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                        <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: "6s" }} />
                      </div>
                      <span className="text-xs font-heading font-bold uppercase tracking-wider text-amber-400">
                        {lang === "ar" ? "قيد التدقيق والمراجعة الفورية" : "Under Live Review"}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {lang === "ar" ? "مزامنة لحظية" : "Live Sync"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#F7F7F5] relative z-10">
                    {t(lang, "payment.under_review_notice")}
                  </p>
                  <p className="text-[11px] text-[#BFC2C6] leading-relaxed relative z-10">
                    {lang === "ar"
                      ? "جاري مراجعة الإيصال من قبل إدارة المتجر. فور قيام الإدارة باعتماد الدفع، ستتحول هذه الصفحة تلقائياً إلى (تم تأكيد الدفع واستلام الطلب)."
                      : "The admin is currently reviewing your transfer receipt. Once approved, this page will update live automatically to Payment Verified & Confirmed."}
                  </p>
                </div>
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-offwhite border border-silver/60 p-3.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-jet">Ref: {sub.transaction_reference}</span>
                      <span className="text-neutralgray mx-2">|</span>
                      <span>{formatCurrency(sub.transfer_amount, lang)}</span>
                      <span className="text-neutralgray mx-2">|</span>
                      <span>From: {sub.sender_identifier}</span>
                    </div>
                    <span className="font-bold uppercase px-2.5 py-0.5 rounded-full text-[10px] bg-amber-800 text-white">
                      {lang === "ar" ? "قيد المراجعة" : "UNDER REVIEW"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Printable Bilingual Commercial Invoice Card (Collapsible Accordion Dropdown) */}
          <div className="bg-white border border-silver/60 rounded-2xl overflow-hidden shadow-xs transition-all">
            {/* Clickable Accordion Header */}
            <button
              type="button"
              onClick={() => setIsInvoiceOpen(!isInvoiceOpen)}
              className="w-full p-4 sm:p-6 bg-white hover:bg-neutral-50 flex items-center justify-between gap-4 text-start transition-colors border-b border-silver/40"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-jet text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-sm sm:text-base font-bold text-jet truncate">
                      {lang === "ar" ? "الفاتورة الرسمية وتفاصيل المنتجات" : "Official Invoice & Order Items"}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-jet border border-silver/60 font-mono">
                      {invoice?.invoice_number || order.order_number}
                    </span>
                  </div>
                  <p className="text-xs text-neutralgray mt-0.5 truncate">
                    {items.length} {lang === "ar" ? "منتجات" : "items"} • {formatCurrency(order.total_amount, lang)} • {new Date(order.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-jet hidden sm:inline">
                  {isInvoiceOpen
                    ? lang === "ar"
                      ? "طي الفاتورة"
                      : "Collapse"
                    : lang === "ar"
                    ? "عرض الفاتورة"
                    : "Expand"}
                </span>
                <div className="w-8 h-8 rounded-full border border-silver flex items-center justify-center bg-offwhite text-jet">
                  {isInvoiceOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </button>

            {/* Collapsible Content */}
            {isInvoiceOpen && (
              <div className="p-6 sm:p-10 space-y-6 bg-white">
                <div className="flex items-center justify-between border-b-2 border-jet pb-6">
                  <div className="flex items-center gap-3.5">
                    <img
                      src="/logo.jpg"
                      alt="U3 STORE Logo"
                      className="w-16 h-16 rounded-full object-contain border border-silver"
                    />
                    <div>
                      <h2 className="font-heading text-2xl font-bold text-jet">U3 STORE</h2>
                      <p className="text-xs tracking-[0.25em] text-neutralgray uppercase">
                        LIVE YOURS.
                      </p>
                    </div>
                  </div>
                  <div className={lang === "ar" ? "text-left" : "text-right"}>
                    <p className="font-heading text-lg font-bold text-jet">
                      {invoice?.invoice_number || order.order_number}
                    </p>
                    <p className="text-xs text-neutralgray">
                      {new Date(order.created_at).toLocaleString(
                        lang === "ar" ? "ar-EG" : "en-GB"
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-silver/50 pb-6">
                  <div className="space-y-1">
                    <p className="font-bold uppercase text-neutralgray">
                      {lang === "ar" ? "بيانات العميل والتوصيل" : "CUSTOMER & DELIVERY ADDRESS"}
                    </p>
                    <p className="font-bold text-sm text-jet">{order.customer_name}</p>
                    <p className="text-jet">{order.customer_phone}</p>
                    {order.customer_email && <p className="text-neutralgray">{order.customer_email}</p>}
                    <p className="text-darkgray pt-1">
                      {lang === "ar"
                        ? invoice?.delivery_address_ar || order.street_address
                        : invoice?.delivery_address_en || order.street_address}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold uppercase text-neutralgray">
                      {lang === "ar" ? "تفاصيل الطلب والدفع" : "ORDER & PAYMENT SNAPSHOT"}
                    </p>
                    <p>
                      <span className="text-neutralgray">{t(lang, "order.number")}: </span>
                      <strong className="font-mono">{order.order_number}</strong>
                    </p>
                    <p>
                      <span className="text-neutralgray">
                        {lang === "ar" ? "وسيلة الدفع: " : "Payment Method: "}
                      </span>
                      <strong>{order.payment_method_code}</strong>
                    </p>
                    <p>
                      <span className="text-neutralgray">
                        {lang === "ar" ? "حالة الدفع: " : "Payment Status: "}
                      </span>
                      <strong>{t(lang, `status.payment.${order.payment_status}`)}</strong>
                    </p>
                    <p>
                      <span className="text-neutralgray">
                        {lang === "ar" ? "مدة التوصيل المتوقعة: " : "Delivery Estimate: "}
                      </span>
                      <strong>
                        {lang === "ar" ? order.delivery_estimate_ar : order.delivery_estimate_en}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Invoice Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-jet text-offwhite">
                        <th className="p-3 text-start">SKU</th>
                        <th className="p-3 text-start">
                          {lang === "ar" ? "المنتج / المقاس / اللون" : "Product / Size / Color"}
                        </th>
                        <th className="p-3 text-center">{lang === "ar" ? "الكمية" : "Qty"}</th>
                        <th className="p-3 text-end">{lang === "ar" ? "سعر الوحدة" : "Unit Price"}</th>
                        <th className="p-3 text-end">{lang === "ar" ? "الإجمالي" : "Total"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-silver/40">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 font-mono">{item.sku_snapshot}</td>
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>
                                {lang === "ar"
                                  ? item.product_name_ar_snapshot || item.product_name_en_snapshot
                                  : item.product_name_en_snapshot}{" "}
                                — {item.product_type_snapshot === "CLOTHING" ? item.size_snapshot : `EU ${item.size_snapshot}`} (
                                {lang === "ar"
                                  ? item.color_ar_snapshot || item.color_en_snapshot
                                  : item.color_en_snapshot}
                                )
                              </span>
                              {order.order_status === "EXCHANGED" && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                  {lang === "ar" ? "منتج بديل حالي" : "Active Replacement"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold">{item.quantity}</td>
                          <td className="p-3 text-end">
                            {formatCurrency(item.unit_final_price_snapshot, lang)}
                          </td>
                          <td className="p-3 text-end font-bold">
                            {formatCurrency(item.line_total, lang)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-silver/60 pt-4 space-y-2 text-sm max-w-xs ms-auto">
                  <div className="flex justify-between">
                    <span className="text-neutralgray">{t(lang, "cart.subtotal")}</span>
                    <span className="font-bold">{formatCurrency(order.subtotal, lang)}</span>
                  </div>
                  {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between text-neutralgray">
                      <span>{t(lang, "cart.discount")}</span>
                      <span className="font-bold">- {formatCurrency(order.discount_amount, lang)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutralgray">{t(lang, "checkout.shipping_fee")}</span>
                    <span className="font-bold">
                      {formatCurrency(Number(order.shipping_fee) + Number(order.additional_fees), lang)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-jet pt-2 font-heading text-base font-bold text-jet">
                    <span>{t(lang, "checkout.total")}</span>
                    <span>{formatCurrency(order.total_amount, lang)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Shipment Tracking & Status Timeline */}
        <div className="space-y-6 no-print">
          {order.tracking_number && (
            <div className="bg-white border border-silver/60 p-6 space-y-3">
              <div className="flex items-center gap-2 text-jet font-heading font-bold text-sm uppercase">
                <Truck className="w-4 h-4" />
                <span>{lang === "ar" ? "بيانات الشحنة والتتبع" : "SHIPMENT TRACKING"}</span>
              </div>
              {order.shipping_company_name && (
                <p className="text-xs text-jet">
                  {lang === "ar" ? "شركة الشحن: " : "Carrier: "}
                  <strong>{order.shipping_company_name}</strong>
                </p>
              )}
              <p className="text-xs text-jet">
                {lang === "ar" ? "رقم البوليصة / التتبع: " : "Tracking Number: "}
                <strong className="font-mono">{order.tracking_number}</strong>
              </p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block bg-jet text-offwhite text-xs font-bold uppercase tracking-wider px-4 py-2"
                >
                  {lang === "ar" ? "تتبع الشحنة لدى الشركة ←" : "External Carrier Tracking →"}
                </a>
              )}
            </div>
          )}

          {/* Clean Modern Status History Timeline */}
          <div className="bg-white border border-silver/60 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-silver/50 pb-3">
              <h3 className="font-heading text-xs sm:text-sm font-bold uppercase tracking-wider text-jet flex items-center gap-2">
                <Clock className="w-4 h-4 text-jet" />
                <span>{lang === "ar" ? "سجل تحديثات الطلب" : "ORDER TIMELINE"}</span>
              </h3>
              <span className="text-[10px] font-bold text-neutralgray uppercase px-2 py-0.5 rounded-full bg-neutral-100 border border-silver/50">
                {history.length} {lang === "ar" ? "تحديث" : "events"}
              </span>
            </div>

            <div className="relative ps-6 space-y-4 before:absolute before:top-2 before:bottom-2 before:start-2.5 before:w-0.5 before:bg-silver/60">
              {history.map((h, idx) => {
                const isLatest = idx === 0;
                return (
                  <div key={h.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -start-6 top-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isLatest
                          ? "bg-jet text-white ring-4 ring-neutral-200"
                          : "bg-white border-2 border-silver text-neutralgray"
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isLatest ? "bg-emerald-400" : "bg-neutralgray"
                        }`}
                      />
                    </div>

                    {/* Content Box */}
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        isLatest
                          ? "bg-neutral-50/80 border-silver/80 shadow-2xs"
                          : "bg-white border-silver/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`font-heading text-xs font-bold ${
                            isLatest ? "text-jet" : "text-neutral-700"
                          }`}
                        >
                          {h.new_status}
                        </span>
                        <span className="text-[10px] text-neutralgray font-mono">
                          {new Date(h.created_at).toLocaleString(
                            lang === "ar" ? "ar-EG" : "en-GB"
                          )}
                        </span>
                      </div>
                      {h.note && (
                        <p className="text-[11px] text-neutralgray mt-1 leading-relaxed">
                          {h.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

