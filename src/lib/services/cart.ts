import { Database } from "sql.js";
import { getDb, queryOne, queryAll, runSql, persistDb } from "@/lib/db";
import {
  getCurrentCustomer,
  getOrCreateGuestSession,
  generateId,
} from "@/lib/auth/session";
import { releaseExpiredReservations } from "./commerce";

export interface HydratedCartItem {
  id: string;
  productId: string;
  variantId: string;
  productType?: string;
  sku: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  imageUrl: string;
  size: string;
  colorEn: string;
  colorAr: string;
  colorHex: string;
  regularPrice: number;
  finalPrice: number;
  discountPerUnit: number;
  quantity: number;
  availableStock: number;
  lineSubtotal: number;
}

export interface HydratedCart {
  cartId: string;
  ownerType: "CUSTOMER" | "GUEST" | "NONE";
  ownerId: string;
  items: HydratedCartItem[];
  subtotal: number;
  itemDiscountTotal: number;
  couponCode: string;
  couponDiscount: number;
  finalSubtotalAfterDiscount: number;
}

export async function getPrivateCart(createIfMissing = false): Promise<HydratedCart> {
  const db = await getDb();
  releaseExpiredReservations(db);

  const customer = await getCurrentCustomer();
  let guest = null;
  if (!customer) {
    guest = await getOrCreateGuestSession(createIfMissing);
  }

  let cartRow: any = null;
  const now = new Date().toISOString();

  if (customer) {
    cartRow = queryOne<any>(db, `SELECT * FROM carts WHERE user_id = ?`, [customer.id]);
    if (!cartRow && createIfMissing) {
      const cartId = generateId("cart");
      runSql(
        db,
        `INSERT INTO carts (id, user_id, guest_session_id, coupon_code, updated_at, created_at)
         VALUES (?, ?, NULL, '', ?, ?)`,
        [cartId, customer.id, now, now]
      );
      persistDb(db);
      cartRow = { id: cartId, user_id: customer.id, coupon_code: "" };
    }
  } else if (guest) {
    cartRow = queryOne<any>(db, `SELECT * FROM carts WHERE guest_session_id = ?`, [guest.id]);
    if (!cartRow && createIfMissing) {
      const cartId = generateId("cart");
      runSql(
        db,
        `INSERT INTO carts (id, user_id, guest_session_id, coupon_code, updated_at, created_at)
         VALUES (?, NULL, ?, '', ?, ?)`,
        [cartId, guest.id, now, now]
      );
      persistDb(db);
      cartRow = { id: cartId, guest_session_id: guest.id, coupon_code: "" };
    }
  }

  if (!cartRow) {
    return {
      cartId: "",
      ownerType: customer ? "CUSTOMER" : guest ? "GUEST" : "NONE",
      ownerId: customer?.id || guest?.id || "",
      items: [],
      subtotal: 0,
      itemDiscountTotal: 0,
      couponCode: "",
      couponDiscount: 0,
      finalSubtotalAfterDiscount: 0,
    };
  }

  return hydrateCartById(
    db,
    cartRow.id,
    customer ? "CUSTOMER" : "GUEST",
    customer?.id || guest?.id || "",
    cartRow.coupon_code || ""
  );
}

