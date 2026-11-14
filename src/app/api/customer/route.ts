import { NextResponse } from "next/server";
import { getDb, queryAll, queryOne, runSql, persistDb } from "@/lib/db";
import { getCurrentCustomer, generateId } from "@/lib/auth/session";
import { queueWhatsAppNotification } from "@/lib/services/whatsapp";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const addresses = queryAll<any>(
    db,
    `SELECT ca.*, g.name_en as gov_name_en, g.name_ar as gov_name_ar,
            c.name_en as city_name_en, c.name_ar as city_name_ar,
            a.name_en as area_name_en, a.name_ar as area_name_ar
     FROM customer_addresses ca
     LEFT JOIN governorates g ON g.id = ca.governorate_id
     LEFT JOIN cities c ON c.id = ca.city_id
     LEFT JOIN areas a ON a.id = ca.area_id
     WHERE ca.user_id = ?
     ORDER BY ca.is_default DESC, ca.created_at DESC`,
    [customer.id]
  );

  const returns = queryAll<any>(
    db,
    `SELECT rr.*, o.order_number
     FROM return_requests rr
     JOIN orders o ON o.id = rr.order_id
     WHERE rr.user_id = ?
     ORDER BY rr.created_at DESC`,
    [customer.id]
  );

  const notifications = queryAll<any>(
    db,
    `SELECT * FROM notifications
     WHERE recipient_type = 'CUSTOMER' AND recipient_user_id = ?
     ORDER BY created_at DESC LIMIT 50`,
    [customer.id]
  );

  return NextResponse.json(
    { ok: true, customer, addresses, returns, notifications },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: Request) {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action;
    const db = await getDb();
    const now = new Date().toISOString();

    if (action === "save_address") {
      const id = String(body.id || "").trim();
      const label = String(body.label || "Home").trim();
      const fullName = String(body.fullName || customer.fullName).trim();
      const phone = String(body.phone || customer.phone).trim();
      const governorateId = String(body.governorateId || "").trim();
      const cityId = String(body.cityId || "").trim();
      const areaId = String(body.areaId || "").trim();
      const streetAddress = String(body.streetAddress || "").trim();
      const buildingNumber = String(body.buildingNumber || "").trim();
      const floorNumber = String(body.floorNumber || "").trim();
      const apartmentNumber = String(body.apartmentNumber || "").trim();
      const landmark = String(body.landmark || "").trim();
      const notes = String(body.notes || "").trim();
      const isDefault = body.isDefault ? 1 : 0;

      if (!governorateId || !streetAddress || !buildingNumber) {
        return NextResponse.json(
          { ok: false, error: "Governorate, Street Address, and Building Number are required." },
          { status: 400 }
        );
      }

      if (isDefault) {
        runSql(db, `UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?`, [customer.id]);
      }

      if (id) {
        runSql(
          db,
          `UPDATE customer_addresses
           SET label = ?, full_name = ?, phone = ?, governorate_id = ?, city_id = ?, area_id = ?,
               street_address = ?, building_number = ?, floor_number = ?, apartment_number = ?,
               landmark = ?, notes = ?, is_default = ?
           WHERE id = ? AND user_id = ?`,
          [
            label,
            fullName,
            phone,
            governorateId,
            cityId,
            areaId,
            streetAddress,
            buildingNumber,
            floorNumber,
            apartmentNumber,
            landmark,
            notes,
            isDefault,
            id,
            customer.id,
          ]
        );
      } else {
        runSql(
          db,
          `INSERT INTO customer_addresses (
            id, user_id, label, full_name, phone, governorate_id, city_id, area_id,
            street_address, building_number, floor_number, apartment_number,
            landmark, notes, is_default, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId("addr"),
            customer.id,
            label,
            fullName,
            phone,
            governorateId,
            cityId,
            areaId,
            streetAddress,
            buildingNumber,
            floorNumber,
            apartmentNumber,
            landmark,
            notes,
            isDefault,
            now,
          ]
        );
      }
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_address") {
      const id = String(body.id || "");
      runSql(db, `DELETE FROM customer_addresses WHERE id = ? AND user_id = ?`, [id, customer.id]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "set_default_address") {
      const id = String(body.id || "");
      runSql(db, `UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?`, [customer.id]);
      runSql(db, `UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND user_id = ?`, [
        id,
        customer.id,
      ]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "request_return") {
      const orderId = String(body.orderId || "");
      const requestType = body.requestType === "EXCHANGE" ? "EXCHANGE" : "RETURN";
      const reason = String(body.reason || "").trim();
      const customerComments = String(body.customerComments || "").trim();
      const selectedItems: Array<{ orderItemId: string; quantity: number }> = Array.isArray(
        body.items
      )
        ? body.items
        : [];

      const order = queryOne<any>(db, `SELECT * FROM orders WHERE id = ? AND user_id = ?`, [
        orderId,
        customer.id,
      ]);
      if (!order) {
        return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
      }
      if (!reason || selectedItems.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Please select at least one item and provide a reason." },
          { status: 400 }
        );
      }

      const retId = generateId("ret");
      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

      runSql(
        db,
        `INSERT INTO return_requests (
          id, return_number, order_id, user_id, request_type, reason, customer_comments,
          status, stock_restored, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUESTED', 0, ?, ?)`,
        [retId, returnNumber, order.id, customer.id, requestType, reason, customerComments, now, now]
      );

      for (const si of selectedItems) {
        const oi = queryOne<any>(
          db,
          `SELECT * FROM order_items WHERE id = ? AND order_id = ?`,
          [si.orderItemId, order.id]
        );
        if (oi) {
          runSql(
            db,
            `INSERT INTO return_items (id, return_request_id, order_item_id, variant_id, quantity)
             VALUES (?, ?, ?, ?, ?)`,
            [
              generateId("ri"),
              retId,
              oi.id,
              oi.variant_id,
              Math.min(Number(oi.quantity), Math.max(1, Number(si.quantity || 1))),
            ]
          );
        }
      }

      runSql(db, `UPDATE orders SET order_status = 'RETURN_REQUESTED', updated_at = ? WHERE id = ?`, [
        now,
        order.id,
      ]);

      runSql(
        db,
        `INSERT INTO notifications (
          id, recipient_type, recipient_user_id, order_id, event_type,
          title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
        ) VALUES (?, 'ADMIN', NULL, ?, 'RETURN_REQUEST', ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
        [
          generateId("notif"),
          order.id,
          `Return/Exchange Request (${returnNumber})`,
          `طلب استرجاع/استبدال (${returnNumber})`,
          `Customer ${customer.fullName} requested a ${requestType} for order ${order.order_number}.`,
          `قدم العميل ${customer.fullName} طلب ${requestType === "EXCHANGE" ? "استبدال" : "استرجاع"} للطلب ${order.order_number}.`,
          now,
        ]
      );

      queueWhatsAppNotification(db, {
        eventType: "RETURN_REQUEST_RECEIVED",
        recipientPhone: order.customer_phone,
        userId: customer.id,
        orderId: order.id,
        lang: order.language_used === "ar" ? "ar" : "en",
        variables: {
          customer_name: order.customer_name,
          order_number: order.order_number,
        },
      });

      persistDb(db);
      return NextResponse.json({ ok: true, returnNumber, returnId: retId });
    }

    if (action === "mark_notifications_read") {
      runSql(
        db,
        `UPDATE notifications SET is_read = 1 WHERE recipient_type = 'CUSTOMER' AND recipient_user_id = ?`,
        [customer.id]
      );
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

