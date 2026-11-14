import { NextResponse } from "next/server";
import { getDb, queryOne, runSql, persistDb } from "@/lib/db";
import { getPrivateCart } from "@/lib/services/cart";
import { generateId } from "@/lib/auth/session";

export async function GET() {
  const cart = await getPrivateCart(false);
  return NextResponse.json(
    { ok: true, cart },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;
    const db = await getDb();
    const now = new Date().toISOString();

    // Ensure isolated cart exists for this device's guest session or logged-in customer
    const cart = await getPrivateCart(true);
    if (!cart.cartId) {
      return NextResponse.json({ ok: false, error: "Could not initialize private cart session." }, { status: 400 });
    }

    if (action === "add") {
      const productId = String(body.productId || "");
      const variantId = String(body.variantId || "");
      const quantity = Math.max(1, Number(body.quantity || 1));
      const isBuyNow = Boolean(body.buyNow);

      // CRITICAL: Buy Now starts a fresh dedicated checkout flow for that single product!
      // It must never carry over previous cart items or previous coupon codes!
      if (isBuyNow) {
        runSql(db, `DELETE FROM cart_items WHERE cart_id = ?`, [cart.cartId]);
        runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cart.cartId]);
      }

      const variant = queryOne<any>(
        db,
        `SELECT pv.*, p.status as product_status, COALESCE(inv.on_hand, 0) as on_hand, COALESCE(inv.reserved, 0) as reserved
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         LEFT JOIN inventory inv ON inv.variant_id = pv.id
         WHERE pv.id = ? AND pv.product_id = ?`,
        [variantId, productId]
      );

      if (!variant || variant.product_status !== "ACTIVE" || !variant.is_active) {
        return NextResponse.json({ ok: false, error: "Selected product variant is unavailable." }, { status: 400 });
      }

      const available = Math.max(0, Number(variant.on_hand) - Number(variant.reserved));
      if (available <= 0) {
        return NextResponse.json({ ok: false, error: "Selected size/color is currently out of stock." }, { status: 400 });
      }

      const existing = queryOne<any>(
        db,
        `SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
        [cart.cartId, variantId]
      );

      if (existing) {
        const nextQty = Number(existing.quantity) + quantity;
        if (nextQty > available) {
          return NextResponse.json(
            { ok: false, error: `Only ${available} units available in stock for this variant.` },
            { status: 400 }
          );
        }
        runSql(db, `UPDATE cart_items SET quantity = ? WHERE id = ?`, [nextQty, existing.id]);
      } else {
        if (quantity > available) {
          return NextResponse.json(
            { ok: false, error: `Only ${available} units available in stock for this variant.` },
            { status: 400 }
          );
        }
        runSql(
          db,
          `INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [generateId("ci"), cart.cartId, productId, variantId, quantity, now]
        );
      }

      runSql(db, `UPDATE carts SET updated_at = ? WHERE id = ?`, [now, cart.cartId]);
      persistDb(db);

      const updatedCart = await getPrivateCart(false);
      return NextResponse.json(
        { ok: true, cart: updatedCart },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "update_quantity") {
      const itemId = String(body.itemId || "");
      const quantity = Number(body.quantity || 1);

      const item = queryOne<any>(
        db,
        `SELECT ci.*, COALESCE(inv.on_hand, 0) as on_hand, COALESCE(inv.reserved, 0) as reserved
         FROM cart_items ci
         LEFT JOIN inventory inv ON inv.variant_id = ci.variant_id
         WHERE ci.id = ? AND ci.cart_id = ?`,
        [itemId, cart.cartId]
      );

      if (!item) {
        return NextResponse.json({ ok: false, error: "Item not found in your private cart." }, { status: 404 });
      }

      if (quantity <= 0) {
        runSql(db, `DELETE FROM cart_items WHERE id = ? AND cart_id = ?`, [itemId, cart.cartId]);
      } else {
        const available = Math.max(0, Number(item.on_hand) - Number(item.reserved));
        if (quantity > available) {
          return NextResponse.json(
            { ok: false, error: `Only ${available} units available in stock.` },
            { status: 400 }
          );
        }
        runSql(db, `UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?`, [
          quantity,
          itemId,
          cart.cartId,
        ]);
      }

      // Check remaining items count in cart
      const remainingCount = queryOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM cart_items WHERE cart_id = ?`,
        [cart.cartId]
      )?.count || 0;

      // If cart is now empty, immediately clear the coupon code from the database!
      if (remainingCount === 0) {
        runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cart.cartId]);
      } else {
        runSql(db, `UPDATE carts SET updated_at = ? WHERE id = ?`, [now, cart.cartId]);
      }
      persistDb(db);

      const updatedCart = await getPrivateCart(false);
      return NextResponse.json(
        { ok: true, cart: updatedCart },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "remove") {
      const itemId = String(body.itemId || "");
      runSql(db, `DELETE FROM cart_items WHERE id = ? AND cart_id = ?`, [itemId, cart.cartId]);

      // Check remaining items count in cart
      const remainingCount = queryOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM cart_items WHERE cart_id = ?`,
        [cart.cartId]
      )?.count || 0;

      // If cart is now empty, immediately clear the coupon code from the database!
      if (remainingCount === 0) {
        runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cart.cartId]);
      } else {
        runSql(db, `UPDATE carts SET updated_at = ? WHERE id = ?`, [now, cart.cartId]);
      }
      persistDb(db);

      const updatedCart = await getPrivateCart(false);
      return NextResponse.json(
        { ok: true, cart: updatedCart },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "clear") {
      runSql(db, `DELETE FROM cart_items WHERE cart_id = ?`, [cart.cartId]);
      runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cart.cartId]);
      persistDb(db);

      const updatedCart = await getPrivateCart(false);
      return NextResponse.json(
        { ok: true, cart: updatedCart },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "apply_coupon") {
      const code = String(body.code || "").trim().toUpperCase();
      if (!code) {
        runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cart.cartId]);
        persistDb(db);
        const updatedCart = await getPrivateCart(false);
        return NextResponse.json({ ok: true, cart: updatedCart });
      }

      const coupon = queryOne<any>(
        db,
        `SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1`,
        [code]
      );
      if (!coupon) {
        return NextResponse.json({ ok: false, error: "Invalid or inactive coupon code." }, { status: 400 });
      }
      if (coupon.starts_at && coupon.starts_at > now) {
        return NextResponse.json({ ok: false, error: "This coupon is not active yet." }, { status: 400 });
      }
      if (coupon.expires_at && coupon.expires_at < now) {
        return NextResponse.json({ ok: false, error: "This coupon has expired." }, { status: 400 });
      }
      if (coupon.usage_limit && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
        return NextResponse.json({ ok: false, error: "This coupon has reached its usage limit." }, { status: 400 });
      }
      if (coupon.customer_eligibility === "REGISTERED_ONLY" && cart.ownerType !== "CUSTOMER") {
        return NextResponse.json(
          { ok: false, error: "This coupon is exclusively for registered customers. Please sign in." },
          { status: 400 }
        );
      }
      if (cart.subtotal < Number(coupon.min_spend || 0)) {
        return NextResponse.json(
          { ok: false, error: `Minimum order subtotal for this coupon is EGP ${coupon.min_spend}.` },
          { status: 400 }
        );
      }

      runSql(db, `UPDATE carts SET coupon_code = ?, updated_at = ? WHERE id = ?`, [
        coupon.code,
        now,
        cart.cartId,
      ]);
      persistDb(db);

      const updatedCart = await getPrivateCart(false);
      return NextResponse.json(
        { ok: true, cart: updatedCart },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