export function hydrateCartById(
  db: Database,
  cartId: string,
  ownerType: "CUSTOMER" | "GUEST",
  ownerId: string,
  couponCode = ""
): HydratedCart {
  const rows = queryAll<any>(
    db,
    `SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity,
            p.slug, p.product_type, p.regular_price, p.sale_price, p.status as product_status, p.category_id,
            pt_en.name as name_en, pt_ar.name as name_ar,
            pv.sku, pv.size, pv.color_en, pv.color_ar, pv.color_hex, pv.is_active as variant_active,
            COALESCE(inv.on_hand, 0) as on_hand, COALESCE(inv.reserved, 0) as reserved,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) as image_url
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     JOIN product_variants pv ON pv.id = ci.variant_id
     LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
     LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
     LEFT JOIN inventory inv ON inv.variant_id = pv.id
     WHERE ci.cart_id = ?`,
    [cartId]
  );

  const items: HydratedCartItem[] = [];
  let subtotal = 0;
  let itemDiscountTotal = 0;

  for (const r of rows) {
    if (r.product_status !== "ACTIVE" || !r.variant_active) continue;
    const availableStock = Math.max(0, Number(r.on_hand) - Number(r.reserved));
    const regularPrice = Number(r.regular_price);
    const hasSale = r.sale_price !== null && r.sale_price !== undefined && Number(r.sale_price) > 0 && Number(r.sale_price) < regularPrice;
    const finalPrice = hasSale ? Number(r.sale_price) : regularPrice;
    const discountPerUnit = Math.max(0, regularPrice - finalPrice);
    const qty = Math.max(1, Number(r.quantity));
    const lineSubtotal = finalPrice * qty;

    subtotal += lineSubtotal;
    itemDiscountTotal += discountPerUnit * qty;

    items.push({
      id: r.id,
      productId: r.product_id,
      variantId: r.variant_id,
      productType: r.product_type || "SHOES",
      sku: r.sku,
      slug: r.slug,
      nameEn: r.name_en || r.slug,
      nameAr: r.name_ar || r.name_en || r.slug,
      imageUrl: r.image_url || "/logo.jpg",
      size: r.size,
      colorEn: r.color_en,
      colorAr: r.color_ar || r.color_en,
      colorHex: r.color_hex || "#111111",
      regularPrice,
      finalPrice,
      discountPerUnit,
      quantity: qty,
      availableStock,
      lineSubtotal,
    });
  }

  const now = new Date().toISOString();

  // If cart has no items, ALWAYS purge any coupon_code from the DB!
  if (items.length === 0) {
    if (couponCode) {
      runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cartId]);
      persistDb(db);
    }
    return {
      cartId,
      ownerType,
      ownerId,
      items: [],
      subtotal: 0,
      itemDiscountTotal: 0,
      couponCode: "",
      couponDiscount: 0,
      finalSubtotalAfterDiscount: 0,
    };
  }

  let couponDiscount = 0;
  let validCouponCode = "";

  if (couponCode) {
    const coupon = queryOne<any>(
      db,
      `SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1`,
      [couponCode.trim()]
    );
    if (!coupon) {
      // Invalid/deleted coupon code: purge immediately from DB
      runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cartId]);
      persistDb(db);
      couponCode = "";
    } else {
      const startsOk = !coupon.starts_at || coupon.starts_at <= now;
      const expiresOk = !coupon.expires_at || coupon.expires_at >= now;
      const limitOk = !coupon.usage_limit || Number(coupon.used_count) < Number(coupon.usage_limit);
      const minSpendOk = subtotal >= Number(coupon.min_spend || 0);
      const eligibilityOk =
        coupon.customer_eligibility !== "REGISTERED_ONLY" || ownerType === "CUSTOMER";

      if (!startsOk || !expiresOk || !limitOk || !minSpendOk || !eligibilityOk) {
        // Eligibility no longer met: purge immediately from DB
        runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cartId]);
        persistDb(db);
        couponCode = "";
      } else {
        validCouponCode = coupon.code;
        if (coupon.discount_type === "PERCENTAGE") {
          couponDiscount = Math.round((subtotal * Number(coupon.discount_value)) / 100 * 100) / 100;
        } else {
          couponDiscount = Math.min(subtotal, Number(coupon.discount_value));
        }
      }
    }
  }

  const finalSubtotalAfterDiscount = Math.max(0, subtotal - couponDiscount);

  return {
    cartId,
    ownerType,
    ownerId,
    items,
    subtotal,
    itemDiscountTotal,
    couponCode: validCouponCode,
    couponDiscount,
    finalSubtotalAfterDiscount,
  };
}

