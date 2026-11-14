import { Database } from "sql.js";
import { getDb, queryOne, queryAll, runSql } from "@/lib/db";
import { generateId, sha256Hex } from "@/lib/auth/session";

export function verifyOrderAccess(
  db: any,
  order: any,
  customer: any,
  admin: any,
  guest: any,
  providedAccessToken = ""
): boolean {
  if (!order) return false;
  if (admin) return true;
  if (customer && order.user_id && order.user_id === customer.id) return true;
  if (providedAccessToken && sha256Hex(providedAccessToken.trim()) === order.guest_access_token_hash) {
    return true;
  }
  if (guest && order.guest_session_id && order.guest_session_id === guest.id) {
    return true;
  }
  return false;
}

export interface ShippingCalculationResult {
  allowed: boolean;
  errorEn?: string;
  errorAr?: string;
  governorate: { id: string; name_en: string; name_ar: string } | null;
  city: { id: string; name_en: string; name_ar: string } | null;
  area: { id: string; name_en: string; name_ar: string } | null;
  appliedLevel: "AREA" | "CITY" | "GOVERNORATE" | "DEFAULT" | "FREE_THRESHOLD" | "UNCONFIGURED";
  shippingFee: number;
  additionalFees: number;
  estimatedDaysEn: string;
  estimatedDaysAr: string;
}

/**
 * Calculates shipping rate strictly on the server following priority:
 * 1. Area-specific rate
 * 2. City-specific rate
 * 3. Governorate rate
 * 4. Default rate
 * Also respects free shipping threshold, minimum order value, and disabled locations.
 */
