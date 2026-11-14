import React from "react";
import { redirect } from "next/navigation";
import { getDb, queryOne, queryAll } from "@/lib/db";
import { getStorefrontLanguage, getCurrentCustomer } from "@/lib/auth/session";
import { StoreShell } from "@/components/store/StoreShell";
import { OrderPaymentClient } from "@/components/store/OrderPaymentClient";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const lang = await getStorefrontLanguage();
  const db = await getDb();

  // Strictly enforce customer ownership
  const order = queryOne<any>(
    db,
    `SELECT * FROM orders WHERE (id = ? OR UPPER(order_number) = UPPER(?)) AND user_id = ?`,
    [orderId, orderId, customer.id]
  );

  if (!order) {
    redirect("/account/orders");
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
          accessToken=""
        />
      </div>
    </StoreShell>
  );
}

