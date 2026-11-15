"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  MapPin,
  Heart,
  RotateCcw,
  Bell,
  LogOut,
  FileDown,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Language, t, formatCurrency } from "@/lib/i18n/dictionaries";

interface AccountDashboardClientProps {
  lang: Language;
  initialTab?: string;
  customer: any;
  orders: any[];
  addresses: any[];
  wishlistItems: any[];
  returns: any[];
  notifications: any[];
  governorates: any[];
  cities: any[];
  areas: any[];
}

export function AccountDashboardClient({
  lang,
  initialTab = "orders",
  customer,
  orders,
  addresses,
  wishlistItems,
  returns,
  notifications,
  governorates,
  cities,
  areas,
}: AccountDashboardClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Profile Edit State
  const [fullName, setFullName] = useState(customer?.fullName || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Claim Guest Order State
  const [claimOrderNumber, setClaimOrderNumber] = useState("");
  const [claimAccessToken, setClaimAccessToken] = useState("");

  // Address Form State
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrGov, setAddrGov] = useState(governorates[0]?.id || "");
  const [addrCity, setAddrCity] = useState("");
  const [addrArea, setAddrArea] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrBuilding, setAddrBuilding] = useState("");
  const [addrFloor, setAddrFloor] = useState("");
  const [addrApt, setAddrApt] = useState("");
  const [addrLandmark, setAddrLandmark] = useState("");
  const [addrNotes, setAddrNotes] = useState("");
  const [addrDefault, setAddrDefault] = useState(true);

  async function handleLogout() {
    await fetch("/api/auth/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/");
    router.refresh();
  }

  async function handleLogoutAllDevices() {
    await fetch("/api/auth/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout_all_devices" }),
    });
    router.push("/account/login");
    router.refresh();
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/auth/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_profile", fullName, phone }),
    });
    const data = await res.json();
    if (data.ok) {
      setMsg({ type: "ok", text: lang === "ar" ? "تم تحديث البيانات." : "Profile updated." });
      router.refresh();
    } else {
      setMsg({ type: "err", text: data.error || "Failed" });
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/auth/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", currentPassword, newPassword }),
    });
    const data = await res.json();
    if (data.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setMsg({ type: "ok", text: lang === "ar" ? "تم تغيير كلمة المرور." : "Password changed." });
    } else {
      setMsg({ type: "err", text: data.error || "Failed" });
    }
  }

  async function claimGuestOrder(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/auth/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "claim_guest_order",
        orderNumber: claimOrderNumber,
        accessToken: claimAccessToken,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setClaimOrderNumber("");
      setClaimAccessToken("");
      setMsg({
        type: "ok",
        text: lang === "ar" ? "تم ربط الطلب بحسابك بنجاح." : "Guest order linked to your account.",
      });
      router.refresh();
    } else {
      setMsg({ type: "err", text: data.error || "Failed" });
    }
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_address",
        label: addrLabel,
        fullName,
        phone,
        governorateId: addrGov,
        cityId: addrCity,
        areaId: addrArea,
        streetAddress: addrStreet,
        buildingNumber: addrBuilding,
        floorNumber: addrFloor,
        apartmentNumber: addrApt,
        landmark: addrLandmark,
        notes: addrNotes,
        isDefault: addrDefault,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setAddrStreet("");
      setAddrBuilding("");
      setAddrFloor("");
      setAddrApt("");
      setAddrLandmark("");
      setAddrNotes("");
      setMsg({ type: "ok", text: lang === "ar" ? "تم حفظ العنوان بنجاح." : "Address saved successfully." });
      router.refresh();
    } else {
      setMsg({ type: "err", text: data.error || "Failed" });
    }
  }

  async function deleteAddress(id: string) {
    await fetch("/api/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_address", id }),
    });
    router.refresh();
  }

  const navTabs = [
    { id: "orders", labelEn: "My Orders", labelAr: "طلباتي", icon: Package },
    { id: "profile", labelEn: "My Profile", labelAr: "بياناتي الشخصية", icon: User },
    { id: "addresses", labelEn: "My Addresses", labelAr: "عناويني", icon: MapPin },
    { id: "wishlist", labelEn: "Wishlist", labelAr: "المفضلة", icon: Heart },
    { id: "returns", labelEn: "My Returns", labelAr: "المرتجعات والاستبدال", icon: RotateCcw },
    { id: "notifications", labelEn: "Notifications", labelAr: "الإشعارات", icon: Bell },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar */}
      <aside className="bg-white border border-silver/60 p-5 h-fit space-y-2">
        <div className="border-b border-silver/50 pb-4 mb-3">
          <p className="font-heading font-bold text-base text-jet">{customer.fullName}</p>
          <p className="text-xs text-neutralgray">{customer.email}</p>
        </div>

        {navTabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                active
                  ? "bg-jet text-offwhite"
                  : "text-jet hover:bg-offwhite"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{lang === "ar" ? item.labelAr : item.labelEn}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white transition-colors mt-4 border-t border-silver/50"
        >
          <LogOut className="w-4 h-4" />
          <span>{lang === "ar" ? "تسجيل الخروج الآمن" : "SECURE LOGOUT"}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="lg:col-span-3 space-y-6">
        {msg && (
          <div
            className={`p-4 text-xs font-bold ${
              msg.type === "ok" ? "bg-emerald-900 text-white" : "bg-red-900 text-white"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* TAB: MY ORDERS */}
        {tab === "orders" && (
          <div className="space-y-6">
            <div className="bg-white border border-silver/60 p-6 space-y-4">
              <h2 className="font-heading text-xl font-bold text-jet">
                {lang === "ar" ? "سجل طلباتي الخاصة" : "MY PRIVATE ORDERS"}
              </h2>

              {orders.length === 0 ? (
                <p className="text-sm text-neutralgray py-6">
                  {lang === "ar"
                    ? "لا توجد طلبات مسجلة في حسابك حتى الآن."
                    : "You have no orders under this account yet."}
                </p>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="border border-silver/60 p-5 bg-offwhite flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-heading font-bold text-base text-jet font-mono">
                            {o.order_number}
                          </span>
                          <span className="bg-jet text-offwhite text-[10px] font-bold uppercase px-2.5 py-0.5">
                            {t(lang, `status.order.${o.order_status}`)}
                          </span>
                          <span className="bg-[#292B2E] text-white text-[10px] font-bold uppercase px-2.5 py-0.5">
                            {t(lang, `status.payment.${o.payment_status}`)}
                          </span>
                        </div>
                        <p className="text-xs text-neutralgray">
                          {new Date(o.created_at).toLocaleString(
                            lang === "ar" ? "ar-EG" : "en-GB"
                          )}{" "}
                          | {o.payment_method_code} | {o.items_count}{" "}
                          {lang === "ar" ? "منتج" : "item(s)"}
                        </p>
                        <p className="font-heading font-bold text-sm text-jet pt-1">
                          {formatCurrency(o.total_amount, lang)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/account/orders/${o.id}`}
                          className="bg-jet hover:bg-[#292B2E] text-offwhite text-xs font-bold uppercase tracking-wider px-4 py-2.5"
                        >
                          {lang === "ar" ? "عرض التفاصيل" : "View Details"}
                        </Link>
                        <a
                          href={`/api/invoices?orderNumber=${encodeURIComponent(
                            o.order_number
                          )}&format=pdf&lang=${lang}`}
                          target="_blank"
                          rel="noreferrer"
                          className="border border-jet text-jet hover:bg-jet hover:text-offwhite text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 inline-flex items-center gap-1.5"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>{lang === "ar" ? "فاتورة PDF" : "PDF Invoice"}</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Claim Guest Order by Verification */}
            <form
              onSubmit={claimGuestOrder}
              className="bg-white border border-silver/60 p-6 space-y-4"
            >
              <h3 className="font-heading text-sm font-bold uppercase text-jet">
                {lang === "ar"
                  ? "ربط طلب سابق قمت به كزائر بحسابك (يتطلب مفتاح التتبع السري)"
                  : "CLAIM A PREVIOUS GUEST ORDER (REQUIRES PRIVATE TRACKING KEY)"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={claimOrderNumber}
                  onChange={(e) => setClaimOrderNumber(e.target.value)}
                  placeholder={lang === "ar" ? "رقم الطلب (مثال: U3-20261103-00001)" : "Order Number (e.g. U3-20261103-00001)"}
                  className="border border-silver px-3 py-2 text-xs bg-offwhite font-mono uppercase"
                />
                <input
                  type="text"
                  required
                  value={claimAccessToken}
                  onChange={(e) => setClaimAccessToken(e.target.value)}
                  placeholder={lang === "ar" ? "رمز تتبع الزائر السري" : "Private Guest Tracking Key"}
                  className="border border-silver px-3 py-2 text-xs bg-offwhite font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 transition-colors"
              >
                {lang === "ar" ? "تأكيد الملكية وربط الطلب" : "Verify & Claim Order"}
              </button>
            </form>
          </div>
        )}

        {/* TAB: MY PROFILE */}
        {tab === "profile" && (
          <div className="space-y-6">
            <form
              onSubmit={updateProfile}
              className="bg-white border border-silver/60 p-6 space-y-4"
            >
              <h2 className="font-heading text-xl font-bold text-jet">
                {lang === "ar" ? "بيانات الحساب" : "MY PROFILE"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-jet mb-1">
                    {t(lang, "checkout.full_name")}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-silver px-3 py-2 text-sm bg-offwhite"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-jet mb-1">
                    {t(lang, "checkout.phone")} (11 رقماً)
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="01xxxxxxxxx"
                    className="w-full border border-silver px-3 py-2 text-sm bg-offwhite font-mono"
                  />
                </div>
              </div>
              <div className="text-xs text-neutralgray">
                <p>{lang === "ar" ? "البريد الإلكتروني: " : "Email: "}{customer.email}</p>
                <p>
                  {lang === "ar" ? "تاريخ الانضمام: " : "Joined: "}{new Date(customer.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
                </p>
              </div>
              <button
                type="submit"
                className="bg-jet text-offwhite text-xs font-bold uppercase tracking-wider px-6 py-3"
              >
                {lang === "ar" ? "حفظ التعديلات" : "Save Profile"}
              </button>
            </form>

            <form
              onSubmit={changePassword}
              className="bg-white border border-silver/60 p-6 space-y-4"
            >
              <h3 className="font-heading text-base font-bold text-jet">
                {lang === "ar" ? "تغيير كلمة المرور" : "CHANGE PASSWORD"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={lang === "ar" ? "كلمة المرور الحالية" : "Current Password"}
                    className="w-full border border-silver px-3 py-2 pe-10 text-sm bg-offwhite"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 end-0 px-3 flex items-center text-neutralgray hover:text-jet"
                    aria-label="Toggle password visibility"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={lang === "ar" ? "كلمة المرور الجديدة" : "New Password"}
                    className="w-full border border-silver px-3 py-2 pe-10 text-sm bg-offwhite"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 end-0 px-3 flex items-center text-neutralgray hover:text-jet"
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 transition-colors"
              >
                {lang === "ar" ? "تحديث كلمة المرور" : "Update Password"}
              </button>
            </form>

            <div className="bg-white border border-silver/60 p-6 space-y-3">
              <h3 className="font-heading text-base font-bold text-jet">
                {lang === "ar" ? "الأمان والجلسات النشطة" : "SECURITY & ACTIVE SESSIONS"}
              </h3>
              <p className="text-xs text-neutralgray">
                {lang === "ar"
                  ? "جلسة حسابك محفوظة لمدة ٣٠ يوماً على هذا المتصفح. يمكنك تسجيل الخروج من جميع الأجهزة المتصلة فوراً."
                  : "Your account session stays signed in for 30 days on this browser. You can sign out of all active devices at any time."}
              </p>
              <button
                type="button"
                onClick={handleLogoutAllDevices}
                className="border border-jet text-jet hover:bg-jet hover:text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 transition-colors"
              >
                {lang === "ar" ? "تسجيل الخروج من جميع الأجهزة" : "Logout From All Devices"}
              </button>
            </div>
          </div>
        )}

        {/* TAB: MY ADDRESSES */}
        {tab === "addresses" && (
          <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden box-border">
            <div className="bg-white border border-silver/60 p-4 sm:p-6 space-y-4 w-full max-w-full min-w-0 box-border overflow-hidden">
              <h2 className="font-heading text-xl font-bold text-jet flex items-center gap-2">
                <MapPin className="w-5 h-5 text-jet shrink-0" />
                <span>{lang === "ar" ? "العناوين المحفوظة" : "SAVED ADDRESSES"}</span>
              </h2>
              {addresses.length === 0 ? (
                <p className="text-xs text-neutralgray">
                  {lang === "ar" ? "لا توجد عناوين محفوظة بعد." : "No saved addresses yet."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-full min-w-0">
                  {addresses.map((a) => {
                    const govName = lang === "ar" ? a.gov_name_ar || a.gov_name_en : a.gov_name_en || a.gov_name_ar;
                    const cityName = lang === "ar" ? a.city_name_ar || a.city_name_en : a.city_name_en || a.city_name_ar;
                    const areaName = lang === "ar" ? a.area_name_ar || a.area_name_en : a.area_name_en || a.area_name_ar;

                    return (
                      <div
                        key={a.id}
                        className="border border-silver p-4 bg-offwhite flex justify-between items-start gap-3 rounded-none w-full max-w-full min-w-0 box-border"
                      >
                        <div className="space-y-1.5 text-xs min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-jet">{a.label}</span>
                            {Boolean(a.is_default) && (
                              <span className="bg-[#111214] text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                                {lang === "ar" ? "افتراضي" : "Default"}
                              </span>
                            )}
                          </div>
                          <p className="text-jet font-medium">{a.full_name} • {a.phone}</p>
                          <p className="text-neutralgray leading-relaxed">
                            {a.street_address}, {lang === "ar" ? "عمارة" : "Bldg"} {a.building_number}
                            {a.floor_number && ` • ${lang === "ar" ? "دور" : "Floor"} ${a.floor_number}`}
                            {a.apartment_number && ` • ${lang === "ar" ? "شقة" : "Apt"} ${a.apartment_number}`}
                          </p>
                          <p className="text-jet text-[11px] font-semibold">
                            {[areaName, cityName, govName].filter(Boolean).join(" - ")}
                          </p>
                          {a.landmark && (
                            <p className="text-neutralgray text-[11px] bg-white border border-silver/40 p-2 rounded-none">
                              <span className="font-bold text-jet">{lang === "ar" ? "علامة مميزة: " : "Landmark: "}</span>
                              {a.landmark}
                            </p>
                          )}
                          {a.notes && (
                            <p className="text-neutralgray text-[11px] italic">
                              <span className="font-bold text-jet not-italic">{lang === "ar" ? "ملاحظات: " : "Notes: "}</span>
                              {a.notes}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteAddress(a.id)}
                          className="text-neutralgray hover:text-red-700 p-1 shrink-0"
                          title={lang === "ar" ? "حذف العنوان" : "Delete address"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form: Add New Address with 100% Mobile Safe Containment */}
            <form
              onSubmit={saveAddress}
              className="bg-white border border-silver/60 p-4 sm:p-6 space-y-4 w-full max-w-full min-w-0 box-border overflow-hidden"
            >
              <h3 className="font-heading text-base font-bold text-jet flex items-center gap-2 border-b border-silver/40 pb-3">
                <Plus className="w-4 h-4 text-jet" />
                <span>{lang === "ar" ? "إضافة عنوان جديد وتفاصيل اللوكيشن" : "ADD NEW ADDRESS & LOCATION DETAILS"}</span>
              </h3>

              {/* Row 1: Label (Home / Work) */}
              <div className="w-full max-w-full min-w-0">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                  {lang === "ar" ? "تسمية العنوان (المنزل / العمل / أخرى)" : "Address Label"}
                </label>
                <input
                  type="text"
                  value={addrLabel}
                  onChange={(e) => setAddrLabel(e.target.value)}
                  placeholder={lang === "ar" ? "مثال: المنزل، المكتب" : "e.g. Home, Office"}
                  className="w-full max-w-full min-w-0 box-border border border-silver px-3 py-2 text-xs bg-offwhite focus:outline-none focus:border-jet"
                />
              </div>

              {/* Row 2: Governorate -> City -> Area (100% inside phone screen boundaries) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-full min-w-0 box-border">
                <div className="w-full max-w-full min-w-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                    {lang === "ar" ? "المحافظة *" : "Governorate *"}
                  </label>
                  <select
                    value={addrGov}
                    onChange={(e) => {
                      setAddrGov(e.target.value);
                      setAddrCity("");
                      setAddrArea("");
                    }}
                    className="w-full max-w-full min-w-0 box-border truncate overflow-hidden border border-silver px-3 py-2 text-xs bg-offwhite text-jet focus:outline-none focus:border-jet"
                  >
                    {governorates.map((g) => (
                      <option key={g.id} value={g.id}>
                        {lang === "ar" ? g.name_ar : g.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full max-w-full min-w-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                    {lang === "ar" ? "المدينة (اختياري)" : "City (Optional)"}
                  </label>
                  <select
                    value={addrCity}
                    onChange={(e) => {
                      setAddrCity(e.target.value);
                      setAddrArea("");
                    }}
                    className="w-full max-w-full min-w-0 box-border truncate overflow-hidden border border-silver px-3 py-2 text-xs bg-offwhite text-jet focus:outline-none focus:border-jet"
                  >
                    <option value="">{lang === "ar" ? "جميع المدن" : "All Cities"}</option>
                    {cities
                      .filter((c) => c.governorate_id === addrGov)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === "ar" ? c.name_ar : c.name_en}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="w-full max-w-full min-w-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                    {lang === "ar" ? "المنطقة / الحي (اختياري)" : "Area (Optional)"}
                  </label>
                  <select
                    value={addrArea}
                    onChange={(e) => setAddrArea(e.target.value)}
                    className="w-full max-w-full min-w-0 box-border truncate overflow-hidden border border-silver px-3 py-2 text-xs bg-offwhite text-jet focus:outline-none focus:border-jet"
                  >
                    <option value="">{lang === "ar" ? "جميع المناطق" : "All Areas"}</option>
                    {areas
                      .filter((a) => a.city_id === addrCity)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {lang === "ar" ? a.name_ar : a.name_en}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Street & Building */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-full min-w-0 box-border">
                <div className="sm:col-span-2 w-full max-w-full min-w-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                    {lang === "ar" ? "اسم الشارع *" : "Street Address *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    placeholder={lang === "ar" ? "اسم الشارع والحي" : "Street name and area"}
                    className="w-full max-w-full min-w-0 box-border border border-silver px-3 py-2 text-xs bg-offwhite focus:outline-none focus:border-jet"
                  />
                </div>
                <div className="sm:col-span-1 w-full max-w-full min-w-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                    {lang === "ar" ? "رقم المبنى / العمارة *" : "Building Number *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={addrBuilding}
                    onChange={(e) => setAddrBuilding(e.target.value)}
                    placeholder={lang === "ar" ? "رقم العمارة" : "Bldg #"}
                    className="w-full max-w-full min-w-0 box-border border border-silver px-3 py-2 text-xs bg-offwhite focus:outline-none focus:border-jet text-center sm:text-start"
                  />
                </div>
              </div>

              {/* Row 4: Floor Number & Apartment Number */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-full min-w-0 box-border">
                <div className="w-full max-w-full min-w-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutralgray mb-1">
                    {lang === "ar" ? "رقم الدور / الطابق" : "Floor Number"}
                  </label>
                  <input
                    type="text"
                    value={addrFloor}
                    onChange={(e) => setAddrFloor(e.target.value)}
                    placeholder={lang === "ar" ? "مثال: 3" : "e.g. 3"}
                    className="w-full max-w-full min-w-0 box-border border border-silver px-3 py-2 text-xs bg-offwhite focus:outline-none focus:border-jet"
                  />
                </div>
                <div className="w-full max-w-full min-w-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutralgray mb-1">
                    {lang === "ar" ? "رقم الشقة" : "Apartment Number"}
                  </label>
                  <input
                    type="text"
                    value={addrApt}
                    onChange={(e) => setAddrApt(e.target.value)}
                    placeholder={lang === "ar" ? "مثال: 12" : "e.g. 12"}
                    className="w-full max-w-full min-w-0 box-border border border-silver px-3 py-2 text-xs bg-offwhite focus:outline-none focus:border-jet"
                  />
                </div>
              </div>

              {/* Row 5: Landmark / Detailed Location (علامة مميزة وتفاصيل اللوكيشن) */}
              <div className="w-full max-w-full min-w-0 box-border">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-jet mb-1">
                  {lang === "ar" ? "علامة مميزة / تفاصيل اللوكيشن بدقة" : "Distinct Landmark / Location Details"}
                </label>
                <input
                  type="text"
                  value={addrLandmark}
                  onChange={(e) => setAddrLandmark(e.target.value)}
                  placeholder={
                    lang === "ar"
                      ? "مثال: بجوار صيدلية كذا، أمام مسجد النور، متفرع من شارع كذا"
                      : "e.g. Near pharmacy, opposite to mosque, landmark..."
                  }
                  className="w-full max-w-full min-w-0 box-border border border-silver px-3 py-2 text-xs bg-offwhite focus:outline-none focus:border-jet"
                />
              </div>

              {/* Row 6: Delivery Notes */}
              <div className="w-full max-w-full min-w-0 box-border">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutralgray mb-1">
                  {lang === "ar" ? "تعليمات وملاحظات لمندوب التوصيل (اختياري)" : "Delivery Instructions (Optional)"}
                </label>
                <input
                  type="text"
                  value={addrNotes}
                  onChange={(e) => setAddrNotes(e.target.value)}
                  placeholder={
                    lang === "ar"
                      ? "مثال: يرجى الاتصال قبل الوصول بنصف ساعة"
                      : "e.g. Please call 30 mins before arrival"
                  }
                  className="w-full max-w-full min-w-0 box-border border border-silver px-3 py-2 text-xs bg-offwhite focus:outline-none focus:border-jet"
                />
              </div>

              {/* Default Address Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="addrDefaultChk"
                  checked={addrDefault}
                  onChange={(e) => setAddrDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-black focus:ring-0 accent-black cursor-pointer"
                />
                <label htmlFor="addrDefaultChk" className="text-xs text-jet font-medium cursor-pointer select-none">
                  {lang === "ar" ? "تعيين كعنوان رئيسي للتوصيل" : "Set as default delivery address"}
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase tracking-wider px-8 py-3 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "حفظ وتثبيت العنوان" : "Save Address"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: WISHLIST */}
        {tab === "wishlist" && (
          <div className="bg-white border border-silver/60 p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold text-jet">
              {t(lang, "nav.wishlist")}
            </h2>
            {wishlistItems.length === 0 ? (
              <p className="text-xs text-neutralgray">
                {lang === "ar" ? "قائمة المفضلة الخاصة بك فارغة." : "Your private wishlist is empty."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {wishlistItems.map((w) => (
                  <Link
                    key={w.id}
                    href={`/products/${w.slug}`}
                    className="border border-silver p-3.5 bg-offwhite flex items-center gap-4 hover:border-jet"
                  >
                    <img
                      src={w.image_url || "/logo.jpg"}
                      alt=""
                      className="w-16 h-16 object-cover border border-silver/40"
                    />
                    <div>
                      <p className="font-bold text-sm text-jet">
                        {lang === "ar" ? w.name_ar || w.name_en : w.name_en}
                      </p>
                      <p className="text-xs text-jet font-bold">
                        {formatCurrency(w.sale_price || w.regular_price, lang)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: RETURNS */}
        {tab === "returns" && (
          <div className="bg-white border border-silver/60 p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold text-jet">
              {lang === "ar" ? "طلبات الاسترجاع والاستبدال" : "RETURNS & EXCHANGES"}
            </h2>
            {returns.length === 0 ? (
              <p className="text-sm text-neutralgray py-6">
                {lang === "ar"
                  ? "لا توجد طلبات استرجاع أو استبدال حالياً."
                  : "No return or exchange requests submitted."}
              </p>
            ) : (
              <div className="space-y-4">
                {returns.map((r) => (
                  <div
                    key={r.id}
                    className="border border-silver/60 p-5 bg-offwhite flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-heading font-bold text-base text-jet font-mono">
                          {r.order_number}
                        </span>
                        <span className="bg-jet text-offwhite text-[10px] font-bold uppercase px-2.5 py-0.5">
                          {r.status === "EXCHANGED" || r.request_type === "EXCHANGE"
                            ? lang === "ar"
                              ? "تم الاستبدال"
                              : "EXCHANGED"
                            : lang === "ar"
                            ? "مرتجع"
                            : "RETURNED"}
                        </span>
                        {r.return_number && (
                          <span className="bg-[#292B2E] text-white text-[10px] font-bold uppercase px-2.5 py-0.5 font-mono">
                            {r.return_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutralgray">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString(
                              lang === "ar" ? "ar-EG" : "en-GB"
                            )
                          : ""}{" "}
                        {r.reason ? `| ${r.reason}` : ""}
                      </p>
                      {r.total_amount && (
                        <p className="font-heading font-bold text-sm text-jet pt-1">
                          {formatCurrency(r.total_amount, lang)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/account/orders/${
                          r.order_id || r.original_order_id || r.order_number
                        }`}
                        className="bg-jet hover:bg-[#292B2E] text-offwhite text-xs font-bold uppercase tracking-wider px-4 py-2.5"
                      >
                        {lang === "ar" ? "عرض تفاصيل الطلب" : "View Order"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: NOTIFICATIONS */}
        {tab === "notifications" && (
          <div className="bg-white border border-silver/60 p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold text-jet">
              {lang === "ar" ? "الإشعارات الخاصة" : "PRIVATE NOTIFICATIONS"}
            </h2>
            {notifications.length === 0 ? (
              <p className="text-xs text-neutralgray">
                {lang === "ar" ? "لا توجد إشعارات جديدة." : "No notifications yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="border-s-4 border-[#111214] bg-offwhite p-4 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-bold text-jet">
                        {lang === "ar" ? n.title_ar : n.title_en}
                      </span>
                      <span className="text-[10px] text-neutralgray">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-darkgray">
                      {lang === "ar" ? n.message_ar : n.message_en}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