export function calculateShippingServer(
  db: Database,
  params: {
    governorateId: string;
    cityId?: string;
    cityName?: string;
    areaId?: string;
    areaName?: string;
    subtotalAfterDiscount: number;
    shippingMethod?: "STANDARD" | "EXPRESS";
  }
): ShippingCalculationResult {
  const rules = queryOne<any>(db, `SELECT * FROM shipping_rules WHERE id = 'default'`) || {
    free_shipping_threshold: null,
    minimum_order_value: 0,
    default_shipping_rate: null,
    express_delivery_enabled: 0,
    special_handling_fee: 0,
  };

  if (rules.minimum_order_value && params.subtotalAfterDiscount < Number(rules.minimum_order_value)) {
    return {
      allowed: false,
      errorEn: `Minimum order value is EGP ${rules.minimum_order_value}`,
      errorAr: `الحد الأدنى لقيمة الطلب هو ${rules.minimum_order_value} ج.م`,
      governorate: null,
      city: null,
      area: null,
      appliedLevel: "UNCONFIGURED",
      shippingFee: 0,
      additionalFees: 0,
      estimatedDaysEn: "",
      estimatedDaysAr: "",
    };
  }

  const gov = queryOne<any>(db, `SELECT * FROM governorates WHERE id = ?`, [params.governorateId]);
  if (!gov) {
    return {
      allowed: false,
      errorEn: "Please select a valid Egyptian governorate.",
      errorAr: "يرجى اختيار محافظة صحيحة.",
      governorate: null,
      city: null,
      area: null,
      appliedLevel: "UNCONFIGURED",
      shippingFee: 0,
      additionalFees: 0,
      estimatedDaysEn: "",
      estimatedDaysAr: "",
    };
  }

  if (!gov.is_enabled) {
    return {
      allowed: false,
      errorEn: `Delivery to ${gov.name_en} is temporarily disabled.`,
      errorAr: `التوصيل إلى محافظة ${gov.name_ar} متوقف مؤقتاً.`,
      governorate: { id: gov.id, name_en: gov.name_en, name_ar: gov.name_ar },
      city: null,
      area: null,
      appliedLevel: "UNCONFIGURED",
      shippingFee: 0,
      additionalFees: 0,
      estimatedDaysEn: "",
      estimatedDaysAr: "",
    };
  }

  let city: any = null;
  if (params.cityId) {
    city = queryOne<any>(db, `SELECT * FROM cities WHERE id = ? AND governorate_id = ?`, [
      params.cityId,
      gov.id,
    ]);
    if (city && !city.is_enabled) {
      return {
        allowed: false,
        errorEn: `Delivery to ${city.name_en} is temporarily disabled.`,
        errorAr: `التوصيل إلى مدينة ${city.name_ar} متوقف مؤقتاً.`,
        governorate: { id: gov.id, name_en: gov.name_en, name_ar: gov.name_ar },
        city: { id: city.id, name_en: city.name_en, name_ar: city.name_ar },
        area: null,
        appliedLevel: "UNCONFIGURED",
        shippingFee: 0,
        additionalFees: 0,
        estimatedDaysEn: "",
        estimatedDaysAr: "",
      };
    }
  }

  let area: any = null;
  if (params.areaId && city) {
    area = queryOne<any>(db, `SELECT * FROM areas WHERE id = ? AND city_id = ?`, [
      params.areaId,
      city.id,
    ]);
    if (area && !area.is_enabled) {
      return {
        allowed: false,
        errorEn: `Delivery to ${area.name_en} is temporarily disabled.`,
        errorAr: `التوصيل إلى منطقة ${area.name_ar} متوقف مؤقتاً.`,
        governorate: { id: gov.id, name_en: gov.name_en, name_ar: gov.name_ar },
        city: { id: city.id, name_en: city.name_en, name_ar: city.name_ar },
        area: { id: area.id, name_en: area.name_en, name_ar: area.name_ar },
        appliedLevel: "UNCONFIGURED",
        shippingFee: 0,
        additionalFees: 0,
        estimatedDaysEn: "",
        estimatedDaysAr: "",
      };
    }
  }

  // Priority: Area -> City -> Governorate -> Default
  let baseRate: number | null = null;
  let appliedLevel: ShippingCalculationResult["appliedLevel"] = "UNCONFIGURED";

  if (area && area.shipping_rate !== null && area.shipping_rate !== undefined && area.shipping_rate !== "") {
    baseRate = Number(area.shipping_rate);
    appliedLevel = "AREA";
  } else if (city && city.shipping_rate !== null && city.shipping_rate !== undefined && city.shipping_rate !== "") {
    baseRate = Number(city.shipping_rate);
    appliedLevel = "CITY";
  } else if (gov.shipping_rate !== null && gov.shipping_rate !== undefined && gov.shipping_rate !== "") {
    baseRate = Number(gov.shipping_rate);
    appliedLevel = "GOVERNORATE";
  } else if (
    rules.default_shipping_rate !== null &&
    rules.default_shipping_rate !== undefined &&
    rules.default_shipping_rate !== ""
  ) {
    baseRate = Number(rules.default_shipping_rate);
    appliedLevel = "DEFAULT";
  }

  if (baseRate === null || Number.isNaN(baseRate) || baseRate < 0) {
    return {
      allowed: false,
      errorEn: `Shipping price for ${gov.name_en} is not configured yet. Please configure it in Admin → Shipping.`,
      errorAr: `لم يتم تحديد سعر الشحن لمحافظة ${gov.name_ar} حتى الآن. يرجى ضبط السعر من لوحة الإدارة ← الشحن.`,
      governorate: { id: gov.id, name_en: gov.name_en, name_ar: gov.name_ar },
      city: city ? { id: city.id, name_en: city.name_en, name_ar: city.name_ar } : null,
      area: area ? { id: area.id, name_en: area.name_en, name_ar: area.name_ar } : null,
      appliedLevel: "UNCONFIGURED",
      shippingFee: 0,
      additionalFees: 0,
      estimatedDaysEn: gov.estimated_days_en || "2-4 Business Days",
      estimatedDaysAr: gov.estimated_days_ar || "٢-٤ أيام عمل",
    };
  }

  // Check free shipping threshold
  let finalShippingFee = baseRate;
  if (
    rules.free_shipping_threshold !== null &&
    rules.free_shipping_threshold !== undefined &&
    Number(rules.free_shipping_threshold) > 0 &&
    params.subtotalAfterDiscount >= Number(rules.free_shipping_threshold)
  ) {
    finalShippingFee = 0;
    appliedLevel = "FREE_THRESHOLD";
  }

  // Check express delivery surcharge if requested and enabled
  if (
    params.shippingMethod === "EXPRESS" &&
    rules.express_delivery_enabled &&
    gov.express_rate !== null &&
    gov.express_rate !== undefined
  ) {
    finalShippingFee = Number(gov.express_rate);
  }

  const estimatedDaysEn =
    (area && area.estimated_days_en) ||
    (city && city.estimated_days_en) ||
    gov.estimated_days_en ||
    "2-4 Business Days";
  const estimatedDaysAr =
    (area && area.estimated_days_ar) ||
    (city && city.estimated_days_ar) ||
    gov.estimated_days_ar ||
    "٢-٤ أيام عمل";

  return {
    allowed: true,
    governorate: { id: gov.id, name_en: gov.name_en, name_ar: gov.name_ar },
    city: city
      ? { id: city.id, name_en: city.name_en, name_ar: city.name_ar }
      : params.cityName || params.cityId
      ? {
          id: params.cityId || params.cityName || "",
          name_en: params.cityName || params.cityId || "",
          name_ar: params.cityName || params.cityId || "",
        }
      : null,
    area: area
      ? { id: area.id, name_en: area.name_en, name_ar: area.name_ar }
      : params.areaName || params.areaId
      ? {
          id: params.areaId || params.areaName || "",
          name_en: params.areaName || params.areaId || "",
          name_ar: params.areaName || params.areaId || "",
        }
      : null,
    appliedLevel,
    shippingFee: finalShippingFee,
    additionalFees: Number(rules.special_handling_fee || 0),
    estimatedDaysEn,
    estimatedDaysAr,
  };
}

