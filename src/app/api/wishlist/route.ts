import { NextResponse } from "next/server";
import { getDb, queryOne, queryAll, runSql, persistDb } from "@/lib/db";
import { getCurrentCustomer, getOrCreateGuestSession, generateId } from "@/lib/auth/session";

async function getPrivateWishlistId(createIfMissing = false): Promise<string | null> {
  const db = await getDb();
  const customer = await getCurrentCustomer();
  const now = new Date().toISOString();

  if (customer) {
    const row = queryOne<any>(db, `SELECT id FROM wishlists WHERE user_id = ?`, [customer.id]);
    if (row) return row.id;
    if (!createIfMissing) return null;
    const id = generateId("wl");
    runSql(db, `INSERT INTO wishlists (id, user_id, guest_session_id, created_at) VALUES (?, ?, NULL, ?)`, [
      id,
      customer.id,
      now,
    ]);
    persistDb(db);
    return id;
  }

  const guest = await getOrCreateGuestSession(createIfMissing);
  if (!guest) return null;
  const row = queryOne<any>(db, `SELECT id FROM wishlists WHERE guest_session_id = ?`, [guest.id]);
  if (row) return row.id;
  if (!createIfMissing) return null;
  const id = generateId("wl");
  runSql(db, `INSERT INTO wishlists (id, user_id, guest_session_id, created_at) VALUES (?, NULL, ?, ?)`, [
    id,
    guest.id,
    now,
  ]);
  persistDb(db);
  return id;
}

export async function GET() {
  const db = await getDb();
  const wlId = await getPrivateWishlistId(false);
  if (!wlId) {
    return NextResponse.json({ ok: true, items: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const items = queryAll<any>(
    db,
    `SELECT wi.id, wi.product_id, p.slug, p.regular_price, p.sale_price, p.status,
            pt_en.name as name_en, pt_ar.name as name_ar,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) as image_url
     FROM wishlist_items wi
     JOIN products p ON p.id = wi.product_id
     LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
     LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
     WHERE wi.wishlist_id = ? AND p.status = 'ACTIVE'`,
    [wlId]
  );

  return NextResponse.json({ ok: true, items }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId = String(body.productId || "");
    if (!productId) {
      return NextResponse.json({ ok: false, error: "Product ID required" }, { status: 400 });
    }

    const db = await getDb();
    const wlId = await getPrivateWishlistId(true);
    if (!wlId) {
      return NextResponse.json({ ok: false, error: "Could not initialize private wishlist" }, { status: 400 });
    }

    const existing = queryOne<any>(
      db,
      `SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?`,
      [wlId, productId]
    );

    if (existing) {
      runSql(db, `DELETE FROM wishlist_items WHERE id = ?`, [existing.id]);
      persistDb(db);
      return NextResponse.json(
        { ok: true, saved: false },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    } else {
      runSql(
        db,
        `INSERT INTO wishlist_items (id, wishlist_id, product_id, created_at) VALUES (?, ?, ?, ?)`,
        [generateId("wli"), wlId, productId, new Date().toISOString()]
      );
      persistDb(db);
      return NextResponse.json(
        { ok: true, saved: true },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

