import { NextResponse } from "next/server";
import { getDb, queryAll, queryOne, runSql, persistDb } from "@/lib/db";
import { getCurrentAdmin, generateId } from "@/lib/auth/session";

function sanitizeText(val: string): string {
  return String(val || "")
    .replace(/<[^>]*>?/gm, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = sanitizeText(body.name);
    const contactInfo = sanitizeText(body.contactInfo || body.email || body.phone);
    const subject = sanitizeText(body.subject);
    const message = sanitizeText(body.message);
    const lang = body.lang === "ar" ? "ar" : "en";

    if (!name || name.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: lang === "ar" ? "يرجى كتابة الاسم بالكامل." : "Please provide your name.",
        },
        { status: 400 }
      );
    }

    if (!contactInfo || contactInfo.length < 5) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lang === "ar"
              ? "يرجى كتابة رقم الهاتف أو البريد الإلكتروني للتواصل."
              : "Please provide a valid phone number or email address.",
        },
        { status: 400 }
      );
    }

    if (!message || message.length < 5) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lang === "ar"
              ? "يرجى كتابة تفاصيل رسالتك أو استفسارك."
              : "Please enter your message or inquiry.",
        },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const db = await getDb();
    const id = generateId("msg");
    const now = new Date().toISOString();

    runSql(
      db,
      `INSERT INTO contact_messages (id, name, contact_info, subject, message, status, admin_notes, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, 'NEW', '', ?, ?)`,
      [id, name, contactInfo, subject || "General Inquiry", message, ip, now]
    );
    persistDb(db);

    return NextResponse.json({
      ok: true,
      message:
        lang === "ar"
          ? "تم استلام رسالتك بنجاح. سيتواصل معك فريق U3 STORE في أقرب وقت."
          : "Your message has been received. U3 STORE team will reach out to you shortly.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to submit message." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const db = await getDb();
    const messages = queryAll<any>(
      db,
      `SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100`
    );
    return NextResponse.json({ ok: true, messages });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

