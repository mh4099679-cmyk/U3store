import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getDb, queryOne, queryAll, runSql, persistDb } from "@/lib/db";
import {
  getCurrentCustomer,
  getCurrentAdmin,
  getOrCreateGuestSession,
  generateId,
  sha256Hex,
} from "@/lib/auth/session";
import { verifyOrderAccess } from "@/lib/services/commerce";
import { queueWhatsAppNotification } from "@/lib/services/whatsapp";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderNumber = (searchParams.get("orderNumber") || "").trim().toUpperCase();
  const orderId = (searchParams.get("orderId") || "").trim();
  const accessToken = (searchParams.get("token") || "").trim();
  const phoneVerify = (searchParams.get("phone") || "").trim();

  const db = await getDb();
  const customer = await getCurrentCustomer();
  const admin = await getCurrentAdmin();
  const guest = await getOrCreateGuestSession(false);

  if (!orderNumber && !orderId) {
    if (!customer) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const myOrders = queryAll<any>(
      db,
      `SELECT o.*,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [customer.id]
    );
    return NextResponse.json(
      { ok: true, orders: myOrders },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const order = orderNumber
    ? queryOne<any>(db, `SELECT * FROM orders WHERE UPPER(order_number) = ?`, [orderNumber])
    : queryOne<any>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  let authorized = verifyOrderAccess(db, order, customer, admin, guest, accessToken);
  if (!authorized && phoneVerify && accessToken) {
    if (
      order.customer_phone.trim() === phoneVerify &&
      sha256Hex(accessToken) === order.guest_access_token_hash
    ) {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Access denied. Private order records require customer ownership or the Private Guest Tracking Key.",
      },
      { status: 403 }
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
    `SELECT code, name_en, name_ar, recipient_name, receiving_account, instructions_en, instructions_ar
     FROM payment_methods WHERE code = ?`,
    [order.payment_method_code]
  );
  const submissions = queryAll<any>(
    db,
    `SELECT id, payment_method_code, transaction_reference, sender_identifier, transfer_date, transfer_amount, status, admin_notes, reviewed_at, created_at
     FROM payment_submissions WHERE order_id = ? ORDER BY created_at DESC`,
    [order.id]
  );
  const invoice = queryOne<any>(db, `SELECT * FROM invoices WHERE order_id = ?`, [order.id]);
  const shipments = queryAll<any>(db, `SELECT * FROM shipments WHERE order_id = ? ORDER BY shipped_at DESC`, [
    order.id,
  ]);
  const revisions = queryAll<any>(
    db,
    `SELECT * FROM order_revisions WHERE order_id = ? ORDER BY revision_number DESC`,
    [order.id]
  );
  const editLogs = queryAll<any>(
    db,
    `SELECT * FROM order_edit_logs WHERE order_id = ? ORDER BY created_at DESC`,
    [order.id]
  );
  const invoiceRevisions = queryAll<any>(
    db,
    `SELECT * FROM invoice_revisions WHERE order_id = ? ORDER BY revision_number DESC`,
    [order.id]
  );

  return NextResponse.json(
    {
      ok: true,
      order,
      items,
      history,
      paymentMethod,
      submissions,
      invoice,
      shipments,
      revisions,
      editLogs,
      invoiceRevisions,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;
    const db = await getDb();
    const customer = await getCurrentCustomer();
    const admin = await getCurrentAdmin();
    const guest = await getOrCreateGuestSession(false);
    const now = new Date().toISOString();

    if (action === "report_payment") {
      const orderNumber = String(body.orderNumber || "").trim().toUpperCase();
      const accessToken = String(body.accessToken || "").trim();
      const transactionReference = String(body.transactionReference || "").trim();
      const senderIdentifier = String(body.senderIdentifier || "").trim();
      const transferDate = String(body.transferDate || now).trim();
      const transferAmount = Number(body.transferAmount || 0);
      const receiptBase64 = String(body.receiptBase64 || "");
      const receiptFileName = String(body.receiptFileName || "receipt.jpg");

      const order = queryOne<any>(db, `SELECT * FROM orders WHERE UPPER(order_number) = ?`, [orderNumber]);
      if (!order) {
        return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
      }

      if (!verifyOrderAccess(db, order, customer, admin, guest, accessToken)) {
        return NextResponse.json({ ok: false, error: "Unauthorized order access." }, { status: 403 });
      }

      if (!transactionReference || !senderIdentifier || transferAmount <= 0) {
        return NextResponse.json(
          { ok: false, error: "Please enter the Transaction Reference, Sender Number/Account, and Amount." },
          { status: 400 }
        );
      }

      // Save optional receipt in protected private storage (data/receipts), NEVER in public folder
      let savedReceiptPath = "";
      if (receiptBase64 && receiptBase64.includes("base64,")) {
        const receiptsDir = path.join(process.cwd(), "data", "receipts");
        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }
        const ext = path.extname(receiptFileName).replace(/[^a-zA-Z0-9.]/g, "") || ".jpg";
        const safeFile = `rcpt-${order.order_number}-${Date.now()}${ext}`;
        const fullPath = path.join(receiptsDir, safeFile);
        const base64Data = receiptBase64.split("base64,")[1];
        fs.writeFileSync(fullPath, Buffer.from(base64Data, "base64"));
        savedReceiptPath = safeFile;
      }

      const subId = generateId("psub");
      runSql(
        db,
        `INSERT INTO payment_submissions (
          id, order_id, payment_method_code, transaction_reference,
          sender_identifier, transfer_date, transfer_amount, receipt_file_path,
          status, admin_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNDER_REVIEW', '', ?)`,
        [
          subId,
          order.id,
          order.payment_method_code,
          transactionReference,
          senderIdentifier,
          transferDate,
          transferAmount,
          savedReceiptPath,
          now,
        ]
      );

      // Set status to UNDER_REVIEW / PAYMENT_UNDER_REVIEW (NEVER automatically PAID)
      const prevPayStatus = order.payment_status;
      const prevOrdStatus = order.order_status;

      runSql(
        db,
        `UPDATE orders
         SET payment_status = 'UNDER_REVIEW',
             order_status = CASE WHEN order_status = 'PENDING_PAYMENT' THEN 'PAYMENT_UNDER_REVIEW' ELSE order_status END,
             updated_at = ?
         WHERE id = ?`,
        [now, order.id]
      );

      runSql(db, `UPDATE invoices SET payment_status = 'UNDER_REVIEW' WHERE order_id = ?`, [order.id]);

      runSql(
        db,
        `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, created_at)
         VALUES (?, ?, 'PAYMENT_STATUS', ?, 'UNDER_REVIEW', ?, ?)`,
        [
          generateId("osh"),
          order.id,
          prevPayStatus,
          `Customer submitted payment report (Ref: ${transactionReference})`,
          now,
        ]
      );

      if (prevOrdStatus === "PENDING_PAYMENT") {
        runSql(
          db,
          `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, created_at)
           VALUES (?, ?, 'ORDER_STATUS', 'PENDING_PAYMENT', 'PAYMENT_UNDER_REVIEW', 'Awaiting admin payment verification', ?)`,
          [generateId("osh"), order.id, now]
        );
      }

      // Notify Customer & Admin
      if (order.user_id) {
        runSql(
          db,
          `INSERT INTO notifications (
            id, recipient_type, recipient_user_id, order_id, event_type,
            title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
          ) VALUES (?, 'CUSTOMER', ?, ?, 'PAYMENT_REPORT_SUBMITTED', ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
          [
            generateId("notif"),
            order.user_id,
            order.id,
            `Payment Report Received (${order.order_number})`,
            `تم استلام إشعار الدفع (${order.order_number})`,
            `Your transfer reference (${transactionReference}) is currently under review by U3 STORE.`,
            `بيانات التحويل برقم مرجعي (${transactionReference}) قيد المراجعة حالياً من إدارة U3 STORE.`,
            now,
          ]
        );
      }

      runSql(
        db,
        `INSERT INTO notifications (
          id, recipient_type, recipient_user_id, order_id, event_type,
          title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
        ) VALUES (?, 'ADMIN', NULL, ?, 'CUSTOMER_REPORTED_PAYMENT', ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
        [
          generateId("notif"),
          order.id,
          `Payment Awaiting Verification: ${order.order_number}`,
          `دفعة بانتظار المراجعة: ${order.order_number}`,
          `${order.customer_name} reported EGP ${transferAmount} via ${order.payment_method_code} (Ref: ${transactionReference}).`,
          `أبلغ العميل ${order.customer_name} عن تحويل ${transferAmount} ج.م عبر ${order.payment_method_code} (مرجع: ${transactionReference}).`,
          now,
        ]
      );

      queueWhatsAppNotification(db, {
        eventType: "PAYMENT_REPORT_SUBMITTED",
        recipientPhone: order.customer_phone,
        userId: order.user_id || null,
        orderId: order.id,
        lang: order.language_used === "ar" ? "ar" : "en",
        variables: {
          customer_name: order.customer_name,
          order_number: order.order_number,
          total_amount: transferAmount,
          payment_method: order.payment_method_code === "VODAFONE_CASH" ? "Vodafone Cash" : "InstaPay",
        },
      });

      persistDb(db);
      return NextResponse.json(
        { ok: true, submissionId: subId },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
