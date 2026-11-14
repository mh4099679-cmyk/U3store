import { NextResponse } from "next/server";
import { getDb, queryOne, runSql, persistDb } from "@/lib/db";
import { generateId } from "@/lib/auth/session";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const lang = body.lang === "ar" ? "ar" : "en";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lang === "ar"
              ? "يرجى إدخال بريد إلكتروني صحيح."
              : "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existing = queryOne<any>(
      db,
      `SELECT * FROM newsletter_subscribers WHERE LOWER(email) = ?`,
      [email]
    );

    if (existing) {
      if (existing.status === "SUBSCRIBED") {
        return NextResponse.json(
          {
            ok: false,
            alreadySubscribed: true,
            error:
              lang === "ar"
                ? "هذا البريد الإلكتروني مشترك بالفعل في النشرة البريدية."
                : "This email address is already subscribed.",
          },
          { status: 409 }
        );
      }
      runSql(
        db,
        `UPDATE newsletter_subscribers SET status = 'SUBSCRIBED', lang = ? WHERE id = ?`,
        [lang, existing.id]
      );
      persistDb(db);
      return NextResponse.json({
        ok: true,
        message:
          lang === "ar"
            ? "تم إعادة تفعيل اشتراكك بنجاح."
            : "Your subscription has been reactivated.",
      });
    }

    const id = generateId("sub");
    const token = generateId("unsub");
    runSql(
      db,
      `INSERT INTO newsletter_subscribers (id, email, lang, status, unsubscribe_token, created_at)
       VALUES (?, ?, ?, 'SUBSCRIBED', ?, ?)`,
      [id, email, lang, token, new Date().toISOString()]
    );
    persistDb(db);

    return NextResponse.json({
      ok: true,
      message:
        lang === "ar"
          ? "شكرًا لاشتراكك في نشرة U3 STORE."
          : "Thank you for subscribing to U3 STORE.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Subscription error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = String(searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: "Token required" }, { status: 400 });
    }
    const db = await getDb();
    runSql(
      db,
      `UPDATE newsletter_subscribers SET status = 'UNSUBSCRIBED' WHERE unsubscribe_token = ?`,
      [token]
    );
    persistDb(db);
    return NextResponse.json({ ok: true, message: "Unsubscribed successfully from U3 STORE drops." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

