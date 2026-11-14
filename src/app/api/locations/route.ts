import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const governorateId = searchParams.get("governorateId") || "";
    const cityId = searchParams.get("cityId") || "";

    const db = await getDb();

    if (cityId) {
      // Fetch areas for the specified city
      const areas = queryAll<any>(
        db,
        `SELECT id, city_id, name_en, name_ar, shipping_rate, is_enabled
         FROM areas
         WHERE city_id = ? AND is_enabled = 1
         ORDER BY name_en ASC`,
        [cityId]
      );
      return NextResponse.json({ ok: true, type: "areas", data: areas });
    }

    if (governorateId) {
      // Fetch cities for the specified governorate
      const cities = queryAll<any>(
        db,
        `SELECT id, governorate_id, name_en, name_ar, shipping_rate, is_enabled
         FROM cities
         WHERE governorate_id = ? AND is_enabled = 1
         ORDER BY name_en ASC`,
        [governorateId]
      );
      return NextResponse.json({ ok: true, type: "cities", data: cities });
    }

    // Default: return all 27 governorates
    const governorates = queryAll<any>(
      db,
      `SELECT id, code, name_en, name_ar, shipping_rate, is_enabled, sort_order
       FROM governorates
       ORDER BY sort_order ASC, name_en ASC`
    );
    return NextResponse.json({ ok: true, type: "governorates", data: governorates });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load locations" },
      { status: 500 }
    );
  }
}

