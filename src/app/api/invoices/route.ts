import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getDb, queryOne, queryAll } from "@/lib/db";
import {
  getCurrentAdmin,
  getCurrentCustomer,
  getOrCreateGuestSession,
} from "@/lib/auth/session";
import { verifyOrderAccess } from "@/lib/services/commerce";
import { formatArabicForPdf, containsArabic } from "@/lib/arabic-pdf";

function containsNonWinAnsi(text: string): boolean {
  return /[^\x00-\x7F]/.test(text);
}

function formatEgp(num: number | string | undefined): string {
  const n = Number(num || 0);
  return `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderNumber = (searchParams.get("orderNumber") || "").trim().toUpperCase();
  const invoiceNumber = (searchParams.get("invoiceNumber") || "").trim().toUpperCase();
  const accessToken = (searchParams.get("token") || "").trim();
  const format = (searchParams.get("format") || "pdf").toLowerCase(); // 'pdf' | 'html' | 'json'
  const isDownload = searchParams.get("download") === "1";
  const isPrint = searchParams.get("print") === "1" || searchParams.get("print") === "true";

  const db = await getDb();

  // Find invoice and order reliably
  let invoice = invoiceNumber
    ? queryOne<any>(db, `SELECT * FROM invoices WHERE UPPER(invoice_number) = ?`, [invoiceNumber])
    : queryOne<any>(db, `SELECT * FROM invoices WHERE UPPER(order_number) = ?`, [orderNumber]);

  let order = invoice
    ? queryOne<any>(db, `SELECT * FROM orders WHERE id = ?`, [invoice.order_id])
    : queryOne<any>(db, `SELECT * FROM orders WHERE UPPER(order_number) = ?`, [orderNumber]);

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  // Synthesize invoice snapshot if table record is missing
  if (!invoice) {
    invoice = {
      id: `inv-${order.id}`,
      invoice_number: `INV-${order.order_number.replace(/^U3-/, "")}`,
      order_id: order.id,
      order_number: order.order_number,
      revision_number: order.revision_number || 1,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email || "",
      delivery_address_en: `${order.street_address}, Bldg ${order.building_number || 1}, Floor ${order.floor_number || 1}, Apt ${order.apartment_number || 1}, ${order.governorate_name_en}`,
      delivery_address_ar: `${order.street_address}, عمارة ${order.building_number || 1}, دور ${order.floor_number || 1}, شقة ${order.apartment_number || 1}, ${order.governorate_name_ar}`,
      subtotal: order.subtotal,
      discount_amount: order.discount_amount || 0,
      shipping_fee: order.shipping_fee,
      total_amount: order.total_amount,
      payment_method_code: order.payment_method_code,
      payment_status: order.payment_status === "PAID" ? "Paid" : order.payment_status,
      issued_at: order.created_at,
    };
  }

  const admin = await getCurrentAdmin();
  const customer = await getCurrentCustomer();
  const guest = await getOrCreateGuestSession(false);

  // Authorize access
  if (!verifyOrderAccess(db, order, customer, admin, guest, accessToken)) {
    return NextResponse.json(
      { ok: false, error: "Access denied. Order invoice requires valid authorization." },
      { status: 403 }
    );
  }

  // Fetch items fresh from order_items to guarantee exchange/edit accuracy
  const orderItems = queryAll<any>(
    db,
    `SELECT * FROM order_items WHERE order_id = ?`,
    [order.id]
  );
  let items = orderItems.map((oi) => ({
    sku: oi.sku_snapshot,
    product_name_en: oi.product_name_en_snapshot,
    product_name_ar: oi.product_name_ar_snapshot,
    color_en: oi.color_en_snapshot || "Monochrome",
    color_ar: oi.color_ar_snapshot || "مونوكروم",
    size: oi.size_snapshot,
    quantity: oi.quantity,
    unit_price: oi.unit_final_price_snapshot || oi.unit_price,
    line_total: oi.total_price || (oi.unit_final_price_snapshot || oi.unit_price) * oi.quantity,
  }));

  if (items.length === 0 && invoice?.id) {
    items = queryAll<any>(db, `SELECT * FROM invoice_items WHERE invoice_id = ?`, [invoice.id]);
  }

  // Fetch latest revision for exchange/edit audit report
  const latestRevision = queryOne<any>(
    db,
    `SELECT * FROM order_revisions WHERE order_id = ? ORDER BY revision_number DESC LIMIT 1`,
    [order.id]
  );

  let prevExchangedItem: any = null;
  let newExchangedItem: any = null;
  if (latestRevision && latestRevision.change_type === "EXCHANGE") {
    try {
      prevExchangedItem = JSON.parse(latestRevision.previous_items_json || "null");
      newExchangedItem = JSON.parse(latestRevision.new_items_json || "null");
    } catch {}
  }

  if (format === "json") {
    return NextResponse.json(
      { ok: true, invoice, items, order, latestRevision },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  // Delivery Estimate string
  const deliveryEstimate = order.delivery_estimate_en || "2-4 Business Days";
  const issueDateFormatted = new Date(invoice.issued_at || order.created_at).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Delivery address string and structured parts
  const govName = order.governorate_name_ar || order.governorate_name_en || "";
  const cityName = order.city_name_ar || order.city_name_en || "";
  const areaName = order.area_name_ar || order.area_name_en || "";
  const locationHierarchy = [govName, cityName, areaName].filter(Boolean).join(" • ");
  const buildingDetails = [
    order.building_number ? `عمارة: ${order.building_number}` : "",
    order.floor_number ? `الدور: ${order.floor_number}` : "",
    order.apartment_number ? `شقة: ${order.apartment_number}` : "",
  ].filter(Boolean).join(" | ");

  const addressLine = order.street_address
    ? `${order.street_address}, Bldg ${order.building_number || 1}, Floor ${order.floor_number || 1}, Apt ${order.apartment_number || 1}, ${order.governorate_name_en || order.governorate_name_ar}`
    : invoice.delivery_address_en;

  // =========================================================================
  // OPTION 1: HIGH-RES EXACT MATCH HTML PRINT SLIP
  // =========================================================================
  if (format === "html" || format === "print") {
    const logoPath = path.join(process.cwd(), "public", "logo.jpg");
    let base64Logo = "";
    if (fs.existsSync(logoPath)) {
      try {
        const fileBuffer = fs.readFileSync(logoPath);
        base64Logo = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
      } catch (err) {
        console.error("Failed to base64 encode invoice logo:", err);
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${invoice.invoice_number} — U3 STORE INVOICE</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f4f5f7;
      color: #111111;
      padding: 24px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .no-print-bar {
      max-width: 760px;
      margin: 0 auto 16px auto;
      background: #111214;
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 14px rgba(0,0,0,0.12);
    }
    .btn-print {
      background: #ffffff;
      color: #111214;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn-print:hover { background: #e5e7eb; }
    .btn-sub {
      background: #232529;
      color: #e5e7eb;
      border: 1px solid #374151;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-sub:hover { background: #374151; color: #fff; }

    /* The Invoice Document Card */
    .invoice-card {
      max-width: 760px;
      width: 100%;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 32px 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #111111;
      width: 100%;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid #111111;
      background-color: #111214;
      display: block;
    }
    .brand-title h1 {
      font-size: 20px;
      font-weight: 900;
      color: #111111;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .brand-title p {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.28em;
      color: #71717a;
      margin-top: 3px;
      text-transform: uppercase;
    }

    .invoice-meta {
      text-align: right;
    }
    .invoice-number {
      font-size: 17px;
      font-weight: 900;
      color: #111111;
      letter-spacing: -0.2px;
      font-family: monospace;
    }
    .invoice-date {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
      font-weight: 500;
    }
    .badge-paid {
      display: inline-block;
      margin-top: 5px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
    }

    /* Two column snapshot */
    .snapshot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      padding: 22px 0 20px 0;
      width: 100%;
    }
    .snapshot-col {
      background: #fbfbfb;
      border: 1px solid #eef0f2;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #71717a;
      text-transform: uppercase;
      margin-bottom: 8px;
      border-bottom: 1px solid #eef0f2;
      padding-bottom: 4px;
    }
    .cust-name {
      font-family: 'Cairo', 'Inter', sans-serif;
      font-size: 13.5px;
      font-weight: 800;
      color: #111111;
      margin-bottom: 2px;
    }
    .cust-detail {
      font-size: 11.5px;
      color: #374151;
      line-height: 1.45;
    }

    .snap-line {
      font-size: 11px;
      color: #4b5563;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .snap-line strong {
      color: #111111;
      font-weight: 700;
      font-size: 11.5px;
    }

    /* Product Table */
    .table-wrapper {
      width: 100%;
      margin-top: 6px;
      margin-bottom: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th {
      background: #111111;
      color: #ffffff;
      padding: 9px 12px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    th.th-left { text-align: left; }
    th.th-center { text-align: center; }
    th.th-right { text-align: right; }

    td {
      padding: 11px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
      vertical-align: middle;
      word-wrap: break-word;
    }
    td.td-sku {
      font-family: monospace;
      font-size: 9.5px;
      color: #374151;
      font-weight: 600;
    }
    td.td-prod {
      color: #111111;
      font-weight: 600;
      line-height: 1.35;
    }
    td.td-center { text-align: center; font-weight: 700; }
    td.td-right { text-align: right; font-weight: 600; }
    td.td-total { text-align: right; font-weight: 800; color: #111111; }

    /* Totals Block */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
      width: 100%;
    }
    .totals-table {
      width: 270px;
      background: #fbfbfb;
      border: 1px solid #eef0f2;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11.5px;
    }
    .total-row .lbl {
      color: #6b7280;
      font-weight: 500;
    }
    .total-row .val {
      color: #111111;
      font-weight: 700;
    }
    .total-divider {
      border-bottom: 1px dashed #d1d5db;
      margin: 6px 0;
    }
    .final-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: #111214;
      color: #ffffff;
      border-radius: 6px;
      margin-top: 4px;
    }
    .final-row .lbl {
      font-size: 12px;
      font-weight: 800;
    }
    .final-row .val {
      font-size: 14.5px;
      font-weight: 900;
      color: #10b981;
    }

    .invoice-footer {
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px solid #eef0f2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #71717a;
    }

    /* Print Specific Strict Media Rules - Zero Page Margin to hide browser headers & URL footers */
    @page {
      size: A4 portrait;
      margin: 0 !important;
    }

    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #111111 !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print-bar {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .invoice-card {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        padding: 14mm 16mm !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .snapshot-col, .totals-table {
        background: #fafafa !important;
        border: 1px solid #e5e7eb !important;
      }
      table {
        width: 100% !important;
        table-layout: fixed !important;
      }
      th {
        background: #111111 !important;
        color: #ffffff !important;
      }
      .final-row {
        background: #111214 !important;
        color: #ffffff !important;
      }
      .final-row .val {
        color: #10b981 !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Screen Action Bar -->
  <div class="no-print-bar">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:13px; font-weight:700;">U3 STORE Official Invoice Preview</span>
      <span style="font-size:11px; color:#9ca3af; font-family:monospace;">${invoice.invoice_number}</span>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn-print" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>طباعة الفاتورة (Print)</span>
      </button>
      <button class="btn-sub" onclick="window.close()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span>إغلاق</span>
      </button>
    </div>
  </div>

  <!-- The Exact User-Requested Invoice Card -->
  <div class="invoice-card">
    <!-- Top Header -->
    <div class="header-row">
      <div class="brand-group">
        <img src="${base64Logo || '/logo.jpg'}" alt="U3 STORE" class="brand-logo">
        <div class="brand-title">
          <h1>U3 STORE</h1>
          <p>L I V E &nbsp; Y O U R S .</p>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-number">${invoice.invoice_number}</div>
        <div class="invoice-date">${issueDateFormatted}</div>
        <div class="badge-paid">PAID • مسدد بالكامل</div>
      </div>
    </div>

    <!-- Snapshot Two Columns -->
    <div class="snapshot-grid">
      <!-- Left: Customer & Delivery Address -->
      <div class="snapshot-col">
        <div class="section-label">CUSTOMER & SHIPPING DETAILS</div>
        <div class="cust-name">${order.customer_name}</div>
        <div class="cust-detail" style="font-weight:700; font-family:monospace; font-size:12px; margin-top:2px; display:flex; align-items:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-inline-end:5px; color:#4b5563;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          <span>${order.customer_phone}</span>
        </div>
        ${order.customer_email ? `<div class="cust-detail" style="color:#6b7280; font-size:10.5px; margin-top:1px; display:flex; align-items:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-inline-end:5px; color:#6b7280;"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
          <span>${order.customer_email}</span>
        </div>` : ""}
        
        <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #d1d5db; font-size:11px; line-height:1.45;">
          <div style="font-weight:700; color:#111827; font-family:'Cairo', sans-serif; display:flex; align-items:center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-inline-end:5px; color:#10b981; flex-shrink:0;"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${govName}${cityName ? ` — ${cityName}` : ""}</span>
          </div>
          ${order.street_address ? `<div style="color:#1f2937; margin-top:2px; font-family:'Cairo', sans-serif;"><span style="color:#6b7280;">العنوان:</span> ${order.street_address}</div>` : ""}
          ${buildingDetails ? `<div style="color:#374151; margin-top:2px; font-family:'Cairo', sans-serif;">${buildingDetails}</div>` : ""}
          ${order.landmark ? `<div style="color:#4b5563; margin-top:2px; font-family:'Cairo', sans-serif;"><span style="color:#6b7280;">علامة:</span> ${order.landmark}</div>` : ""}
          ${order.delivery_notes ? `<div style="color:#4b5563; margin-top:2px; font-family:'Cairo', sans-serif;"><span style="color:#6b7280;">ملاحظات:</span> ${order.delivery_notes}</div>` : ""}
        </div>
      </div>

      <!-- Right: Order & Payment Snapshot -->
      <div class="snapshot-col">
        <div class="section-label">ORDER & PAYMENT SUMMARY</div>
        <div class="snap-line"><span>Order Number:</span> <strong style="font-family:monospace;">${order.order_number}</strong></div>
        <div class="snap-line"><span>Payment Method:</span> <strong>${order.payment_method_code}</strong></div>
        <div class="snap-line"><span>Payment Status:</span> <strong style="color:#059669;">${invoice.payment_status}</strong></div>
        <div class="snap-line"><span>Delivery Estimate:</span> <strong>${deliveryEstimate}</strong></div>
        ${order.shipping_company_name ? `<div class="snap-line"><span>Shipping Carrier:</span> <strong>${order.shipping_company_name}</strong></div>` : ""}
        ${order.tracking_number ? `<div class="snap-line"><span>Tracking Number:</span> <strong style="font-family:monospace;">${order.tracking_number}</strong></div>` : ""}
      </div>
    </div>

    <!-- Products Table -->
    <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th class="th-left" style="width: 22%;">SKU</th>
          <th class="th-left" style="width: 44%;">Product / Size / Color</th>
          <th class="th-center" style="width: 8%;">Qty</th>
          <th class="th-right" style="width: 13%;">Unit Price</th>
          <th class="th-right" style="width: 13%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item: any) => `
          <tr>
            <td class="td-sku">${item.sku}</td>
            <td class="td-prod">
              <div>${item.product_name_en}</div>
              <div style="font-size:10px; color:#6b7280; font-family:'Cairo', sans-serif;">
                ${isNaN(Number(item.size)) ? item.size : `EU ${item.size}`} • ${item.color_en || "Monochrome"}
              </div>
            </td>
            <td class="td-center">${item.quantity}</td>
            <td class="td-right">${formatEgp(item.unit_price)}</td>
            <td class="td-total">${formatEgp(item.line_total)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
    </div>

    <!-- Totals Table -->
    <div class="totals-wrapper">
      <div class="totals-table">
        <div class="total-row">
          <span class="lbl">Subtotal</span>
          <span class="val">${formatEgp(order.subtotal)}</span>
        </div>
        ${
          Number(order.discount_amount) > 0
            ? `<div class="total-row">
          <span class="lbl">Discount</span>
          <span class="val" style="color:#dc2626;">- ${formatEgp(order.discount_amount)}</span>
        </div>`
            : ""
        }
        <div class="total-row">
          <span class="lbl">Shipping Fee</span>
          <span class="val">${formatEgp(order.shipping_fee)}</span>
        </div>
        <div class="total-divider"></div>
        <div class="final-row">
          <span class="lbl">Final Total / الإجمالي</span>
          <span class="val">${formatEgp(order.total_amount)}</span>
        </div>
      </div>
    </div>

    <!-- Invoice Footer -->
    <div class="invoice-footer">
      <div>
        <strong>U3 STORE</strong> — Official Store Invoice • Premium Authentic Footwear & Apparel
      </div>
      <div>
        Live Yours • Tel: 01007695129 • u3store.com
      </div>
    </div>
  </div>

  ${
    isPrint
      ? `<script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  </script>`
      : ""
  }
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  }

  // =========================================================================
  // OPTION 2: STANDALONE EXACT MATCH A4 PDF (pdf-lib)
  // =========================================================================
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size (points)
  const { width, height } = page.getSize();

  if (isPrint) {
    pdfDoc.addJavaScript(
      "print",
      "this.print({bUI: true, bSilent: false, bShrinkToFit: true});"
    );
  }

  // Load Fonts
  let fontBold: any;
  let fontRegular: any;
  let isUnicodeFont = false;

  const arialPath = "C:/Windows/Fonts/arial.ttf";
  const arialBdPath = "C:/Windows/Fonts/arialbd.ttf";

  if (fs.existsSync(arialPath) && fs.existsSync(arialBdPath)) {
    try {
      pdfDoc.registerFontkit(fontkit);
      fontRegular = await pdfDoc.embedFont(fs.readFileSync(arialPath));
      fontBold = await pdfDoc.embedFont(fs.readFileSync(arialBdPath));
      isUnicodeFont = true;
    } catch {
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  } else {
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const drawSafeText = (
    text: any,
    options: {
      x: number;
      y: number;
      size: number;
      font?: any;
      color?: any;
      maxWidth?: number;
    }
  ) => {
    let clean = String(text ?? "").trim();
    if (!clean) return;

    if (isUnicodeFont && containsArabic(clean)) {
      clean = formatArabicForPdf(clean);
    } else if (!isUnicodeFont && containsNonWinAnsi(clean)) {
      clean = clean.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
      if (!clean) clean = "-";
    }

    if (options.maxWidth && options.maxWidth > 0) {
      const charWidth = options.size * 0.48;
      const maxChars = Math.floor(options.maxWidth / charWidth);
      if (clean.length > maxChars) {
        clean = clean.slice(0, Math.max(1, maxChars - 3)) + "...";
      }
    }

    page.drawText(clean, {
      x: options.x,
      y: options.y,
      size: options.size,
      font: options.font || fontRegular,
      color: options.color || rgb(0.07, 0.07, 0.07),
    });
  };

  const marginX = 38;
  const contentWidth = width - marginX * 2;
  let curY = height - 48;

  // 1. EMBED LOGO SAFELY
  const logoPath = path.join(process.cwd(), "public", "logo.jpg");
  if (fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath);
      const logoArrayBuffer = logoBytes.buffer.slice(
        logoBytes.byteOffset,
        logoBytes.byteOffset + logoBytes.byteLength
      );
      const jpgImage = await pdfDoc.embedJpg(logoArrayBuffer);
      const dims = jpgImage.scaleToFit(50, 50);

      page.drawImage(jpgImage, {
        x: marginX,
        y: curY - 50,
        width: dims.width,
        height: dims.height,
      });
    } catch (logoErr) {
      console.error("PDF logo embedding error:", logoErr);
    }
  }

  // 2. BRAND TITLE (Beside logo)
  drawSafeText("U3 STORE", {
    x: marginX + 62,
    y: curY - 20,
    size: 21,
    font: fontBold,
    color: rgb(0.07, 0.07, 0.07),
  });

  drawSafeText("L I V E   Y O U R S .", {
    x: marginX + 62,
    y: curY - 36,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.45, 0.45, 0.48),
  });

  // 3. TOP RIGHT: INVOICE NUMBER & TIMESTAMP
  drawSafeText(invoice.invoice_number, {
    x: width - marginX - 170,
    y: curY - 20,
    size: 16,
    font: fontBold,
    color: rgb(0.07, 0.07, 0.07),
  });

  drawSafeText(issueDateFormatted, {
    x: width - marginX - 120,
    y: curY - 36,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.45, 0.45, 0.48),
  });

  curY -= 60;

  // 4. SOLID BLACK HORIZONTAL DIVIDER LINE
  page.drawLine({
    start: { x: marginX, y: curY },
    end: { x: width - marginX, y: curY },
    thickness: 1.8,
    color: rgb(0.07, 0.07, 0.07),
  });

  curY -= 26;

  // 5. TWO COLUMNS SNAPSHOT
  const colLeftX = marginX;
  const colRightX = marginX + 270;

  // Left: CUSTOMER & DELIVERY ADDRESS
  drawSafeText("CUSTOMER & DELIVERY ADDRESS", {
    x: colLeftX,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: rgb(0.45, 0.45, 0.48),
  });

  let lY = curY - 18;
  drawSafeText(order.customer_name, {
    x: colLeftX,
    y: lY,
    size: 11.5,
    font: fontBold,
    color: rgb(0.07, 0.07, 0.07),
    maxWidth: 240,
  });

  lY -= 15;
  drawSafeText(order.customer_phone, {
    x: colLeftX,
    y: lY,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  if (order.customer_email) {
    lY -= 14;
    drawSafeText(order.customer_email, {
      x: colLeftX,
      y: lY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.45, 0.45, 0.48),
      maxWidth: 240,
    });
  }

  // Location hierarchy (Gov - City - Area)
  const govCityAreaPdf = [
    order.governorate_name_en || order.governorate_name_ar || "",
    order.city_name_en || order.city_name_ar || "",
    order.area_name_en || order.area_name_ar || "",
  ].filter(Boolean).join(" - ");

  if (govCityAreaPdf) {
    lY -= 14;
    drawSafeText(govCityAreaPdf, {
      x: colLeftX,
      y: lY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.12, 0.12, 0.12),
      maxWidth: 250,
    });
  }

  // Draw street address
  if (order.street_address) {
    lY -= 14;
    drawSafeText(`Street: ${order.street_address}`, {
      x: colLeftX,
      y: lY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
      maxWidth: 250,
    });
  }

  const buildingAptGovLine = `Bldg ${order.building_number || 1}, Floor ${order.floor_number || 1}, Apt ${order.apartment_number || 1}`;
  lY -= 13;
  drawSafeText(buildingAptGovLine, {
    x: colLeftX,
    y: lY,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
    maxWidth: 250,
  });

  if (order.landmark) {
    lY -= 12;
    drawSafeText(`Landmark: ${order.landmark}`, {
      x: colLeftX,
      y: lY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.45, 0.45, 0.48),
      maxWidth: 250,
    });
  }

  // Right: ORDER & PAYMENT SNAPSHOT
  drawSafeText("ORDER & PAYMENT SNAPSHOT", {
    x: colRightX,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: rgb(0.45, 0.45, 0.48),
  });

  let rY = curY - 18;
  drawSafeText("Order Number: ", { x: colRightX, y: rY, size: 9.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  drawSafeText(order.order_number, { x: colRightX + 75, y: rY, size: 9.5, font: fontBold, color: rgb(0.07, 0.07, 0.07) });

  rY -= 15;
  drawSafeText("Payment Method: ", { x: colRightX, y: rY, size: 9.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  drawSafeText(order.payment_method_code, { x: colRightX + 85, y: rY, size: 9.5, font: fontBold, color: rgb(0.07, 0.07, 0.07) });

  rY -= 15;
  drawSafeText("Payment Status: ", { x: colRightX, y: rY, size: 9.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  drawSafeText(invoice.payment_status, { x: colRightX + 80, y: rY, size: 9.5, font: fontBold, color: rgb(0.07, 0.07, 0.07) });

  rY -= 15;
  drawSafeText("Delivery Estimate: ", { x: colRightX, y: rY, size: 9.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  drawSafeText(deliveryEstimate, { x: colRightX + 85, y: rY, size: 9.5, font: fontBold, color: rgb(0.07, 0.07, 0.07) });

  curY = Math.min(lY, rY) - 30;

  // 6. PRODUCT TABLE (Clean aligned columns without overlapping)
  const tblHeaderH = 24;
  page.drawRectangle({
    x: marginX,
    y: curY - tblHeaderH,
    width: contentWidth,
    height: tblHeaderH,
    color: rgb(0.07, 0.07, 0.07),
  });

  const tHY = curY - 16;
  drawSafeText("SKU", { x: marginX + 10, y: tHY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  drawSafeText("Product / Size / Color", { x: marginX + 130, y: tHY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  drawSafeText("Qty", { x: marginX + 375, y: tHY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  drawSafeText("Unit Price", { x: marginX + 410, y: tHY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  drawSafeText("Total", { x: width - marginX - 55, y: tHY, size: 9, font: fontBold, color: rgb(1, 1, 1) });

  curY -= tblHeaderH;

  // Table Rows
  const rowH = 28;
  items.forEach((item: any) => {
    curY -= rowH;
    const rYText = curY + 9;
    const sizeLabel = isNaN(Number(item.size)) ? item.size : `EU ${item.size}`;
    const pTitle = `${item.product_name_en} — ${sizeLabel} (${item.color_en || "Monochrome"})`;

    drawSafeText(item.sku, { x: marginX + 10, y: rYText, size: 8, font: fontRegular, color: rgb(0.25, 0.25, 0.25), maxWidth: 115 });
    drawSafeText(pTitle, { x: marginX + 130, y: rYText, size: 9, font: fontBold, color: rgb(0.07, 0.07, 0.07), maxWidth: 240 });
    drawSafeText(String(item.quantity), { x: marginX + 382, y: rYText, size: 9.5, font: fontBold, color: rgb(0.07, 0.07, 0.07) });
    drawSafeText(formatEgp(item.unit_price), { x: marginX + 410, y: rYText, size: 9, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    drawSafeText(formatEgp(item.line_total), { x: width - marginX - 58, y: rYText, size: 9.5, font: fontBold, color: rgb(0.07, 0.07, 0.07) });

    page.drawLine({
      start: { x: marginX, y: curY },
      end: { x: width - marginX, y: curY },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
  });

  curY -= 25;

  // 7. TOTALS BLOCK (Right-aligned)
  const totX = width - marginX - 210;
  const totValX = width - marginX - 55;

  drawSafeText("Subtotal", { x: totX, y: curY, size: 10, font: fontRegular, color: rgb(0.45, 0.45, 0.48) });
  drawSafeText(formatEgp(order.subtotal), { x: totValX, y: curY, size: 10, font: fontBold, color: rgb(0.07, 0.07, 0.07) });

  if (Number(order.discount_amount) > 0) {
    curY -= 18;
    drawSafeText("Discount", { x: totX, y: curY, size: 10, font: fontRegular, color: rgb(0.85, 0.15, 0.15) });
    drawSafeText(`- ${formatEgp(order.discount_amount)}`, { x: totValX, y: curY, size: 10, font: fontBold, color: rgb(0.85, 0.15, 0.15) });
  }

  curY -= 18;
  drawSafeText("Shipping Fee", { x: totX, y: curY, size: 10, font: fontRegular, color: rgb(0.45, 0.45, 0.48) });
  drawSafeText(formatEgp(order.shipping_fee), { x: totValX, y: curY, size: 10, font: fontBold, color: rgb(0.07, 0.07, 0.07) });

  curY -= 12;
  page.drawLine({
    start: { x: totX, y: curY },
    end: { x: width - marginX, y: curY },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });

  curY -= 18;
  drawSafeText("Final Total", { x: totX, y: curY, size: 12, font: fontBold, color: rgb(0.07, 0.07, 0.07) });
  drawSafeText(formatEgp(order.total_amount), { x: totValX, y: curY, size: 13, font: fontBold, color: rgb(0.07, 0.07, 0.07) });
  drawSafeText(formatEgp(order.total_amount), { x: totValX, y: curY, size: 13, font: fontBold, color: rgb(0.07, 0.07, 0.07) });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": isDownload
        ? `attachment; filename="${invoice.invoice_number}.pdf"`
        : `inline; filename="${invoice.invoice_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
