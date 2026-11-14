import React from "react";
import Link from "next/link";
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

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderReference: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { orderReference } = await params;
  const { token = "" } = await searchParams;

  const lang = await getStorefrontLanguage();
  const customer = await getCurrentCustomer();
  const admin = await getCurrentAdmin();
  const guest = await getOrCreateGuestSession(false);
  const db = await getDb();

  const order = queryOne<any>(
    db,
    `SELECT * FROM orders WHERE UPPER(order_number) = UPPER(?) OR id = ?`,
    [orderReference.trim(), orderReference.trim()]
  );

  if (!order || !verifyOrderAccess(db, order, customer, admin, guest, token)) {
    return (
      <StoreShell>
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white border border-silver/60 p-10 text-center space-y-4">
            <h1 className="font-heading text-2xl font-bold text-jet">
              {lang === "ar" ? "الطلب محمي بكلمة مرور / مفتاح خاص" : "PROTECTED PRIVATE ORDER RECORD"}
            </h1>
            <p className="text-sm text-neutralgray">
              {lang === "ar"
                ? "لا يمكن لأي زائر أو عميل آخر الاطلاع على بيانات هذا الطلب بدون تسجيل الدخول لحساب صاحب الطلب أو إدخال مفتاح التتبع السري."
                : "Another customer's order cannot be accessed by changing the URL. Please verify ownership via the Track Order page or Sign In."}
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link
                href={`/track-order?orderNumber=${encodeURIComponent(orderReference)}`}
                className="bg-jet text-offwhite text-xs font-bold uppercase tracking-widest px-6 py-3"
              >
                {lang === "ar" ? "التحقق من ملكية الطلب" : "VERIFY ORDER ACCESS"}
              </Link>
              <Link
                href="/account/login"
                className="border border-jet text-jet text-xs font-bold uppercase tracking-widest px-6 py-3"
              >
                {lang === "ar" ? "تسجيل الدخول" : "SIGN IN"}
              </Link>
            </div>
          </div>
        </div>
      </StoreShell>
    );
  }

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

  return (
    <StoreShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <OrderPaymentClient
          lang={lang}
          order={order}
          items={items}
          history={history}
          paymentMethod={paymentMethod}
          submissions={submissions}
          invoice={invoice}
          accessToken={token}
        />
      </div>
    </StoreShell>
  );
}
