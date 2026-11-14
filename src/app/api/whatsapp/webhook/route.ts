import { NextResponse } from "next/server";
import { getDb, queryOne, runSql, persistDb } from "@/lib/db";
import { generateId } from "@/lib/auth/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const db = await getDb();
  const settings = queryOne<any>(db, `SELECT * FROM whatsapp_settings WHERE id = 'default'`);
  const expectedToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    settings?.webhook_verify_token ||
    "u3store_verify_token";

  if (mode === "subscribe" && token === expectedToken) {
    runSql(
      db,
      `UPDATE whatsapp_settings SET webhook_status = 'VERIFIED', updated_at = ? WHERE id = 'default'`,
      [new Date().toISOString()]
    );
    persistDb(db);
    return new NextResponse(challenge || "OK", { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const db = await getDb();
    const now = new Date().toISOString();

    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const ch of changes) {
        const val = ch?.value || {};

        // 1. Handle Status Callbacks (sent / delivered / read / failed)
        const statuses = Array.isArray(val.statuses) ? val.statuses : [];
        for (const st of statuses) {
          const wamid = String(st.id || "");
          const statusStr = String(st.status || "").toUpperCase();
          if (wamid && statusStr) {
            runSql(
              db,
              `UPDATE whatsapp_message_logs
               SET delivery_status = ?,
                   send_status = CASE WHEN ? IN ('DELIVERED', 'READ', 'FAILED') THEN ? ELSE send_status END,
                   updated_at = ?
               WHERE provider_message_id = ?`,
              [statusStr, statusStr, statusStr, now, wamid]
            );
          }
        }

        // 2. Handle Incoming Customer Messages -> Conversation Inbox
        const messages = Array.isArray(val.messages) ? val.messages : [];
        for (const msg of messages) {
          const fromPhone = String(msg.from || "");
          const textBody = String(msg.text?.body || "[Media/Interactive Message]");
          const wamid = String(msg.id || "");

          if (!fromPhone) continue;

          // Check STOP / Opt-out keyword
          if (["STOP", "UNSUBSCRIBE", "إلغاء"].includes(textBody.trim().toUpperCase())) {
            runSql(
              db,
              `UPDATE whatsapp_consents SET consent_status = 'OPTED_OUT', updated_at = ? WHERE phone = ?`,
              [now, fromPhone]
            );
          }

          let conv = queryOne<any>(
            db,
            `SELECT * FROM whatsapp_conversations WHERE customer_phone = ?`,
            [fromPhone]
          );
          if (!conv) {
            const convId = generateId("wconv");
            runSql(
              db,
              `INSERT INTO whatsapp_conversations (
                id, customer_phone, customer_name, status, last_message_at, created_at
              ) VALUES (?, ?, ?, 'OPEN', ?, ?)`,
              [convId, fromPhone, fromPhone, now, now]
            );
            conv = { id: convId };
          } else {
            runSql(
              db,
              `UPDATE whatsapp_conversations SET status = 'OPEN', last_message_at = ? WHERE id = ?`,
              [now, conv.id]
            );
          }

          runSql(
            db,
            `INSERT INTO whatsapp_messages (
              id, conversation_id, direction, sender_phone, body, provider_message_id, status, created_at
            ) VALUES (?, ?, 'INBOUND', ?, ?, ?, 'RECEIVED', ?)`,
            [generateId("wmsg"), conv.id, fromPhone, textBody, wamid, now]
          );
        }
      }
    }

    persistDb(db);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Webhook error" }, { status: 400 });
  }
}

