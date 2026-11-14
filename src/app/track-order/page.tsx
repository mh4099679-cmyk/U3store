import React from "react";
import { getDb, queryOne, queryAll } from "@/lib/db";
import {
  getStorefrontLanguage,
  getCurrentCustomer,
  getCurrentAdmin,
  getOrCreateGuestSession,
} from "@/lib/auth/session";
import { verifyOrderAccess } from "@/lib/services/commerce";
import { StoreShell } from "@/components/store/StoreShell";
import { OrderPaymentClient } from "@/components/store/OrderPaymentClient";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; token?: string }>;
}) {
  const sp = await searchParams;
  const orderNumber = (sp.orderNumber || "").trim().toUpperCase();
  const token = (sp.token || "").trim();

  const lang = await getStorefrontLanguage();
  const customer = await getCurrentCustomer();
  const admin = await getCurrentAdmin();
  const guest = await getOrCreateGuestSession(false);
  const db = await getDb();

  let order: any = null;
  let authorized = false;
  let errorMsg = "";

  if (orderNumber) {
    order = queryOne<any>(db, `SELECT * FROM orders WHERE UPPER(order_number) = ?`, [orderNumber]);
    if (!order) {
      errorMsg =
        lang === "ar"
          ? "لم يتم العثور على طلب بهذا الرقم."
          : "No order found matching that Order Number.";
    } else {
      authorized = verifyOrderAccess(db, order, customer, admin, guest, token);
      if (!authorized) {
        errorMsg =
          lang === "ar"
            ? "لحماية خصوصية العميل، يرجى إدخال مفتاح تتبع الطلب السري الصحيح أو تسجيل الدخول لحساب صاحب الطلب."
            : "For customer privacy, a predictable Order Number alone never exposes private order details. Please enter your Private Guest Tracking Key or sign in.";
      }
    }
  }

  let items: any[] = [];
  let history: any[] = [];
  let paymentMethod: any = null;
  let submissions: any[] = [];
  let invoice: any = null;
  let revisions: any[] = [];

  if (order && authorized) {
    items = queryAll<any>(db, `SELECT * FROM order_items WHERE order_id = ?`, [order.id]);
    history = queryAll<any>(
      db,
      `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`,
      [order.id]
    );
    paymentMethod = queryOne<any>(
      db,
      `SELECT * FROM payment_methods WHERE code = ?`,
      [order.payment_method_code]
    );
    submissions = queryAll<any>(
      db,
      `SELECT * FROM payment_submissions WHERE order_id = ? ORDER BY created_at DESC`,
      [order.id]
    );
    invoice = queryOne<any>(db, `SELECT * FROM invoices WHERE order_id = ?`, [order.id]);
    revisions = queryAll<any>(
      db,
      `SELECT * FROM order_revisions WHERE order_id = ? ORDER BY revision_number DESC`,
      [order.id]
    );
  }

  return (
    <StoreShell>
      <div className="bg-[#111214] text-[#F7F7F5] py-4 sm:py-6 border-b border-[#292B2E] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#BFC2C6] mb-1 font-semibold">
            U3 STORE — LIVE YOURS.
          </p>
          <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
            {lang === "ar" ? "تتبع حالة الطلب والفاتورة بأمان" : "SECURE ORDER TRACKING & INVOICE"}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-10">
        <form
          method="GET"
          action="/track-order"
          className="bg-white border border-silver/60 p-6 sm:p-8 max-w-3xl mx-auto space-y-4 no-print"
        >
          <p className="text-xs text-neutralgray">
            {lang === "ar"
              ? "أدخل رقم الطلب ومفتاح التتبع السري الذي ظهر لك عند إتمام الطلب لعرض حالة الشحنة وتحميل الفاتورة أو الإبلاغ عن الدفع."
              : "Enter your Order Number and Private Guest Tracking Key to view shipment updates, report payment, or download your PDF invoice."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-jet mb-1">
                {lang === "ar" ? "رقم الطلب (Order Number) *" : "Order Number *"}
              </label>
              <input
                type="text"
                name="orderNumber"
                required
                defaultValue={orderNumber}
                placeholder="U3-20261103-00001"
                className="w-full border border-silver px-3.5 py-2.5 text-sm bg-offwhite font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-jet mb-1">
                {lang === "ar"
                  ? "مفتاح التتبع السري للزائر (Tracking Key)"
                  : "Private Guest Tracking Key"}
              </label>
              <input
                type="text"
                name="token"
                defaultValue={token}
                placeholder={
                  lang === "ar"
                    ? "مطلوب للزوار خارج الجلسة الحالية"
                    : "Required for guests outside active session"
                }
                className="w-full border border-silver px-3.5 py-2.5 text-sm bg-offwhite font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-900 text-white p-3.5 text-xs font-bold">{errorMsg}</div>
          )}

          <button
            type="submit"
            className="bg-jet hover:bg-[#292B2E] text-offwhite font-heading text-xs font-bold uppercase tracking-widest px-8 py-3.5 transition-colors"
          >
            {lang === "ar" ? "عرض تفاصيل الطلب" : "TRACK ORDER"}
          </button>
        </form>

        {order && authorized && (
          <OrderPaymentClient
            lang={lang}
            order={order}
            items={items}
            history={history}
            paymentMethod={paymentMethod}
            submissions={submissions}
            invoice={invoice}
            accessToken={token}
            revisions={revisions}
          />
        )}
      </div>
    </StoreShell>
  );
}
