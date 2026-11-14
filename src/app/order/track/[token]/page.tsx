import React from "react";
import Link from "next/link";
import { getDb, queryOne, queryAll } from "@/lib/db";
import { getStorefrontLanguage, sha256Hex } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { OrderPaymentClient } from "@/components/store/OrderPaymentClient";
import { ShieldCheck, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrderTrackTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cleanToken = (token || "").trim();
  const lang = await getStorefrontLanguage();
  const isAr = lang === "ar";

  if (!cleanToken) {
    return (
      <StoreShell>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto" />
          <h1 className="font-heading text-xl font-bold text-jet">
            {isAr ? "رابط تتبع الطلب غير صحيح" : "Invalid Tracking Link"}
          </h1>
          <p className="text-xs text-neutralgray">
            {isAr
              ? "لم يتم تزويد مفتاح تتبع صالح. يرجى استخدام الرابط المرسل إليك عبر واتساب أو تتبع الطلب برقم الطلب."
              : "No valid tracking key was provided. Please use the secure link sent via WhatsApp or track using your order number."}
          </p>
          <Link
            href="/track-order"
            className="inline-flex items-center gap-2 bg-[#111214] text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            <span>{isAr ? "صفحة تتبع الطلبات" : "Track Order"}</span>
            {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </Link>
        </div>
      </StoreShell>
    );
  }

  const tokenHash = sha256Hex(cleanToken);
  const db = await getDb();

  // Securely find order using token hash (or fallback plain token)
  const order = queryOne<any>(
    db,
    `SELECT * FROM orders WHERE guest_access_token_hash = ? OR guest_access_token_plain = ?`,
    [tokenHash, cleanToken]
  );

  if (!order) {
    return (
      <StoreShell>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-jet">
            {isAr ? "لم يتم العثور على الطلب" : "Order Not Found"}
          </h1>
          <p className="text-xs text-neutralgray max-w-md mx-auto leading-relaxed">
            {isAr
              ? "رابط التتبع هذا غير صالح أو تم إلغاؤه لحماية خصوصية بيانات العميل. تأكد من فتح الرابط الصحيح المرسل لك من U3 STORE."
              : "This tracking link is invalid or has expired for customer privacy. Please verify the exact link sent by U3 STORE."}
          </p>
          <div className="pt-2">
            <Link
              href="/track-order"
              className="inline-flex items-center gap-2 bg-[#111214] hover:bg-[#292B2E] text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              <span>{isAr ? "البحث برقم الطلب" : "Search by Order Number"}</span>
              {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>
          </div>
        </div>
      </StoreShell>
    );
  }

  // Load associated read-only order details
  const items = queryAll<any>(db, `SELECT * FROM order_items WHERE order_id = ?`, [order.id]);
  const history = queryAll<any>(
    db,
    `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`,
    [order.id]
  );
  const paymentMethod = queryOne<any>(
    db,
    `SELECT * FROM payment_methods WHERE code = ?`,
    [order.payment_method_code]
  );
  const submissions = queryAll<any>(
    db,
    `SELECT * FROM payment_submissions WHERE order_id = ? ORDER BY created_at DESC`,
    [order.id]
  );
  const invoice = queryOne<any>(db, `SELECT * FROM invoices WHERE order_id = ?`, [order.id]);
  const revisions = queryAll<any>(
    db,
    `SELECT * FROM order_revisions WHERE order_id = ? ORDER BY revision_number DESC`,
    [order.id]
  );

  return (
    <StoreShell>
      {/* Top Banner */}
      <div className="bg-[#111214] text-[#F7F7F5] py-4 sm:py-6 border-b border-[#292B2E] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#BFC2C6] mb-1 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>U3 STORE — {isAr ? "تتبع رسمي آمن" : "OFFICIAL SECURE TRACKING"}</span>
              </p>
              <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
                {isAr ? `تفاصيل وحالة الطلب: ${order.order_number}` : `Order Status: ${order.order_number}`}
              </h1>
            </div>
            <div className="text-end">
              <span className="text-[11px] text-[#92969D] block">
                {isAr ? "رابط مشفر خاص بك" : "Encrypted Private Link"}
              </span>
              <span className="text-xs font-mono font-bold text-white uppercase">
                {order.customer_name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Order View Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        <OrderPaymentClient
          lang={lang}
          order={order}
          items={items}
          history={history}
          paymentMethod={paymentMethod}
          submissions={submissions}
          invoice={invoice}
          accessToken={cleanToken}
          revisions={revisions}
        />
      </div>
    </StoreShell>
  );
}

