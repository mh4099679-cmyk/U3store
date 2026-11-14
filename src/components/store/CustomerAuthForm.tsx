"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";

export function CustomerAuthForm({
  mode,
  lang,
}: {
  mode: "login" | "register" | "forgot";
  lang: Language;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [whatsappTransactionalConsent, setWhatsappTransactionalConsent] = useState(true);
  const [whatsappMarketingConsent, setWhatsappMarketingConsent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "register" || mode === "forgot") {
        const cleanPhone = phone.replace(/\D/g, "").slice(0, 11);
        if (cleanPhone.length !== 11 || !cleanPhone.startsWith("01")) {
          setError(
            lang === "ar"
              ? "يجب أن يتكون رقم الهاتف من 11 رقماً ويبدأ بـ 01 (مثال: 010xxxxxxxx)"
              : "Phone number must be exactly 11 digits starting with 01 (e.g. 010xxxxxxxx)"
          );
          setLoading(false);
          return;
        }
      }

      const action =
        mode === "login"
          ? "login"
          : mode === "register"
          ? "register"
          : "request_password_reset";

      const res = await fetch("/api/auth/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          fullName,
          phone: phone.replace(/\D/g, "").slice(0, 11),
          email,
          password,
          confirmPassword,
          newPassword: password,
          whatsappTransactionalConsent,
          whatsappMarketingConsent,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Operation failed.");
      } else {
        if (mode === "forgot") {
          setSuccess(
            lang === "ar"
              ? "تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن."
              : "Password updated successfully. You can now sign in."
          );
        } else {
          if (data.canOfferCartMerge) {
            const merge = window.confirm(
              lang === "ar"
                ? `لديك ${data.guestItemsCount} منتج في حقيبة الزائر الحالية. هل ترغب في دمجها مع حقيبة حسابك؟`
                : `You have ${data.guestItemsCount} item(s) in your guest shopping bag. Would you like to merge them into your account bag?`
            );
            if (merge) {
              await fetch("/api/auth/customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "merge_guest_cart" }),
              });
            }
          }
          router.push("/account");
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-silver/60 p-8 space-y-6">
      <div className="text-center space-y-1">
        <p className="text-xs uppercase tracking-[0.25em] text-neutralgray font-bold">
          U3 STORE — LIVE YOURS.
        </p>
        <h1 className="font-heading text-2xl font-bold text-jet">
          {mode === "login"
            ? lang === "ar"
              ? "تسجيل الدخول لحسابك"
              : "SIGN IN TO YOUR ACCOUNT"
            : mode === "register"
            ? lang === "ar"
              ? "إنشاء حساب عميل جديد (اختياري)"
              : "CREATE CUSTOMER ACCOUNT (OPTIONAL)"
            : lang === "ar"
            ? "استعادة كلمة المرور"
            : "RESET YOUR PASSWORD"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-xs font-bold uppercase text-jet mb-1">
              {lang === "ar" ? "الاسم بالكامل *" : "Full Name *"}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-silver px-3.5 py-2.5 text-sm bg-offwhite"
            />
          </div>
        )}

        {(mode === "register" || mode === "forgot") && (
          <div>
            <label className="block text-xs font-bold uppercase text-jet mb-1">
              {lang === "ar" ? "رقم الهاتف المحمول (11 رقماً) *" : "Phone Number (11 digits) *"}
            </label>
            <input
              type="tel"
              required
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="01xxxxxxxxx"
              className="w-full border border-silver px-3.5 py-2.5 text-sm bg-offwhite font-mono"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase text-jet mb-1">
            {lang === "ar" ? "البريد الإلكتروني *" : "Email Address *"}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-silver px-3.5 py-2.5 text-sm bg-offwhite"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-jet mb-1">
            {mode === "forgot"
              ? lang === "ar"
                ? "كلمة المرور الجديدة *"
                : "New Password *"
              : lang === "ar"
              ? "كلمة المرور *"
              : "Password *"}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              inputMode="text"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-silver px-3.5 py-2.5 pe-10 text-sm bg-offwhite font-sans"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 end-0 px-3 flex items-center text-neutralgray hover:text-jet transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={
                showPassword
                  ? lang === "ar"
                    ? "إخفاء كلمة المرور"
                    : "Hide password"
                  : lang === "ar"
                  ? "إظهار كلمة المرور"
                  : "Show password"
              }
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mode === "register" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-jet mb-1">
                {lang === "ar" ? "تأكيد كلمة المرور *" : "Confirm Password *"}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  inputMode="text"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-silver px-3.5 py-2.5 pe-10 text-sm bg-offwhite font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 end-0 px-3 flex items-center text-neutralgray hover:text-jet transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={
                    showConfirmPassword
                      ? lang === "ar"
                        ? "إخفاء كلمة المرور"
                        : "Hide password"
                      : lang === "ar"
                      ? "إظهار كلمة المرور"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="bg-offwhite border border-silver/50 p-3 space-y-2 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappTransactionalConsent}
                  onChange={(e) => setWhatsappTransactionalConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-jet">
                  {lang === "ar"
                    ? "تفعيل إشعارات الطلبات والشحن عبر واتساب"
                    : "Receive order & shipping updates via WhatsApp"}
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappMarketingConsent}
                  onChange={(e) => setWhatsappMarketingConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-neutralgray">
                  {lang === "ar"
                    ? "استلام العروض والإصدارات الجديدة عبر واتساب (اختياري)"
                    : "Receive new drops & exclusive offers via WhatsApp (Optional)"}
                </span>
              </label>
            </div>
          </div>
        )}

        {error && <div className="bg-red-900 text-white p-3 text-xs font-bold">{error}</div>}
        {success && (
          <div className="bg-emerald-900 text-white p-3 text-xs font-bold">{success}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#111214] hover:bg-[#292B2E] text-white font-heading text-xs font-bold uppercase tracking-widest py-3.5 transition-colors"
        >
          {loading
            ? "..."
            : mode === "login"
            ? lang === "ar"
              ? "تسجيل الدخول"
              : "SIGN IN"
            : mode === "register"
            ? lang === "ar"
              ? "إنشاء الحساب"
              : "CREATE ACCOUNT"
            : lang === "ar"
            ? "تحديث كلمة المرور"
            : "RESET PASSWORD"}
        </button>
      </form>

      <div className="border-t border-silver/50 pt-4 text-xs text-center space-y-2">
        {mode === "login" && (
          <>
            <p>
              <Link href="/account/forgot-password" className="text-jet hover:underline font-bold">
                {lang === "ar" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
              </Link>
            </p>
            <p className="text-neutralgray">
              {lang === "ar" ? "ليس لديك حساب؟ " : "Don't have an account? "}
              <Link href="/account/register" className="text-jet font-bold underline">
                {lang === "ar" ? "إنشاء حساب جديد" : "Create Account"}
              </Link>
            </p>
          </>
        )}
        {mode !== "login" && (
          <p className="text-neutralgray">
            <Link href="/account/login" className="text-jet font-bold underline">
              {lang === "ar" ? "العودة لتسجيل الدخول" : "Back to Sign In"}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
