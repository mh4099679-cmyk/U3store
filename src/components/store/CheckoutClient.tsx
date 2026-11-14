"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Upload,
  X,
  ShoppingBag,
  ChevronDown,
  Eye,
  EyeOff,
  Tag,
} from "lucide-react";
import { Language, t, formatCurrency } from "@/lib/i18n/dictionaries";
import { HydratedCart } from "@/lib/services/cart";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

function formatEgyptianPhoneInput(val: string): string {
  let digits = val.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length >= 12 && /^(2010|2011|2012|2015)/.test(digits)) {
    digits = "0" + digits.slice(2);
  }
  return digits.slice(0, 11);
}

function isValidEgyptianPhone(val: string): boolean {
  return /^(010|011|012|015)\d{8}$/.test(val);
}

interface CheckoutClientProps {
  lang: Language;
  cart: HydratedCart;
  customer: any;
  savedAddresses: any[];
  governorates: any[];
  cities: any[];
  areas: any[];
  paymentMethods: any[];
}

export function CheckoutClient({
  lang,
  cart: initialCart,
  customer,
  savedAddresses,
  governorates,
  cities,
  areas,
  paymentMethods,
}: CheckoutClientProps) {
  const router = useRouter();
  const [activeCart, setActiveCart] = useState<HydratedCart>(initialCart);
  const cart = activeCart;

  useEffect(() => {
    setActiveCart(initialCart);
  }, [initialCart]);

  // Coupon handling state
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponMessage(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_coupon", code }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveCart(data.cart);
        setCouponMessage({
          type: "ok",
          text: lang === "ar" ? "تم تطبيق كود الخصم بنجاح!" : "Coupon applied successfully!",
        });
        setCouponInput("");
        router.refresh();
      } else {
        setCouponMessage({
          type: "err",
          text: data.error || (lang === "ar" ? "كود الخصم غير صحيح أو غير مفعل." : "Invalid or inactive coupon code."),
        });
      }
    } catch {
      setCouponMessage({
        type: "err",
        text: lang === "ar" ? "حدث خطأ أثناء تطبيق الكود." : "Failed to apply coupon.",
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponLoading(true);
    setCouponMessage(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_coupon", code: "" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveCart(data.cart);
        setCouponMessage({
          type: "ok",
          text: lang === "ar" ? "تمت إزالة كود الخصم." : "Coupon removed.",
        });
        setCouponInput("");
        router.refresh();
      }
    } catch {
    } finally {
      setCouponLoading(false);
    }
  };
  const [checkoutMode, setCheckoutMode] = useState<"GUEST" | "SIGNIN" | "REGISTER">("GUEST");

  // Mobile Top Order Summary Bar
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // The Only Two Sections with Arrows: Step 1 (Customer & Delivery) & Step 2 (Payment)
  const [addressOpen, setAddressOpen] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(true);

  // Eye Icon Password Visibility Toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showOptionalPassword, setShowOptionalPassword] = useState(false);

  const defaultAddr = savedAddresses.find((a) => Boolean(a.is_default)) || savedAddresses[0] || null;

  const [fullName, setFullName] = useState(
    defaultAddr?.full_name || customer?.fullName || ""
  );
  const [phone, setPhone] = useState(
    formatEgyptianPhoneInput(defaultAddr?.phone || customer?.phone || "")
  );
  const [email, setEmail] = useState(customer?.email || "");
  const [governorateId, setGovernorateId] = useState(defaultAddr?.governorate_id || "");
  const [cityName, setCityName] = useState(
    defaultAddr?.city_name || defaultAddr?.city_name_ar || defaultAddr?.city_name_en || defaultAddr?.city_id || ""
  );
  const [areaName, setAreaName] = useState(
    defaultAddr?.area_name || defaultAddr?.area_name_ar || defaultAddr?.area_name_en || defaultAddr?.area_id || ""
  );
  const [streetAddress, setStreetAddress] = useState(defaultAddr?.street_address || "");
  const [buildingNumber, setBuildingNumber] = useState(defaultAddr?.building_number || "");
  const [floorNumber, setFloorNumber] = useState(defaultAddr?.floor_number || "");
  const [apartmentNumber, setApartmentNumber] = useState(defaultAddr?.apartment_number || "");
  const [landmark, setLandmark] = useState(defaultAddr?.landmark || "");
  const [deliveryNotes, setDeliveryNotes] = useState(defaultAddr?.notes || "");
  const [paymentMethodCode, setPaymentMethodCode] = useState(
    paymentMethods[0]?.code || "INSTAPAY"
  );

  // Manual payment transfer details & receipt proof upload
  const [receiptBase64, setReceiptBase64] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [senderIdentifier, setSenderIdentifier] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [copiedAccount, setCopiedAccount] = useState(false);

  function copyText(val: string) {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptBase64(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveReceipt() {
    setReceiptBase64("");
    setReceiptFileName("");
  }

  // Optional voluntary account registration at guest checkout
  const [createOptionalAccount, setCreateOptionalAccount] = useState(false);
  const [optionalPassword, setOptionalPassword] = useState("");
  const [whatsappTransactionalConsent, setWhatsappTransactionalConsent] = useState(true);
  const [whatsappMarketingConsent, setWhatsappMarketingConsent] = useState(false);

  // Quick Sign In state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Live server-verified shipping state
  const [shippingCalc, setShippingCalc] = useState<any>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (!governorateId) {
      setShippingCalc(null);
      return;
    }
    let active = true;
    setCalculatingShipping(true);
    fetch("/api/shipping/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        governorateId,
        shippingMethod: "STANDARD",
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (active && data.ok) {
          setShippingCalc(data.calculation);
        }
      })
      .finally(() => {
        if (active) setCalculatingShipping(false);
      });
    return () => {
      active = false;
    };
  }, [governorateId]);

  function applySavedAddress(addr: any) {
    setFullName(addr.full_name || customer?.fullName || "");
    setPhone(formatEgyptianPhoneInput(addr.phone || customer?.phone || ""));
    setGovernorateId(addr.governorate_id || "");
    setCityName(addr.city_name || addr.city_name_ar || addr.city_name_en || addr.city_id || "");
    setAreaName(addr.area_name || addr.area_name_ar || addr.area_name_en || addr.area_id || "");
    setStreetAddress(addr.street_address || "");
    setBuildingNumber(addr.building_number || "");
    setFloorNumber(addr.floor_number || "");
    setApartmentNumber(addr.apartment_number || "");
    setLandmark(addr.landmark || "");
    setDeliveryNotes(addr.notes || "");
  }

  async function handleQuickSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email: loginEmail, password: loginPassword }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoginError(data.error || "Sign in failed");
    } else {
      if (data.canOfferCartMerge) {
        const shouldMerge = window.confirm(
          lang === "ar"
            ? "هل ترغب في دمج منتجات جلسة الزائر الحالية مع حقيبة حسابك؟"
            : "Would you like to merge your current guest bag items into your account bag?"
        );
        if (shouldMerge) {
          await fetch("/api/auth/customer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "merge_guest_cart" }),
          });
        }
      }
      router.refresh();
    }
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    const cleanPhone = formatEgyptianPhoneInput(phone);
    if (!isValidEgyptianPhone(cleanPhone)) {
      setErrorMsg(
        lang === "ar"
          ? "يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015."
          : "Please enter a valid 11-digit Egyptian phone number."
      );
      return;
    }

    if (!governorateId) {
      setErrorMsg(
        lang === "ar"
          ? "يرجى اختيار المحافظة أولاً للمتابعة."
          : "Please select an Egyptian governorate to proceed."
      );
      return;
    }

    if (!cityName.trim()) {
      setErrorMsg(
        lang === "ar"
          ? "يرجى كتابة اسم المدينة للمتابعة."
          : "Please enter your city to proceed."
      );
      return;
    }

    if (!areaName.trim()) {
      setErrorMsg(
        lang === "ar"
          ? "يرجى كتابة اسم المنطقة أو الحي للمتابعة."
          : "Please enter your area / district to proceed."
      );
      return;
    }

    if (!streetAddress.trim()) {
      setErrorMsg(
        lang === "ar"
          ? "يرجى كتابة العنوان بالتفصيل للمتابعة."
          : "Please enter your detailed street address to proceed."
      );
      return;
    }

    if (!buildingNumber.trim()) {
      setErrorMsg(
        lang === "ar"
          ? "يرجى إدخال رقم المبنى للمتابعة."
          : "Please enter the building number to proceed."
      );
      return;
    }

    // Strict validation for electronic payments (InstaPay & Vodafone Cash)
    if (paymentMethodCode === "INSTAPAY" || paymentMethodCode === "VODAFONE_CASH") {
      if (!senderIdentifier.trim()) {
        setErrorMsg(
          lang === "ar"
            ? "يرجى إدخال رقم المحفظة أو الحساب المحوّل منه (إجباري لتأكيد عملية الدفع)."
            : "Please enter the sender wallet / phone number (required to confirm payment)."
        );
        return;
      }

      const cleanSender = formatEgyptianPhoneInput(senderIdentifier);
      if (!isValidEgyptianPhone(cleanSender)) {
        setErrorMsg(
          lang === "ar"
            ? "يرجى إدخال رقم محفظة مصري صحيح مكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015."
            : "Please enter a valid 11-digit Egyptian phone number for the sender wallet."
        );
        return;
      }

      if (!receiptBase64) {
        setErrorMsg(
          lang === "ar"
            ? "يرجى إرفاق صورة إيصال التحويل (سكرين شوت) لتأكيد طلبك وإتمام الدفع."
            : "Please upload your payment transfer receipt screenshot to confirm your order."
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: cleanPhone,
          email,
          governorateId,
          cityId: cityName.trim(),
          cityName: cityName.trim(),
          areaId: areaName.trim(),
          areaName: areaName.trim(),
          streetAddress: streetAddress.trim(),
          buildingNumber: buildingNumber.trim(),
          floorNumber: floorNumber.trim(),
          apartmentNumber: apartmentNumber.trim(),
          landmark: landmark.trim(),
          deliveryNotes: deliveryNotes.trim(),
          paymentMethodCode,
          idempotencyKey,
          createOptionalAccount: checkoutMode === "REGISTER" || createOptionalAccount,
          optionalPassword,
          whatsappTransactionalConsent,
          whatsappMarketingConsent,
          receiptBase64,
          receiptFileName,
          transactionReference,
          senderIdentifier: senderIdentifier ? formatEgyptianPhoneInput(senderIdentifier) : cleanPhone,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || "Could not complete order.");
      } else {
        // Instant real-time sync with Admin Portal across all browser tabs
        try {
          if (typeof window !== "undefined") {
            const syncChannel = new BroadcastChannel("u3_admin_sync");
            syncChannel.postMessage({
              type: "order_created",
              orderNumber: data.orderNumber,
              orderId: data.orderId,
              timestamp: Date.now(),
            });
            syncChannel.close();
            localStorage.setItem("u3_last_order_sync", String(Date.now()));
          }
        } catch {
          // BroadcastChannel fallback
        }

        router.push(
          `/order-confirmation/${data.orderNumber}?token=${encodeURIComponent(data.accessToken)}`
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-white border border-[#E1E3E5] p-8 sm:p-12 text-center rounded-2xl space-y-4 max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 bg-[#111214] text-white mx-auto flex items-center justify-center rounded-full">
          <ShoppingBag className="w-5 h-5 text-[#BFC2C6]" />
        </div>
        <p className="font-heading text-lg sm:text-xl font-bold text-jet">{t(lang, "cart.empty")}</p>
        <Link
          href="/shop"
          className="inline-block bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase tracking-widest px-8 py-3.5 rounded-xl transition-colors"
        >
          {t(lang, "cart.continue_shopping")}
        </Link>
      </div>
    );
  }

  const shippingAllowed = Boolean(shippingCalc && shippingCalc.allowed);
  const shippingFee = shippingAllowed ? Number(shippingCalc.shippingFee) : 0;
  const additionalFees = shippingAllowed ? Number(shippingCalc.additionalFees) : 0;
  const finalTotal = cart.finalSubtotalAfterDiscount + shippingFee + additionalFees;
  const totalItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const selectedGov = governorates.find((g) => g.id === governorateId);
  const govName = selectedGov ? (lang === "ar" ? selectedGov.name_ar : selectedGov.name_en) : "";

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {/* ======================================================== */}
      {/* MOBILE COMPACT ORDER SUMMARY BAR (lg:hidden)             */}
      {/* ======================================================== */}
      <div className="lg:hidden col-span-1 bg-white border border-[#30343A]/20 shadow-xs rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
          className="w-full px-4 py-3 bg-[#111214] text-white flex items-center justify-between text-xs font-bold transition-colors active:bg-[#1A1C1F]"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="tracking-wide">
              {mobileSummaryOpen
                ? lang === "ar"
                  ? "إخفاء ملخص ومحتويات الطلب"
                  : "Hide Order Summary"
                : lang === "ar"
                ? `عرض ملخص الطلب (${totalItemCount} ${totalItemCount === 1 ? "قطعة" : "قطع"})`
                : `Show Order Summary (${totalItemCount} items)`}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#BFC2C6] transition-transform duration-200 ${
                mobileSummaryOpen ? "rotate-180" : ""
              }`}
            />
          </div>
          <span className="font-heading text-sm text-emerald-400 font-black tabular-nums">
            {formatCurrency(finalTotal, lang)}
          </span>
        </button>

        {mobileSummaryOpen && (
          <div className="p-4 space-y-3.5 bg-[#FAFBFB] border-t border-[#30343A]/10 text-xs animate-in slide-in-from-top-1 duration-200">
            {/* Products List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-[#E1E3E5]/60 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.imageUrl || "/logo.jpg"}
                      alt=""
                      className="w-11 h-11 object-cover rounded-lg border border-[#E1E3E5] shrink-0 bg-white"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-jet text-xs truncate">
                        {lang === "ar" ? item.nameAr || item.nameEn : item.nameEn}
                      </p>
                      <p className="text-[11px] text-neutralgray">
                        {item.productType === "CLOTHING" ? item.size : `EU ${item.size}`} • {lang === "ar" ? item.colorAr : item.colorEn} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-jet shrink-0 tabular-nums">
                    {formatCurrency(item.lineSubtotal, lang)}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile Coupon Code Box */}
            <div className="border border-[#E1E3E5] bg-[#F7F7F5] rounded-xl p-2.5 my-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-jet flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-neutralgray" />
                  <span>{lang === "ar" ? "كوبون الخصم" : "Coupon / Promo Code"}</span>
                </span>
                {cart.couponCode && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {cart.couponCode}
                  </span>
                )}
              </div>

              {cart.couponCode && cart.couponDiscount > 0 ? (
                <div className="flex items-center justify-between bg-white border border-emerald-300 rounded-lg p-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-800 font-medium">
                      {lang === "ar" ? "الخصم:" : "Discount:"}{" "}
                      <strong className="font-bold">{formatCurrency(cart.couponDiscount, lang)}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    disabled={couponLoading}
                    className="text-[11px] text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer"
                  >
                    {lang === "ar" ? "إزالة" : "Remove"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={lang === "ar" ? "اكتب كود الخصم..." : "Enter code..."}
                    className="flex-1 bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-jet"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponInput.trim()}
                    className="bg-jet hover:bg-black disabled:bg-[#BFC2C6] text-white px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    {couponLoading
                      ? (lang === "ar" ? "فحص..." : "...")
                      : (lang === "ar" ? "تطبيق" : "Apply")}
                  </button>
                </form>
              )}

              {couponMessage && (
                <p
                  className={`text-[10px] font-medium ${
                    couponMessage.type === "ok" ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {couponMessage.text}
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div className="flex justify-between text-neutralgray">
                <span>{t(lang, "cart.subtotal")}</span>
                <span className="font-semibold text-jet">{formatCurrency(cart.subtotal, lang)}</span>
              </div>
              {cart.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>{t(lang, "cart.discount")} ({cart.couponCode})</span>
                  <span>- {formatCurrency(cart.couponDiscount, lang)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutralgray">
                <span>{t(lang, "checkout.shipping_fee")}</span>
                <span className="font-semibold text-jet">
                  {shippingAllowed ? formatCurrency(shippingFee, lang) : (lang === "ar" ? "اختر المحافظة" : "Select Governorate")}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E1E3E5] pt-2 text-xs font-bold text-jet font-heading">
                <span>{t(lang, "checkout.total")}</span>
                <span className="text-emerald-700">{formatCurrency(finalTotal, lang)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* LEFT COLUMN: THE CHECKOUT FORM (lg:col-span-7)           */}
      {/* ======================================================== */}
      <div className="col-span-1 lg:col-span-7 space-y-5">
        {/* Guest vs Sign In vs Register Selector (Sleek Pills) */}
        {!customer && (
          <div className="bg-white border border-[#E1E3E5] p-3 sm:p-4 rounded-2xl shadow-xs">
            <div className="grid grid-cols-2 gap-2 bg-[#F7F7F5] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCheckoutMode("GUEST")}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  checkoutMode === "GUEST"
                    ? "bg-[#111214] text-white shadow-xs"
                    : "text-neutralgray hover:text-jet"
                }`}
              >
                {t(lang, "checkout.mode.guest")}
              </button>
              <button
                type="button"
                onClick={() => setCheckoutMode("SIGNIN")}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  checkoutMode === "SIGNIN"
                    ? "bg-[#111214] text-white shadow-xs"
                    : "text-neutralgray hover:text-jet"
                }`}
              >
                {t(lang, "checkout.mode.signin")}
              </button>
            </div>

            {checkoutMode === "SIGNIN" && (
              <form onSubmit={handleQuickSignIn} className="mt-3 p-3.5 bg-[#FAFBFB] rounded-xl border border-[#E1E3E5] space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={lang === "ar" ? "البريد الإلكتروني" : "Email"}
                    className="border border-[#D5D7DA] px-3 py-2 text-xs bg-white rounded-lg outline-none focus:border-black"
                  />
                  {/* Password with Eye Visibility Toggle */}
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={lang === "ar" ? "كلمة المرور" : "Password"}
                      className="w-full border border-[#D5D7DA] px-3 py-2 pe-10 text-xs bg-white rounded-lg outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 end-0 px-3 flex items-center text-neutralgray hover:text-jet"
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {loginError && <p className="text-[11px] text-red-600 font-bold">{loginError}</p>}
                <button
                  type="submit"
                  className="w-full bg-[#111214] hover:bg-[#292B2E] text-white py-2 text-xs font-bold uppercase tracking-wider rounded-lg"
                >
                  {t(lang, "checkout.mode.signin")}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Saved Addresses for Logged-In Customer */}
        {customer && savedAddresses.length > 0 && (
          <div className="bg-white border border-[#E1E3E5] p-4 sm:p-5 rounded-2xl shadow-xs space-y-2.5">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-jet flex items-center gap-1.5">
              <span>{lang === "ar" ? "العناوين المحفوظة" : "Saved Addresses"}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => applySavedAddress(addr)}
                  className="text-start border border-[#E1E3E5] hover:border-[#111214] p-3 rounded-xl bg-[#FAFBFB] transition-colors"
                >
                  <p className="font-bold text-xs text-jet">
                    {addr.label} — {addr.full_name}
                  </p>
                  <p className="text-[11px] text-neutralgray truncate">
                    {addr.street_address}, Bldg {addr.building_number} ({addr.gov_name_en})
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Delivery & Payment Form */}
        <form onSubmit={handlePlaceOrder} className="space-y-5">
          {/* ======================================================== */}
          {/* STEP 1: بيانات العميل وعنوان التوصيل (مع سهم دروب داون)   */}
          {/* ======================================================== */}
          <div className="bg-white border border-[#E1E3E5] rounded-2xl shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setAddressOpen(!addressOpen)}
              className="w-full p-4 sm:p-6 bg-white hover:bg-[#FAFBFB] text-start flex items-center justify-between border-b border-[#E1E3E5] transition-colors"
              aria-expanded={addressOpen}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#111214] text-white text-xs font-bold flex items-center justify-center font-mono shrink-0">
                  1
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-sm sm:text-base font-bold text-jet uppercase tracking-wider">
                      {lang === "ar" ? "بيانات العميل وعنوان التوصيل" : t(lang, "checkout.customer_info")}
                    </h2>
                    {fullName && govName && (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline">
                        {fullName} • {govName}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutralgray font-medium">
                    {lang === "ar" ? "الاسم ورقم الهاتف والمحافظة والعنوان بالتفصيل" : "Full name, phone and address details"}
                  </span>
                </div>
              </div>

              {/* The Collapsible Arrow for Step 1 */}
              <div
                className={`w-7 h-7 rounded-full bg-[#FAFBFB] border border-[#E1E3E5] flex items-center justify-center text-jet transition-transform duration-200 shrink-0 ${
                  addressOpen ? "rotate-180" : ""
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            {addressOpen && (
              <div className="p-4 sm:p-6 space-y-4 animate-in slide-in-from-top-1 duration-200">
                {/* Name & Phone in 2 clean columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                      {t(lang, "checkout.full_name")} *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={lang === "ar" ? "الاسم ثلاثي" : "Full Name"}
                      className="w-full border border-[#D5D7DA] px-3.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                      {lang === "ar" ? "رقم الهاتف المصري *" : "PHONE NUMBER (EGYPT) *"}
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={11}
                      value={phone}
                      onChange={(e) => setPhone(formatEgyptianPhoneInput(e.target.value))}
                      placeholder="010xxxxxxxx / 011 / 012 / 015"
                      className="w-full border border-[#D5D7DA] px-3.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black focus:bg-white transition-colors font-mono tracking-wider"
                    />
                  </div>
                </div>

                {/* Email (Compact with helper) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-jet">
                      {t(lang, "checkout.email")} {checkoutMode === "REGISTER" ? "*" : ""}
                    </label>
                    <span className="text-[10px] text-neutralgray">
                      {lang === "ar" ? "(اختياري لإرسال الفاتورة الرسمية)" : "(Optional for PDF invoice)"}
                    </span>
                  </div>
                  <input
                    type="email"
                    required={checkoutMode === "REGISTER"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full border border-[#D5D7DA] px-3.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"
                  />
                </div>

                {/* Optional Registration Password with Eye Visibility Toggle */}
                {!customer && checkoutMode === "REGISTER" && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                      {lang === "ar" ? "كلمة المرور للحساب الجديد *" : "Password (min 6 chars) *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showOptionalPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={optionalPassword}
                        onChange={(e) => setOptionalPassword(e.target.value)}
                        className="w-full border border-[#D5D7DA] px-3.5 py-2.5 pe-10 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOptionalPassword(!showOptionalPassword)}
                        className="absolute inset-y-0 end-0 px-3 flex items-center text-neutralgray hover:text-jet"
                        aria-label="Toggle password visibility"
                      >
                        {showOptionalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Compact WhatsApp Update Toggle */}
                <div className="bg-[#FAFBFB] border border-[#E1E3E5] p-3 rounded-xl flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={whatsappTransactionalConsent}
                      onChange={(e) => setWhatsappTransactionalConsent(e.target.checked)}
                      className="w-4 h-4 rounded text-black focus:ring-0 accent-black"
                    />
                    <span className="text-xs text-jet font-medium leading-snug">
                      {lang === "ar"
                        ? "إرسال إشعار تأكيد الطلب وتتبع الشحنة عبر واتساب (موصى به)"
                        : "Send order updates, tracking & payment links via WhatsApp"}
                    </span>
                  </label>
                </div>

                {/* Location: Governorate (Dropdown) -> City (Text) -> Area/District (Text) */}
                <div className="pt-1 space-y-2.5 w-full max-w-full min-w-0 box-border">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-full min-w-0 box-border">
                    {/* 1. Egyptian Governorate Dropdown */}
                    <div className="w-full max-w-full min-w-0">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                        {lang === "ar" ? "المحافظة *" : "EGYPTIAN GOVERNORATE *"}
                      </label>
                      <select
                        required
                        value={governorateId}
                        onChange={(e) => setGovernorateId(e.target.value)}
                        className="w-full max-w-full min-w-0 box-border truncate overflow-hidden border border-[#D5D7DA] px-3 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"
                      >
                        <option value="">
                          {lang === "ar" ? "اختر المحافظة (٢٧ محافظة)..." : "Select Governorate (27)..."}
                        </option>
                        {governorates.map((g) => (
                          <option key={g.id} value={g.id} disabled={!g.is_enabled}>
                            {lang === "ar" ? g.name_ar : g.name_en}
                            {!g.is_enabled ? (lang === "ar" ? " (متوقف مؤقتاً)" : " (Disabled)") : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. City Text Input */}
                    <div className="w-full max-w-full min-w-0">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                        {lang === "ar" ? "المدينة *" : "CITY *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        placeholder={lang === "ar" ? "اكتب اسم مدينتك" : "Enter your city"}
                        className="w-full max-w-full min-w-0 box-border border border-[#D5D7DA] px-3.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"
                      />
                    </div>

                    {/* 3. Area / District Text Input */}
                    <div className="w-full max-w-full min-w-0">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                        {lang === "ar" ? "المنطقة / الحي *" : "AREA / DISTRICT *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={areaName}
                        onChange={(e) => setAreaName(e.target.value)}
                        placeholder={lang === "ar" ? "اكتب اسم المنطقة أو الحي" : "Enter your area / district"}
                        className="w-full max-w-full min-w-0 box-border border border-[#D5D7DA] px-3.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Instant Shipping Fee Feedback Pill */}
                  {governorateId && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        shippingAllowed
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : "bg-amber-50 border-amber-200 text-amber-950"
                      }`}
                    >
                      {calculatingShipping ? (
                        <span className="text-[11px] text-neutralgray animate-pulse">
                          {lang === "ar" ? "جاري حساب سعر الشحن المعتمد..." : "Calculating shipping fee..."}
                        </span>
                      ) : shippingAllowed ? (
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="text-xs font-semibold">
                            {lang === "ar"
                              ? `رسوم الشحن: ${formatCurrency(shippingFee, lang)} • التوصيل: ${shippingCalc.estimatedDaysAr}`
                              : `Shipping: ${formatCurrency(shippingFee, lang)} • Delivery: ${shippingCalc.estimatedDaysEn}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-800 font-medium">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span className="text-xs">
                            {lang === "ar"
                              ? shippingCalc?.errorAr || t(lang, "checkout.shipping_unconfigured")
                              : shippingCalc?.errorEn || t(lang, "checkout.shipping_unconfigured")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Detailed Street Address */}
                <div className="w-full max-w-full min-w-0 box-border">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                    {lang === "ar" ? "العنوان بالتفصيل *" : "DETAILED STREET ADDRESS *"}
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder={
                      lang === "ar"
                        ? "اسم الشارع، تفاصيل المبنى، وأي معلومات إضافية للعنوان"
                        : "Street name, building details, and any additional address information"
                    }
                    className="w-full max-w-full min-w-0 box-border border border-[#D5D7DA] px-3.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black focus:bg-white resize-y transition-colors leading-relaxed"
                  />
                </div>

                {/* Building Details: Building #, Floor, Apartment, Landmark */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-full min-w-0 box-border">
                  <div className="col-span-1 w-full max-w-full min-w-0">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                      {lang === "ar" ? "رقم المبنى *" : "BUILDING NUMBER *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={buildingNumber}
                      onChange={(e) => setBuildingNumber(e.target.value)}
                      placeholder={lang === "ar" ? "رقم المبنى" : "Bldg #"}
                      className="w-full max-w-full min-w-0 box-border border border-[#D5D7DA] px-3.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black focus:bg-white text-center sm:text-start"
                    />
                  </div>

                  <div className="col-span-1 w-full max-w-full min-w-0">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutralgray mb-1">
                      {t(lang, "checkout.floor")}
                    </label>
                    <input
                      type="text"
                      value={floorNumber}
                      onChange={(e) => setFloorNumber(e.target.value)}
                      placeholder={lang === "ar" ? "الدور" : "Floor"}
                      className="w-full max-w-full min-w-0 box-border border border-[#D5D7DA] px-2.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black text-center"
                    />
                  </div>

                  <div className="col-span-1 w-full max-w-full min-w-0">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutralgray mb-1">
                      {t(lang, "checkout.apartment")}
                    </label>
                    <input
                      type="text"
                      value={apartmentNumber}
                      onChange={(e) => setApartmentNumber(e.target.value)}
                      placeholder={lang === "ar" ? "الشقة" : "Apt #"}
                      className="w-full max-w-full min-w-0 box-border border border-[#D5D7DA] px-2.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black text-center"
                    />
                  </div>

                  <div className="col-span-1 w-full max-w-full min-w-0">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutralgray mb-1">
                      {t(lang, "checkout.landmark")}
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder={lang === "ar" ? "علامة مميزة" : "Landmark"}
                      className="w-full max-w-full min-w-0 box-border border border-[#D5D7DA] px-2.5 py-2.5 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* Notes: 1-line optional */}
                <div className="w-full max-w-full min-w-0 box-border">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutralgray mb-1">
                    {t(lang, "checkout.notes")} ({lang === "ar" ? "اختياري" : "Optional"})
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder={lang === "ar" ? "أي ملاحظات لمندوب التوصيل..." : "Notes for courier..."}
                    className="w-full max-w-full min-w-0 box-border border border-[#D5D7DA] px-3 py-2 text-xs bg-[#FAFBFB] rounded-xl outline-none focus:border-black"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* STEP 2: اختر وسيلة الدفع (مع سهم دروب داون)             */}
          {/* ======================================================== */}
          <div className="bg-white border border-[#E1E3E5] rounded-2xl shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setPaymentOpen(!paymentOpen)}
              className="w-full p-4 sm:p-6 bg-white hover:bg-[#FAFBFB] text-start flex items-center justify-between border-b border-[#E1E3E5] transition-colors"
              aria-expanded={paymentOpen}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#111214] text-white text-xs font-bold flex items-center justify-center font-mono shrink-0">
                  2
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-sm sm:text-base font-bold text-jet uppercase tracking-wider">
                      {lang === "ar" ? "اختر وسيلة الدفع" : t(lang, "checkout.payment_method")}
                    </h2>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {paymentMethodCode === "INSTAPAY" ? "InstaPay" : "Vodafone Cash"}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutralgray font-medium">
                    {lang === "ar" ? "تحويل فوري عبر انستاباي أو محفظة فودافون كاش" : "Direct transfer with instant verification"}
                  </span>
                </div>
              </div>

              {/* The Collapsible Arrow for Step 2 */}
              <div
                className={`w-7 h-7 rounded-full bg-[#FAFBFB] border border-[#E1E3E5] flex items-center justify-center text-jet transition-transform duration-200 shrink-0 ${
                  paymentOpen ? "rotate-180" : ""
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            {paymentOpen && (
              <div className="p-4 sm:p-6 space-y-4 animate-in slide-in-from-top-1 duration-200">
                {/* 2 Equal Radio Cards (InstaPay / Vodafone Cash) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {paymentMethods.map((pm) => {
                    const isSelected = paymentMethodCode === pm.code;
                    const isInsta = pm.code === "INSTAPAY";
                    const logoSrc = isInsta ? "/instapay.jpg" : "/vodafone-cash.jpg";

                    return (
                      <button
                        key={pm.code}
                        type="button"
                        onClick={() => setPaymentMethodCode(pm.code)}
                        className={`p-3 rounded-xl border text-start transition-all relative flex flex-col justify-between min-h-[82px] ${
                          isSelected
                            ? "border-[#111214] bg-[#111214] text-white shadow-md ring-1 ring-[#111214]"
                            : "border-[#E1E3E5] bg-[#FAFBFB] text-jet hover:border-[#111214]/60"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <img
                              src={logoSrc}
                              alt={isInsta ? "InstaPay" : "Vodafone Cash"}
                              className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 border border-silver/40 shadow-xs"
                            />
                            <span className="font-heading font-black text-xs uppercase tracking-wide">
                              {isInsta ? "InstaPay" : "Vodafone Cash"}
                            </span>
                          </div>
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              isSelected ? "text-emerald-400" : "text-[#D5D7DA]"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[10px] mt-1.5 line-clamp-1 ${
                            isSelected ? "text-[#BFC2C6]" : "text-neutralgray"
                          }`}
                        >
                          {lang === "ar"
                            ? isInsta
                              ? "تحويل فوري عبر انستاباي"
                              : "تحويل كاش للمحفظة"
                            : "Instant Direct Transfer"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Compact Transfer Box with 1-Tap Copy */}
                {(() => {
                  const currentPm =
                    paymentMethods.find((p) => p.code === paymentMethodCode) || paymentMethods[0];
                  const receivingAccount =
                    currentPm?.receiving_account ||
                    (paymentMethodCode === "INSTAPAY" ? "u3store@instapay" : "01115915388");
                  const recipientName = currentPm?.recipient_name || "U3 STORE";

                  return (
                    <div className="bg-[#FAFBFB] border border-[#E1E3E5] rounded-xl p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#E1E3E5] pb-2 text-[11px]">
                        <span className="font-bold text-neutralgray uppercase tracking-wider flex items-center gap-1.5">
                          <img
                            src={paymentMethodCode === "INSTAPAY" ? "/instapay.jpg" : "/vodafone-cash.jpg"}
                            alt=""
                            className="w-4 h-4 rounded-full object-contain bg-white border border-silver/50"
                          />
                          <span>{paymentMethodCode === "INSTAPAY" ? "InstaPay Egypt" : "Vodafone Cash"}</span>
                        </span>
                        <span className="font-bold text-jet">
                          {lang === "ar" ? "المطلوب تحويله:" : "Amount:"}{" "}
                          <strong className="text-emerald-700 font-heading text-xs">
                            {formatCurrency(finalTotal, lang)}
                          </strong>
                        </span>
                      </div>

                      {/* Account / Phone to copy */}
                      <div className="bg-white border border-[#D5D7DA] rounded-xl p-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-neutralgray uppercase tracking-wider">
                            {paymentMethodCode === "INSTAPAY"
                              ? lang === "ar"
                                ? "حول إلى عنوان انستاباي"
                                : "InstaPay Address"
                              : lang === "ar"
                              ? "حول إلى رقم فودافون كاش"
                              : "Vodafone Cash Number"}
                          </p>
                          <p className="font-mono text-sm sm:text-base font-bold text-jet select-all tracking-wide">
                            {receivingAccount}
                          </p>
                          <p className="text-[10px] text-neutralgray">
                            {lang === "ar" ? "باسم المستلم:" : "Name:"} <strong className="text-jet">{recipientName}</strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => copyText(receivingAccount)}
                          className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shrink-0 active:scale-95 ${
                            copiedAccount
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-[#111214] text-white border-[#111214] hover:bg-[#292B2E]"
                          }`}
                        >
                          {copiedAccount ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{lang === "ar" ? "تم النسخ" : "Copied"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{lang === "ar" ? "نسخ" : "Copy"}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Compact Upload Box */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-jet flex items-center justify-between">
                          <span>
                            {lang === "ar"
                              ? "صورة إيصال التحويل (Screenshot) *"
                              : "Transfer Screenshot / Receipt *"}
                          </span>
                          <span className="text-[10px] text-red-600 font-bold lowercase">
                            {lang === "ar" ? "(إجباري)" : "(required)"}
                          </span>
                        </label>

                        {!receiptBase64 ? (
                          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#BFC2C6] hover:border-black bg-white p-3.5 rounded-xl cursor-pointer transition-colors group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleReceiptChange}
                              className="hidden"
                            />
                            <Upload className="w-4 h-4 text-neutralgray group-hover:text-black transition-colors shrink-0" />
                            <span className="text-xs font-bold text-jet">
                              {lang === "ar"
                                ? "اضغط لإرفاق صورة التحويل أو سكرين شوت *"
                                : "Click to upload transfer receipt image *"}
                            </span>
                          </label>
                        ) : (
                          <div className="bg-white border border-[#D5D7DA] rounded-xl p-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={receiptBase64}
                                alt="Receipt"
                                className="w-10 h-10 object-cover rounded-lg border border-[#D5D7DA] shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-jet truncate">{receiptFileName}</p>
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {lang === "ar" ? "تم الإرفاق بنجاح" : "Receipt attached"}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveReceipt}
                              className="text-[11px] font-bold text-red-600 hover:text-red-800 border border-red-200 px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>{lang === "ar" ? "حذف" : "Remove"}</span>
                            </button>
                          </div>
                        )}

                        {/* Sender Account Phone/Identifier (Mandatory) */}
                        <div className="pt-2 space-y-1">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-jet flex items-center justify-between">
                            <span>
                              {lang === "ar"
                                ? "رقم المحفظة / الحساب المحوّل منه *"
                                : "Sender Wallet Phone (01xxxxxxxxx) *"}
                            </span>
                            <span className="text-[10px] text-red-600 font-bold lowercase">
                              {lang === "ar" ? "(إجباري)" : "(required)"}
                            </span>
                          </label>
                          <input
                            type="tel"
                            maxLength={11}
                            required
                            value={senderIdentifier}
                            onChange={(e) => setSenderIdentifier(formatEgyptianPhoneInput(e.target.value))}
                            placeholder={
                              lang === "ar"
                                ? "اكتب رقم محفظتك (01xxxxxxxxx) *"
                                : "Enter sender wallet number (01xxxxxxxxx) *"
                            }
                            className="w-full border border-[#D5D7DA] px-3.5 py-2.5 text-xs bg-white rounded-xl outline-none focus:border-black font-mono transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="bg-red-700 text-white p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Place Order CTA Button */}
          <div className="space-y-3 pt-1">
            <button
              type="submit"
              disabled={submitting || !shippingAllowed}
              className="w-full bg-[#111214] hover:bg-[#292B2E] disabled:bg-[#92969D] text-white font-heading text-sm font-bold uppercase tracking-widest py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.99] transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>
                {submitting
                  ? lang === "ar"
                    ? "جاري تأكيد الطلب والدفع..."
                    : "CONFIRMING ORDER..."
                  : receiptBase64
                  ? lang === "ar"
                    ? `تأكيد الطلب والدفع — ${formatCurrency(finalTotal, lang)}`
                    : `CONFIRM ORDER & PAYMENT — ${formatCurrency(finalTotal, lang)}`
                  : lang === "ar"
                  ? `تأكيد الطلب — ${formatCurrency(finalTotal, lang)}`
                  : `PLACE ORDER — ${formatCurrency(finalTotal, lang)}`}
              </span>
            </button>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-neutralgray text-center font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {lang === "ar" ? "دفع مشفر وآمن 100%" : "100% Secure"}
              </span>
              <span>•</span>
              <span>{lang === "ar" ? "شحن لجميع المحافظات" : "Fast Egypt Delivery"}</span>
              <span>•</span>
              <span>{lang === "ar" ? "فاتورة إلكترونية معتمدة" : "Official Invoice"}</span>
            </div>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: PERMANENT DESKTOP LIVE ORDER SUMMARY       */}
      {/* (lg:col-span-5) - Retained exactly as originally desired */}
      {/* ======================================================== */}
      <div className="hidden lg:block lg:col-span-5 sticky top-24 space-y-4">
        <div className="bg-white border border-[#E1E3E5] p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E1E3E5] pb-3">
            <h2 className="font-heading text-base font-bold text-jet uppercase tracking-wider">
              {t(lang, "checkout.order_summary")}
            </h2>
            <span className="text-xs text-neutralgray font-semibold">
              {totalItemCount} {totalItemCount === 1 ? (lang === "ar" ? "قطعة" : "item") : (lang === "ar" ? "قطع" : "items")}
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs border-b border-[#E1E3E5]/60 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.imageUrl || "/logo.jpg"}
                    alt=""
                    className="w-12 h-12 object-cover rounded-xl border border-[#E1E3E5] shrink-0 bg-white"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-jet truncate">
                      {lang === "ar" ? item.nameAr || item.nameEn : item.nameEn}
                    </p>
                    <p className="text-neutralgray text-[11px]">
                      {item.productType === "CLOTHING" ? item.size : `EU ${item.size}`} • {lang === "ar" ? item.colorAr : item.colorEn} × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-jet shrink-0 tabular-nums">
                  {formatCurrency(item.lineSubtotal, lang)}
                </span>
              </div>
            ))}
          </div>

          {/* Desktop Coupon Code Box */}
          <div className="border border-[#E1E3E5] bg-[#F7F7F5] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-jet flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-neutralgray" />
                <span>{lang === "ar" ? "كوبون الخصم" : "Coupon / Promo Code"}</span>
              </span>
              {cart.couponCode && (
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {cart.couponCode}
                </span>
              )}
            </div>

            {cart.couponCode && cart.couponDiscount > 0 ? (
              <div className="flex items-center justify-between bg-white border border-emerald-300 rounded-lg p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-800 font-medium">
                    {lang === "ar" ? "تم تطبيق الخصم:" : "Discount applied:"}{" "}
                    <strong className="font-bold">{formatCurrency(cart.couponDiscount, lang)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={couponLoading}
                  className="text-xs text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer"
                >
                  {lang === "ar" ? "إزالة" : "Remove"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder={lang === "ar" ? "اكتب كود الخصم هنا..." : "Enter promo code..."}
                  className="flex-1 bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-jet"
                />
                <button
                  type="submit"
                  disabled={couponLoading || !couponInput.trim()}
                  className="bg-jet hover:bg-black disabled:bg-[#BFC2C6] text-white px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {couponLoading
                    ? (lang === "ar" ? "جاري التحقق..." : "Checking...")
                    : (lang === "ar" ? "تطبيق" : "Apply")}
                </button>
              </form>
            )}

            {couponMessage && (
              <p
                className={`text-[11px] font-medium ${
                  couponMessage.type === "ok" ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {couponMessage.text}
              </p>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2 text-xs border-t border-[#E1E3E5] pt-3">
            <div className="flex justify-between text-neutralgray">
              <span>{t(lang, "cart.subtotal")}</span>
              <span className="font-bold text-jet tabular-nums">{formatCurrency(cart.subtotal, lang)}</span>
            </div>

            {cart.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>{t(lang, "cart.discount")} ({cart.couponCode})</span>
                <span className="tabular-nums">- {formatCurrency(cart.couponDiscount, lang)}</span>
              </div>
            )}

            <div className="flex justify-between text-neutralgray">
              <span>{t(lang, "checkout.shipping_fee")}</span>
              <span className="font-bold text-jet tabular-nums">
                {shippingAllowed
                  ? formatCurrency(shippingFee, lang)
                  : lang === "ar"
                  ? "اختر المحافظة"
                  : "Select Governorate"}
              </span>
            </div>

            {additionalFees > 0 && (
              <div className="flex justify-between text-neutralgray">
                <span>{lang === "ar" ? "رسوم إضافية" : "Handling Fee"}</span>
                <span className="font-bold text-jet tabular-nums">{formatCurrency(additionalFees, lang)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-[#E1E3E5] pt-3 font-heading text-lg font-bold text-jet">
              <span>{t(lang, "checkout.total")}</span>
              <span className="text-emerald-700 tabular-nums">{formatCurrency(finalTotal, lang)}</span>
            </div>
          </div>

          <div className="bg-[#FAFBFB] p-3 rounded-xl border border-[#E1E3E5] text-[11px] text-neutralgray flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-jet shrink-0 mt-0.5" />
            <span>
              {lang === "ar"
                ? "يتم تأكيد الطلب فورياً وحجز المقاسات المحددة في المخزون وإصدار الفاتورة الرسمية."
                : "Your items and sizes are instantly reserved in stock upon placing your order with an official invoice."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
