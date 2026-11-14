import { NextResponse } from "next/server";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { calculateShippingServer } from "@/lib/services/commerce";
import { getPrivateCart } from "@/lib/services/cart";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const governorateId = searchParams.get("governorateId") || "";
  const cityId = searchParams.get("cityId") || "";
  const db = await getDb();

  const governorates = queryAll<any>(
    db,
    `SELECT * FROM governorates ORDER BY sort_order ASC, name_en ASC`
  );

  const cities = governorateId
    ? queryAll<any>(
        db,
        `SELECT * FROM cities WHERE governorate_id = ? AND is_enabled = 1 ORDER BY name_en ASC`,
        [governorateId]
      )
    : queryAll<any>(db, `SELECT * FROM cities WHERE is_enabled = 1 ORDER BY name_en ASC`);

  const areas = cityId
    ? queryAll<any>(
        db,
        `SELECT * FROM areas WHERE city_id = ? AND is_enabled = 1 ORDER BY name_en ASC`,
        [cityId]
      )
    : queryAll<any>(db, `SELECT * FROM areas WHERE is_enabled = 1 ORDER BY name_en ASC`);

  const rules = queryOne<any>(db, `SELECT * FROM shipping_rules WHERE id = 'default'`);

  return NextResponse.json(
    { ok: true, governorates, cities, areas, rules },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const governorateId = String(body.governorateId || "");
    const cityId = String(body.cityId || "");
    const areaId = String(body.areaId || "");
    const shippingMethod = body.shippingMethod === "EXPRESS" ? "EXPRESS" : "STANDARD";

    const db = await getDb();
    const cart = await getPrivateCart(false);

    const calc = calculateShippingServer(db, {
      governorateId,
      cityId,
      areaId,
      subtotalAfterDiscount: cart.finalSubtotalAfterDiscount,
      shippingMethod,
    });

    return NextResponse.json(
      {
        ok: true,
        calculation: calc,
        cartSubtotal: cart.subtotal,
        couponDiscount: cart.couponDiscount,
        finalTotal: calc.allowed
          ? cart.finalSubtotalAfterDiscount + calc.shippingFee + calc.additionalFees
          : cart.finalSubtotalAfterDiscount,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

