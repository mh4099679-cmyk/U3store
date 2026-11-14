import { Database } from "sql.js";
import { queryOne, runSql } from "@/lib/db";
import { generateId } from "@/lib/auth/session";

export interface WhatsAppTriggerParams {
  eventType: string;
  recipientPhone: string;
  customerName?: string;
  language?: "en" | "ar";
  lang?: "en" | "ar";
  userId?: string | null;
  orderId?: string | null;
  relatedOrderId?: string | null;
  relatedOrderNumber?: string;
  variables?: Record<string, any>;
  buttonLabel?: string;
  buttonUrl?: string;
  trackingToken?: string;
  requireConsent?: boolean;
  forceSend?: boolean;
}

/**
 * Returns the canonical website domain automatically.
 * Never returns localhost in production.
 */
export function getCanonicalDomain(req?: Request, db?: Database): string {
  if (db) {
    try {
      const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
      if (settings?.canonical_url && String(settings.canonical_url).trim().length > 0) {
        let u = String(settings.canonical_url).trim().replace(/\/+$/, "");
        if (!u.startsWith("http://") && !u.startsWith("https://")) {
          u = `https://${u}`;
        }
        return u;
      }
    } catch {}
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, "");
  }

  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    if (host) {
      if (process.env.NODE_ENV === "production" && host.includes("localhost")) {
        return "https://u3store.kesug.com";
      }
      return `${proto}://${host}`;
    }
  }

  return process.env.NODE_ENV === "production" ? "https://u3store.kesug.com" : "http://localhost:3000";
}

/**
 * Renders template variables like {{customer_name}}, {{order_number}}, {{order_summary}}, {{order_total}}, {{secure_tracking_link}}
 * Never allows password or auth token interpolation in body text.
 * Provides smart fallbacks and BiDi protection for Arabic names in English text.
 */
export function renderWhatsAppTemplate(
  rawBody: string,
  variables: Record<string, any> = {},
  options?: { lang?: "en" | "ar"; canonicalDomain?: string }
): string {
  const isEn = options?.lang === "en";
  const domain = options?.canonicalDomain || "https://u3store.kesug.com";
  let rendered = rawBody;

  // Build normalized dictionary with fallbacks
  const normalized: Record<string, string> = {};

  // 1. Customer Name with BiDi isolation
  let rawName = String(variables.customer_name || variables.customerName || "").trim();
  if (!rawName) rawName = isEn ? "Customer" : "عميلنا العزيز";
  // If template is English and name has Arabic characters, wrap with Left-to-Right Mark \u200E
  // to avoid reversing adjacent English words or punctuation like ".محمد هاني Hello"
  const hasArabic = /[\u0600-\u06FF]/.test(rawName);
  if (isEn && hasArabic) {
    normalized["customer_name"] = `\u200E${rawName}\u200E`;
  } else {
    normalized["customer_name"] = rawName;
  }

  // 2. Order Number
  const orderNum = String(variables.order_number || variables.orderNumber || "").trim();
  normalized["order_number"] = orderNum;

  // 3. Order Total / Total Amount
  const rawTotal = variables.order_total ?? variables.total_amount ?? variables.total ?? variables.amount;
  if (rawTotal !== undefined && rawTotal !== null && rawTotal !== "") {
    if (typeof rawTotal === "number") {
      normalized["order_total"] = isEn
        ? `${rawTotal.toLocaleString("en-US")} EGP`
        : `${rawTotal.toLocaleString("en-US")} ج.م`;
    } else {
      normalized["order_total"] = String(rawTotal);
    }
  } else {
    normalized["order_total"] = "";
  }
  normalized["total_amount"] = normalized["order_total"];

  // 4. Secure Tracking Link
  let trackingLink = String(
    variables.secure_tracking_link ||
    variables.order_tracking_link ||
    variables.tracking_url ||
    variables.trackingUrl ||
    ""
  ).trim();

  if (!trackingLink) {
    const token = String(variables.tracking_token || variables.trackingToken || "").trim();
    if (token) {
      trackingLink = `${domain}/order/track/${token}`;
    } else if (orderNum) {
      trackingLink = `${domain}/track-order?orderNumber=${encodeURIComponent(orderNum)}`;
    }
  } else if (!trackingLink.startsWith("http")) {
    trackingLink = `${domain}${trackingLink.startsWith("/") ? "" : "/"}${trackingLink}`;
  }
  normalized["secure_tracking_link"] = trackingLink;
  normalized["order_tracking_link"] = trackingLink;

  // 5. Payment Method
  let pm = String(variables.payment_method || variables.payment_method_code || "").trim();
  if (pm === "VODAFONE_CASH") pm = isEn ? "Vodafone Cash" : "فودافون كاش";
  else if (pm === "INSTAPAY") pm = isEn ? "InstaPay" : "إنستاباي";
  else if (pm === "CASH_ON_DELIVERY") pm = isEn ? "Cash on Delivery" : "الدفع عند الاستلام";
  normalized["payment_method"] = pm;

  // 6. Tracking Number
  normalized["tracking_number"] = String(variables.tracking_number || variables.trackingNumber || "N/A");

  // 7. Order Summary
  normalized["order_summary"] = String(variables.order_summary || variables.orderSummary || (isEn ? "U3 STORE Order" : "طلب منتجات U3 STORE"));

  // 8. Copy any other explicit variables
  for (const [k, v] of Object.entries(variables)) {
    if (k.toLowerCase().includes("password") || (k.toLowerCase().includes("token") && k !== "tracking_token")) {
      continue;
    }
    if (!(k in normalized) && v !== undefined && v !== null) {
      normalized[k] = String(v);
    }
  }

  // Interpolate known variables
  for (const [k, v] of Object.entries(normalized)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
  }

  // Clean up any remaining unreplaced {{...}} placeholders so raw markup never leaks
  rendered = rendered.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");

  return rendered.trim();
}