/**
 * Releases expired inventory reservations safely so unpaid abandoned orders do not lock stock forever.
 */
export function releaseExpiredReservations(db: Database) {
  const now = new Date().toISOString();
  const expired = queryAll<any>(
    db,
    `SELECT r.id, r.order_id, r.variant_id, r.quantity, o.payment_status, o.order_status
     FROM inventory_reservations r
     JOIN orders o ON o.id = r.order_id
     WHERE r.status = 'ACTIVE' AND r.expires_at < ?`,
    [now]
  );

  for (const res of expired) {
    // Protect reservation if customer already reported payment and it is under review
    if (
      res.payment_status === "UNDER_REVIEW" ||
      res.payment_status === "CUSTOMER_REPORTED_PAYMENT" ||
      res.payment_status === "PAID"
    ) {
      continue;
    }

    const inv = queryOne<any>(db, `SELECT * FROM inventory WHERE variant_id = ?`, [res.variant_id]);
    if (inv) {
      const prevReserved = Number(inv.reserved || 0);
      const newReserved = Math.max(0, prevReserved - Number(res.quantity));
      runSql(db, `UPDATE inventory SET reserved = ?, updated_at = ? WHERE variant_id = ?`, [
        newReserved,
        now,
        res.variant_id,
      ]);
      runSql(
        db,
        `INSERT INTO inventory_movements (id, variant_id, movement_type, previous_on_hand, new_on_hand, previous_reserved, new_reserved, reason, related_order_id, created_at)
         VALUES (?, ?, 'RELEASE', ?, ?, ?, ?, 'Expired unpaid reservation released', ?, ?)`,
        [
          generateId("mov"),
          res.variant_id,
          inv.on_hand,
          inv.on_hand,
          prevReserved,
          newReserved,
          res.order_id,
          now,
        ]
      );
    }
    runSql(db, `UPDATE inventory_reservations SET status = 'RELEASED' WHERE id = ?`, [res.id]);
  }
}

export function generateUniqueOrderNumber(db: Database): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;

  runSql(db, `UPDATE store_settings SET order_sequence = order_sequence + 1 WHERE id = 'default'`);
  const row = queryOne<{ order_sequence: number }>(
    db,
    `SELECT order_sequence FROM store_settings WHERE id = 'default'`
  );
  const seq = String(row?.order_sequence || 1).padStart(5, "0");
  return `U3-${datePart}-${seq}`;
}

export function generateUniqueInvoiceNumber(db: Database): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;

  runSql(db, `UPDATE store_settings SET invoice_sequence = invoice_sequence + 1 WHERE id = 'default'`);
  const row = queryOne<{ invoice_sequence: number }>(
    db,
    `SELECT invoice_sequence FROM store_settings WHERE id = 'default'`
  );
  const seq = String(row?.invoice_sequence || 1).padStart(5, "0");
  return `INV-${datePart}-${seq}`;
}
