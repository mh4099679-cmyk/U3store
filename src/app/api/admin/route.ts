import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getDb, queryAll, queryOne, runSql, persistDb, withTransaction } from "@/lib/db";
import {
  getCurrentAdmin,
  hasAdminPermission,
  generateId,
  logAdminAction,
} from "@/lib/auth/session";
import { hashPasswordSync } from "@/lib/db/seed-data";
import { calculateShippingServer } from "@/lib/services/commerce";
import {
  queueWhatsAppNotification,
  renderWhatsAppTemplate,
  retryWhatsAppNotification,
} from "@/lib/services/whatsapp";

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized admin access." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") || "dashboard";
  const q = (searchParams.get("q") || "").trim();
  const db = await getDb();

  if (resource === "dashboard") {
    const totalOrders = queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM orders`)?.c || 0;
    const newOrders =
      queryOne<{ c: number }>(
        db,
        `SELECT COUNT(*) as c FROM orders WHERE order_status IN ('PENDING_PAYMENT', 'PAYMENT_UNDER_REVIEW')`
      )?.c || 0;
    const pendingPayments =
      queryOne<{ c: number }>(
        db,
        `SELECT COUNT(*) as c FROM orders WHERE payment_status = 'AWAITING_PAYMENT'`
      )?.c || 0;
    const paymentsUnderReview =
      queryOne<{ c: number }>(
        db,
        `SELECT COUNT(*) as c FROM orders WHERE payment_status IN ('UNDER_REVIEW', 'CUSTOMER_REPORTED_PAYMENT')`
      )?.c || 0;
    const confirmedOrders =
      queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM orders WHERE order_status = 'CONFIRMED'`)
        ?.c || 0;
    const processingOrders =
      queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM orders WHERE order_status = 'PROCESSING'`)
        ?.c || 0;
    const shippedOrders =
      queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM orders WHERE order_status = 'SHIPPED'`)
        ?.c || 0;
    const deliveredOrders =
      queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM orders WHERE order_status = 'DELIVERED'`)
        ?.c || 0;

    // Paid revenue strictly counts ONLY confirmed PAID orders (excluding cancelled or returned orders)
    const paidRevenue =
      queryOne<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE payment_status = 'PAID' AND order_status NOT IN ('CANCELLED', 'RETURNED')`
      )?.s || 0;

    const unpaidOrderValue =
      queryOne<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE payment_status IN ('AWAITING_PAYMENT', 'UNDER_REVIEW', 'CUSTOMER_REPORTED_PAYMENT') AND order_status != 'CANCELLED'`
      )?.s || 0;

    const refundsTotal =
      queryOne<{ s: number }>(db, `SELECT COALESCE(SUM(amount), 0) as s FROM refunds`)?.s || 0;
    const returnsCount =
      queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM return_requests`)?.c || 0;

    const regCustomers = queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM users`)?.c || 0;
    const guestCustomers =
      queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM guest_customers`)?.c || 0;
    const totalCustomers = regCustomers + guestCustomers;

    const lowStockCount =
      queryOne<{ c: number }>(
        db,
        `SELECT COUNT(*) as c FROM inventory WHERE (on_hand - reserved) > 0 AND (on_hand - reserved) <= low_stock_threshold`
      )?.c || 0;
    const outOfStockCount =
      queryOne<{ c: number }>(db, `SELECT COUNT(*) as c FROM inventory WHERE (on_hand - reserved) <= 0`)
        ?.c || 0;
    const productsSold =
      queryOne<{ s: number }>(db, `SELECT COALESCE(SUM(sold), 0) as s FROM inventory`)?.s || 0;

    const recentOrders = queryAll<any>(
      db,
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT 8`
    );
    const recentPayments = queryAll<any>(
      db,
      `SELECT ps.*, o.order_number, o.customer_name, o.total_amount
       FROM payment_submissions ps
       JOIN orders o ON o.id = ps.order_id
       ORDER BY ps.created_at DESC LIMIT 8`
    );
    const salesByGov = queryAll<any>(
      db,
      `SELECT governorate_name_en, governorate_name_ar, COUNT(*) as orders_count,
              COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) as paid_revenue
       FROM orders
       GROUP BY governorate_id, governorate_name_en, governorate_name_ar
       ORDER BY orders_count DESC LIMIT 10`
    );

    return NextResponse.json(
      {
        ok: true,
        stats: {
          totalOrders,
          newOrders,
          pendingPayments,
          paymentsUnderReview,
          confirmedOrders,
          processingOrders,
          shippedOrders,
          deliveredOrders,
          paidRevenue,
          unpaidOrderValue,
          refundsTotal,
          returnsCount,
          totalCustomers,
          regCustomers,
          guestCustomers,
          lowStockCount,
          outOfStockCount,
          productsSold,
        },
        recentOrders,
        recentPayments,
        salesByGov,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "settings") {
    const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
    return NextResponse.json({ ok: true, settings }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (resource === "catalog") {
    const products = queryAll<any>(
      db,
      `SELECT p.*,
              pt_en.name as name_en, pt_en.description as description_en,
              pt_ar.name as name_ar, pt_ar.description as description_ar,
              c_en.name as category_name_en, c_ar.name as category_name_ar,
              col.name_en as collection_name_en, col.name_ar as collection_name_ar
       FROM products p
       LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
       LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
       LEFT JOIN category_translations c_en ON c_en.category_id = p.category_id AND c_en.lang = 'en'
       LEFT JOIN category_translations c_ar ON c_ar.category_id = p.category_id AND c_ar.lang = 'ar'
       LEFT JOIN collections col ON col.id = p.collection_id
       ORDER BY p.created_at DESC`
    );

    for (const p of products) {
      p.images = queryAll<any>(
        db,
        `SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC`,
        [p.id]
      );
      p.variants = queryAll<any>(
        db,
        `SELECT pv.*, COALESCE(inv.on_hand, 0) as on_hand, COALESCE(inv.reserved, 0) as reserved,
                COALESCE(inv.sold, 0) as sold, COALESCE(inv.returned, 0) as returned, COALESCE(inv.damaged, 0) as damaged,
                COALESCE(inv.low_stock_threshold, 3) as low_stock_threshold
         FROM product_variants pv
         LEFT JOIN inventory inv ON inv.variant_id = pv.id
         WHERE pv.product_id = ?
         ORDER BY pv.color_en ASC, pv.size ASC`,
        [p.id]
      );
    }

    const categories = queryAll<any>(
      db,
      `SELECT c.*, ct_en.name as name_en, ct_en.description as description_en,
              ct_ar.name as name_ar, ct_ar.description as description_ar
       FROM categories c
       LEFT JOIN category_translations ct_en ON ct_en.category_id = c.id AND ct_en.lang = 'en'
       LEFT JOIN category_translations ct_ar ON ct_ar.category_id = c.id AND ct_ar.lang = 'ar'
       ORDER BY c.sort_order ASC, c.created_at DESC`
    );

    const collections = queryAll<any>(
      db,
      `SELECT * FROM collections ORDER BY sort_order ASC, created_at DESC`
    );

    const movements = queryAll<any>(
      db,
      `SELECT im.*, pv.sku, pv.size, pv.color_en, pt_en.name as product_name_en
       FROM inventory_movements im
       JOIN product_variants pv ON pv.id = im.variant_id
       LEFT JOIN product_translations pt_en ON pt_en.product_id = pv.product_id AND pt_en.lang = 'en'
       ORDER BY im.created_at DESC LIMIT 100`
    );

    return NextResponse.json(
      { ok: true, products, categories, collections, movements },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "orders") {
    const statusFilter = searchParams.get("orderStatus") || "";
    const paymentStatusFilter = searchParams.get("paymentStatus") || "";
    const govFilter = searchParams.get("governorateId") || "";
    const customerTypeFilter = searchParams.get("customerType") || "";
    const sort = searchParams.get("sort") || "newest";

    let sql = `
      SELECT DISTINCT o.*,
             i.invoice_number,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN invoices i ON i.order_id = o.id
      LEFT JOIN order_items ois ON ois.order_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (q) {
      sql += ` AND (
        UPPER(o.order_number) LIKE UPPER(?) OR
        UPPER(COALESCE(i.invoice_number, '')) LIKE UPPER(?) OR
        UPPER(o.customer_name) LIKE UPPER(?) OR
        o.customer_phone LIKE ? OR
        UPPER(o.customer_email) LIKE UPPER(?) OR
        UPPER(COALESCE(ois.product_name_en_snapshot, '')) LIKE UPPER(?) OR
        UPPER(COALESCE(ois.product_name_ar_snapshot, '')) LIKE UPPER(?) OR
        UPPER(COALESCE(ois.sku_snapshot, '')) LIKE UPPER(?) OR
        UPPER(COALESCE(o.tracking_number, '')) LIKE UPPER(?)
      )`;
      const likeQ = `%${q}%`;
      params.push(likeQ, likeQ, likeQ, likeQ, likeQ, likeQ, likeQ, likeQ, likeQ);
    }

    if (statusFilter) {
      sql += ` AND o.order_status = ?`;
      params.push(statusFilter);
    }
    if (paymentStatusFilter) {
      sql += ` AND o.payment_status = ?`;
      params.push(paymentStatusFilter);
    }
    if (govFilter) {
      sql += ` AND o.governorate_id = ?`;
      params.push(govFilter);
    }
    if (customerTypeFilter) {
      sql += ` AND o.customer_type = ?`;
      params.push(customerTypeFilter);
    }

    if (sort === "oldest") sql += ` ORDER BY o.created_at ASC`;
    else if (sort === "highest") sql += ` ORDER BY o.total_amount DESC`;
    else if (sort === "lowest") sql += ` ORDER BY o.total_amount ASC`;
    else if (sort === "updated") sql += ` ORDER BY o.updated_at DESC`;
    else sql += ` ORDER BY o.created_at DESC`;

    const orders = queryAll<any>(db, sql, params);
    for (const o of orders) {
      o.items = queryAll<any>(
        db,
        `SELECT oi.*, COALESCE(oi.product_type_snapshot, p.product_type, 'SHOES') as product_type
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [o.id]
      );
      o.submissions = queryAll<any>(
        db,
        `SELECT * FROM payment_submissions WHERE order_id = ? ORDER BY created_at DESC`,
        [o.id]
      );
      o.revisions = queryAll<any>(
        db,
        `SELECT * FROM order_revisions WHERE order_id = ? ORDER BY revision_number DESC`,
        [o.id]
      );
      o.editLogs = queryAll<any>(
        db,
        `SELECT * FROM order_edit_logs WHERE order_id = ? ORDER BY created_at DESC`,
        [o.id]
      );
      o.whatsappLogs = queryAll<any>(
        db,
        `SELECT * FROM whatsapp_message_logs
         WHERE related_order_id = ? OR related_order_number = ?
         ORDER BY queued_at DESC`,
        [o.id, o.order_number]
      );
    }
    const shippingCompanies = queryAll<any>(db, `SELECT * FROM shipping_companies ORDER BY name_en ASC`);
    const governorates = queryAll<any>(db, `SELECT * FROM governorates ORDER BY sort_order ASC`);
    const allVariants = queryAll<any>(
      db,
      `SELECT pv.*, p.regular_price, p.sale_price,
              pt_en.name as product_name_en, pt_ar.name as product_name_ar,
              COALESCE(inv.on_hand, 0) as on_hand, COALESCE(inv.reserved, 0) as reserved,
              MAX(0, COALESCE(inv.on_hand, 0) - COALESCE(inv.reserved, 0)) as available
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
       LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
       LEFT JOIN inventory inv ON inv.variant_id = pv.id
       WHERE pv.is_active = 1
       ORDER BY pt_en.name ASC, pv.color_en ASC, pv.size ASC`
    );

    return NextResponse.json(
      { ok: true, orders, shippingCompanies, governorates, allVariants },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "payments") {
    const paymentMethods = queryAll<any>(db, `SELECT * FROM payment_methods ORDER BY code ASC`);
    const submissions = queryAll<any>(
      db,
      `SELECT ps.*, o.order_number, o.customer_name, o.customer_phone, o.total_amount, o.payment_status as order_payment_status
       FROM payment_submissions ps
       JOIN orders o ON o.id = ps.order_id
       ORDER BY ps.created_at DESC`
    );
    return NextResponse.json(
      { ok: true, paymentMethods, submissions },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "customers") {
    const registered = queryAll<any>(
      db,
      `SELECT u.id, u.email, u.phone, u.status, u.email_verified, u.phone_verified, u.created_at,
              cp.full_name, cp.internal_notes,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as total_orders,
              (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = u.id AND o.payment_status = 'PAID') as total_paid_spending,
              (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id) as most_recent_order_at
       FROM users u
       LEFT JOIN customer_profiles cp ON cp.user_id = u.id
       ORDER BY u.created_at DESC`
    );

    const guests = queryAll<any>(
      db,
      `SELECT gc.*,
              (SELECT COUNT(*) FROM orders o WHERE o.guest_customer_id = gc.id) as total_orders,
              (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.guest_customer_id = gc.id AND o.payment_status = 'PAID') as total_paid_spending,
              (SELECT MAX(o.created_at) FROM orders o WHERE o.guest_customer_id = gc.id) as most_recent_order_at
       FROM guest_customers gc
       ORDER BY gc.created_at DESC`
    );

    return NextResponse.json(
      { ok: true, registered, guests },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "customer_details") {
    try {
      const userId = searchParams.get("userId") || "";
      const guestId = searchParams.get("guestId") || "";

      let customer: any = null;
      let orders: any[] = [];
      let addresses: any[] = [];

      if (userId) {
        customer = queryOne<any>(
          db,
          `SELECT u.id, u.email, u.phone, u.status, u.email_verified, u.phone_verified, u.created_at,
                  cp.full_name, cp.internal_notes, 'REGISTERED' as customer_type
           FROM users u
           LEFT JOIN customer_profiles cp ON cp.user_id = u.id
           WHERE u.id = ?`,
          [userId]
        );

        orders = queryAll<any>(
          db,
          `SELECT o.*,
                  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
                  (SELECT GROUP_CONCAT(oi.product_name_en_snapshot || ' (EU ' || oi.size_snapshot || ') x' || oi.quantity, ' | ') FROM order_items oi WHERE oi.order_id = o.id) as items_summary
           FROM orders o
           WHERE o.user_id = ?
           ORDER BY o.created_at DESC`,
          [userId]
        );

        addresses = queryAll<any>(
          db,
          `SELECT ca.*, g.name_en as gov_name_en, g.name_ar as gov_name_ar
           FROM customer_addresses ca
           LEFT JOIN governorates g ON g.id = ca.governorate_id
           WHERE ca.user_id = ?
           ORDER BY ca.is_default DESC, ca.created_at DESC`,
          [userId]
        );
      } else if (guestId) {
        customer = queryOne<any>(
          db,
          `SELECT gc.*, 'GUEST' as customer_type FROM guest_customers gc WHERE gc.id = ?`,
          [guestId]
        );

        orders = queryAll<any>(
          db,
          `SELECT o.*,
                  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
                  (SELECT GROUP_CONCAT(oi.product_name_en_snapshot || ' (EU ' || oi.size_snapshot || ') x' || oi.quantity, ' | ') FROM order_items oi WHERE oi.order_id = o.id) as items_summary
           FROM orders o
           WHERE o.guest_customer_id = ?
           ORDER BY o.created_at DESC`,
          [guestId]
        );
      }

      // Hydrate each order with its actual line items so admin sees images & sizes
      const hydratedOrders = orders.map((o) => {
        const items = queryAll<any>(
          db,
          `SELECT oi.id, oi.product_id, oi.variant_id, oi.sku_snapshot,
                  oi.product_name_en_snapshot, oi.product_name_ar_snapshot,
                  oi.product_image_snapshot, oi.size_snapshot, oi.color_en_snapshot,
                  oi.unit_final_price_snapshot, oi.quantity, oi.line_total
           FROM order_items oi
           WHERE oi.order_id = ?`,
          [o.id]
        );
        return { ...o, items };
      });

      return NextResponse.json(
        { ok: true, customer, orders: hydratedOrders, addresses },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    } catch (err: any) {
      console.error("Error loading customer_details:", err);
      return NextResponse.json(
        { ok: false, error: err?.message || "Failed to load customer details." },
        { status: 500 }
      );
    }
  }

  if (resource === "shipping") {
    const governorates = queryAll<any>(db, `SELECT * FROM governorates ORDER BY sort_order ASC`);
    const cities = queryAll<any>(
      db,
      `SELECT c.*, g.name_en as gov_name_en, g.name_ar as gov_name_ar
       FROM cities c
       JOIN governorates g ON g.id = c.governorate_id
       ORDER BY g.sort_order ASC, c.name_en ASC`
    );
    const areas = queryAll<any>(
      db,
      `SELECT a.*, c.name_en as city_name_en, c.name_ar as city_name_ar, g.name_en as gov_name_en
       FROM areas a
       JOIN cities c ON c.id = a.city_id
       JOIN governorates g ON g.id = c.governorate_id
       ORDER BY g.sort_order ASC, c.name_en ASC, a.name_en ASC`
    );
    const rules = queryOne<any>(db, `SELECT * FROM shipping_rules WHERE id = 'default'`);
    const companies = queryAll<any>(db, `SELECT * FROM shipping_companies ORDER BY name_en ASC`);

    return NextResponse.json(
      { ok: true, governorates, cities, areas, rules, companies },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "invoices") {
    const invoices = queryAll<any>(
      db,
      `SELECT i.*,
              o.order_status,
              o.governorate_name_ar,
              o.governorate_name_en,
              o.city_name_ar,
              o.city_name_en,
              o.shipping_method,
              (SELECT ps.id FROM payment_submissions ps WHERE ps.order_id = i.order_id ORDER BY ps.created_at DESC LIMIT 1) as payment_submission_id,
              (SELECT ps.transaction_reference FROM payment_submissions ps WHERE ps.order_id = i.order_id ORDER BY ps.created_at DESC LIMIT 1) as transaction_reference,
              (SELECT ps.sender_identifier FROM payment_submissions ps WHERE ps.order_id = i.order_id ORDER BY ps.created_at DESC LIMIT 1) as sender_identifier,
              (SELECT ps.transfer_date FROM payment_submissions ps WHERE ps.order_id = i.order_id ORDER BY ps.created_at DESC LIMIT 1) as transfer_date,
              (SELECT ps.receipt_file_path FROM payment_submissions ps WHERE ps.order_id = i.order_id ORDER BY ps.created_at DESC LIMIT 1) as receipt_file_path,
              (SELECT ps.status FROM payment_submissions ps WHERE ps.order_id = i.order_id ORDER BY ps.created_at DESC LIMIT 1) as submission_status
       FROM invoices i
       LEFT JOIN orders o ON o.id = i.order_id
       ORDER BY i.issued_at DESC`
    );

    // Hydrate line items efficiently
    const invoiceIds = invoices.map((i) => i.id);
    let allItems: any[] = [];
    if (invoiceIds.length > 0) {
      allItems = queryAll<any>(
        db,
        `SELECT ii.* FROM invoice_items ii WHERE ii.invoice_id IN (${invoiceIds.map(() => "?").join(",")})`,
        invoiceIds
      );
    }
    const itemsByInvoice: Record<string, any[]> = {};
    for (const item of allItems) {
      if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
      itemsByInvoice[item.invoice_id].push(item);
    }
    for (const inv of invoices) {
      inv.items = itemsByInvoice[inv.id] || [];
    }

    // Comprehensive financial breakdown
    const paidRevenue =
      queryOne<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE payment_status = 'PAID' AND order_status NOT IN ('CANCELLED', 'RETURNED')`
      )?.s || 0;

    const instapayRevenue =
      queryOne<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE payment_status = 'PAID' AND payment_method_code = 'INSTAPAY' AND order_status NOT IN ('CANCELLED', 'RETURNED')`
      )?.s || 0;

    const vodafoneRevenue =
      queryOne<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE payment_status = 'PAID' AND payment_method_code = 'VODAFONE_CASH' AND order_status NOT IN ('CANCELLED', 'RETURNED')`
      )?.s || 0;

    const codRevenue =
      queryOne<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE payment_status = 'PAID' AND payment_method_code = 'CASH_ON_DELIVERY' AND order_status NOT IN ('CANCELLED', 'RETURNED')`
      )?.s || 0;

    const pendingRevenue =
      queryOne<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE payment_status != 'PAID' AND order_status NOT IN ('CANCELLED', 'RETURNED')`
      )?.s || 0;

    const stats = {
      paidRevenue,
      instapayRevenue,
      vodafoneRevenue,
      codRevenue,
      pendingRevenue,
      totalCount: invoices.length,
      paidCount: invoices.filter((i: any) => i.payment_status === "PAID" || i.payment_status === "Paid").length,
      pendingCount: invoices.filter((i: any) => i.payment_status !== "PAID" && i.payment_status !== "Paid").length,
    };

    return NextResponse.json({ ok: true, invoices, stats }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (resource === "returns_discounts") {
    const returns = queryAll<any>(
      db,
      `SELECT rr.*, o.order_number, o.customer_name, o.customer_phone
       FROM return_requests rr
       JOIN orders o ON o.id = rr.order_id
       ORDER BY rr.created_at DESC`
    );
    for (const r of returns) {
      r.items = queryAll<any>(db, `SELECT * FROM return_items WHERE return_request_id = ?`, [r.id]);
      r.inspections = queryAll<any>(
        db,
        `SELECT * FROM return_inspections WHERE return_request_id = ? ORDER BY inspected_at DESC`,
        [r.id]
      );
      r.exchanges = queryAll<any>(
        db,
        `SELECT * FROM exchange_orders WHERE return_request_id = ? ORDER BY created_at DESC`,
        [r.id]
      );
    }

    // Seamlessly include all orders marked as RETURNED or EXCHANGED directly
    const existingOrderIds = new Set(returns.map((r: any) => r.order_id));
    const directOrders = queryAll<any>(
      db,
      `SELECT o.*,
              (SELECT reason FROM order_revisions WHERE order_id = o.id ORDER BY revision_number DESC LIMIT 1) as exchange_summary
       FROM orders o
       WHERE o.order_status IN ('RETURNED', 'EXCHANGED')
       ORDER BY o.updated_at DESC`
    );

    for (const ord of directOrders) {
      if (existingOrderIds.has(ord.id)) continue;
      const orderItems = queryAll<any>(db, `SELECT * FROM order_items WHERE order_id = ?`, [ord.id]);
      const revisions = queryAll<any>(db, `SELECT * FROM order_revisions WHERE order_id = ? ORDER BY revision_number DESC`, [ord.id]);

      returns.push({
        id: `ret-${ord.id}`,
        return_number: ord.order_status === "EXCHANGED" ? `EXC-${ord.order_number.replace(/^U3-/, "")}` : `RET-${ord.order_number.replace(/^U3-/, "")}`,
        order_id: ord.id,
        order_number: ord.order_number,
        customer_name: ord.customer_name,
        customer_phone: ord.customer_phone,
        request_type: ord.order_status === "EXCHANGED" ? "EXCHANGE" : "RETURN",
        reason: ord.order_status === "EXCHANGED" ? (ord.exchange_summary || "استبدال مقاس / موديل") : "مرتجع من العميل وتم استرجاع المخزون",
        status: ord.order_status === "EXCHANGED" ? "EXCHANGED" : "RETURNED",
        condition_status: "RESALABLE",
        stock_restored: 1,
        created_at: ord.updated_at || ord.created_at,
        items: orderItems.map((oi) => ({
          id: oi.id,
          return_request_id: `ret-${ord.id}`,
          order_item_id: oi.id,
          product_name: oi.product_name_ar_snapshot || oi.product_name_en_snapshot,
          sku: oi.sku_snapshot,
          size: oi.size_snapshot,
          color: oi.color_ar_snapshot || oi.color_en_snapshot,
          quantity: oi.quantity,
          condition: "RESALABLE",
          restocked: 1,
        })),
        inspections: [],
        exchanges: revisions.map((rev) => ({
          id: rev.id,
          change_summary: rev.reason || "استبدال أوردر",
          previous_total: 0,
          new_total: ord.total_amount,
          price_difference: rev.price_difference,
          created_at: rev.created_at,
        })),
        is_direct: true,
      });
    }
    const coupons = queryAll<any>(db, `SELECT * FROM coupons ORDER BY created_at DESC`);
    const discounts = queryAll<any>(db, `SELECT * FROM discounts ORDER BY created_at DESC`);
    const allVariants = queryAll<any>(
      db,
      `SELECT pv.*, pt_en.name as product_name_en, pt_ar.name as product_name_ar,
              MAX(0, COALESCE(inv.on_hand, 0) - COALESCE(inv.reserved, 0)) as available
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
       LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
       LEFT JOIN inventory inv ON inv.variant_id = pv.id
       WHERE pv.is_active = 1`
    );
    return NextResponse.json(
      { ok: true, returns, coupons, discounts, allVariants },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "cms") {
    const sections = queryAll<any>(db, `SELECT * FROM website_sections ORDER BY sort_order ASC`);
    const pages = queryAll<any>(db, `SELECT * FROM website_pages ORDER BY slug ASC`);
    const navLinks = queryAll<any>(db, `SELECT * FROM navigation_links ORDER BY location ASC, sort_order ASC`);
    const media = queryAll<any>(db, `SELECT * FROM media_files WHERE is_private = 0 ORDER BY created_at DESC`);
    const translations = queryAll<any>(db, `SELECT * FROM translations ORDER BY key ASC`);
    const settings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);
    const footerSettings = queryOne<any>(db, `SELECT * FROM footer_settings WHERE id = 'default'`);
    const marqueeSettings = queryOne<any>(db, `SELECT * FROM marquee_settings WHERE id = 'default'`);
    const saleCampaign = queryOne<any>(db, `SELECT * FROM sale_campaigns WHERE id = 'archive_sale'`);
    const subscribers = queryAll<any>(
      db,
      `SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 200`
    );
    const contactMessages = queryAll<any>(
      db,
      `SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100`
    );
    return NextResponse.json(
      {
        ok: true,
        sections,
        pages,
        navLinks,
        media,
        translations,
        settings,
        footerSettings,
        marqueeSettings,
        saleCampaign,
        subscribers,
        contactMessages,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "system") {
    const staff = queryAll<any>(
      db,
      `SELECT a.id, a.username, a.email, a.full_name, a.role_id, a.status, a.last_login_at, a.created_at,
              r.code as role_code, r.name_en as role_name_en, r.name_ar as role_name_ar
       FROM admin_users a
       JOIN roles r ON r.id = a.role_id
       ORDER BY a.created_at ASC`
    );
    const roles = queryAll<any>(db, `SELECT * FROM roles`);
    const permissions = queryAll<any>(db, `SELECT * FROM permissions`);
    const auditLogs = queryAll<any>(db, `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`);
    const notifications = queryAll<any>(
      db,
      `SELECT * FROM notifications WHERE recipient_type = 'ADMIN' ORDER BY created_at DESC LIMIT 80`
    );
    const backups = queryAll<any>(db, `SELECT * FROM backups ORDER BY created_at DESC`);
    return NextResponse.json(
      { ok: true, staff, roles, permissions, auditLogs, notifications, backups },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "reports") {
    const salesByDate = queryAll<any>(
      db,
      `SELECT substr(created_at, 1, 10) as day,
              COUNT(*) as orders_count,
              COALESCE(SUM(total_amount), 0) as gross_value,
              COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) as paid_revenue
       FROM orders
       WHERE order_status != 'CANCELLED'
       GROUP BY substr(created_at, 1, 10)
       ORDER BY day DESC LIMIT 30`
    );

    const salesByProduct = queryAll<any>(
      db,
      `SELECT oi.product_name_en_snapshot as product_name_en,
              oi.product_name_ar_snapshot as product_name_ar,
              SUM(oi.quantity) as units_sold,
              SUM(oi.line_total) as total_sales
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status != 'CANCELLED'
       GROUP BY oi.product_id, oi.product_name_en_snapshot, oi.product_name_ar_snapshot
       ORDER BY units_sold DESC`
    );

    const salesBySize = queryAll<any>(
      db,
      `SELECT oi.size_snapshot as size, SUM(oi.quantity) as units_sold
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status != 'CANCELLED'
       GROUP BY oi.size_snapshot
       ORDER BY units_sold DESC`
    );

    const salesByColor = queryAll<any>(
      db,
      `SELECT oi.color_en_snapshot as color_en, oi.color_ar_snapshot as color_ar, SUM(oi.quantity) as units_sold
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status != 'CANCELLED'
       GROUP BY oi.color_en_snapshot, oi.color_ar_snapshot
       ORDER BY units_sold DESC`
    );

    const paymentDistribution = queryAll<any>(
      db,
      `SELECT payment_method_code, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_value
       FROM orders
       GROUP BY payment_method_code`
    );

    return NextResponse.json(
      {
        ok: true,
        salesByDate,
        salesByProduct,
        salesBySize,
        salesByColor,
        paymentDistribution,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "whatsapp") {
    const settings = queryOne<any>(db, `SELECT * FROM whatsapp_settings WHERE id = 'default'`);
    const templates = queryAll<any>(db, `SELECT * FROM whatsapp_templates ORDER BY event_type ASC`);
    const logs = queryAll<any>(
      db,
      `SELECT l.*, l.send_status as status, l.rendered_body as message_body
       FROM whatsapp_message_logs l
       ORDER BY l.queued_at DESC LIMIT 100`
    );
    const outbox = queryAll<any>(
      db,
      `SELECT * FROM notification_outbox ORDER BY created_at DESC LIMIT 100`
    );
    const conversations = queryAll<any>(
      db,
      `SELECT * FROM whatsapp_conversations ORDER BY last_message_at DESC`
    );
    for (const c of conversations) {
      c.messages = queryAll<any>(
        db,
        `SELECT * FROM whatsapp_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
        [c.id]
      );
    }
    return NextResponse.json(
      { ok: true, settings, templates, logs, outbox, conversations },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (resource === "appearance") {
    const appearance = queryOne<any>(db, `SELECT * FROM appearance_settings WHERE id = 'default'`);
    return NextResponse.json(
      { ok: true, appearance },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  return NextResponse.json({ ok: false, error: "Unknown resource" }, { status: 400 });
}

function commitOrderInventory(txDb: any, order: any, adminId: string, now: string, reasonNote?: string): boolean {
  // Check if inventory has already been deducted for this order (prevent duplicate deductions)
  if (Number(order.inventory_deducted) === 1) return false;

  const orderItems = queryAll<any>(
    txDb,
    `SELECT variant_id, quantity FROM order_items WHERE order_id = ?`,
    [order.id]
  );
  for (const item of orderItems) {
    if (!item.variant_id) continue;
    const inv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [
      item.variant_id,
    ]);
    if (inv) {
      const qty = Number(item.quantity || 1);
      const prevOnHand = Number(inv.on_hand);
      const prevSold = Number(inv.sold || 0);
      const newOnHand = Math.max(0, prevOnHand - qty);
      const newSold = prevSold + qty;
      runSql(
        txDb,
        `UPDATE inventory SET on_hand = ?, reserved = 0, sold = ?, updated_at = ? WHERE variant_id = ?`,
        [newOnHand, newSold, now, item.variant_id]
      );
      runSql(
        txDb,
        `INSERT INTO inventory_movements (
          id, variant_id, movement_type, previous_on_hand, new_on_hand,
          previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
        ) VALUES (?, ?, 'SALE', ?, ?, 0, 0, ?, ?, ?, ?)`,
        [
          generateId("mov"),
          item.variant_id,
          prevOnHand,
          newOnHand,
          reasonNote || `خصم من المخزون: تم تأكيد الدفع للطلب ${order.order_number}`,
          order.id,
          adminId,
          now,
        ]
      );
    }
  }
  runSql(txDb, `UPDATE inventory_reservations SET status = 'COMMITTED' WHERE order_id = ?`, [
    order.id,
  ]);
  runSql(txDb, `UPDATE orders SET inventory_deducted = 1, updated_at = ? WHERE id = ?`, [
    now,
    order.id,
  ]);
  order.inventory_deducted = 1;
  return true;
}

function restoreOrderInventory(txDb: any, order: any, adminId: string, now: string, reasonNote?: string): boolean {
  // If already returned, prevent duplicate inventory restoration
  if (order.order_status === "RETURNED") {
    return false;
  }

  // If inventory was deducted OR the order was confirmed/shipped/delivered OR an explicit return was requested, restore all exact product quantities
  const wasDeducted = Number(order.inventory_deducted) === 1;
  const wasFulfilled = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CONFIRMED", "PROCESSING"].includes(order.order_status);
  const isExplicitReturn = Boolean(reasonNote && reasonNote.includes("مرتجع"));

  if (wasDeducted || wasFulfilled || isExplicitReturn) {
    const orderItems = queryAll<any>(
      txDb,
      `SELECT variant_id, quantity FROM order_items WHERE order_id = ?`,
      [order.id]
    );
    for (const item of orderItems) {
      if (!item.variant_id) continue;
      const inv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [
        item.variant_id,
      ]);
      if (inv) {
        const qty = Number(item.quantity || 1);
        const prevOnHand = Number(inv.on_hand);
        const prevSold = Number(inv.sold || 0);
        const newOnHand = prevOnHand + qty;
        const newSold = Math.max(0, prevSold - qty);
        runSql(
          txDb,
          `UPDATE inventory SET on_hand = ?, sold = ?, updated_at = ? WHERE variant_id = ?`,
          [newOnHand, newSold, now, item.variant_id]
        );
        runSql(
          txDb,
          `INSERT INTO inventory_movements (
            id, variant_id, movement_type, previous_on_hand, new_on_hand,
            previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
          ) VALUES (?, ?, 'RETURN_RESTORE', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId("mov"),
            item.variant_id,
            prevOnHand,
            newOnHand,
            Number(inv.reserved || 0),
            Number(inv.reserved || 0),
            reasonNote || `طلب مرتجع: استرجاع منتجات الطلب #${order.order_number} إلى المخزون`,
            order.id,
            adminId,
            now,
          ]
        );
      }
    }
    runSql(txDb, `UPDATE inventory_reservations SET status = 'RELEASED' WHERE order_id = ?`, [
      order.id,
    ]);
    runSql(txDb, `UPDATE orders SET inventory_deducted = 0, updated_at = ? WHERE id = ?`, [
      now,
      order.id,
    ]);
    order.inventory_deducted = 0;
    return true;
  }

  // Unpaid order: release any active reserved stock without touching on_hand
  const activeRes = queryAll<any>(
    txDb,
    `SELECT * FROM inventory_reservations WHERE order_id = ? AND status = 'ACTIVE'`,
    [order.id]
  );
  for (const r of activeRes) {
    const inv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [
      r.variant_id,
    ]);
    if (inv) {
      const prevRes = Number(inv.reserved);
      const nextRes = Math.max(0, prevRes - Number(r.quantity));
      runSql(txDb, `UPDATE inventory SET reserved = ?, updated_at = ? WHERE variant_id = ?`, [
        nextRes,
        now,
        r.variant_id,
      ]);
      runSql(
        txDb,
        `INSERT INTO inventory_movements (
          id, variant_id, movement_type, previous_on_hand, new_on_hand,
          previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
        ) VALUES (?, ?, 'RELEASE', ?, ?, ?, ?, 'Order cancelled - reservation released', ?, ?, ?)`,
        [
          generateId("mov"),
          r.variant_id,
          inv.on_hand,
          inv.on_hand,
          prevRes,
          nextRes,
          order.id,
          adminId,
          now,
        ]
      );
    }
    runSql(txDb, `UPDATE inventory_reservations SET status = 'RELEASED' WHERE id = ?`, [
      r.id,
    ]);
  }
  return false;
}

function markOrderAcknowledgedInSettings(db: any, orderId: string, timestamp: string) {
  try {
    const settings = queryOne<any>(
      db,
      `SELECT last_acknowledged_order_id, acknowledged_order_ids FROM store_settings WHERE id = 'default'`
    );
    let ackList: string[] = [];
    if (settings?.acknowledged_order_ids) {
      try {
        ackList = JSON.parse(settings.acknowledged_order_ids);
      } catch {}
    }
    if (!ackList.includes(orderId)) {
      ackList.push(orderId);
    }
    if (ackList.length > 50) {
      ackList = ackList.slice(-50);
    }
    runSql(
      db,
      `UPDATE store_settings SET last_acknowledged_order_id = ?, acknowledged_order_ids = ?, updated_at = ? WHERE id = 'default'`,
      [orderId, JSON.stringify(ackList), timestamp]
    );
  } catch (err) {
    console.error("Error updating acknowledged order in settings:", err);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized admin access." }, { status: 401 });
    }

    const body = await req.json();
    const action = String(body.action || "");
    const db = await getDb();
    const now = new Date().toISOString();

    // 0. ACKNOWLEDGE NEW ORDER ALERT (Syncs instantly across all open admin devices)
    if (action === "acknowledge_order") {
      const orderId = String(body.orderId || "").trim();
      if (!orderId) {
        return NextResponse.json({ ok: false, error: "Order ID is required." }, { status: 400 });
      }

      markOrderAcknowledgedInSettings(db, orderId, now);
      persistDb(db);

      return NextResponse.json({
        ok: true,
        orderId,
      });
    }

    // 1. CATEGORY CRUD
    if (action === "save_category") {
      if (!hasAdminPermission(admin, "products.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("cat");
      const slug =
        String(body.slug || body.nameEn || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `cat-${Date.now()}`;
      const nameEn = String(body.nameEn || "").trim();
      const nameAr = String(body.nameAr || nameEn).trim();
      const descriptionEn = String(body.descriptionEn || "").trim();
      const descriptionAr = String(body.descriptionAr || "").trim();
      const imageUrl = String(body.imageUrl || "").trim();
      const isActive = body.isActive === false ? 0 : 1;

      if (!nameEn) {
        return NextResponse.json({ ok: false, error: "English Category Name is required." }, { status: 400 });
      }

      const exists = queryOne<any>(db, `SELECT id FROM categories WHERE id = ?`, [id]);
      if (exists) {
        runSql(db, `UPDATE categories SET slug = ?, image_url = ?, is_active = ? WHERE id = ?`, [
          slug,
          imageUrl,
          isActive,
          id,
        ]);
      } else {
        runSql(
          db,
          `INSERT INTO categories (id, slug, image_url, is_active, sort_order, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
          [id, slug, imageUrl, isActive, now]
        );
      }

      runSql(
        db,
        `INSERT OR REPLACE INTO category_translations (category_id, lang, name, description) VALUES (?, 'en', ?, ?)`,
        [id, nameEn, descriptionEn]
      );
      runSql(
        db,
        `INSERT OR REPLACE INTO category_translations (category_id, lang, name, description) VALUES (?, 'ar', ?, ?)`,
        [id, nameAr, descriptionAr]
      );

      persistDb(db);
      await logAdminAction(admin, "SAVE_CATEGORY", "CATEGORY", id, { nameEn, nameAr });
      return NextResponse.json({ ok: true, id });
    }

    if (action === "delete_category") {
      if (!hasAdminPermission(admin, "products.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      runSql(db, `DELETE FROM categories WHERE id = ?`, [String(body.id || "")]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    // 2. COLLECTION CRUD
    if (action === "save_collection") {
      if (!hasAdminPermission(admin, "products.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("col");
      const nameEn = String(body.nameEn || "").trim();
      const nameAr = String(body.nameAr || nameEn).trim();
      const slug =
        String(body.slug || nameEn)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `col-${Date.now()}`;
      const descriptionEn = String(body.descriptionEn || "").trim();
      const descriptionAr = String(body.descriptionAr || "").trim();
      const bannerDesktopUrl = String(body.bannerDesktopUrl || "").trim();
      const bannerMobileUrl = String(body.bannerMobileUrl || "").trim();
      const isActive = body.isActive === false ? 0 : 1;
      const productType = body.productType === "CLOTHING" ? "CLOTHING" : "SHOES";
      const showOnHomepage = body.showOnHomepage === false || body.showOnHomepage === 0 ? 0 : 1;
      const homepageSortOrder = Number(body.homepageSortOrder || 0);

      if (!nameEn) {
        return NextResponse.json({ ok: false, error: "Collection English name is required." }, { status: 400 });
      }

      const exists = queryOne<any>(db, `SELECT id FROM collections WHERE id = ?`, [id]);
      if (exists) {
        runSql(
          db,
          `UPDATE collections
           SET slug = ?, name_en = ?, name_ar = ?, description_en = ?, description_ar = ?,
               banner_desktop_url = ?, banner_mobile_url = ?, is_active = ?,
               product_type = ?, show_on_homepage = ?, homepage_sort_order = ?
           WHERE id = ?`,
          [
            slug,
            nameEn,
            nameAr,
            descriptionEn,
            descriptionAr,
            bannerDesktopUrl,
            bannerMobileUrl,
            isActive,
            productType,
            showOnHomepage,
            homepageSortOrder,
            id,
          ]
        );
      } else {
        runSql(
          db,
          `INSERT INTO collections (
            id, slug, name_en, name_ar, description_en, description_ar,
            banner_desktop_url, banner_mobile_url, is_active, sort_order,
            product_type, show_on_homepage, homepage_sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          [
            id,
            slug,
            nameEn,
            nameAr,
            descriptionEn,
            descriptionAr,
            bannerDesktopUrl,
            bannerMobileUrl,
            isActive,
            productType,
            showOnHomepage,
            homepageSortOrder,
            now,
          ]
        );
      }
      persistDb(db);
      await logAdminAction(admin, "SAVE_COLLECTION", "COLLECTION", id, { nameEn, nameAr, productType });
      return NextResponse.json({ ok: true, id });
    }

    if (action === "delete_collection") {
      if (!hasAdminPermission(admin, "products.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const colId = String(body.id || "").trim();
      if (!colId) {
        return NextResponse.json({ ok: false, error: "Collection ID required" }, { status: 400 });
      }
      await withTransaction((txDb) => {
        runSql(txDb, `UPDATE products SET collection_id = NULL WHERE collection_id = ?`, [colId]);
        runSql(txDb, `DELETE FROM collections WHERE id = ?`, [colId]);
      });
      persistDb(db);
      await logAdminAction(admin, "DELETE_COLLECTION", "COLLECTION", colId, {});
      return NextResponse.json({ ok: true });
    }

    // 3. PRODUCT & VARIANTS CRUD
    if (action === "delete_product") {
      if (!hasAdminPermission(admin, "products.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const productId = String(body.id || body.productId || "").trim();
      if (!productId) {
        return NextResponse.json({ ok: false, error: "Product ID required" }, { status: 400 });
      }
      await withTransaction((txDb) => {
        runSql(txDb, `DELETE FROM product_translations WHERE product_id = ?`, [productId]);
        runSql(txDb, `DELETE FROM product_images WHERE product_id = ?`, [productId]);
        const variants = queryAll<any>(txDb, `SELECT id FROM product_variants WHERE product_id = ?`, [productId]);
        for (const v of variants) {
          runSql(txDb, `DELETE FROM inventory WHERE variant_id = ?`, [v.id]);
          runSql(txDb, `DELETE FROM inventory_movements WHERE variant_id = ?`, [v.id]);
          runSql(txDb, `DELETE FROM inventory_reservations WHERE variant_id = ?`, [v.id]);
        }
        runSql(txDb, `DELETE FROM product_variants WHERE product_id = ?`, [productId]);
        runSql(txDb, `DELETE FROM products WHERE id = ?`, [productId]);
      });
      await logAdminAction(admin, "DELETE_PRODUCT", "PRODUCT", productId, {});
      return NextResponse.json({ ok: true });
    }

    if (action === "save_product") {
      if (!hasAdminPermission(admin, "products.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }

      const id = String(body.id || "").trim() || generateId("prd");
      const nameEn = String(body.nameEn || "").trim();
      const nameAr = String(body.nameAr || nameEn).trim();
      const descriptionEn = String(body.descriptionEn || "").trim();
      const descriptionAr = String(body.descriptionAr || "").trim();
      const slug =
        String(body.slug || nameEn)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `u3-shoe-${Date.now()}`;
      const categoryId =
        body.categoryId && body.categoryId !== "none" && body.categoryId !== "null"
          ? String(body.categoryId).trim()
          : null;
      const collectionId =
        body.collectionId && body.collectionId !== "none" && body.collectionId !== "null"
          ? String(body.collectionId).trim()
          : null;
      const regularPrice = Number(body.regularPrice || 0);
      const salePrice =
        body.salePrice !== null && body.salePrice !== undefined && body.salePrice !== ""
          ? Number(body.salePrice)
          : null;
      const status = ["ACTIVE", "DRAFT", "ARCHIVED"].includes(body.status) ? body.status : "ACTIVE";
      const isFeatured = body.isFeatured ? 1 : 0;
      const isNewArrival = body.isNewArrival ? 1 : 0;
      const isBestSeller = body.isBestSeller ? 1 : 0;
      const productType = body.productType === "CLOTHING" ? "CLOTHING" : "SHOES";
      const brand = String(body.brand || "U3").trim();
      const materialEn = String(body.materialEn || "").trim();
      const materialAr = String(body.materialAr || "").trim();
      const rawImages: any[] = Array.isArray(body.images) ? body.images : [];
      const images: Array<{ url: string; isMain?: boolean }> = rawImages
        .map((img: any, idx: number) => {
          if (typeof img === "string") return { url: img.trim(), isMain: idx === 0 };
          if (img && typeof img.url === "string") return { url: img.url.trim(), isMain: Boolean(img.isMain) };
          return null;
        })
        .filter(Boolean) as Array<{ url: string; isMain?: boolean }>;
      const variants: Array<{
        id?: string;
        sku: string;
        size: string;
        colorEn: string;
        colorAr: string;
        colorHex?: string;
        onHand: number;
      }> = Array.isArray(body.variants) ? body.variants : [];

      if (!nameEn || regularPrice <= 0) {
        return NextResponse.json(
          { ok: false, error: "Product English name and a valid regular price (> 0) are required." },
          { status: 400 }
        );
      }

      await withTransaction((txDb) => {
        const existing = queryOne<any>(txDb, `SELECT id FROM products WHERE id = ?`, [id]);
        if (existing) {
          runSql(
            txDb,
            `UPDATE products
             SET slug = ?, category_id = ?, collection_id = ?, regular_price = ?, sale_price = ?,
                 status = ?, is_featured = ?, is_new_arrival = ?, is_best_seller = ?,
                 product_type = ?, brand = ?, material_en = ?, material_ar = ?, updated_at = ?
             WHERE id = ?`,
            [
              slug,
              categoryId,
              collectionId,
              regularPrice,
              salePrice,
              status,
              isFeatured,
              isNewArrival,
              isBestSeller,
              productType,
              brand,
              materialEn,
              materialAr,
              now,
              id,
            ]
          );
        } else {
          runSql(
            txDb,
            `INSERT INTO products (
              id, slug, category_id, collection_id, regular_price, sale_price,
              status, is_featured, is_new_arrival, is_best_seller,
              product_type, brand, material_en, material_ar, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              slug,
              categoryId,
              collectionId,
              regularPrice,
              salePrice,
              status,
              isFeatured,
              isNewArrival,
              isBestSeller,
              productType,
              brand,
              materialEn,
              materialAr,
              now,
              now,
            ]
          );
        }

        runSql(
          txDb,
          `INSERT OR REPLACE INTO product_translations (product_id, lang, name, description) VALUES (?, 'en', ?, ?)`,
          [id, nameEn, descriptionEn]
        );
        runSql(
          txDb,
          `INSERT OR REPLACE INTO product_translations (product_id, lang, name, description) VALUES (?, 'ar', ?, ?)`,
          [id, nameAr, descriptionAr]
        );

        // Update images if provided
        if (images.length > 0) {
          runSql(txDb, `DELETE FROM product_images WHERE product_id = ?`, [id]);
          images.forEach((img, idx) => {
            if (!img.url) return;
            runSql(
              txDb,
              `INSERT INTO product_images (id, product_id, url, alt_en, alt_ar, is_main, sort_order, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId("pimg"),
                id,
                img.url,
                nameEn,
                nameAr,
                img.isMain || idx === 0 ? 1 : 0,
                idx,
                now,
              ]
            );
          });
        }

        // Upsert Variants & Independent Stock per Size/Color
        for (const v of variants) {
          const vId = v.id || generateId("var");
          const sku =
            String(v.sku || "").trim() ||
            `U3-${slug.slice(0, 6).toUpperCase()}-${v.colorEn.slice(0, 3).toUpperCase()}-${v.size}`;
          const size = String(v.size || "41").trim();
          const colorEn = String(v.colorEn || "Black").trim();
          const colorAr = String(v.colorAr || colorEn).trim();
          const colorHex = String(v.colorHex || "#111111").trim();
          const targetOnHand = Math.max(0, Number(v.onHand || 0));

          const existingVar = queryOne<any>(txDb, `SELECT id FROM product_variants WHERE id = ?`, [vId]);
          if (existingVar) {
            runSql(
              txDb,
              `UPDATE product_variants SET sku = ?, size = ?, color_en = ?, color_ar = ?, color_hex = ?, is_active = 1 WHERE id = ?`,
              [sku, size, colorEn, colorAr, colorHex, vId]
            );
          } else {
            runSql(
              txDb,
              `INSERT INTO product_variants (id, product_id, sku, size, color_en, color_ar, color_hex, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
              [vId, id, sku, size, colorEn, colorAr, colorHex, now]
            );
          }

          const inv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [vId]);
          if (!inv) {
            runSql(
              txDb,
              `INSERT INTO inventory (variant_id, on_hand, reserved, low_stock_threshold, updated_at)
               VALUES (?, ?, 0, 3, ?)`,
              [vId, targetOnHand, now]
            );
            runSql(
              txDb,
              `INSERT INTO inventory_movements (
                id, variant_id, movement_type, previous_on_hand, new_on_hand,
                previous_reserved, new_reserved, reason, admin_user_id, created_at
              ) VALUES (?, ?, 'RESTOCK', 0, ?, 0, 0, 'Initial variant stock setup', ?, ?)`,
              [generateId("mov"), vId, targetOnHand, admin.id, now]
            );
          } else if (Number(inv.on_hand) !== targetOnHand) {
            const prevOnHand = Number(inv.on_hand);
            runSql(txDb, `UPDATE inventory SET on_hand = ?, updated_at = ? WHERE variant_id = ?`, [
              targetOnHand,
              now,
              vId,
            ]);
            runSql(
              txDb,
              `INSERT INTO inventory_movements (
                id, variant_id, movement_type, previous_on_hand, new_on_hand,
                previous_reserved, new_reserved, reason, admin_user_id, created_at
              ) VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?, ?, 'Admin product stock update', ?, ?)`,
              [
                generateId("mov"),
                vId,
                prevOnHand,
                targetOnHand,
                inv.reserved,
                inv.reserved,
                admin.id,
                now,
              ]
            );
          }
        }
      });

      await logAdminAction(admin, "SAVE_PRODUCT", "PRODUCT", id, { nameEn, slug });
      return NextResponse.json({ ok: true, id });
    }

    // 4. INVENTORY DIRECT ADJUSTMENT
    if (action === "adjust_inventory") {
      if (!hasAdminPermission(admin, "inventory.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const variantId = String(body.variantId || "");
      const newOnHand = Math.max(0, Number(body.newOnHand || 0));
      const lowStockThreshold = Math.max(0, Number(body.lowStockThreshold ?? 3));
      const reason = String(body.reason || "Manual stock adjustment by admin").trim();

      const inv = queryOne<any>(db, `SELECT * FROM inventory WHERE variant_id = ?`, [variantId]);
      if (!inv) {
        return NextResponse.json({ ok: false, error: "Variant inventory not found." }, { status: 404 });
      }

      const prevOnHand = Number(inv.on_hand);
      runSql(
        db,
        `UPDATE inventory SET on_hand = ?, low_stock_threshold = ?, updated_at = ? WHERE variant_id = ?`,
        [newOnHand, lowStockThreshold, now, variantId]
      );
      runSql(
        db,
        `INSERT INTO inventory_movements (
          id, variant_id, movement_type, previous_on_hand, new_on_hand,
          previous_reserved, new_reserved, reason, admin_user_id, created_at
        ) VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId("mov"),
          variantId,
          prevOnHand,
          newOnHand,
          inv.reserved,
          inv.reserved,
          reason,
          admin.id,
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "ADJUST_INVENTORY", "VARIANT", variantId, {
        prevOnHand,
        newOnHand,
        reason,
      });

      return NextResponse.json({ ok: true });
    }

    // 5. SHIPPING MANAGEMENT (27 Governorates, Cities, Areas, Rules, Companies)
    if (action === "update_governorate") {
      if (!hasAdminPermission(admin, "shipping.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "");
      const shippingRate =
        body.shippingRate === "" || body.shippingRate === null || body.shippingRate === undefined
          ? null
          : Number(body.shippingRate);
      const expressRate =
        body.expressRate === "" || body.expressRate === null || body.expressRate === undefined
          ? null
          : Number(body.expressRate);
      const estimatedDaysEn = String(body.estimatedDaysEn || "2-4 Business Days").trim();
      const estimatedDaysAr = String(body.estimatedDaysAr || "٢-٤ أيام عمل").trim();
      const isEnabled = body.isEnabled === false ? 0 : 1;

      runSql(
        db,
        `UPDATE governorates
         SET shipping_rate = ?, express_rate = ?, estimated_days_en = ?, estimated_days_ar = ?, is_enabled = ?
         WHERE id = ?`,
        [shippingRate, expressRate, estimatedDaysEn, estimatedDaysAr, isEnabled, id]
      );
      persistDb(db);
      await logAdminAction(admin, "UPDATE_GOVERNORATE_SHIPPING", "GOVERNORATE", id, {
        shippingRate,
        isEnabled,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "save_city") {
      if (!hasAdminPermission(admin, "shipping.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("city");
      const governorateId = String(body.governorateId || "").trim();
      const nameEn = String(body.nameEn || "").trim();
      const nameAr = String(body.nameAr || nameEn).trim();
      const shippingRate =
        body.shippingRate === "" || body.shippingRate === null || body.shippingRate === undefined
          ? null
          : Number(body.shippingRate);
      const estimatedDaysEn = String(body.estimatedDaysEn || "").trim();
      const estimatedDaysAr = String(body.estimatedDaysAr || "").trim();
      const isEnabled = body.isEnabled === false ? 0 : 1;

      if (!governorateId || !nameEn) {
        return NextResponse.json({ ok: false, error: "Governorate and City name required." }, { status: 400 });
      }

      const exists = queryOne<any>(db, `SELECT id FROM cities WHERE id = ?`, [id]);
      if (exists) {
        runSql(
          db,
          `UPDATE cities SET governorate_id = ?, name_en = ?, name_ar = ?, shipping_rate = ?, estimated_days_en = ?, estimated_days_ar = ?, is_enabled = ? WHERE id = ?`,
          [governorateId, nameEn, nameAr, shippingRate, estimatedDaysEn, estimatedDaysAr, isEnabled, id]
        );
      } else {
        runSql(
          db,
          `INSERT INTO cities (id, governorate_id, name_en, name_ar, shipping_rate, estimated_days_en, estimated_days_ar, is_enabled, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, governorateId, nameEn, nameAr, shippingRate, estimatedDaysEn, estimatedDaysAr, isEnabled, now]
        );
      }
      persistDb(db);
      return NextResponse.json({ ok: true, id });
    }

    if (action === "save_area") {
      if (!hasAdminPermission(admin, "shipping.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("area");
      const cityId = String(body.cityId || "").trim();
      const nameEn = String(body.nameEn || "").trim();
      const nameAr = String(body.nameAr || nameEn).trim();
      const shippingRate =
        body.shippingRate === "" || body.shippingRate === null || body.shippingRate === undefined
          ? null
          : Number(body.shippingRate);
      const estimatedDaysEn = String(body.estimatedDaysEn || "").trim();
      const estimatedDaysAr = String(body.estimatedDaysAr || "").trim();
      const isEnabled = body.isEnabled === false ? 0 : 1;

      if (!cityId || !nameEn) {
        return NextResponse.json({ ok: false, error: "City and Area name required." }, { status: 400 });
      }

      const exists = queryOne<any>(db, `SELECT id FROM areas WHERE id = ?`, [id]);
      if (exists) {
        runSql(
          db,
          `UPDATE areas SET city_id = ?, name_en = ?, name_ar = ?, shipping_rate = ?, estimated_days_en = ?, estimated_days_ar = ?, is_enabled = ? WHERE id = ?`,
          [cityId, nameEn, nameAr, shippingRate, estimatedDaysEn, estimatedDaysAr, isEnabled, id]
        );
      } else {
        runSql(
          db,
          `INSERT INTO areas (id, city_id, name_en, name_ar, shipping_rate, estimated_days_en, estimated_days_ar, is_enabled, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, cityId, nameEn, nameAr, shippingRate, estimatedDaysEn, estimatedDaysAr, isEnabled, now]
        );
      }
      persistDb(db);
      return NextResponse.json({ ok: true, id });
    }

    if (action === "save_shipping_rules") {
      if (!hasAdminPermission(admin, "shipping.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const freeShippingThreshold =
        body.freeShippingThreshold === "" || body.freeShippingThreshold === null
          ? null
          : Number(body.freeShippingThreshold);
      const minimumOrderValue = Number(body.minimumOrderValue || 0);
      const defaultShippingRate =
        body.defaultShippingRate === "" || body.defaultShippingRate === null
          ? null
          : Number(body.defaultShippingRate);
      const expressDeliveryEnabled = body.expressDeliveryEnabled ? 1 : 0;
      const specialHandlingFee = Number(body.specialHandlingFee || 0);

      runSql(
        db,
        `UPDATE shipping_rules
         SET free_shipping_threshold = ?, minimum_order_value = ?, default_shipping_rate = ?,
             express_delivery_enabled = ?, special_handling_fee = ?, updated_at = ?
         WHERE id = 'default'`,
        [
          freeShippingThreshold,
          minimumOrderValue,
          defaultShippingRate,
          expressDeliveryEnabled,
          specialHandlingFee,
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "SAVE_SHIPPING_RULES", "SHIPPING_RULES", "default", {
        freeShippingThreshold,
        defaultShippingRate,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "save_shipping_company") {
      if (!hasAdminPermission(admin, "shipping.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("sc");
      const nameEn = String(body.nameEn || "").trim();
      const nameAr = String(body.nameAr || nameEn).trim();
      const phone = String(body.phone || "").trim();
      const websiteUrl = String(body.websiteUrl || "").trim();
      const trackingUrlTemplate = String(body.trackingUrlTemplate || "").trim();

      if (!nameEn) {
        return NextResponse.json({ ok: false, error: "Shipping company name required." }, { status: 400 });
      }

      const exists = queryOne<any>(db, `SELECT id FROM shipping_companies WHERE id = ?`, [id]);
      if (exists) {
        runSql(
          db,
          `UPDATE shipping_companies SET name_en = ?, name_ar = ?, phone = ?, website_url = ?, tracking_url_template = ? WHERE id = ?`,
          [nameEn, nameAr, phone, websiteUrl, trackingUrlTemplate, id]
        );
      } else {
        runSql(
          db,
          `INSERT INTO shipping_companies (id, name_en, name_ar, phone, website_url, tracking_url_template, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
          [id, nameEn, nameAr, phone, websiteUrl, trackingUrlTemplate, now]
        );
      }
      persistDb(db);
      return NextResponse.json({ ok: true, id });
    }

    // 6. PAYMENT METHODS CONFIGURATION & MANUAL PAYMENT VERIFICATION
    if (action === "save_payment_method") {
      if (!hasAdminPermission(admin, "payments.config")) {
        return NextResponse.json(
          { ok: false, error: "Forbidden: Only Owner/Authorized staff can change payment wallets." },
          { status: 403 }
        );
      }
      const code = body.code === "VODAFONE_CASH" ? "VODAFONE_CASH" : "INSTAPAY";
      const isEnabled = body.isEnabled ? 1 : 0;
      const recipientName = String(body.recipientName || "").trim();
      const receivingAccount = String(body.receivingAccount || "").trim();
      const instructionsEn = String(body.instructionsEn || "").trim();
      const instructionsAr = String(body.instructionsAr || "").trim();

      runSql(
        db,
        `UPDATE payment_methods
         SET is_enabled = ?, recipient_name = ?, receiving_account = ?,
             instructions_en = ?, instructions_ar = ?, updated_at = ?
         WHERE code = ?`,
        [isEnabled, recipientName, receivingAccount, instructionsEn, instructionsAr, now, code]
      );
      persistDb(db);
      await logAdminAction(admin, "UPDATE_PAYMENT_METHOD", "PAYMENT_METHOD", code, {
        isEnabled,
        recipientName,
        receivingAccount,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "verify_payment_submission") {
      if (!hasAdminPermission(admin, "payments.verify")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const submissionId = String(body.submissionId || "");
      const decision = body.decision === "CONFIRM" ? "CONFIRMED" : "REJECTED";
      const adminNotes = String(body.adminNotes || "").trim();

      await withTransaction((txDb) => {
        const sub = queryOne<any>(txDb, `SELECT * FROM payment_submissions WHERE id = ?`, [
          submissionId,
        ]);
        if (!sub) throw new Error("Payment submission not found.");

        const order = queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [sub.order_id]);
        if (!order) throw new Error("Order not found.");

        markOrderAcknowledgedInSettings(txDb, order.id, now);

        runSql(
          txDb,
          `UPDATE payment_submissions
           SET status = ?, admin_notes = ?, reviewed_by_admin_id = ?, reviewed_at = ?
           WHERE id = ?`,
          [decision, adminNotes, admin.id, now, submissionId]
        );

        if (decision === "CONFIRMED") {
          const prevPay = order.payment_status;
          const prevOrd = order.order_status;
          const alreadyPaid = prevPay === "PAID";

          runSql(
            txDb,
            `UPDATE orders
             SET payment_status = 'PAID',
                 order_status = CASE WHEN order_status IN ('PENDING_PAYMENT', 'PAYMENT_UNDER_REVIEW') THEN 'CONFIRMED' ELSE order_status END,
                 updated_at = ?
             WHERE id = ?`,
            [now, order.id]
          );
          runSql(txDb, `UPDATE invoices SET payment_status = 'PAID' WHERE order_id = ?`, [order.id]);

          // Idempotently commit inventory (subtract ordered qty from on_hand, increment sold)
          commitOrderInventory(
            txDb,
            order,
            admin.id,
            now,
            `Payment verified: stock deducted for order ${order.order_number}`
          );

            runSql(
              txDb,
              `INSERT INTO payment_transactions (
                id, order_id, submission_id, transaction_type, amount, method_code, reference, recorded_by_admin_id, created_at
              ) VALUES (?, ?, ?, 'MANUAL_PAYMENT', ?, ?, ?, ?, ?)`,
              [
                generateId("ptx"),
                order.id,
                sub.id,
                sub.transfer_amount,
                sub.payment_method_code,
                sub.transaction_reference,
                admin.id,
                now,
              ]
            );

          if (order.user_id && !alreadyPaid) {
            runSql(
              txDb,
              `UPDATE customer_profiles
               SET total_paid_spending = total_paid_spending + ?, updated_at = ?
               WHERE user_id = ?`,
              [order.total_amount, now, order.user_id]
            );
            runSql(
              txDb,
              `INSERT INTO notifications (
                id, recipient_type, recipient_user_id, order_id, event_type,
                title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
              ) VALUES (?, 'CUSTOMER', ?, ?, 'PAYMENT_CONFIRMED', ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
              [
                generateId("notif"),
                order.user_id,
                order.id,
                `Payment Confirmed — ${order.order_number}`,
                `تم تأكيد الدفع — ${order.order_number}`,
                `Your payment for order ${order.order_number} has been verified and confirmed.`,
                `تم التحقق من دفعتك وتأكيد الطلب رقم ${order.order_number}.`,
                now,
              ]
            );
          }

          if (!alreadyPaid) {
            const invRow = queryOne<any>(txDb, `SELECT invoice_number FROM invoices WHERE order_id = ?`, [
              order.id,
            ]);
            const trackingToken = order.guest_access_token_plain || "";
            queueWhatsAppNotification(txDb, {
              eventType: "PAYMENT_CONFIRMED",
              recipientPhone: order.customer_phone,
              customerName: order.customer_name,
              relatedOrderNumber: order.order_number,
              userId: order.user_id || null,
              orderId: order.id,
              lang: order.language_used === "ar" ? "ar" : "en",
              forceSend: true, // Payment confirmation is essential transactional notification
              trackingToken,
              variables: {
                customer_name: order.customer_name,
                order_number: order.order_number,
                order_total: `${Number(order.total_amount).toLocaleString("en-US")} ج.م`,
                total_amount: order.total_amount,
                secure_tracking_link: trackingToken ? `/order/track/${trackingToken}` : "",
                invoice_link: `/api/invoices/${invRow?.invoice_number || order.order_number}?token=${trackingToken}`,
              },
            });
          }

          runSql(
            txDb,
            `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
             VALUES (?, ?, 'PAYMENT_STATUS', ?, 'PAID', ?, ?, ?)`,
            [
              generateId("osh"),
              order.id,
              prevPay,
              adminNotes || "Verified and approved by admin",
              admin.id,
              now,
            ]
          );
          if (prevOrd === "PENDING_PAYMENT" || prevOrd === "PAYMENT_UNDER_REVIEW") {
            runSql(
              txDb,
              `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
               VALUES (?, ?, 'ORDER_STATUS', ?, 'CONFIRMED', 'Order confirmed after payment verification', ?, ?)`,
              [generateId("osh"), order.id, prevOrd, admin.id, now]
            );
          }
        } else {
          const prevPay = order.payment_status;
          runSql(
            txDb,
            `UPDATE orders SET payment_status = 'REJECTED', updated_at = ? WHERE id = ?`,
            [now, order.id]
          );
          runSql(txDb, `UPDATE invoices SET payment_status = 'REJECTED' WHERE order_id = ?`, [
            order.id,
          ]);
          runSql(
            txDb,
            `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
             VALUES (?, ?, 'PAYMENT_STATUS', ?, 'REJECTED', ?, ?, ?)`,
            [
              generateId("osh"),
              order.id,
              prevPay,
              adminNotes || "Payment rejected / could not verify transfer",
              admin.id,
              now,
            ]
          );
          if (order.user_id) {
            runSql(
              txDb,
              `INSERT INTO notifications (
                id, recipient_type, recipient_user_id, order_id, event_type,
                title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
              ) VALUES (?, 'CUSTOMER', ?, ?, 'PAYMENT_REJECTED', ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
              [
                generateId("notif"),
                order.user_id,
                order.id,
                `Payment Not Verified — ${order.order_number}`,
                `لم يتم التحقق من الدفع — ${order.order_number}`,
                `We could not verify your payment submission for order ${order.order_number}. Note: ${adminNotes}`,
                `تعذر التحقق من إشعار الدفع للطلب ${order.order_number}. ملاحظة: ${adminNotes}`,
                now,
              ]
            );
          }
          queueWhatsAppNotification(txDb, {
            eventType: "PAYMENT_REJECTED",
            recipientPhone: order.customer_phone,
            userId: order.user_id || null,
            orderId: order.id,
            lang: order.language_used === "ar" ? "ar" : "en",
            variables: {
              customer_name: order.customer_name,
              order_number: order.order_number,
              order_tracking_link: `/track?orderNumber=${order.order_number}&token=${order.guest_access_token_plain || ""}`,
            },
          });
        }
      });

      await logAdminAction(admin, `PAYMENT_${decision}`, "PAYMENT_SUBMISSION", submissionId, {
        adminNotes,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "confirm_order_payment") {
      if (!hasAdminPermission(admin, "payments.verify") && !hasAdminPermission(admin, "orders.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const orderId = String(body.orderId || body.id || "").trim();
      const adminNotes = String(body.adminNotes || "تم استلام الدفع وتأكيد الطلب من لوحة الإدارة").trim();

      let directWhatsAppData: any = null;

      await withTransaction((txDb) => {
        const order = queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [orderId]);
        if (!order) throw new Error("Order not found.");

        markOrderAcknowledgedInSettings(txDb, order.id, now);

        const prevPay = order.payment_status;
        const prevOrd = order.order_status;
        const alreadyPaid = prevPay === "PAID";

        // Update any pending payment submission for this order to CONFIRMED
        runSql(
          txDb,
          `UPDATE payment_submissions
           SET status = 'CONFIRMED', admin_notes = ?, reviewed_by_admin_id = ?, reviewed_at = ?
           WHERE order_id = ? AND status = 'UNDER_REVIEW'`,
          [adminNotes, admin.id, now, order.id]
        );

        runSql(
          txDb,
          `UPDATE orders
           SET payment_status = 'PAID',
               order_status = CASE WHEN order_status IN ('PENDING_PAYMENT', 'PAYMENT_UNDER_REVIEW') THEN 'CONFIRMED' ELSE order_status END,
               updated_at = ?
           WHERE id = ?`,
          [now, order.id]
        );
        runSql(txDb, `UPDATE invoices SET payment_status = 'PAID' WHERE order_id = ?`, [order.id]);

        // Commit inventory if not already paid
        commitOrderInventory(
          txDb,
          order,
          admin.id,
          now,
          `Stock deducted: payment confirmed for order ${order.order_number}`
        );

        if (!alreadyPaid) {
          runSql(
            txDb,
            `INSERT INTO payment_transactions (
              id, order_id, submission_id, transaction_type, amount, method_code, reference, recorded_by_admin_id, created_at
            ) VALUES (?, ?, NULL, 'MANUAL_PAYMENT', ?, ?, ?, ?, ?)`,
            [
              generateId("ptx"),
              order.id,
              order.total_amount,
              order.payment_method_code,
              `ADMIN-CONFIRM-${Date.now()}`,
              admin.id,
              now,
            ]
          );

          if (order.user_id) {
            runSql(
              txDb,
              `UPDATE customer_profiles
               SET total_paid_spending = total_paid_spending + ?, updated_at = ?
               WHERE user_id = ?`,
              [order.total_amount, now, order.user_id]
            );
          }
        }

        // WhatsApp notification queue
        const invRow = queryOne<any>(txDb, `SELECT invoice_number FROM invoices WHERE order_id = ?`, [
          order.id,
        ]);
        const trackingUrl = `/track-order?orderNumber=${order.order_number}&token=${order.guest_access_token_plain || ""}`;

        queueWhatsAppNotification(txDb, {
          eventType: "PAYMENT_CONFIRMED",
          recipientPhone: order.customer_phone,
          userId: order.user_id || null,
          orderId: order.id,
          lang: order.language_used === "ar" ? "ar" : "en",
          variables: {
            customer_name: order.customer_name,
            order_number: order.order_number,
            total_amount: order.total_amount,
            invoice_link: `/api/invoices/${invRow?.invoice_number || order.order_number}?token=${order.guest_access_token_plain || ""}`,
          },
        });

        runSql(
          txDb,
          `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
           VALUES (?, ?, 'PAYMENT_STATUS', ?, 'PAID', ?, ?, ?)`,
          [
            generateId("osh"),
            order.id,
            prevPay,
            adminNotes,
            admin.id,
            now,
          ]
        );
        if (prevOrd === "PENDING_PAYMENT" || prevOrd === "PAYMENT_UNDER_REVIEW") {
          runSql(
            txDb,
            `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
             VALUES (?, ?, 'ORDER_STATUS', ?, 'CONFIRMED', 'Order confirmed after payment receipt verification', ?, ?)`,
            [generateId("osh"), order.id, prevOrd, admin.id, now]
          );
        }

        // Format direct WhatsApp URL from brand
        let cleanPhone = String(order.customer_phone).replace(/\D/g, "");
        if (cleanPhone.startsWith("0")) cleanPhone = "2" + cleanPhone;
        else if (!cleanPhone.startsWith("20") && cleanPhone.length === 10) cleanPhone = "20" + cleanPhone;

        const isAr = order.language_used !== "en";
        const messageText = isAr
          ? `مرحباً ${order.customer_name}، تم استلام وتأكيد دفعتك للطلب #${order.order_number} بقيمة ${order.total_amount} ج.م من U3 STORE بنجاح!\n\nجاري الآن تجهيز طلبك للشحن والتوصيل.\n\nيمكنك متابعة حالة شحنتك عبر الرابط:\nhttps://u3store.kesug.com${trackingUrl}\n\nشكراً لاختيارك U3 STORE — LIVE YOURS.`
          : `Hello ${order.customer_name}, your payment for order #${order.order_number} (EGP ${order.total_amount}) at U3 STORE has been verified and confirmed!\n\nYour order is now being processed for shipping.\n\nTrack your order here:\nhttps://u3store.kesug.com${trackingUrl}\n\nThank you for choosing U3 STORE — LIVE YOURS.`;

        directWhatsAppData = {
          phone: cleanPhone,
          url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`,
          messageText,
        };
      });

      await logAdminAction(admin, "PAYMENT_CONFIRMED_DIRECT", "ORDER", orderId, {
        adminNotes,
      });

      return NextResponse.json({
        ok: true,
        message: "Payment confirmed successfully and WhatsApp notification queued.",
        whatsApp: directWhatsAppData,
      });
    }

    if (action === "delete_order" || action === "cancel_order") {
      if (!hasAdminPermission(admin, "orders.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const orderId = String(body.id || body.orderId || "").trim();
      const cancellationReason = String(body.reason || body.cancellationReason || "إلغاء الطلب من قبل الإدارة").trim();
      if (!orderId) {
        return NextResponse.json({ ok: false, error: "Order ID required" }, { status: 400 });
      }

      let directWhatsAppData: any = null;
      let stockRestored = false;

      await withTransaction((txDb) => {
        const order = queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [orderId]);
        if (!order) return;

        // Idempotency: If already cancelled, do not duplicate cancellation or inventory operations
        if (order.order_status === "CANCELLED") {
          return;
        }

        // Restore inventory if previously deducted; release reservations if unpaid
        stockRestored = restoreOrderInventory(
          txDb,
          order,
          admin.id,
          now,
          `Stock restored: order #${order.order_number} cancelled (${cancellationReason})`
        );

        // Update order status to CANCELLED and preserve all order data, items, and financial records
        // DO NOT change payment_status (keep financial tracking separate from fulfillment status)
        runSql(
          txDb,
          `UPDATE orders
           SET order_status = 'CANCELLED',
               cancellation_reason = ?,
               cancelled_at = ?,
               updated_at = ?
           WHERE id = ?`,
          [cancellationReason, now, now, order.id]
        );

        runSql(
          txDb,
          `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
           VALUES (?, ?, 'ORDER_STATUS', ?, 'CANCELLED', ?, ?, ?)`,
          [generateId("osh"), orderId, order.order_status, cancellationReason, admin.id, now]
        );

        // Queue WhatsApp notification for cancellation
        const trackingToken = order.guest_access_token_plain || "";
        const trackingUrl = `https://u3store.kesug.com/order/track/${trackingToken}`;

        queueWhatsAppNotification(txDb, {
          eventType: "ORDER_CANCELLED",
          recipientPhone: order.customer_phone,
          customerName: order.customer_name,
          orderId: order.id,
          relatedOrderId: order.id,
          relatedOrderNumber: order.order_number,
          trackingToken,
          lang: order.language_used === "ar" ? "ar" : "en",
          forceSend: true,
          variables: {
            customer_name: order.customer_name,
            order_number: order.order_number,
            cancellation_reason: cancellationReason,
            tracking_token: trackingToken,
            secure_tracking_link: trackingUrl,
          },
        });

        // Direct WhatsApp helper
        let cleanPhone = String(order.customer_phone).replace(/\D/g, "");
        if (cleanPhone.startsWith("0")) cleanPhone = "2" + cleanPhone;
        else if (!cleanPhone.startsWith("20") && cleanPhone.length === 10) cleanPhone = "20" + cleanPhone;

        const isAr = order.language_used !== "en";
        const messageText = isAr
          ? `مرحباً ${order.customer_name}، تم إلغاء طلبك #${order.order_number} في U3 STORE.\nسبب الإلغاء: ${cancellationReason}\n\nيمكنك مراجعة تفاصيل طلبك عبر الرابط:\n${trackingUrl}\n\nشكراً لاختيارك U3 STORE — LIVE YOURS.`
          : `Hello ${order.customer_name}, your order #${order.order_number} at U3 STORE has been cancelled.\nReason: ${cancellationReason}\n\nTrack order details:\n${trackingUrl}\n\nThank you — U3 STORE LIVE YOURS.`;

        directWhatsAppData = {
          phone: cleanPhone,
          url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`,
          messageText,
        };
      });

      await logAdminAction(admin, "CANCEL_ORDER", "ORDER", orderId, {
        cancellationReason,
        stockRestored,
      });

      return NextResponse.json({
        ok: true,
        message: stockRestored
          ? "تم إلغاء الطلب واسترجاع كميات ومقاسات المنتجات للمخزون فورياً مع حفظ السجلات."
          : "تم إلغاء الطلب وتحرير الحجز مع حفظ كافة بياناته وسجلاته بشكل دائم.",
        whatsApp: directWhatsAppData,
      });
    }

    if (action === "delete_coupon") {
      if (!hasAdminPermission(admin, "discounts.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const couponId = String(body.id || "").trim();
      runSql(db, `DELETE FROM coupons WHERE id = ?`, [couponId]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    // 7. ORDER STATUS & TRACKING UPDATES
    if (action === "update_order") {
      if (!hasAdminPermission(admin, "orders.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const orderId = String(body.orderId || "");
      const newOrderStatus = String(body.orderStatus || "");
      const newPaymentStatus = String(body.paymentStatus || "");
      const shippingCompanyId = String(body.shippingCompanyId || "");
      const trackingNumber = String(body.trackingNumber || "").trim();
      const trackingUrl = String(body.trackingUrl || "").trim();
      const internalNotes = String(body.internalNotes || "").trim();

      await withTransaction((txDb) => {
        const order = queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [orderId]);
        if (!order) throw new Error("Order not found");

        let companyName = order.shipping_company_name || "";
        if (shippingCompanyId) {
          const sc = queryOne<any>(txDb, `SELECT name_en FROM shipping_companies WHERE id = ?`, [
            shippingCompanyId,
          ]);
          if (sc) companyName = sc.name_en;
        }

        if (newOrderStatus && newOrderStatus !== order.order_status) {
          runSql(
            txDb,
            `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
             VALUES (?, ?, 'ORDER_STATUS', ?, ?, ?, ?, ?)`,
            [
              generateId("osh"),
              order.id,
              order.order_status,
              newOrderStatus,
              internalNotes || `Order status updated to ${newOrderStatus}`,
              admin.id,
              now,
            ]
          );

          // If cancelled or returned, release reservations AND restore on_hand inventory if the order was already paid/committed
          if (newOrderStatus === "CANCELLED" || newOrderStatus === "RETURNED") {
            restoreOrderInventory(
              txDb,
              order,
              admin.id,
              now,
              internalNotes || (newOrderStatus === "RETURNED" ? `طلب مرتجع: استرجاع منتجات الطلب #${order.order_number} إلى المخزون` : `إلغاء الطلب #${order.order_number} من قبل الإدارة`)
            );
            if (newOrderStatus === "CANCELLED") {
              runSql(
                txDb,
                `UPDATE orders SET cancellation_reason = ?, cancelled_at = ? WHERE id = ?`,
                [internalNotes || "إلغاء الطلب من قبل الإدارة", now, order.id]
              );
            }
          }

          // If transitioning from un-deducted to a fulfilled status with payment PAID, re-commit inventory
          if (["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(newOrderStatus) && Number(order.inventory_deducted) === 0 && (newPaymentStatus === "PAID" || order.payment_status === "PAID")) {
            commitOrderInventory(txDb, order, admin.id, now, `خصم من المخزون: استئناف الطلب #${order.order_number} إلى ${newOrderStatus}`);
          }

          if (order.user_id) {
            runSql(
              txDb,
              `INSERT INTO notifications (
                id, recipient_type, recipient_user_id, order_id, event_type,
                title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
              ) VALUES (?, 'CUSTOMER', ?, ?, 'ORDER_STATUS_UPDATED', ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
              [
                generateId("notif"),
                order.user_id,
                order.id,
                `Order ${order.order_number} — ${newOrderStatus}`,
                `تحديث حالة الطلب ${order.order_number} — ${newOrderStatus}`,
                `Your order ${order.order_number} status is now: ${newOrderStatus}. ${trackingNumber ? `Tracking: ${trackingNumber}` : ""}`,
                `حالة طلبك رقم ${order.order_number} أصبحت الآن: ${newOrderStatus}. ${trackingNumber ? `رقم التتبع: ${trackingNumber}` : ""}`,
                now,
              ]
            );
          }

          // Trigger WhatsApp Notification on Status Change (if customer opted in at checkout)
          const waEventMap: Record<string, string> = {
            PROCESSING: "ORDER_PREPARING",
            SHIPPED: "ORDER_SHIPPED",
            OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
            DELIVERED: "ORDER_DELIVERED",
            CANCELLED: "ORDER_CANCELLED",
          };
          const waEvent = waEventMap[newOrderStatus];
          const customerOptedIn = Boolean(order.whatsapp_transactional_consent);
          if (waEvent && customerOptedIn) {
            const trackingToken = order.guest_access_token_plain || "";
            queueWhatsAppNotification(txDb, {
              eventType: waEvent,
              recipientPhone: order.customer_phone,
              customerName: order.customer_name,
              relatedOrderNumber: order.order_number,
              userId: order.user_id || null,
              orderId: order.id,
              lang: order.language_used === "ar" ? "ar" : "en",
              trackingToken,
              forceSend: true,
              variables: {
                customer_name: order.customer_name,
                order_number: order.order_number,
                shipping_company: companyName || "Courier",
                tracking_number: trackingNumber || "N/A",
                secure_tracking_link: trackingToken ? `/order/track/${trackingToken}` : "",
                order_tracking_link: trackingToken ? `/order/track/${trackingToken}` : "",
              },
            });
          }
        }

        if (newPaymentStatus && newPaymentStatus !== order.payment_status) {
          runSql(
            txDb,
            `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
             VALUES (?, ?, 'PAYMENT_STATUS', ?, ?, ?, ?, ?)`,
            [
              generateId("osh"),
              order.id,
              order.payment_status,
              newPaymentStatus,
              internalNotes || `Payment status updated to ${newPaymentStatus}`,
              admin.id,
              now,
            ]
          );
          runSql(txDb, `UPDATE invoices SET payment_status = ? WHERE order_id = ?`, [
            newPaymentStatus,
            order.id,
          ]);

          if (newPaymentStatus === "PAID") {
            commitOrderInventory(
              txDb,
              order,
              admin.id,
              now,
              `Stock deducted: payment status marked PAID for order ${order.order_number}`
            );
          }
        }

        const deliveredAtValue =
          newOrderStatus === "DELIVERED" ? (order.delivered_at || now) : (order.delivered_at || null);

        const finalTrackingNumber =
          trackingNumber ||
          order.tracking_number ||
          (newOrderStatus === "SHIPPED" ? `U3-TRK-${order.order_number.replace(/[^0-9]/g, "") || Date.now()}` : "");

        runSql(
          txDb,
          `UPDATE orders
           SET order_status = COALESCE(NULLIF(?, ''), order_status),
               payment_status = COALESCE(NULLIF(?, ''), payment_status),
               shipping_company_id = ?,
               shipping_company_name = ?,
               tracking_number = COALESCE(NULLIF(?, ''), tracking_number),
               tracking_url = COALESCE(NULLIF(?, ''), tracking_url),
               delivered_at = ?,
               internal_notes = ?,
               updated_at = ?
           WHERE id = ?`,
          [
            newOrderStatus,
            newPaymentStatus,
            shippingCompanyId || null,
            companyName,
            finalTrackingNumber,
            trackingUrl,
            deliveredAtValue,
            internalNotes,
            now,
            order.id,
          ]
        );

        if (finalTrackingNumber && newOrderStatus === "SHIPPED") {
          runSql(
            txDb,
            `INSERT INTO shipments (id, order_id, shipping_company_id, tracking_number, tracking_url, status, notes, shipped_at)
             VALUES (?, ?, ?, ?, ?, 'SHIPPED', ?, ?)`,
            [
              generateId("shp"),
              order.id,
              shippingCompanyId || null,
              finalTrackingNumber,
              trackingUrl,
              internalNotes,
              now,
            ]
          );
        }
      });

      await logAdminAction(admin, "UPDATE_ORDER", "ORDER", orderId, {
        newOrderStatus,
        newPaymentStatus,
        trackingNumber,
      });
      return NextResponse.json({ ok: true });
    }

    // 7A. EXCHANGE ORDER ITEMS (Admin-Only Exchange Workflow)
    if (action === "exchange_order_items") {
      if (!hasAdminPermission(admin, "orders.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const orderId = String(body.orderId || "");
      const orderItemId = String(body.orderItemId || "");
      const newVariantId = String(body.newVariantId || "");
      const reason = String(body.reason || "استبدال مقاس/لون بناءً على طلب العميل").trim();

      const exchangeResult = await withTransaction((txDb) => {
        const order = queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [orderId]);
        if (!order) throw new Error("Order not found");
        if (order.order_status === "CANCELLED") {
          throw new Error("لا يمكن استبدال طلب ملغي");
        }

        const item = queryOne<any>(
          txDb,
          `SELECT * FROM order_items WHERE id = ? AND order_id = ?`,
          [orderItemId, order.id]
        );
        if (!item) throw new Error("المنتج المطلوب استبداله غير موجود في هذا الطلب");

        const newVar = queryOne<any>(
          txDb,
          `SELECT v.*, p.name_en as product_name_en, p.name_ar as product_name_ar, p.product_type,
                  p.regular_price, p.sale_price,
                  (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_main DESC, sort_order ASC LIMIT 1) as main_image
           FROM product_variants v
           JOIN products p ON v.product_id = p.id
           WHERE v.id = ?`,
          [newVariantId]
        );
        if (!newVar) throw new Error("المتغير البديل غير موجود");

        const newInv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [newVariantId]);
        const availStock = Math.max(0, Number(newInv?.on_hand || 0) - Number(newInv?.reserved || 0));
        const qty = Number(item.quantity || 1);
        if (availStock < qty) {
          throw new Error(`الكمية المتاحة من المقاس/اللون البديل غير كافية (${availStock} متاح فقط).`);
        }

        // 1. Snapshot BEFORE exchange
        const beforeSnapshot = {
          order: { ...order },
          items: queryAll<any>(txDb, `SELECT * FROM order_items WHERE order_id = ?`, [order.id]),
          replacedItem: { ...item },
        };

        // 2. Return OLD variant stock to on_hand and decrease sold
        const oldInv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [item.variant_id]);
        if (oldInv) {
          const prevOldOnHand = Number(oldInv.on_hand);
          const prevOldSold = Number(oldInv.sold || 0);
          const nextOldOnHand = prevOldOnHand + qty;
          const nextOldSold = Math.max(0, prevOldSold - qty);
          runSql(
            txDb,
            `UPDATE inventory SET on_hand = ?, sold = ?, updated_at = ? WHERE variant_id = ?`,
            [nextOldOnHand, nextOldSold, now, item.variant_id]
          );
          runSql(
            txDb,
            `INSERT INTO inventory_movements (
              id, variant_id, movement_type, previous_on_hand, new_on_hand,
              previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
            ) VALUES (?, ?, 'RETURN_RESTORE', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId("mov"),
              item.variant_id,
              prevOldOnHand,
              nextOldOnHand,
              Number(oldInv.reserved || 0),
              Number(oldInv.reserved || 0),
              `استرجاع المنتج المستبدل من الطلب #${order.order_number}: ${item.product_name_ar_snapshot || item.product_name_en_snapshot} (${item.color_ar_snapshot || item.color_en_snapshot} / ${item.size_snapshot}) — ${reason}`,
              order.id,
              admin.id,
              now,
            ]
          );
        }

        // 3. Deduct NEW replacement variant stock from on_hand and increase sold (re-query fresh)
        const freshNewInv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [newVariantId]);
        const prevNewOnHand = Number(freshNewInv?.on_hand || 0);
        const prevNewSold = Number(freshNewInv?.sold || 0);
        const nextNewOnHand = Math.max(0, prevNewOnHand - qty);
        const nextNewSold = prevNewSold + qty;
        runSql(
          txDb,
          `UPDATE inventory SET on_hand = ?, sold = ?, updated_at = ? WHERE variant_id = ?`,
          [nextNewOnHand, nextNewSold, now, newVariantId]
        );
        runSql(
          txDb,
          `INSERT INTO inventory_movements (
            id, variant_id, movement_type, previous_on_hand, new_on_hand,
            previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
          ) VALUES (?, ?, 'EXCHANGE_DISPATCH', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId("mov"),
            newVariantId,
            prevNewOnHand,
            nextNewOnHand,
            Number(freshNewInv?.reserved || 0),
            Number(freshNewInv?.reserved || 0),
            `صرف المنتج البديل للطلب #${order.order_number}: ${newVar.product_name_ar || newVar.product_name_en} (${newVar.color_ar || newVar.color_en} / ${newVar.size}) — ${reason}`,
            order.id,
            admin.id,
            now,
          ]
        );

        // 4. Update order item to replacement variant
        const unitRegular = Number(newVar.regular_price);
        const unitFinal =
          newVar.sale_price !== null && newVar.sale_price !== undefined && Number(newVar.sale_price) < unitRegular
            ? Number(newVar.sale_price)
            : unitRegular;
        const discountPerUnit = Math.max(0, unitRegular - unitFinal);
        const lineTotal = Math.round(unitFinal * qty * 100) / 100;

        runSql(
          txDb,
          `UPDATE order_items
           SET product_id = ?, variant_id = ?, sku_snapshot = ?,
               product_name_en_snapshot = ?, product_name_ar_snapshot = ?, product_image_snapshot = ?,
               size_snapshot = ?, color_en_snapshot = ?, color_ar_snapshot = ?,
               unit_regular_price_snapshot = ?, unit_final_price_snapshot = ?, discount_per_unit_snapshot = ?,
               quantity = ?, line_total = ?
           WHERE id = ?`,
          [
            newVar.product_id,
            newVar.id,
            newVar.sku,
            newVar.product_name_en || item.product_name_en_snapshot,
            newVar.product_name_ar || item.product_name_ar_snapshot,
            newVar.main_image || newVar.image_url || item.product_image_snapshot,
            newVar.size,
            newVar.color_en,
            newVar.color_ar,
            unitRegular,
            unitFinal,
            discountPerUnit,
            qty,
            lineTotal,
            item.id,
          ]
        );

        // 5. Update order status to EXCHANGED and increment revision number
        const nextRevision = (Number(order.revision_number) || 0) + 1;
        const updatedItems = queryAll<any>(txDb, `SELECT * FROM order_items WHERE order_id = ?`, [order.id]);
        const newSubtotal = updatedItems.reduce((acc, it) => acc + Number(it.line_total), 0);
        const newTotal = newSubtotal + Number(order.shipping_fee) + Number(order.additional_fees) - Number(order.discount_amount);

        runSql(
          txDb,
          `UPDATE orders
           SET order_status = 'EXCHANGED', subtotal = ?, total_amount = ?, revision_number = ?, inventory_deducted = 1, updated_at = ?
           WHERE id = ?`,
          [newSubtotal, newTotal, nextRevision, now, order.id]
        );

        // 6. Record in order_revisions
        const afterSnapshot = {
          order: queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [order.id]),
          items: updatedItems,
          replacementItem: {
            id: item.id,
            sku: newVar.sku,
            product_name_en: newVar.product_name_en || item.product_name_en_snapshot,
            product_name_ar: newVar.product_name_ar || item.product_name_ar_snapshot,
            size: newVar.size,
            color_en: newVar.color_en,
            color_ar: newVar.color_ar,
            image_url: newVar.image_url || item.product_image_snapshot,
            quantity: qty,
          },
          previousItem: {
            id: item.id,
            sku: item.sku_snapshot,
            product_name_en: item.product_name_en_snapshot,
            product_name_ar: item.product_name_ar_snapshot,
            size: item.size_snapshot,
            color_en: item.color_en_snapshot,
            color_ar: item.color_ar_snapshot,
            image_url: item.product_image_snapshot,
            quantity: item.quantity,
          },
        };

        runSql(
          txDb,
          `INSERT INTO order_revisions (
            id, order_id, revision_number, previous_snapshot_json, new_snapshot_json,
            price_difference, reason, edited_by_admin_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId("orev"),
            order.id,
            nextRevision,
            JSON.stringify(beforeSnapshot),
            JSON.stringify(afterSnapshot),
            newTotal - Number(order.total_amount),
            reason,
            admin.id,
            now,
          ]
        );

        // 7. Record status history
        runSql(
          txDb,
          `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
           VALUES (?, ?, 'ORDER_STATUS', ?, 'EXCHANGED', ?, ?, ?)`,
          [
            generateId("osh"),
            order.id,
            order.order_status,
            `استبدال: استبدال (${item.product_name_ar_snapshot || item.product_name_en_snapshot} - مقاس ${item.size_snapshot}) بـ (${newVar.product_name_ar || newVar.product_name_en} - مقاس ${newVar.size}) — ${reason}`,
            admin.id,
            now,
          ]
        );

        // 8. Update Invoice & Items if exists
        const inv = queryOne<any>(txDb, `SELECT * FROM invoices WHERE order_id = ?`, [order.id]);
        if (inv) {
          runSql(
            txDb,
            `UPDATE invoices SET subtotal = ?, total_amount = ?, revision_number = ? WHERE id = ?`,
            [newSubtotal, newTotal, nextRevision, inv.id]
          );
          runSql(txDb, `DELETE FROM invoice_items WHERE invoice_id = ?`, [inv.id]);
          for (const it of updatedItems) {
            runSql(
              txDb,
              `INSERT INTO invoice_items (
                id, invoice_id, sku, product_name_en, product_name_ar,
                size, color_en, color_ar, quantity, unit_price, discount_amount, line_total
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId("ii"),
                inv.id,
                it.sku_snapshot,
                it.product_name_en_snapshot,
                it.product_name_ar_snapshot,
                it.size_snapshot,
                it.color_en_snapshot,
                it.color_ar_snapshot,
                it.quantity,
                it.unit_final_price_snapshot,
                Number(it.discount_per_unit_snapshot || 0) * Number(it.quantity),
                it.line_total,
              ]
            );
          }
        }

        return {
          success: true,
          orderNumber: order.order_number,
          orderStatus: "EXCHANGED",
          revisionNumber: nextRevision,
        };
      });

      await logAdminAction(admin, "EXCHANGE_ORDER_ITEMS", "ORDER", orderId, {
        reason,
        ...exchangeResult,
      });
      return NextResponse.json({ ok: true, ...exchangeResult });
    }

    // 7B. ORDER EDITING & REVISION SYSTEM (Before & After Payment, Before Shipment)
    if (action === "edit_order") {
      if (!hasAdminPermission(admin, "orders.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const orderId = String(body.orderId || "");
      const reason = String(body.reason || "Customer requested order modification").trim();
      const customerName = body.customerName !== undefined ? String(body.customerName).trim() : undefined;
      const customerPhone = body.customerPhone !== undefined ? String(body.customerPhone).trim() : undefined;
      const customerEmail = body.customerEmail !== undefined ? String(body.customerEmail).trim() : undefined;
      const governorateId = body.governorateId !== undefined ? String(body.governorateId).trim() : undefined;
      const streetAddress = body.streetAddress !== undefined ? String(body.streetAddress).trim() : undefined;
      const buildingNumber = body.buildingNumber !== undefined ? String(body.buildingNumber).trim() : undefined;
      const deliveryNotes = body.deliveryNotes !== undefined ? String(body.deliveryNotes).trim() : undefined;
      const orderItemId = String(body.orderItemId || "");
      const newVariantId = String(body.newVariantId || "");
      const newQuantity = body.newQuantity !== undefined ? Math.max(1, Number(body.newQuantity)) : undefined;

      const editResult = await withTransaction((txDb) => {
        const order = queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [orderId]);
        if (!order) throw new Error("Order not found.");

        markOrderAcknowledgedInSettings(txDb, order.id, now);

        if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.order_status)) {
          throw new Error(
            `Order ${order.order_number} cannot be edited because its status is ${order.order_status}. Shipped orders must use the Return/Exchange workflow.`
          );
        }

        const beforeSnapshot = {
          order: { ...order },
          items: queryAll<any>(txDb, `SELECT * FROM order_items WHERE order_id = ?`, [order.id]),
        };

        const changesSummary: string[] = [];

        // 1. Update Customer & Address fields if provided
        const nextCustomerName = customerName || order.customer_name;
        const nextCustomerPhone = customerPhone || order.customer_phone;
        const nextCustomerEmail = customerEmail !== undefined ? customerEmail : order.customer_email;
        const nextStreet = streetAddress || order.street_address;
        const nextBuilding = buildingNumber || order.building_number;
        const nextNotes = deliveryNotes !== undefined ? deliveryNotes : order.delivery_notes;
        let nextGovId = order.governorate_id;
        let nextGovEn = order.governorate_name_en;
        let nextGovAr = order.governorate_name_ar;
        let nextShippingFee = Number(order.shipping_fee);

        if (governorateId && governorateId !== order.governorate_id) {
          const shipCalc = calculateShippingServer(txDb, {
            governorateId,
            subtotalAfterDiscount: Math.max(0, Number(order.subtotal) - Number(order.discount_amount)),
            shippingMethod: order.shipping_method === "EXPRESS" ? "EXPRESS" : "STANDARD",
          });
          if (!shipCalc.allowed || !shipCalc.governorate) {
            throw new Error(shipCalc.errorEn || "Selected governorate shipping is not configured.");
          }
          nextGovId = shipCalc.governorate.id;
          nextGovEn = shipCalc.governorate.name_en;
          nextGovAr = shipCalc.governorate.name_ar;
          nextShippingFee = shipCalc.shippingFee;
          changesSummary.push(`Governorate changed from ${order.governorate_name_en} to ${nextGovEn}`);
        }

        if (nextCustomerName !== order.customer_name || nextCustomerPhone !== order.customer_phone || nextStreet !== order.street_address) {
          changesSummary.push(`Updated delivery recipient/address details`);
        }

        // 2. Swap Variant / Size or Quantity if requested
        if (orderItemId && newVariantId) {
          const item = queryOne<any>(
            txDb,
            `SELECT * FROM order_items WHERE id = ? AND order_id = ?`,
            [orderItemId, order.id]
          );
          if (!item) throw new Error("Order item not found.");

          const oldVariantId = item.variant_id;
          const oldQty = Number(item.quantity);
          const targetQty = newQuantity ?? oldQty;

          const newVar = queryOne<any>(
            txDb,
            `SELECT pv.*, p.regular_price, p.sale_price,
                    pt_en.name as product_name_en, pt_ar.name as product_name_ar,
                    (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_main DESC, sort_order ASC LIMIT 1) as image_url
             FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             LEFT JOIN product_translations pt_en ON pt_en.product_id = p.id AND pt_en.lang = 'en'
             LEFT JOIN product_translations pt_ar ON pt_ar.product_id = p.id AND pt_ar.lang = 'ar'
             WHERE pv.id = ?`,
            [newVariantId]
          );
          if (!newVar) throw new Error("Replacement variant not found.");

          const newInv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [
            newVariantId,
          ]);
          const newAvailable = Math.max(
            0,
            Number(newInv?.on_hand || 0) - Number(newInv?.reserved || 0)
          );
          // If same variant and increasing qty, only check difference
          const neededStock = oldVariantId === newVariantId ? Math.max(0, targetQty - oldQty) : targetQty;
          if (neededStock > newAvailable) {
            throw new Error(
              `Insufficient available stock for ${newVar.product_name_en} (${newVar.color_en} / Size ${newVar.size}). Available: ${newAvailable}`
            );
          }

          const isPaid = order.payment_status === "PAID";
          const oldInv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [
            oldVariantId,
          ]);

          if (!isPaid) {
            // BEFORE PAYMENT: Release old reservation, create new reservation
            if (oldInv) {
              const prevRes = Number(oldInv.reserved);
              const nextRes = Math.max(0, prevRes - oldQty);
              runSql(txDb, `UPDATE inventory SET reserved = ?, updated_at = ? WHERE variant_id = ?`, [
                nextRes,
                now,
                oldVariantId,
              ]);
              runSql(
                txDb,
                `INSERT INTO inventory_movements (
                  id, variant_id, movement_type, previous_on_hand, new_on_hand,
                  previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
                ) VALUES (?, ?, 'RELEASE', ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  generateId("mov"),
                  oldVariantId,
                  oldInv.on_hand,
                  oldInv.on_hand,
                  prevRes,
                  nextRes,
                  `Order edit released reservation (${order.order_number})`,
                  order.id,
                  admin.id,
                  now,
                ]
              );
            }
            runSql(
              txDb,
              `UPDATE inventory_reservations SET status = 'RELEASED' WHERE order_id = ? AND variant_id = ? AND status = 'ACTIVE'`,
              [order.id, oldVariantId]
            );

            const refreshedNewInv = queryOne<any>(
              txDb,
              `SELECT * FROM inventory WHERE variant_id = ?`,
              [newVariantId]
            );
            const prevNewRes = Number(refreshedNewInv?.reserved || 0);
            const nextNewRes = prevNewRes + targetQty;
            runSql(txDb, `UPDATE inventory SET reserved = ?, updated_at = ? WHERE variant_id = ?`, [
              nextNewRes,
              now,
              newVariantId,
            ]);
            const expAt = new Date(Date.now() + 120 * 60 * 1000).toISOString();
            runSql(
              txDb,
              `INSERT INTO inventory_reservations (id, order_id, variant_id, quantity, status, expires_at, created_at)
               VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
              [generateId("res"), order.id, newVariantId, targetQty, expAt, now]
            );
            runSql(
              txDb,
              `INSERT INTO inventory_movements (
                id, variant_id, movement_type, previous_on_hand, new_on_hand,
                previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
              ) VALUES (?, ?, 'RESERVE', ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId("mov"),
                newVariantId,
                refreshedNewInv?.on_hand || 0,
                refreshedNewInv?.on_hand || 0,
                prevNewRes,
                nextNewRes,
                `Order edit reserved new variant (${order.order_number})`,
                order.id,
                admin.id,
                now,
              ]
            );
          } else {
            // AFTER PAYMENT BEFORE SHIPMENT: Restore old variant on_hand/sold, commit new variant on_hand/sold
            if (oldInv) {
              const prevOnHand = Number(oldInv.on_hand);
              const prevSold = Number(oldInv.sold || 0);
              const nextOnHand = prevOnHand + oldQty;
              const nextSold = Math.max(0, prevSold - oldQty);
              runSql(
                txDb,
                `UPDATE inventory SET on_hand = ?, sold = ?, updated_at = ? WHERE variant_id = ?`,
                [nextOnHand, nextSold, now, oldVariantId]
              );
              runSql(
                txDb,
                `INSERT INTO inventory_movements (
                  id, variant_id, movement_type, previous_on_hand, new_on_hand,
                  previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
                ) VALUES (?, ?, 'EDIT_RETURN', ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  generateId("mov"),
                  oldVariantId,
                  prevOnHand,
                  nextOnHand,
                  oldInv.reserved,
                  oldInv.reserved,
                  `Post-payment order edit restored stock (${order.order_number})`,
                  order.id,
                  admin.id,
                  now,
                ]
              );
            }

            const refreshedNewInv = queryOne<any>(
              txDb,
              `SELECT * FROM inventory WHERE variant_id = ?`,
              [newVariantId]
            );
            const prevNewOnHand = Number(refreshedNewInv?.on_hand || 0);
            const prevNewSold = Number(refreshedNewInv?.sold || 0);
            const nextNewOnHand = Math.max(0, prevNewOnHand - targetQty);
            const nextNewSold = prevNewSold + targetQty;
            runSql(
              txDb,
              `UPDATE inventory SET on_hand = ?, sold = ?, updated_at = ? WHERE variant_id = ?`,
              [nextNewOnHand, nextNewSold, now, newVariantId]
            );
            runSql(
              txDb,
              `INSERT INTO inventory_movements (
                id, variant_id, movement_type, previous_on_hand, new_on_hand,
                previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
              ) VALUES (?, ?, 'SALE', ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId("mov"),
                newVariantId,
                prevNewOnHand,
                nextNewOnHand,
                refreshedNewInv?.reserved || 0,
                refreshedNewInv?.reserved || 0,
                `Post-payment order edit committed replacement (${order.order_number})`,
                order.id,
                admin.id,
                now,
              ]
            );
          }

          const unitRegular = Number(newVar.regular_price);
          const unitFinal =
            newVar.sale_price !== null &&
            newVar.sale_price !== undefined &&
            Number(newVar.sale_price) < unitRegular
              ? Number(newVar.sale_price)
              : unitRegular;
          const discountPerUnit = Math.max(0, unitRegular - unitFinal);
          const lineTotal = Math.round(unitFinal * targetQty * 100) / 100;

          runSql(
            txDb,
            `UPDATE order_items
             SET product_id = ?, variant_id = ?, sku_snapshot = ?,
                 product_name_en_snapshot = ?, product_name_ar_snapshot = ?, product_image_snapshot = ?,
                 size_snapshot = ?, color_en_snapshot = ?, color_ar_snapshot = ?,
                 unit_regular_price_snapshot = ?, unit_final_price_snapshot = ?, discount_per_unit_snapshot = ?,
                 quantity = ?, line_total = ?
             WHERE id = ?`,
            [
              newVar.product_id,
              newVar.id,
              newVar.sku,
              newVar.product_name_en || item.product_name_en_snapshot,
              newVar.product_name_ar || item.product_name_ar_snapshot,
              newVar.main_image || newVar.image_url || item.product_image_snapshot,
              newVar.size,
              newVar.color_en,
              newVar.color_ar,
              unitRegular,
              unitFinal,
              discountPerUnit,
              targetQty,
              lineTotal,
              item.id,
            ]
          );

          changesSummary.push(
            `Swapped item (${item.size_snapshot} ${item.color_en_snapshot} x${oldQty}) -> (${newVar.size} ${newVar.color_en} x${targetQty})`
          );
        }

        // 3. Recalculate Order Totals & Balance Adjustment
        const updatedItems = queryAll<any>(txDb, `SELECT * FROM order_items WHERE order_id = ?`, [
          order.id,
        ]);
        const newSubtotal =
          Math.round(
            updatedItems.reduce((sum, it) => sum + Number(it.line_total || 0), 0) * 100
          ) / 100;
        const discountAmt = Number(order.discount_amount || 0);
        const addFees = Number(order.additional_fees || 0);
        const newTotal =
          Math.round(
            (Math.max(0, newSubtotal - discountAmt) + nextShippingFee + addFees) * 100
          ) / 100;

        const oldTotal = Number(order.total_amount);
        const priceDifference = Math.round((newTotal - oldTotal) * 100) / 100;
        const isPaid = order.payment_status === "PAID";
        const nextBalanceAdjustment = isPaid
          ? Math.round((Number(order.balance_adjustment_due || 0) + priceDifference) * 100) / 100
          : Number(order.balance_adjustment_due || 0);
        const nextRevision = Number(order.revision_number || 1) + 1;

        runSql(
          txDb,
          `UPDATE orders
           SET customer_name = ?, customer_phone = ?, customer_email = ?,
               governorate_id = ?, governorate_name_en = ?, governorate_name_ar = ?,
               street_address = ?, building_number = ?, delivery_notes = ?,
               subtotal = ?, shipping_fee = ?, total_amount = ?,
               balance_adjustment_due = ?, revision_number = ?, updated_at = ?
           WHERE id = ?`,
          [
            nextCustomerName,
            nextCustomerPhone,
            nextCustomerEmail,
            nextGovId,
            nextGovEn,
            nextGovAr,
            nextStreet,
            nextBuilding,
            nextNotes,
            newSubtotal,
            nextShippingFee,
            newTotal,
            nextBalanceAdjustment,
            nextRevision,
            now,
            order.id,
          ]
        );

        // 4. Update Invoice & Record Invoice Revision
        const inv = queryOne<any>(txDb, `SELECT * FROM invoices WHERE order_id = ?`, [order.id]);
        if (inv) {
          const deliveryAddrEn = `${nextStreet}, Bldg ${nextBuilding}, ${nextGovEn}`;
          const deliveryAddrAr = `${nextStreet}، عقار ${nextBuilding}، ${nextGovAr}`;
          runSql(
            txDb,
            `UPDATE invoices
             SET customer_name = ?, customer_phone = ?, customer_email = ?,
                 delivery_address_en = ?, delivery_address_ar = ?,
                 subtotal = ?, shipping_fee = ?, total_amount = ?, revision_number = ?
             WHERE id = ?`,
            [
              nextCustomerName,
              nextCustomerPhone,
              nextCustomerEmail,
              deliveryAddrEn,
              deliveryAddrAr,
              newSubtotal,
              nextShippingFee + addFees,
              newTotal,
              nextRevision,
              inv.id,
            ]
          );

          runSql(txDb, `DELETE FROM invoice_items WHERE invoice_id = ?`, [inv.id]);
          for (const it of updatedItems) {
            runSql(
              txDb,
              `INSERT INTO invoice_items (
                id, invoice_id, sku, product_name_en, product_name_ar,
                size, color_en, color_ar, quantity, unit_price, discount_amount, line_total
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId("ii"),
                inv.id,
                it.sku_snapshot,
                it.product_name_en_snapshot,
                it.product_name_ar_snapshot,
                it.size_snapshot,
                it.color_en_snapshot,
                it.color_ar_snapshot,
                it.quantity,
                it.unit_final_price_snapshot,
                Number(it.discount_per_unit_snapshot || 0) * Number(it.quantity),
                it.line_total,
              ]
            );
          }

          runSql(
            txDb,
            `INSERT INTO invoice_revisions (
              id, invoice_id, order_id, revision_number, snapshot_json, reason, created_by_admin_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId("irev"),
              inv.id,
              order.id,
              nextRevision,
              JSON.stringify({ items: updatedItems, oldTotal, newTotal, nextBalanceAdjustment }),
              reason,
              admin.id,
              now,
            ]
          );
        }

        const afterSnapshot = {
          order: queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [order.id]),
          items: updatedItems,
        };

        runSql(
          txDb,
          `INSERT INTO order_revisions (
            id, order_id, revision_number, previous_snapshot_json, new_snapshot_json,
            price_difference, reason, edited_by_admin_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId("orev"),
            order.id,
            nextRevision,
            JSON.stringify(beforeSnapshot),
            JSON.stringify(afterSnapshot),
            priceDifference,
            reason,
            admin.id,
            now,
          ]
        );

        runSql(
          txDb,
          `INSERT INTO order_edit_logs (
            id, order_id, order_number, admin_id, field_name, old_value, new_value, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId("oel"),
            order.id,
            order.order_number,
            admin.id,
            orderItemId ? "order_items" : "order_details",
            `Total EGP ${oldTotal}`,
            `Total EGP ${newTotal} (${changesSummary.join("; ") || "Modified"})`,
            reason,
            now,
          ]
        );

        runSql(
          txDb,
          `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, changed_by_admin_id, created_at)
           VALUES (?, ?, 'ORDER_EDIT', ?, ?, ?, ?, ?)`,
          [
            generateId("osh"),
            order.id,
            `REV-${nextRevision - 1}`,
            `REV-${nextRevision}`,
            `${changesSummary.join("; ")} — ${reason}`,
            admin.id,
            now,
          ]
        );

        return {
          revisionNumber: nextRevision,
          newTotal,
          priceDifference,
          balanceAdjustmentDue: nextBalanceAdjustment,
        };
      });

      await logAdminAction(admin, "EDIT_ORDER", "ORDER", orderId, {
        reason,
        ...editResult,
      });
      return NextResponse.json({ ok: true, ...editResult });
    }

    // 8. RETURNS & EXCHANGES MANAGEMENT (Never auto-restock unless inspected and approved)
    if (action === "update_return_request") {
      if (!hasAdminPermission(admin, "returns.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const returnId = String(body.returnId || "");
      const status = String(body.status || "UNDER_REVIEW");
      const conditionStatus = ["RESALABLE", "DAMAGED"].includes(body.conditionStatus)
        ? String(body.conditionStatus)
        : "PENDING";
      const inspectionNotes = String(body.inspectionNotes || "").trim();
      const refundAmount = Number(body.refundAmount || 0);
      const refundMethod = String(body.refundMethod || "").trim();
      const restoreStock = Boolean(body.restoreStock);
      const replacementVariantId = String(body.replacementVariantId || "").trim();

      await withTransaction((txDb) => {
        const ret = queryOne<any>(txDb, `SELECT * FROM return_requests WHERE id = ?`, [returnId]);
        if (!ret) throw new Error("Return request not found.");

        const order = queryOne<any>(txDb, `SELECT * FROM orders WHERE id = ?`, [ret.order_id]);

        const retItems = queryAll<any>(
          txDb,
          `SELECT * FROM return_items WHERE return_request_id = ?`,
          [ret.id]
        );

        let stockRestoredFlag = Number(ret.stock_restored || 0);
        const physicalStates = [
          "RECEIVED",
          "INSPECTING",
          "APPROVED_FOR_RESTOCK",
          "DAMAGED",
          "REFUND_PENDING",
          "REFUNDED",
          "EXCHANGE_PROCESSING",
          "COMPLETED",
        ];

        // STRICT RULE: Stock NEVER changes on request/approval alone; ONLY after physical inspection!
        if (physicalStates.includes(status) && !stockRestoredFlag) {
          if (conditionStatus === "RESALABLE" && restoreStock) {
            for (const ri of retItems) {
              const inv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [
                ri.variant_id,
              ]);
              if (inv) {
                const prevOnHand = Number(inv.on_hand);
                const prevReturned = Number(inv.returned || 0);
                const nextOnHand = prevOnHand + Number(ri.quantity);
                const nextReturned = prevReturned + Number(ri.quantity);
                runSql(
                  txDb,
                  `UPDATE inventory SET on_hand = ?, returned = ?, updated_at = ? WHERE variant_id = ?`,
                  [nextOnHand, nextReturned, now, ri.variant_id]
                );
                runSql(
                  txDb,
                  `INSERT INTO inventory_movements (
                    id, variant_id, movement_type, previous_on_hand, new_on_hand,
                    previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
                  ) VALUES (?, ?, 'RETURN_RESTORE', ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    generateId("mov"),
                    ri.variant_id,
                    prevOnHand,
                    nextOnHand,
                    inv.reserved,
                    inv.reserved,
                    `Inspected RESALABLE & approved return stock restoration (${ret.return_number})`,
                    ret.order_id,
                    admin.id,
                    now,
                  ]
                );
                runSql(
                  txDb,
                  `INSERT INTO return_inspections (
                    id, return_request_id, inspector_admin_id, physical_item_received,
                    condition_status, restock_approved, notes, inspected_at
                  ) VALUES (?, ?, ?, 1, 'RESALABLE', 1, ?, ?)`,
                  [
                    generateId("rinsp"),
                    ret.id,
                    admin.id,
                    inspectionNotes || "Item inspected and verified resalable",
                    now,
                  ]
                );
              }
            }
            stockRestoredFlag = 1;
          } else if (conditionStatus === "DAMAGED" || status === "DAMAGED") {
            // Damaged item: record in inventory.damaged, NEVER add to sellable on_hand
            for (const ri of retItems) {
              const inv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [
                ri.variant_id,
              ]);
              if (inv) {
                const prevDamaged = Number(inv.damaged || 0);
                const nextDamaged = prevDamaged + Number(ri.quantity);
                runSql(
                  txDb,
                  `UPDATE inventory SET damaged = ?, updated_at = ? WHERE variant_id = ?`,
                  [nextDamaged, now, ri.variant_id]
                );
                runSql(
                  txDb,
                  `INSERT INTO inventory_movements (
                    id, variant_id, movement_type, previous_on_hand, new_on_hand,
                    previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
                  ) VALUES (?, ?, 'RETURN_DAMAGED', ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    generateId("mov"),
                    ri.variant_id,
                    inv.on_hand,
                    inv.on_hand,
                    inv.reserved,
                    inv.reserved,
                    `Inspected DAMAGED return — excluded from sellable stock (${ret.return_number})`,
                    ret.order_id,
                    admin.id,
                    now,
                  ]
                );
                runSql(
                  txDb,
                  `INSERT INTO return_inspections (
                    id, return_request_id, inspector_admin_id, physical_item_received,
                    condition_status, restock_approved, notes, inspected_at
                  ) VALUES (?, ?, ?, 1, 'DAMAGED', 0, ?, ?)`,
                  [
                    generateId("rinsp"),
                    ret.id,
                    admin.id,
                    inspectionNotes || "Item inspected and marked damaged",
                    now,
                  ]
                );
              }
            }
            stockRestoredFlag = 1;
          }
        }

        // Handle Exchange Replacement Variant: Deduct stock on fulfillment/shipped
        if (replacementVariantId) {
          const repInv = queryOne<any>(txDb, `SELECT * FROM inventory WHERE variant_id = ?`, [
            replacementVariantId,
          ]);
          const repAvail = Math.max(0, Number(repInv?.on_hand || 0) - Number(repInv?.reserved || 0));
          if (repAvail <= 0) {
            throw new Error("Selected replacement variant is out of stock.");
          }

          // If the exchange is moving to shipping or completed, deduct on_hand directly and mark sold
          if (["EXCHANGE_PROCESSING", "SHIPPED", "COMPLETED"].includes(status)) {
            const prevOnHand = Number(repInv?.on_hand || 0);
            const prevSold = Number(repInv?.sold || 0);
            const nextOnHand = Math.max(0, prevOnHand - 1);
            const nextSold = prevSold + 1;
            runSql(
              txDb,
              `UPDATE inventory SET on_hand = ?, sold = ?, updated_at = ? WHERE variant_id = ?`,
              [nextOnHand, nextSold, now, replacementVariantId]
            );
            runSql(
              txDb,
              `INSERT INTO inventory_movements (
                id, variant_id, movement_type, previous_on_hand, new_on_hand,
                previous_reserved, new_reserved, reason, related_order_id, admin_user_id, created_at
              ) VALUES (?, ?, 'EXCHANGE_DISPATCH', ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId("mov"),
                replacementVariantId,
                prevOnHand,
                nextOnHand,
                repInv?.reserved || 0,
                repInv?.reserved || 0,
                `Dispatched replacement product for exchange (${ret.return_number})`,
                ret.order_id,
                admin.id,
                now,
              ]
            );
          } else {
            // Reserve replacement variant until dispatched
            runSql(
              txDb,
              `UPDATE inventory SET reserved = reserved + 1, updated_at = ? WHERE variant_id = ?`,
              [now, replacementVariantId]
            );
          }

          runSql(
            txDb,
            `INSERT INTO exchange_orders (
              id, return_request_id, original_order_id, replacement_variant_id,
              quantity, status, created_at
            ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
            [
              generateId("exch"),
              ret.id,
              ret.order_id,
              replacementVariantId,
              ["EXCHANGE_PROCESSING", "SHIPPED", "COMPLETED"].includes(status) ? "DISPATCHED" : "RESERVED",
              now,
            ]
          );
        }

        if (status === "REFUNDED" && refundAmount > 0) {
          runSql(
            txDb,
            `INSERT INTO refunds (id, order_id, return_request_id, amount, refund_method, notes, processed_by_admin_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId("ref"),
              ret.order_id,
              ret.id,
              refundAmount,
              refundMethod || "MANUAL",
              inspectionNotes,
              admin.id,
              now,
            ]
          );
          runSql(
            txDb,
            `UPDATE orders SET payment_status = 'REFUNDED', order_status = 'RETURNED', updated_at = ? WHERE id = ?`,
            [now, ret.order_id]
          );
        }

        const inspectionResult =
          conditionStatus === "RESALABLE" && stockRestoredFlag
            ? "APPROVED_FOR_RESTOCK"
            : conditionStatus === "DAMAGED"
              ? "DAMAGED"
              : "PENDING";

        runSql(
          txDb,
          `UPDATE return_requests
           SET status = ?, inspection_result = ?, inspection_notes = ?, refund_amount = ?, refund_method = ?,
               stock_restored = ?, handled_by_admin_id = ?, updated_at = ?
           WHERE id = ?`,
          [
            status,
            inspectionResult,
            inspectionNotes,
            refundAmount,
            refundMethod,
            stockRestoredFlag,
            admin.id,
            now,
            ret.id,
          ]
        );

        // Trigger WhatsApp Notification for Return/Exchange/Refund events
        if (order) {
          let waEvent = "";
          if (status === "APPROVED" && ret.request_type === "EXCHANGE") waEvent = "EXCHANGE_APPROVED";
          else if (status === "APPROVED") waEvent = "RETURN_APPROVED";
          else if (status === "REJECTED") waEvent = "RETURN_REJECTED";
          else if (status === "REFUNDED") waEvent = "REFUND_PROCESSED";

          if (waEvent) {
            queueWhatsAppNotification(txDb, {
              eventType: waEvent,
              recipientPhone: order.customer_phone,
              userId: order.user_id || null,
              orderId: order.id,
              lang: order.language_used === "ar" ? "ar" : "en",
              variables: {
                customer_name: order.customer_name,
                order_number: order.order_number,
                total_amount: refundAmount || order.total_amount,
              },
            });
          }
        }
      });

      await logAdminAction(admin, "UPDATE_RETURN_REQUEST", "RETURN", returnId, {
        status,
        conditionStatus,
        restoreStock,
      });

      return NextResponse.json({ ok: true });
    }

    // 9. COUPONS & DISCOUNTS
    if (action === "save_coupon") {
      if (!hasAdminPermission(admin, "discounts.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("cpn");
      const code = String(body.code || "")
        .trim()
        .toUpperCase();
      const nameEn = String(body.nameEn || code).trim();
      const nameAr = String(body.nameAr || nameEn).trim();
      const discountType = body.discountType === "FIXED" ? "FIXED" : "PERCENTAGE";
      const discountValue = Number(body.discountValue || 0);
      const minSpend = Number(body.minSpend || 0);
      const usageLimit = body.usageLimit ? Number(body.usageLimit) : null;
      const customerEligibility =
        body.customerEligibility === "REGISTERED_ONLY" ? "REGISTERED_ONLY" : "ALL";
      const expiresAt = body.expiresAt ? String(body.expiresAt) : null;
      const isActive = body.isActive === false ? 0 : 1;

      if (!code || discountValue <= 0) {
        return NextResponse.json({ ok: false, error: "Coupon code and discount value required." }, { status: 400 });
      }

      runSql(
        db,
        `INSERT OR REPLACE INTO coupons (
          id, code, name_en, name_ar, discount_type, discount_value, min_spend,
          usage_limit, used_count, per_customer_limit, customer_eligibility, expires_at, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT used_count FROM coupons WHERE id = ?), 0), 1, ?, ?, ?, ?)`,
        [
          id,
          code,
          nameEn,
          nameAr,
          discountType,
          discountValue,
          minSpend,
          usageLimit,
          id,
          customerEligibility,
          expiresAt,
          isActive,
          now,
        ]
      );
      persistDb(db);
      return NextResponse.json({ ok: true, id });
    }

    // 10. CMS (HOMEPAGE SECTIONS, PAGES, NAVIGATION, MEDIA, TRANSLATIONS, SETTINGS)
    if (action === "save_website_section") {
      if (!hasAdminPermission(admin, "content.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("sec");
      const sectionType = String(body.sectionType || "BANNER");
      const titleEn = String(body.titleEn || "").trim();
      const titleAr = String(body.titleAr || titleEn).trim();
      const subtitleEn = String(body.subtitleEn || "").trim();
      const subtitleAr = String(body.subtitleAr || "").trim();
      const descriptionEn = String(body.descriptionEn || "").trim();
      const descriptionAr = String(body.descriptionAr || "").trim();
      const buttonTextEn = String(body.buttonTextEn || "SHOP NOW").trim();
      const buttonTextAr = String(body.buttonTextAr || "تسوق الآن").trim();
      const buttonLink = String(body.buttonLink || "/shop").trim();
      const desktopImageUrl = String(body.desktopImageUrl || "").trim();
      const mobileImageUrl = String(body.mobileImageUrl || "").trim();
      const isVisible = body.isVisible === false ? 0 : 1;
      const sortOrder = Number(body.sortOrder || 1);

      runSql(
        db,
        `INSERT OR REPLACE INTO website_sections (
          id, section_type, title_en, title_ar, subtitle_en, subtitle_ar,
          description_en, description_ar, button_text_en, button_text_ar,
          button_link, desktop_image_url, mobile_image_url, is_visible, sort_order, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          sectionType,
          titleEn,
          titleAr,
          subtitleEn,
          subtitleAr,
          descriptionEn,
          descriptionAr,
          buttonTextEn,
          buttonTextAr,
          buttonLink,
          desktopImageUrl,
          mobileImageUrl,
          isVisible,
          sortOrder,
          now,
        ]
      );
      persistDb(db);
      return NextResponse.json({ ok: true, id });
    }

    if (action === "delete_website_section") {
      if (!hasAdminPermission(admin, "content.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      runSql(db, `DELETE FROM website_sections WHERE id = ?`, [String(body.id || "")]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "save_website_page") {
      if (!hasAdminPermission(admin, "content.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("page");
      const slug = String(body.slug || "").trim();
      const titleEn = String(body.titleEn || "").trim();
      const titleAr = String(body.titleAr || "").trim();
      const contentEn = String(body.contentEn || "").trim();
      const contentAr = String(body.contentAr || "").trim();
      const seoTitleEn = String(body.seoTitleEn || titleEn).trim();
      const seoTitleAr = String(body.seoTitleAr || titleAr).trim();
      const seoDescriptionEn = String(body.seoDescriptionEn || "").trim();
      const seoDescriptionAr = String(body.seoDescriptionAr || "").trim();

      runSql(
        db,
        `INSERT OR REPLACE INTO website_pages (
          id, slug, title_en, title_ar, content_en, content_ar,
          seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          slug,
          titleEn,
          titleAr,
          contentEn,
          contentAr,
          seoTitleEn,
          seoTitleAr,
          seoDescriptionEn,
          seoDescriptionAr,
          now,
        ]
      );
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "upload_media") {
      if (!hasAdminPermission(admin, "content.manage") && !hasAdminPermission(admin, "products.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const fileName = String(body.fileName || "image.jpg");
      const base64Data = String(body.base64Data || "");
      const folder = String(body.folder || "catalog");

      if (!base64Data.includes("base64,")) {
        return NextResponse.json({ ok: false, error: "Invalid image data." }, { status: 400 });
      }

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = path.extname(fileName).replace(/[^a-zA-Z0-9.]/g, "") || ".jpg";
      const safeFile = `u3-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`;
      const fullPath = path.join(uploadsDir, safeFile);
      const rawBuffer = Buffer.from(base64Data.split("base64,")[1], "base64");
      fs.writeFileSync(fullPath, rawBuffer);

      const url = `/uploads/${safeFile}`;
      const mediaId = generateId("med");
      runSql(
        db,
        `INSERT INTO media_files (id, file_name, url, mime_type, size_bytes, folder, is_private, uploaded_by_admin_id, created_at)
         VALUES (?, ?, ?, 'image/jpeg', ?, ?, 0, ?, ?)`,
        [mediaId, safeFile, url, rawBuffer.length, folder, admin.id, now]
      );
      persistDb(db);

      return NextResponse.json({ ok: true, id: mediaId, url });
    }

    if (action === "save_translation") {
      if (!hasAdminPermission(admin, "content.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const key = String(body.key || "").trim();
      const en = String(body.en || "").trim();
      const ar = String(body.ar || "").trim();
      if (!key) return NextResponse.json({ ok: false, error: "Key required" }, { status: 400 });

      runSql(
        db,
        `INSERT OR REPLACE INTO translations (key, en, ar, updated_at) VALUES (?, ?, ?, ?)`,
        [key, en, ar, now]
      );
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "save_store_settings") {
      if (!hasAdminPermission(admin, "settings.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }

      const currentSettings = queryOne<any>(db, `SELECT * FROM store_settings WHERE id = 'default'`);

      const visibleCategories = ["SHOES_ONLY", "CLOTHING_ONLY", "BOTH"].includes(body.visibleCategories)
        ? body.visibleCategories
        : (currentSettings?.visible_categories || "BOTH");
      const shopByCategoryEnabled = body.shopByCategoryEnabled !== undefined
        ? (body.shopByCategoryEnabled ? 1 : 0)
        : (currentSettings?.shop_by_category_enabled ?? 1);
      const categoryShoesImageUrl = body.categoryShoesImageUrl !== undefined
        ? String(body.categoryShoesImageUrl).trim()
        : (currentSettings?.category_shoes_image_url || "/images/shoes/air-jordan-1-retro-high-og.png");
      const categoryClothingImageUrl = body.categoryClothingImageUrl !== undefined
        ? String(body.categoryClothingImageUrl).trim()
        : (currentSettings?.category_clothing_image_url || "/images/clothing/hoodie-heavyweight-black.png");
      const categoryShoesTitleEn = body.categoryShoesTitleEn !== undefined ? String(body.categoryShoesTitleEn).trim() : (currentSettings?.category_shoes_title_en || "SHOES");
      const categoryShoesTitleAr = body.categoryShoesTitleAr !== undefined ? String(body.categoryShoesTitleAr).trim() : (currentSettings?.category_shoes_title_ar || "الأحذية");
      const categoryClothingTitleEn = body.categoryClothingTitleEn !== undefined ? String(body.categoryClothingTitleEn).trim() : (currentSettings?.category_clothing_title_en || "CLOTHING");
      const categoryClothingTitleAr = body.categoryClothingTitleAr !== undefined ? String(body.categoryClothingTitleAr).trim() : (currentSettings?.category_clothing_title_ar || "الملابس");
      const categoryShoesLink = body.categoryShoesLink !== undefined ? String(body.categoryShoesLink).trim() : (currentSettings?.category_shoes_link || "/shoes");
      const categoryClothingLink = body.categoryClothingLink !== undefined ? String(body.categoryClothingLink).trim() : (currentSettings?.category_clothing_link || "/clothing");

      const homepageShoesEnabled = body.homepageShoesEnabled !== undefined ? (body.homepageShoesEnabled ? 1 : 0) : (currentSettings?.homepage_shoes_enabled ?? 1);
      const homepageClothingEnabled = body.homepageClothingEnabled !== undefined ? (body.homepageClothingEnabled ? 1 : 0) : (currentSettings?.homepage_clothing_enabled ?? 1);
      const homepageShoesTitleEn = body.homepageShoesTitleEn !== undefined ? String(body.homepageShoesTitleEn).trim() : (currentSettings?.homepage_shoes_title_en || "SHOES COLLECTION");
      const homepageShoesTitleAr = body.homepageShoesTitleAr !== undefined ? String(body.homepageShoesTitleAr).trim() : (currentSettings?.homepage_shoes_title_ar || "تشكيلة الأحذية");
      const homepageClothingTitleEn = body.homepageClothingTitleEn !== undefined ? String(body.homepageClothingTitleEn).trim() : (currentSettings?.homepage_clothing_title_en || "CLOTHING COLLECTION");
      const homepageClothingTitleAr = body.homepageClothingTitleAr !== undefined ? String(body.homepageClothingTitleAr).trim() : (currentSettings?.homepage_clothing_title_ar || "تشكيلة الملابس");
      const homepageShoesDescEn = body.homepageShoesDescEn !== undefined ? String(body.homepageShoesDescEn).trim() : (currentSettings?.homepage_shoes_desc_en || "Engineered for movement. Built for the bold.");
      const homepageShoesDescAr = body.homepageShoesDescAr !== undefined ? String(body.homepageShoesDescAr).trim() : (currentSettings?.homepage_shoes_desc_ar || "مُصممة للحركة والتميز.");
      const homepageClothingDescEn = body.homepageClothingDescEn !== undefined ? String(body.homepageClothingDescEn).trim() : (currentSettings?.homepage_clothing_desc_en || "Premium streetwear staples and oversized silhouettes.");
      const homepageClothingDescAr = body.homepageClothingDescAr !== undefined ? String(body.homepageClothingDescAr).trim() : (currentSettings?.homepage_clothing_desc_ar || "ستريت وير راقي وقصات واسعة بخامات مصرية فاخرة.");
      const homepageCarouselLimit = body.homepageCarouselLimit !== undefined ? Number(body.homepageCarouselLimit || 12) : (currentSettings?.homepage_carousel_limit ?? 12);

      runSql(
        db,
        `UPDATE store_settings
         SET store_name_en = ?, store_name_ar = ?, tagline_en = ?, tagline_ar = ?,
             contact_email = ?, contact_phone = ?, whatsapp_number = ?,
             address_en = ?, address_ar = ?, instagram_url = ?, tiktok_url = ?, facebook_url = ?,
             seo_title_en = ?, seo_title_ar = ?, seo_description_en = ?, seo_description_ar = ?,
             canonical_url = ?,
             visible_categories = ?, shop_by_category_enabled = ?,
             category_shoes_image_url = ?, category_clothing_image_url = ?,
             category_shoes_title_en = ?, category_shoes_title_ar = ?,
             category_clothing_title_en = ?, category_clothing_title_ar = ?,
             category_shoes_link = ?, category_clothing_link = ?,
             homepage_shoes_enabled = ?, homepage_clothing_enabled = ?,
             homepage_shoes_title_en = ?, homepage_shoes_title_ar = ?,
             homepage_clothing_title_en = ?, homepage_clothing_title_ar = ?,
             homepage_shoes_desc_en = ?, homepage_shoes_desc_ar = ?,
             homepage_clothing_desc_en = ?, homepage_clothing_desc_ar = ?,
             homepage_carousel_limit = ?,
             hero_shoes_headline_en = ?, hero_shoes_headline_ar = ?,
             hero_shoes_subtitle_en = ?, hero_shoes_subtitle_ar = ?,
             hero_shoes_btn_text_en = ?, hero_shoes_btn_text_ar = ?,
             hero_both_headline_en = ?, hero_both_headline_ar = ?,
             hero_both_subtitle_en = ?, hero_both_subtitle_ar = ?,
             hero_both_btn_text_en = ?, hero_both_btn_text_ar = ?,
             hero_clothing_headline_en = ?, hero_clothing_headline_ar = ?,
             hero_clothing_subtitle_en = ?, hero_clothing_subtitle_ar = ?,
             hero_clothing_btn_text_en = ?, hero_clothing_btn_text_ar = ?,
             updated_at = ?
         WHERE id = 'default'`,
        [
          String(body.storeNameEn ?? currentSettings?.store_name_en ?? "U3 STORE"),
          String(body.storeNameAr ?? currentSettings?.store_name_ar ?? "U3 STORE"),
          String(body.taglineEn ?? currentSettings?.tagline_en ?? "LIVE YOURS."),
          String(body.taglineAr ?? currentSettings?.tagline_ar ?? "LIVE YOURS."),
          String(body.contactEmail ?? currentSettings?.contact_email ?? ""),
          String(body.contactPhone ?? currentSettings?.contact_phone ?? ""),
          String(body.whatsappNumber ?? currentSettings?.whatsapp_number ?? ""),
          String(body.addressEn ?? currentSettings?.address_en ?? ""),
          String(body.addressAr ?? currentSettings?.address_ar ?? ""),
          String(body.instagramUrl ?? currentSettings?.instagram_url ?? ""),
          String(body.tiktokUrl ?? currentSettings?.tiktok_url ?? ""),
          String(body.facebookUrl ?? currentSettings?.facebook_url ?? ""),
          String(body.seoTitleEn ?? currentSettings?.seo_title_en ?? ""),
          String(body.seoTitleAr ?? currentSettings?.seo_title_ar ?? ""),
          String(body.seoDescriptionEn ?? currentSettings?.seo_description_en ?? ""),
          String(body.seoDescriptionAr ?? currentSettings?.seo_description_ar ?? ""),
          String(body.canonicalUrl ?? currentSettings?.canonical_url ?? "").trim(),
          visibleCategories,
          shopByCategoryEnabled,
          categoryShoesImageUrl,
          categoryClothingImageUrl,
          categoryShoesTitleEn,
          categoryShoesTitleAr,
          categoryClothingTitleEn,
          categoryClothingTitleAr,
          categoryShoesLink,
          categoryClothingLink,
          homepageShoesEnabled,
          homepageClothingEnabled,
          homepageShoesTitleEn,
          homepageShoesTitleAr,
          homepageClothingTitleEn,
          homepageClothingTitleAr,
          homepageShoesDescEn,
          homepageShoesDescAr,
          homepageClothingDescEn,
          homepageClothingDescAr,
          homepageCarouselLimit,
          String(body.heroShoesHeadlineEn ?? currentSettings?.hero_shoes_headline_en ?? "STEP INTO LUXURY."),
          String(body.heroShoesHeadlineAr ?? currentSettings?.hero_shoes_headline_ar ?? "فخامة في كل خطوة."),
          String(body.heroShoesSubtitleEn ?? currentSettings?.hero_shoes_subtitle_en ?? "Exclusive sneakers & premium footwear engineered for bold presence and supreme comfort."),
          String(body.heroShoesSubtitleAr ?? currentSettings?.hero_shoes_subtitle_ar ?? "سنيكرز وأحذية حصرية بتصاميم استثنائية وأداء يجمع بين الأناقة والراحة المطلقة."),
          String(body.heroShoesBtnTextEn ?? currentSettings?.hero_shoes_btn_text_en ?? "SHOP FOOTWEAR"),
          String(body.heroShoesBtnTextAr ?? currentSettings?.hero_shoes_btn_text_ar ?? "تسوق الأحذية"),
          String(body.heroBothHeadlineEn ?? currentSettings?.hero_both_headline_en ?? "STEP INTO YOUR OWN LANE."),
          String(body.heroBothHeadlineAr ?? currentSettings?.hero_both_headline_ar ?? "اخطُ في مسارك الخاص."),
          String(body.heroBothSubtitleEn ?? currentSettings?.hero_both_subtitle_en ?? "Premium footwear & modern luxury streetwear crafted for distinct individuality."),
          String(body.heroBothSubtitleAr ?? currentSettings?.hero_both_subtitle_ar ?? "أحذية فاخرة وملابس ستريت وير عصرية تعبّر عن هويتك المتفردة وأسلوبك الاستثنائي."),
          String(body.heroBothBtnTextEn ?? currentSettings?.hero_both_btn_text_en ?? "SHOP COLLECTION"),
          String(body.heroBothBtnTextAr ?? currentSettings?.hero_both_btn_text_ar ?? "تسوق المجموعة"),
          String(body.heroClothingHeadlineEn ?? currentSettings?.hero_clothing_headline_en ?? "WEAR YOUR IDENTITY."),
          String(body.heroClothingHeadlineAr ?? currentSettings?.hero_clothing_headline_ar ?? "أناقة تعبّر عن حضورك."),
          String(body.heroClothingSubtitleEn ?? currentSettings?.hero_clothing_subtitle_en ?? "Modern luxury streetwear & premium apparel designed for distinctive street presence."),
          String(body.heroClothingSubtitleAr ?? currentSettings?.hero_clothing_subtitle_ar ?? "ملابس ستريت وير عصرية وتصاميم فاخرة صُممت لتبرز تفرد أسلوبك في كل إطلالة."),
          String(body.heroClothingBtnTextEn ?? currentSettings?.hero_clothing_btn_text_en ?? "SHOP CLOTHING"),
          String(body.heroClothingBtnTextAr ?? currentSettings?.hero_clothing_btn_text_ar ?? "تسوق الملابس"),
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "SAVE_STORE_SETTINGS", "STORE_SETTINGS", "default", { visibleCategories });
      return NextResponse.json({ ok: true });
    }

    // 11. ADMIN STAFF & ROLES
    if (action === "save_admin_user") {
      if (!hasAdminPermission(admin, "staff.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "").trim() || generateId("adm");
      const email = String(body.email || "").trim().toLowerCase();
      const fullName = String(body.fullName || "").trim();
      const roleId = String(body.roleId || "role-order-mgr");
      const password = String(body.password || "");
      const status = body.status === "DISABLED" ? "DISABLED" : "ACTIVE";

      if (!email || !fullName) {
        return NextResponse.json({ ok: false, error: "Email and Full Name required." }, { status: 400 });
      }

      const existing = queryOne<any>(db, `SELECT * FROM admin_users WHERE id = ?`, [id]);
      if (existing) {
        if (password && password.length >= 6) {
          runSql(
            db,
            `UPDATE admin_users SET email = ?, full_name = ?, role_id = ?, password_hash = ?, status = ? WHERE id = ?`,
            [email, fullName, roleId, hashPasswordSync(password), status, id]
          );
        } else {
          runSql(
            db,
            `UPDATE admin_users SET email = ?, full_name = ?, role_id = ?, status = ? WHERE id = ?`,
            [email, fullName, roleId, status, id]
          );
        }
      } else {
        if (password.length < 6) {
          return NextResponse.json(
            { ok: false, error: "Password of at least 6 characters is required for new staff." },
            { status: 400 }
          );
        }
        runSql(
          db,
          `INSERT INTO admin_users (id, email, full_name, password_hash, role_id, status, preferred_language, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'en', ?)`,
          [id, email, fullName, hashPasswordSync(password), roleId, status, now]
        );
      }
      persistDb(db);
      await logAdminAction(admin, "SAVE_ADMIN_STAFF", "ADMIN_USER", id, { email, roleId, status });
      return NextResponse.json({ ok: true, id });
    }

    // 12. REAL DATABASE BACKUP & RESTORE
    if (action === "create_backup") {
      if (!hasAdminPermission(admin, "settings.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const backupsDir = path.join(process.cwd(), "data", "backups");
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
      const fileName = `u3store-backup-${Date.now()}.sqlite`;
      const fullPath = path.join(backupsDir, fileName);

      // Export current database binary snapshot
      const binary = db.export();
      const buf = Buffer.from(binary);
      fs.writeFileSync(fullPath, buf);

      const bkpId = generateId("bkp");
      runSql(
        db,
        `INSERT INTO backups (id, file_name, file_path, size_bytes, notes, created_by_admin_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          bkpId,
          fileName,
          fullPath,
          buf.length,
          String(body.notes || "Manual full SQLite snapshot backup"),
          admin.id,
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "CREATE_BACKUP", "BACKUP", bkpId, { fileName, bytes: buf.length });
      return NextResponse.json({ ok: true, id: bkpId, fileName, sizeBytes: buf.length });
    }

    if (action === "restore_backup") {
      if (!hasAdminPermission(admin, "settings.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const backupId = String(body.backupId || "");
      const bkp = queryOne<any>(db, `SELECT * FROM backups WHERE id = ?`, [backupId]);
      if (!bkp || !fs.existsSync(bkp.file_path)) {
        return NextResponse.json({ ok: false, error: "Backup file not found on disk." }, { status: 404 });
      }
      const mainDbPath = path.join(process.cwd(), "data", "u3store.sqlite");
      fs.copyFileSync(bkp.file_path, mainDbPath);
      return NextResponse.json({ ok: true, restoredFile: bkp.file_name });
    }

    if (action === "update_customer_notes") {
      if (!hasAdminPermission(admin, "customers.view")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const customerId = String(body.customerId || "");
      const isGuest = Boolean(body.isGuest);
      const notes = String(body.notes || "").trim();

      if (isGuest) {
        runSql(db, `UPDATE guest_customers SET internal_notes = ? WHERE id = ?`, [notes, customerId]);
      } else {
        runSql(db, `UPDATE customer_profiles SET internal_notes = ?, updated_at = ? WHERE user_id = ?`, [
          notes,
          now,
          customerId,
        ]);
      }
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    // 13. WHATSAPP BUSINESS AUTOMATION & INBOX ACTIONS
    if (action === "save_whatsapp_settings") {
      if (!hasAdminPermission(admin, "settings.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const isEnabled = body.isEnabled ? 1 : 0;
      const businessPhoneNumber = String(body.businessPhoneNumber || "").trim();
      const phoneNumberId = String(body.phoneNumberId || "").trim();
      const businessAccountId = String(body.businessAccountId || "").trim();
      const webhookVerifyToken = String(body.webhookVerifyToken || "u3store_whatsapp_verify_2026").trim();
      const connectionStatus =
        phoneNumberId
          ? "CONNECTED"
          : isEnabled
            ? "SIMULATED_OUTBOX"
            : "NOT_CONNECTED";

      runSql(
        db,
        `UPDATE whatsapp_settings
         SET is_enabled = ?, business_display_number = ?, phone_number_id = ?,
             waba_id = ?, webhook_verify_token = ?,
             connection_status = ?, updated_at = ?
         WHERE id = 'default'`,
        [
          isEnabled,
          businessPhoneNumber,
          phoneNumberId,
          businessAccountId,
          webhookVerifyToken,
          connectionStatus,
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "SAVE_WHATSAPP_SETTINGS", "WHATSAPP", "default", {
        isEnabled,
        businessPhoneNumber,
        connectionStatus,
      });
      return NextResponse.json({ ok: true, connectionStatus });
    }

    if (action === "save_whatsapp_template") {
      if (!hasAdminPermission(admin, "settings.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const id = String(body.id || "");
      const bodyEn = String(body.bodyEn || "").trim();
      const bodyAr = String(body.bodyAr || "").trim();
      const isActive = body.isActive === false ? 0 : 1;

      runSql(
        db,
        `UPDATE whatsapp_templates SET body_en = ?, body_ar = ?, is_enabled = ?, updated_at = ? WHERE id = ?`,
        [bodyEn, bodyAr, isActive, now, id]
      );
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "send_test_whatsapp") {
      const recipientPhone = String(body.recipientPhone || "").trim();
      const eventType = String(body.eventType || "ORDER_RECEIVED");
      const lang = body.lang === "ar" ? "ar" : "en";
      if (!recipientPhone) {
        return NextResponse.json({ ok: false, error: "Recipient phone required." }, { status: 400 });
      }
      const res = queueWhatsAppNotification(db, {
        eventType,
        recipientPhone,
        lang,
        forceSend: true,
        variables: {
          customer_name: "U3 Test Customer",
          order_number: "U3-TEST-1001",
          total_amount: "2450",
          payment_method: "InstaPay",
          shipping_company: "Bosta",
          tracking_number: "BST-998877",
          order_tracking_link: "http://localhost:3000/track",
          invoice_link: "http://localhost:3000/track",
        },
      });
      persistDb(db);
      return NextResponse.json({ ok: true, ...res });
    }

    if (action === "retry_whatsapp_message") {
      const logId = String(body.logId || "");
      const logRow = queryOne<any>(db, `SELECT * FROM whatsapp_message_logs WHERE id = ?`, [logId]);
      if (!logRow) {
        return NextResponse.json({ ok: false, error: "Message log not found." }, { status: 404 });
      }
      runSql(
        db,
        `UPDATE whatsapp_message_logs
         SET send_status = 'QUEUED', retry_count = retry_count + 1, updated_at = ?
         WHERE id = ?`,
        [now, logId]
      );
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "clear_whatsapp_logs") {
      runSql(db, `DELETE FROM whatsapp_message_logs`);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "reply_whatsapp_conversation") {
      const conversationId = String(body.conversationId || "");
      const messageBody = String(body.messageBody || "").trim();
      if (!conversationId || !messageBody) {
        return NextResponse.json({ ok: false, error: "Message required." }, { status: 400 });
      }
      const conv = queryOne<any>(db, `SELECT * FROM whatsapp_conversations WHERE id = ?`, [
        conversationId,
      ]);
      if (!conv) {
        return NextResponse.json({ ok: false, error: "Conversation not found." }, { status: 404 });
      }
      runSql(
        db,
        `INSERT INTO whatsapp_messages (id, conversation_id, direction, sender_phone, body, status, created_at)
         VALUES (?, ?, 'OUTBOUND', 'U3_STORE', ?, 'QUEUED', ?)`,
        [generateId("wmsg"), conversationId, messageBody, now]
      );
      runSql(
        db,
        `UPDATE whatsapp_conversations SET last_message_at = ? WHERE id = ?`,
        [now, conversationId]
      );
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "update_conversation_status") {
      const conversationId = String(body.conversationId || "");
      const status = ["OPEN", "PENDING", "RESOLVED"].includes(body.status) ? body.status : "OPEN";
      runSql(db, `UPDATE whatsapp_conversations SET status = ? WHERE id = ?`, [
        status,
        conversationId,
      ]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    // 14. APPEARANCE & BRANDING SETTINGS
    if (action === "save_appearance_settings") {
      if (!hasAdminPermission(admin, "settings.manage") && !hasAdminPermission(admin, "content.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      runSql(
        db,
        `UPDATE appearance_settings
         SET default_theme = ?, allow_theme_switching = ?, color_preset = ?,
             product_grid_columns = ?, product_image_ratio = ?,
             announcement_enabled = ?, announcement_en = ?, announcement_ar = ?,
             updated_at = ?
         WHERE id = 'default'`,
        [
          ["light", "dark", "system"].includes(body.defaultStorefrontTheme)
            ? body.defaultStorefrontTheme
            : "light",
          body.allowCustomerThemeSwitch === false ? 0 : 1,
          String(body.colorPreset || "U3_MONOCHROME"),
          Number(body.productGridColumnsDesktop || 4),
          String(body.productImageAspectRatio || "SQUARE"),
          body.announcementBarEnabled === false ? 0 : 1,
          String(body.announcementTextEn || "U3 STORE — LIVE YOURS. | Shipping Across All 27 Egyptian Governorates"),
          String(body.announcementTextAr || "U3 STORE — LIVE YOURS. | شحن لجميع محافظات مصر الـ 27"),
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "SAVE_APPEARANCE_SETTINGS", "APPEARANCE", "default", {});
      return NextResponse.json({ ok: true });
    }

    if (action === "reset_appearance_defaults") {
      runSql(
        db,
        `UPDATE appearance_settings
         SET default_theme = 'light', allow_theme_switching = 1, color_preset = 'U3_MONOCHROME',
             product_grid_columns = 4, product_image_ratio = 'SQUARE',
             announcement_enabled = 1, updated_at = ?
         WHERE id = 'default'`,
        [now]
      );
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    // 15. FOOTER SETTINGS, MARQUEE SETTINGS & SALE CAMPAIGNS
    if (action === "save_footer_settings") {
      if (!hasAdminPermission(admin, "content.manage") && !hasAdminPermission(admin, "settings.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      runSql(
        db,
        `UPDATE footer_settings
         SET brand_signature_en = ?, brand_signature_ar = ?,
             newsletter_enabled = ?, newsletter_heading_en = ?, newsletter_heading_ar = ?,
             newsletter_desc_en = ?, newsletter_desc_ar = ?,
             newsletter_placeholder_en = ?, newsletter_placeholder_ar = ?,
             newsletter_success_en = ?, newsletter_success_ar = ?,
             newsletter_privacy_notice_en = ?, newsletter_privacy_notice_ar = ?,
             instagram_url = ?, tiktok_url = ?, facebook_url = ?, telegram_url = ?,
             phone_number = ?, phone_tel = ?,
             maps_embed_url = ?, maps_external_url = ?,
             maps_visible_footer = ?, maps_visible_contact = ?,
             social_instagram_enabled = ?, social_tiktok_enabled = ?,
             social_facebook_enabled = ?, social_telegram_enabled = ?,
             contact_phone_enabled = ?, contact_telegram_enabled = ?,
             copyright_en = ?, copyright_ar = ?,
             color_preset = ?, show_payment_icons = ?,
             updated_at = ?
         WHERE id = 'default'`,
        [
          String(body.brandSignatureEn || "LIVE YOURS."),
          String(body.brandSignatureAr || "LIVE YOURS."),
          body.newsletterEnabled === false ? 0 : 1,
          String(body.newsletterHeadingEn || "Stay in the loop"),
          String(body.newsletterHeadingAr || "ابقَ على اطلاع"),
          String(body.newsletterDescEn || "Subscribe for exclusive releases, restocks, and private drops."),
          String(body.newsletterDescAr || "اشترك للحصول على أحدث الإصدارات الحصرية، وإعادة توفر المقاسات، والدروبات الخاصة."),
          String(body.newsletterPlaceholderEn || "Enter your email address"),
          String(body.newsletterPlaceholderAr || "أدخل بريدك الإلكتروني"),
          String(body.newsletterSuccessEn || "You are now subscribed to U3 STORE private drops."),
          String(body.newsletterSuccessAr || "تم اشتراكك بنجاح في قائمة إصدارات U3 STORE الخاصة."),
          String(body.newsletterPrivacyNoticeEn || "By subscribing, you agree to our Privacy Policy."),
          String(body.newsletterPrivacyNoticeAr || "بالاشتراك، أنت توافق على سياسة الخصوصية الخاصة بنا."),
          String(body.instagramUrl || "https://www.instagram.com/u3store_/"),
          String(body.tiktokUrl || "https://www.tiktok.com/@ahmedyoosrry"),
          String(body.facebookUrl || "https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA"),
          String(body.telegramUrl || "https://t.me/u3store"),
          String(body.phoneNumber || "01115915388"),
          String(body.phoneTel || "+201115915388"),
          String(body.mapsEmbedUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg"),
          String(body.mapsExternalUrl || "https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z"),
          body.mapsVisibleFooter === false ? 0 : 1,
          body.mapsVisibleContact === false ? 0 : 1,
          body.socialInstagramEnabled === false ? 0 : 1,
          body.socialTiktokEnabled === false ? 0 : 1,
          body.socialFacebookEnabled === false ? 0 : 1,
          body.socialTelegramEnabled === false ? 0 : 1,
          body.contactPhoneEnabled === false ? 0 : 1,
          body.contactTelegramEnabled === false ? 0 : 1,
          String(body.copyrightEn || "All rights reserved."),
          String(body.copyrightAr || "جميع الحقوق محفوظة."),
          String(body.colorPreset || "DEEP_BLACK"),
          body.showPaymentIcons === false ? 0 : 1,
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "SAVE_FOOTER_SETTINGS", "FOOTER", "default", {});
      return NextResponse.json({ ok: true });
    }

    if (action === "reset_footer_settings") {
      if (!hasAdminPermission(admin, "content.manage") && !hasAdminPermission(admin, "settings.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      runSql(
        db,
        `UPDATE footer_settings
         SET brand_signature_en = 'LIVE YOURS.',
             brand_signature_ar = 'LIVE YOURS.',
             newsletter_enabled = 1,
             newsletter_heading_en = 'Stay in the loop',
             newsletter_heading_ar = 'ابقَ على اطلاع',
             newsletter_desc_en = 'Subscribe for exclusive releases, restocks, and private drops.',
             newsletter_desc_ar = 'اشترك للحصول على أحدث الإصدارات الحصرية، وإعادة توفر المقاسات، والدروبات الخاصة.',
             newsletter_placeholder_en = 'Enter your email address',
             newsletter_placeholder_ar = 'أدخل بريدك الإلكتروني',
             newsletter_success_en = 'You are now subscribed to U3 STORE private drops.',
             newsletter_success_ar = 'تم اشتراكك بنجاح في قائمة إصدارات U3 STORE الخاصة.',
             newsletter_privacy_notice_en = 'By subscribing, you agree to our Privacy Policy.',
             newsletter_privacy_notice_ar = 'بالاشتراك، أنت توافق على سياسة الخصوصية الخاصة بنا.',
             instagram_url = 'https://www.instagram.com/u3store_/',
             tiktok_url = 'https://www.tiktok.com/@ahmedyoosrry',
             facebook_url = 'https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA',
             telegram_url = 'https://t.me/u3store',
             phone_number = '01115915388',
             phone_tel = '+201115915388',
             maps_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg',
             maps_external_url = 'https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z',
             maps_visible_footer = 1,
             maps_visible_contact = 1,
             social_instagram_enabled = 1,
             social_tiktok_enabled = 1,
             social_facebook_enabled = 1,
             social_telegram_enabled = 1,
             contact_phone_enabled = 1,
             contact_telegram_enabled = 1,
             copyright_en = 'All rights reserved.',
             copyright_ar = 'جميع الحقوق محفوظة.',
             color_preset = 'DEEP_BLACK',
             show_payment_icons = 1,
             updated_at = ?
         WHERE id = 'default'`,
        [now]
      );
      persistDb(db);
      await logAdminAction(admin, "RESET_FOOTER_SETTINGS", "FOOTER", "default", {});
      return NextResponse.json({ ok: true });
    }

    if (action === "update_contact_message") {
      if (!hasAdminPermission(admin, "content.manage") && !hasAdminPermission(admin, "customers.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const msgId = String(body.id || "");
      const newStatus = String(body.status || "READ");
      const adminNotes = String(body.adminNotes || "").trim();
      runSql(
        db,
        `UPDATE contact_messages SET status = ?, admin_notes = COALESCE(NULLIF(?, ''), admin_notes) WHERE id = ?`,
        [newStatus, adminNotes, msgId]
      );
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_contact_message") {
      if (!hasAdminPermission(admin, "content.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const msgId = String(body.id || "");
      runSql(db, `DELETE FROM contact_messages WHERE id = ?`, [msgId]);
      persistDb(db);
      return NextResponse.json({ ok: true });
    }

    if (action === "save_marquee_settings") {
      if (!hasAdminPermission(admin, "content.manage") && !hasAdminPermission(admin, "settings.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const segmentsEn = Array.isArray(body.segmentsEn)
        ? body.segmentsEn.map((s: any) => String(s).trim()).filter(Boolean)
        : String(body.segmentsEnText || "U3 STORE, LIVE YOURS, NEW ARRIVALS, PREMIUM FOOTWEAR")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      const segmentsAr = Array.isArray(body.segmentsAr)
        ? body.segmentsAr.map((s: any) => String(s).trim()).filter(Boolean)
        : String(body.segmentsArText || "U3 STORE, LIVE YOURS, وصل حديثاً, أحذية فاخرة")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      runSql(
        db,
        `UPDATE marquee_settings
         SET is_enabled = ?, segments_en_json = ?, segments_ar_json = ?,
             separator_symbol = ?, speed_seconds = ?, direction = ?,
             visual_preset = ?, pause_on_hover = ?,
             desktop_font_size = ?, mobile_font_size = ?, updated_at = ?
         WHERE id = 'default'`,
        [
          body.isEnabled === false ? 0 : 1,
          JSON.stringify(segmentsEn),
          JSON.stringify(segmentsAr),
          String(body.separatorSymbol || "✦"),
          Math.max(8, Math.min(90, Number(body.speedSeconds || 28))),
          ["AUTO", "LEFT", "RIGHT"].includes(body.direction) ? body.direction : "AUTO",
          ["OPTION_A_OFFWHITE", "OPTION_B_BLACK", "MIXED_BADGE"].includes(body.visualPreset)
            ? body.visualPreset
            : "OPTION_B_BLACK",
          body.pauseOnHover === false ? 0 : 1,
          String(body.desktopFontSize || "SM"),
          String(body.mobileFontSize || "XS"),
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "SAVE_MARQUEE_SETTINGS", "MARQUEE", "default", {});
      return NextResponse.json({ ok: true });
    }

    if (action === "save_sale_campaign") {
      if (!hasAdminPermission(admin, "discounts.manage") && !hasAdminPermission(admin, "content.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      runSql(
        db,
        `UPDATE sale_campaigns
         SET name_en = ?, name_ar = ?, message_en = ?, message_ar = ?,
             banner_subtitle_en = ?, banner_subtitle_ar = ?,
             starts_at = ?, ends_at = ?, is_active = ?,
             show_countdown = ?, show_in_marquee = ?, show_in_footer = ?,
             updated_at = ?
         WHERE id = 'archive_sale'`,
        [
          String(body.nameEn || "ARCHIVE SALE"),
          String(body.nameAr || "تخفيضات الأرشيف"),
          String(body.messageEn || "ARCHIVE SALE — LIVE NOW"),
          String(body.messageAr || "تخفيضات الأرشيف — متاحة الآن"),
          String(body.bannerSubtitleEn || "LIMITED TIME ARCHIVE RELEASE"),
          String(body.bannerSubtitleAr || "إصدارات محدودة لفترة مؤقتة"),
          String(body.startsAt || "2026-01-01T00:00:00Z"),
          String(body.endsAt || "2026-12-31T23:59:59Z"),
          body.isActive ? 1 : 0,
          body.showCountdown === false ? 0 : 1,
          body.showInMarquee === false ? 0 : 1,
          body.showInFooter === false ? 0 : 1,
          now,
        ]
      );
      persistDb(db);
      await logAdminAction(admin, "SAVE_SALE_CAMPAIGN", "SALE_CAMPAIGN", "archive_sale", {
        isActive: Boolean(body.isActive),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "retry_whatsapp_notification") {
      if (!hasAdminPermission(admin, "orders.manage")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const logId = String(body.logId || "");
      const res = await retryWhatsAppNotification(db, logId);
      persistDb(db);
      return NextResponse.json({ ok: true, status: res.status, error: res.error });
    }

    return NextResponse.json({ ok: false, error: "Unknown admin action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