/**
 * Normalizes phone numbers for WhatsApp API.
 * e.g., 01115915388 -> 201115915388
 */
export function normalizeWhatsAppPhone(phone: string): string {
  let cleaned = String(phone || "").replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("01")) {
    cleaned = "2" + cleaned; // Egypt country code prefix
  }
  return cleaned;
}

/**
 * Queues a WhatsApp notification in the database outbox & message logs.
 * Supports dynamic URL button parameters for Meta WhatsApp Cloud API.
 * Prevents duplicate messages on double clicks or page refreshes.
 */
export function queueWhatsAppNotification(
  db: Database,
  params: WhatsAppTriggerParams
): { logId: string | null; status: string } {
  const now = new Date().toISOString();
  const phone = String(params.recipientPhone || "").trim();
  if (!phone) return { logId: null, status: "SKIPPED_NO_PHONE" };

  const relatedOrderNumber =
    params.relatedOrderNumber || String(params.variables?.order_number || "");

  // Prevent duplicate ORDER_RECEIVED notifications
  if (params.eventType === "ORDER_RECEIVED" && relatedOrderNumber) {
    const existing = queryOne<any>(
      db,
      `SELECT id, send_status FROM whatsapp_message_logs WHERE event_type = 'ORDER_RECEIVED' AND related_order_number = ?`,
      [relatedOrderNumber]
    );
    if (existing) {
      return { logId: existing.id, status: "SKIPPED_DUPLICATE" };
    }
  }

  // Check customer consent if required (unless forceSend = true for essential order receipts)
  if (params.requireConsent !== false && !params.forceSend) {
    const optedOut = queryOne<any>(
      db,
      `SELECT id FROM whatsapp_consents
       WHERE phone = ? AND consent_type = 'TRANSACTIONAL' AND consent_status = 'OPTED_OUT'`,
      [phone]
    );
    if (optedOut) {
      return { logId: null, status: "SKIPPED_OPTED_OUT" };
    }
  }

  // Normalize eventType aliases
  const eventAliasMap: Record<string, string> = {
    ORDER_PREPARING: "ORDER_PROCESSING",
    OUT_FOR_DELIVERY: "TRACKING_ADDED",
    RETURN_REQUEST_RECEIVED: "RETURN_REQUESTED",
  };
  const resolvedEvent = eventAliasMap[params.eventType] || params.eventType;

  const tpl = queryOne<any>(
    db,
    `SELECT * FROM whatsapp_templates WHERE event_type = ? AND is_enabled = 1`,
    [resolvedEvent]
  );
  if (!tpl) return { logId: null, status: "SKIPPED_NO_TEMPLATE" };

  const lang = (params.language || params.lang) === "en" ? "en" : "ar";
  const customerName =
    params.customerName || String(params.variables?.customer_name || "Customer");
  const relatedOrderId = params.relatedOrderId || params.orderId || null;
  const canonicalDomain = getCanonicalDomain(undefined, db);

  const rawBody = lang === "ar" ? tpl.body_ar || tpl.body_en : tpl.body_en;
  const renderedBody = renderWhatsAppTemplate(
    rawBody,
    {
      customer_name: customerName,
      order_number: relatedOrderNumber,
      tracking_token: params.trackingToken,
      ...(params.variables || {}),
    },
    { lang, canonicalDomain }
  );

  // Dynamic Button Configuration
  let buttonLabel = params.buttonLabel || "";
  let buttonUrl = params.buttonUrl || "";

  if (resolvedEvent === "ORDER_RECEIVED" || params.trackingToken) {
    buttonLabel = lang === "ar" ? "متابعة الطلب" : "TRACK YOUR ORDER";
    const token = params.trackingToken || String(params.variables?.tracking_token || "");
    if (token) {
      buttonUrl = `${canonicalDomain}/order/track/${token}`;
    }
  }

  const waSettings = queryOne<any>(
    db,
    `SELECT * FROM whatsapp_settings WHERE id = 'default'`
  );
  const token = process.env.WHATSAPP_ACCESS_TOKEN || waSettings?.access_token || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || waSettings?.phone_number_id || "";
  const hasRealCredentials = Boolean(waSettings?.is_enabled && token && phoneNumberId);

  const logId = generateId("wlog");
  const idempotencyKey = `${resolvedEvent}-${relatedOrderNumber || phone}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  const initialSendStatus = hasRealCredentials ? "QUEUED" : "NOT_CONNECTED";
  const initialFailureReason = hasRealCredentials
    ? ""
    : "WhatsApp Cloud API credentials not configured yet (Please configure WHATSAPP_ACCESS_TOKEN and Phone Number ID in Admin Settings).";

  runSql(
    db,
    `INSERT INTO whatsapp_message_logs (
      id, recipient_phone, customer_name, related_order_id, related_order_number,
      event_type, language, template_name, rendered_body,
      button_label, button_url,
      send_status, provider_message_id, delivery_status, failure_reason,
      retry_count, idempotency_key, queued_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'PENDING', ?, 0, ?, ?, ?)`,
    [
      logId,
      phone,
      customerName,
      relatedOrderId,
      relatedOrderNumber,
      resolvedEvent,
      lang,
      tpl.template_name,
      renderedBody,
      buttonLabel,
      buttonUrl,
      initialSendStatus,
      initialFailureReason,
      idempotencyKey,
      now,
      now,
    ]
  );

  runSql(
    db,
    `INSERT INTO notification_outbox (
      id, channel, event_type, recipient_phone, payload_json, status, attempts, created_at
    ) VALUES (?, 'WHATSAPP', ?, ?, ?, ?, 0, ?)`,
    [
      generateId("out"),
      resolvedEvent,
      phone,
      JSON.stringify({ logId, renderedBody, templateName: tpl.template_name, lang, buttonLabel, buttonUrl }),
      hasRealCredentials ? "PENDING" : "FAILED",
      now,
    ]
  );

  // Maintain customer conversation thread in database
  let conv = queryOne<any>(
    db,
    `SELECT * FROM whatsapp_conversations WHERE customer_phone = ?`,
    [phone]
  );
  if (!conv) {
    const convId = generateId("wconv");
    runSql(
      db,
      `INSERT INTO whatsapp_conversations (
        id, customer_phone, customer_name, related_order_number, status, last_message_at, created_at
      ) VALUES (?, ?, ?, ?, 'OPEN', ?, ?)`,
      [convId, phone, customerName, relatedOrderNumber, now, now]
    );
    conv = { id: convId };
  } else {
    runSql(
      db,
      `UPDATE whatsapp_conversations SET last_message_at = ?, related_order_number = COALESCE(NULLIF(?, ''), related_order_number) WHERE id = ?`,
      [now, relatedOrderNumber, conv.id]
    );
  }

  runSql(
    db,
    `INSERT INTO whatsapp_messages (
      id, conversation_id, direction, sender_phone, body, status, created_at
    ) VALUES (?, ?, 'OUTBOUND', 'U3_STORE', ?, ?, ?)`,
    [generateId("wmsg"), conv.id, renderedBody + (buttonUrl ? `\n\n[${buttonLabel}]: ${buttonUrl}` : ""), initialSendStatus, now]
  );

  // If credentials exist, trigger live dispatch asynchronously
  if (hasRealCredentials) {
    sendLiveWhatsAppMessage(db, logId).catch((err) => {
      console.error("Live WhatsApp dispatch error:", err);
    });
  }

  return { logId, status: initialSendStatus };
}

/**
 * Executes live WhatsApp Cloud API call to Meta Graph API.
 */
export async function sendLiveWhatsAppMessage(
  db: Database,
  logId: string
): Promise<{ ok: boolean; status: string; error?: string }> {
  const log = queryOne<any>(db, `SELECT * FROM whatsapp_message_logs WHERE id = ?`, [logId]);
  if (!log) return { ok: false, status: "NOT_FOUND", error: "Message log not found" };

  const waSettings = queryOne<any>(db, `SELECT * FROM whatsapp_settings WHERE id = 'default'`);
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || waSettings?.access_token || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || waSettings?.phone_number_id || "";

  if (!accessToken || !phoneNumberId) {
    const reason = "WhatsApp Cloud API credentials not configured yet (Please configure WHATSAPP_ACCESS_TOKEN and Phone Number ID in Admin Settings).";
    runSql(
      db,
      `UPDATE whatsapp_message_logs SET send_status = 'NOT_CONNECTED', failure_reason = ?, updated_at = ? WHERE id = ?`,
      [reason, new Date().toISOString(), logId]
    );
    return { ok: false, status: "NOT_CONNECTED", error: reason };
  }

  const recipientPhone = normalizeWhatsAppPhone(log.recipient_phone);
  const now = new Date().toISOString();

  try {
    // Build Meta Cloud API request payload
    let payload: any;
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    // Extract dynamic URL button component if present
    const components: any[] = [];
    if (log.button_url) {
      const urlSuffix = log.button_url.includes("/order/track/")
        ? log.button_url.split("/order/track/")[1]
        : log.button_url;

      components.push({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: urlSuffix }],
      });
    }

    if (components.length > 0) {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "template",
        template: {
          name: log.template_name,
          language: { code: log.language || "ar" },
          components,
        },
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          preview_url: true,
          body: log.rendered_body + (log.button_url ? `\n\n🔗 ${log.button_label}: ${log.button_url}` : ""),
        },
      };
    }

    runSql(db, `UPDATE whatsapp_message_logs SET send_status = 'SENDING', updated_at = ? WHERE id = ?`, [now, logId]);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.messages?.[0]?.id) {
      const wamid = data.messages[0].id;
      runSql(
        db,
        `UPDATE whatsapp_message_logs
         SET send_status = 'SENT_ACCEPTED',
             provider_message_id = ?,
             delivery_status = 'SENT',
             failure_reason = '',
             updated_at = ?
         WHERE id = ?`,
        [wamid, new Date().toISOString(), logId]
      );
      return { ok: true, status: "SENT_ACCEPTED" };
    } else {
      const errMsg = data.error?.message || `HTTP ${res.status}: Failed to deliver message.`;
      runSql(
        db,
        `UPDATE whatsapp_message_logs
         SET send_status = 'FAILED',
             delivery_status = 'FAILED',
             failure_reason = ?,
             updated_at = ?
         WHERE id = ?`,
        [errMsg, new Date().toISOString(), logId]
      );
      return { ok: false, status: "FAILED", error: errMsg };
    }
  } catch (err: any) {
    const errorMsg = err?.message || "Network exception during WhatsApp delivery.";
    runSql(
      db,
      `UPDATE whatsapp_message_logs
       SET send_status = 'FAILED',
           delivery_status = 'FAILED',
           failure_reason = ?,
           updated_at = ?
       WHERE id = ?`,
      [errorMsg, new Date().toISOString(), logId]
    );
    return { ok: false, status: "FAILED", error: errorMsg };
  }
}

/**
 * Retries sending a WhatsApp notification from Admin Portal.
 */
export async function retryWhatsAppNotification(
  db: Database,
  logId: string
): Promise<{ ok: boolean; status: string; error?: string }> {
  runSql(
    db,
    `UPDATE whatsapp_message_logs
     SET retry_count = retry_count + 1,
         updated_at = ?
     WHERE id = ?`,
    [new Date().toISOString(), logId]
  );
  return sendLiveWhatsAppMessage(db, logId);
}

export function saveWhatsAppConsent(
  db: Database,
  params: {
    userId?: string | null;
    guestCustomerId?: string | null;
    phone: string;
    transactionalConsent: boolean;
    marketingConsent: boolean;
    source: "REGISTRATION" | "CHECKOUT" | "ACCOUNT";
  }
) {
  const now = new Date().toISOString();
  const phone = String(params.phone || "").trim();
  if (!phone) return;

  runSql(
    db,
    `INSERT INTO whatsapp_consents (
      id, user_id, guest_customer_id, phone, consent_type, consent_status, consent_source, policy_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'TRANSACTIONAL', ?, ?, 'v1.0', ?, ?)`,
    [
      generateId("wcon"),
      params.userId || null,
      params.guestCustomerId || null,
      phone,
      params.transactionalConsent ? "OPTED_IN" : "OPTED_OUT",
      params.source,
      now,
      now,
    ]
  );

  runSql(
    db,
    `INSERT INTO whatsapp_consents (
      id, user_id, guest_customer_id, phone, consent_type, consent_status, consent_source, policy_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'MARKETING', ?, ?, 'v1.0', ?, ?)`,
    [
      generateId("wcon"),
      params.userId || null,
      params.guestCustomerId || null,
      phone,
      params.marketingConsent ? "OPTED_IN" : "OPTED_OUT",
      params.source,
      now,
      now,
    ]
  );
}
