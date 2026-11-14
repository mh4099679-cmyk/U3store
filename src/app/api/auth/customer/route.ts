import { NextResponse } from "next/server";
import { getDb, queryOne, queryAll, runSql, persistDb } from "@/lib/db";
import { hashPasswordSync, verifyPasswordSync } from "@/lib/db/seed-data";
import {
  createCustomerAuthSession,
  destroyCustomerSession,
  destroyAllCustomerSessions,
  getCurrentCustomer,
  getOrCreateGuestSession,
  generateId,
  generateSecureToken,
  sha256Hex,
} from "@/lib/auth/session";
import { hydrateCartById } from "@/lib/services/cart";
import { queueWhatsAppNotification, saveWhatsAppConsent } from "@/lib/services/whatsapp";

export async function GET() {
  const customer = await getCurrentCustomer();
  const guest = await getOrCreateGuestSession(false);
  const db = await getDb();

  let hasGuestCartItems = false;
  if (guest) {
    const guestCart = queryOne<any>(db, `SELECT id FROM carts WHERE guest_session_id = ?`, [guest.id]);
    if (guestCart) {
      const countRow = queryOne<{ c: number }>(
        db,
        `SELECT COUNT(*) as c FROM cart_items WHERE cart_id = ?`,
        [guestCart.id]
      );
      hasGuestCartItems = Boolean(countRow && countRow.c > 0);
    }
  }

  return NextResponse.json(
    { ok: true, customer, hasGuestCartItems },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;
    const db = await getDb();
    const now = new Date().toISOString();

    if (action === "register") {
      const fullName = String(body.fullName || "").trim();
      const phone = String(body.phone || "").replace(/\D/g, "").slice(0, 11);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const confirmPassword = String(body.confirmPassword || "");
      const whatsappTransactionalConsent = body.whatsappTransactionalConsent !== false;
      const whatsappMarketingConsent = Boolean(body.whatsappMarketingConsent);
      const rememberMe = body.rememberMe !== false;

      if (!fullName || !phone || !email || !password) {
        return NextResponse.json({ ok: false, error: "جميع بيانات التسجيل مطلوبة." }, { status: 400 });
      }
      if (phone.length !== 11 || !phone.startsWith("01")) {
        return NextResponse.json(
          { ok: false, error: "يجب أن يتكون رقم الهاتف من 11 رقماً ويبدأ بـ 01 (مثال: 010xxxxxxxx)." },
          { status: 400 }
        );
      }
      if (password.length < 6) {
        return NextResponse.json({ ok: false, error: "Password must be at least 6 characters." }, { status: 400 });
      }
      if (password !== confirmPassword) {
        return NextResponse.json({ ok: false, error: "Passwords do not match." }, { status: 400 });
      }

      const existing = queryOne<any>(db, `SELECT id FROM users WHERE email = ?`, [email]);
      if (existing) {
        return NextResponse.json({ ok: false, error: "An account with this email already exists." }, { status: 400 });
      }

      const userId = generateId("usr");
      const passwordHash = hashPasswordSync(password);

      runSql(
        db,
        `INSERT INTO users (id, email, phone, password_hash, status, email_verified, phone_verified, preferred_language, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'ACTIVE', 0, 0, 'en', ?, ?)`,
        [userId, email, phone, passwordHash, now, now]
      );

      runSql(
        db,
        `INSERT INTO customer_profiles (user_id, full_name, internal_notes, total_orders, total_paid_spending, updated_at)
         VALUES (?, ?, '', 0, 0, ?)`,
        [userId, fullName, now]
      );

      saveWhatsAppConsent(db, {
        userId,
        phone,
        transactionalConsent: whatsappTransactionalConsent,
        marketingConsent: whatsappMarketingConsent,
        source: "REGISTRATION",
      });

      if (whatsappTransactionalConsent) {
        queueWhatsAppNotification(db, {
          eventType: "ACCOUNT_CREATED",
          recipientPhone: phone,
          customerName: fullName,
          language: "ar",
          variables: { email },
        });
      }

      // Admin notification for New Customer
      runSql(
        db,
        `INSERT INTO notifications (id, recipient_type, recipient_user_id, event_type, title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at)
         VALUES (?, 'ADMIN', NULL, 'NEW_CUSTOMER', 'New Customer Registered', 'تسجيل عميل جديد', ?, ?, 0, 'INTERNAL_ONLY', ?)`,
        [
          generateId("notif"),
          `${fullName} (${email}) registered an account.`,
          `قام العميل ${fullName} (${email}) بإنشاء حساب جديد.`,
          now,
        ]
      );

      persistDb(db);
      await createCustomerAuthSession(userId, rememberMe ? 30 : 1);

      // Check if current device has guest cart items to offer merge
      const guest = await getOrCreateGuestSession(false);
      let guestItemsCount = 0;
      if (guest) {
        const guestCart = queryOne<any>(db, `SELECT id FROM carts WHERE guest_session_id = ?`, [guest.id]);
        if (guestCart) {
          const c = queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM cart_items WHERE cart_id = ?`, [guestCart.id]);
          guestItemsCount = c?.c || 0;
        }
      }

      return NextResponse.json(
        { ok: true, userId, canOfferCartMerge: guestItemsCount > 0, guestItemsCount },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "login") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      const user = queryOne<any>(db, `SELECT * FROM users WHERE email = ?`, [email]);
      if (!user || !verifyPasswordSync(password, user.password_hash)) {
        return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
      }
      if (user.status !== "ACTIVE") {
        return NextResponse.json({ ok: false, error: "This account is currently suspended." }, { status: 403 });
      }

      await createCustomerAuthSession(user.id);

      const guest = await getOrCreateGuestSession(false);
      let guestItemsCount = 0;
      if (guest) {
        const guestCart = queryOne<any>(db, `SELECT id FROM carts WHERE guest_session_id = ?`, [guest.id]);
        if (guestCart) {
          const c = queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM cart_items WHERE cart_id = ?`, [guestCart.id]);
          guestItemsCount = c?.c || 0;
        }
      }

      return NextResponse.json(
        { ok: true, userId: user.id, canOfferCartMerge: guestItemsCount > 0, guestItemsCount },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "logout") {
      await destroyCustomerSession();
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "logout_all_devices") {
      const customer = await getCurrentCustomer();
      if (!customer) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
      await destroyAllCustomerSessions(customer.id);
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "merge_guest_cart") {
      const customer = await getCurrentCustomer();
      if (!customer) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
      const guest = await getOrCreateGuestSession(false);
      if (!guest) {
        return NextResponse.json({ ok: true, merged: 0 });
      }

      const guestCart = queryOne<any>(db, `SELECT * FROM carts WHERE guest_session_id = ?`, [guest.id]);
      if (!guestCart) {
        return NextResponse.json({ ok: true, merged: 0 });
      }

      const hydratedGuest = hydrateCartById(db, guestCart.id, "GUEST", guest.id);
      let customerCart = queryOne<any>(db, `SELECT * FROM carts WHERE user_id = ?`, [customer.id]);
      if (!customerCart) {
        const newId = generateId("cart");
        runSql(
          db,
          `INSERT INTO carts (id, user_id, guest_session_id, coupon_code, updated_at, created_at)
           VALUES (?, ?, NULL, ?, ?, ?)`,
          [newId, customer.id, guestCart.coupon_code || "", now, now]
        );
        customerCart = { id: newId };
      }

      let mergedCount = 0;
      for (const item of hydratedGuest.items) {
        if (item.availableStock <= 0) continue;
        const existingItem = queryOne<any>(
          db,
          `SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
          [customerCart.id, item.variantId]
        );
        if (existingItem) {
          const newQty = Math.min(item.availableStock, Number(existingItem.quantity) + item.quantity);
          runSql(db, `UPDATE cart_items SET quantity = ? WHERE id = ?`, [newQty, existingItem.id]);
        } else {
          const validQty = Math.min(item.availableStock, item.quantity);
          runSql(
            db,
            `INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [generateId("ci"), customerCart.id, item.productId, item.variantId, validQty, now]
          );
        }
        mergedCount++;
      }

      // Clear guest cart after explicit merge
      runSql(db, `DELETE FROM cart_items WHERE cart_id = ?`, [guestCart.id]);
      persistDb(db);

      return NextResponse.json(
        { ok: true, merged: mergedCount },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "dismiss_guest_cart") {
      const guest = await getOrCreateGuestSession(false);
      if (guest) {
        const guestCart = queryOne<any>(db, `SELECT id FROM carts WHERE guest_session_id = ?`, [guest.id]);
        if (guestCart) {
          runSql(db, `DELETE FROM cart_items WHERE cart_id = ?`, [guestCart.id]);
          persistDb(db);
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "update_profile") {
      const customer = await getCurrentCustomer();
      if (!customer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

      const fullName = String(body.fullName || "").trim();
      const phone = String(body.phone || "").trim();
      if (!fullName || !phone) {
        return NextResponse.json({ ok: false, error: "Name and phone are required." }, { status: 400 });
      }
      runSql(db, `UPDATE users SET phone = ?, updated_at = ? WHERE id = ?`, [phone, now, customer.id]);
      runSql(db, `UPDATE customer_profiles SET full_name = ?, updated_at = ? WHERE user_id = ?`, [
        fullName,
        now,
        customer.id,
      ]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "change_password") {
      const customer = await getCurrentCustomer();
      if (!customer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      if (newPassword.length < 6) {
        return NextResponse.json({ ok: false, error: "New password must be at least 6 characters." }, { status: 400 });
      }
      const userRow = queryOne<any>(db, `SELECT password_hash FROM users WHERE id = ?`, [customer.id]);
      if (!userRow || !verifyPasswordSync(currentPassword, userRow.password_hash)) {
        return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 400 });
      }
      runSql(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
        hashPasswordSync(newPassword),
        now,
        customer.id,
      ]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "request_password_reset") {
      const email = String(body.email || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const newPassword = String(body.newPassword || "");

      const user = queryOne<any>(db, `SELECT * FROM users WHERE email = ? AND phone = ?`, [email, phone]);
      if (!user) {
        return NextResponse.json(
          { ok: false, error: "No matching account found with both that email and phone number." },
          { status: 404 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ ok: false, error: "New password must be at least 6 characters." }, { status: 400 });
      }
      runSql(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
        hashPasswordSync(newPassword),
        now,
        user.id,
      ]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "claim_guest_order") {
      const customer = await getCurrentCustomer();
      if (!customer) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

      const orderNumber = String(body.orderNumber || "").trim().toUpperCase();
      const accessToken = String(body.accessToken || "").trim();
      if (!orderNumber || !accessToken) {
        return NextResponse.json(
          { ok: false, error: "Order Number and Private Guest Tracking Key are required." },
          { status: 400 }
        );
      }

      const order = queryOne<any>(
        db,
        `SELECT * FROM orders WHERE UPPER(order_number) = ? AND guest_access_token_hash = ?`,
        [orderNumber, sha256Hex(accessToken)]
      );
      if (!order) {
        return NextResponse.json(
          { ok: false, error: "Invalid Order Number or Private Tracking Key." },
          { status: 404 }
        );
      }
      if (order.user_id && order.user_id !== customer.id) {
        return NextResponse.json(
          { ok: false, error: "This order is already linked to another account." },
          { status: 403 }
        );
      }

      runSql(db, `UPDATE orders SET user_id = ?, customer_type = 'REGISTERED', updated_at = ? WHERE id = ?`, [
        customer.id,
        now,
        order.id,
      ]);
      if (order.guest_customer_id) {
        runSql(db, `UPDATE guest_customers SET claimed_by_user_id = ? WHERE id = ?`, [
          customer.id,
          order.guest_customer_id,
        ]);
      }
      persistDb(db);
      return NextResponse.json({ ok: true, orderId: order.id });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

