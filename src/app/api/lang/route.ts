import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_STORE_LANG,
  COOKIE_ADMIN_LANG,
  getCurrentCustomer,
  getCurrentAdmin,
  getOrCreateGuestSession,
} from "@/lib/auth/session";
import { getDb, runSql, persistDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lang = body.lang === "ar" ? "ar" : "en";
    const scope = body.scope === "admin" ? "admin" : "store";
    const cookieStore = await cookies();
    const db = await getDb();

    if (scope === "admin") {
      cookieStore.set(COOKIE_ADMIN_LANG, lang, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
      const admin = await getCurrentAdmin();
      if (admin) {
        runSql(db, `UPDATE admin_users SET preferred_language = ? WHERE id = ?`, [lang, admin.id]);
        persistDb(db);
      }
    } else {
      cookieStore.set(COOKIE_STORE_LANG, lang, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
      const customer = await getCurrentCustomer();
      if (customer) {
        runSql(db, `UPDATE users SET preferred_language = ?, updated_at = ? WHERE id = ?`, [
          lang,
          new Date().toISOString(),
          customer.id,
        ]);
        persistDb(db);
      } else {
        const guest = await getOrCreateGuestSession(true);
        if (guest) {
          runSql(db, `UPDATE guest_sessions SET preferred_language = ?, last_active_at = ? WHERE id = ?`, [
            lang,
            new Date().toISOString(),
            guest.id,
          ]);
          persistDb(db);
        }
      }
    }

    return NextResponse.json({ ok: true, lang, scope }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed" }, { status: 400 });
  }
}

