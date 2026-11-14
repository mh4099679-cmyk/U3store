import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { withTransaction, queryOne, runSql } from "@/lib/db";
import {
  getCurrentCustomer,
  getOrCreateGuestSession,
  getStorefrontLanguage,
  generateId,
  generateSecureToken,
  sha256Hex,
  createCustomerAuthSession,
} from "@/lib/auth/session";
import { hashPasswordSync } from "@/lib/db/seed-data";
import { hydrateCartById } from "@/lib/services/cart";
import {
  calculateShippingServer,
  generateUniqueOrderNumber,
  generateUniqueInvoiceNumber,
  releaseExpiredReservations,
} from "@/lib/services/commerce";
import { queueWhatsAppNotification, saveWhatsAppConsent } from "@/lib/services/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const customer = await getCurrentCustomer();
    const guest = await getOrCreateGuestSession(true);
    const lang = await getStorefrontLanguage();

    if (!customer && !guest) {
      return NextResponse.json({ ok: false, error: "Session initialization failed." }, { status: 400 });
    }

    const fullName = String(body.fullName || "").trim();
    const rawPhone = String(body.phone || "");
    // Clean and normalize Egyptian phone number
    let phone = rawPhone.replace(/\D/g, "");
    if (phone.startsWith("20") && phone.length === 12 && /^(2010|2011|2012|2015)/.test(phone)) {
      phone = "0" + phone.slice(2);
    }

    const email = String(body.email || "").trim().toLowerCase();
    const governorateId = String(body.governorateId || "").trim();
    const cityName = String(body.cityName || body.cityId || "").trim();
    const areaName = String(body.areaName || body.areaId || "").trim();
    const streetAddress = String(body.streetAddress || "").trim();
    const buildingNumber = String(body.buildingNumber || "").trim();
    const floorNumber = String(body.floorNumber || "").trim();
    const apartmentNumber = String(body.apartmentNumber || "").trim();
    const landmark = String(body.landmark || "").trim();
    const deliveryNotes = String(body.deliveryNotes || "").trim();
    const paymentMethodCode = body.paymentMethodCode === "VODAFONE_CASH" ? "VODAFONE_CASH" : "INSTAPAY";
    const shippingMethod = body.shippingMethod === "EXPRESS" ? "EXPRESS" : "STANDARD";
    const idempotencyKey = String(body.idempotencyKey || "").trim();
    const createOptionalAccount = Boolean(body.createOptionalAccount);
    const optionalPassword = String(body.optionalPassword || "");
    const whatsappTransactionalConsent = body.whatsappTransactionalConsent !== false;
    const whatsappMarketingConsent = Boolean(body.whatsappMarketingConsent);
    const receiptBase64 = String(body.receiptBase64 || "");
    const receiptFileName = String(body.receiptFileName || "receipt.jpg");
    const transactionReference = String(body.transactionReference || "").trim();
    let senderIdentifier = String(body.senderIdentifier || "").trim();
    if (senderIdentifier) {
      let cleanSender = senderIdentifier.replace(/\D/g, "");
      if (cleanSender.startsWith("20") && cleanSender.length === 12 && /^(2010|2011|2012|2015)/.test(cleanSender)) {
        cleanSender = "0" + cleanSender.slice(2);
      }
      senderIdentifier = cleanSender.slice(0, 11);
    }

    if (!fullName || !phone || !governorateId || !cityName || !areaName || !streetAddress || !buildingNumber) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lang === "ar"
              ? "يرجى ملء جميع حقول التوصيل الإجبارية (الاسم، الهاتف، المحافظة، المدينة، المنطقة/الحي، العنوان بالتفصيل، رقم العقار)."
              : "Please fill in all required delivery fields (Full Name, Phone, Governorate, City, Area/District, Detailed Street Address, Building Number).",
        },
        { status: 400 }
      );
    }

    // Strict 11-digit Egyptian mobile validation: must start with 010, 011, 012, or 015
    const isEgyptianPhone = /^(010|011|012|015)\d{8}$/.test(phone);
    if (!isEgyptianPhone) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lang === "ar"
              ? "يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015."
              : "Please enter a valid 11-digit Egyptian phone number.",
        },
        { status: 400 }
      );
    }

    // Strict electronic payment details verification (InstaPay & Vodafone Cash)
    if (paymentMethodCode === "INSTAPAY" || paymentMethodCode === "VODAFONE_CASH") {
      if (!senderIdentifier) {
        return NextResponse.json(
          {
            ok: false,
            error:
              lang === "ar"
                ? "يرجى إدخال رقم المحفظة أو الحساب المحوّل منه لتأكيد عملية الدفع."
                : "Please enter the sender wallet or phone number to confirm payment.",
          },
          { status: 400 }
        );
      }

      if (/^\d+$/.test(senderIdentifier) && !/^(010|011|012|015)\d{8}$/.test(senderIdentifier)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              lang === "ar"
                ? "يرجى إدخال رقم محفظة مصري صحيح مكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015."
                : "Please enter a valid 11-digit Egyptian phone number for the sender wallet.",
          },
          { status: 400 }
        );
      }

      if (!receiptBase64 || !receiptBase64.includes("base64,")) {
        return NextResponse.json(
          {
            ok: false,
            error:
              lang === "ar"
                ? "يرجى إرفاق صورة إيصال التحويل (سكرين شوت) لتأكيد طلبك والدفع."
                : "Please attach a screenshot of the transfer receipt to confirm your order.",
          },
          { status: 400 }
        );
      }
    }

    const result = await withTransaction(async (db) => {
      releaseExpiredReservations(db);
      const now = new Date().toISOString();

      // Check idempotency key to prevent duplicate order on double click or refresh
      if (idempotencyKey) {
        const existingOrder = queryOne<any>(
          db,
          `SELECT order_number, guest_access_token_plain FROM orders WHERE idempotency_key = ?`,
          [idempotencyKey]
        );
        if (existingOrder) {
          return {
            orderNumber: existingOrder.order_number,
            accessToken: existingOrder.guest_access_token_plain,
            duplicatePrevented: true,
          };
        }
      }

      // Resolve active cart
      let cartRow: any = null;
      if (customer) {
        cartRow = queryOne<any>(db, `SELECT * FROM carts WHERE user_id = ?`, [customer.id]);
      } else if (guest) {
        cartRow = queryOne<any>(db, `SELECT * FROM carts WHERE guest_session_id = ?`, [guest.id]);
      }

      if (!cartRow) {
        throw new Error(lang === "ar" ? "حقيبة التسوق فارغة." : "Your shopping bag is empty.");
      }

      const cart = hydrateCartById(
        db,
        cartRow.id,
        customer ? "CUSTOMER" : "GUEST",
        customer?.id || guest?.id || "",
        cartRow.coupon_code || ""
      );

      if (cart.items.length === 0) {
        throw new Error(lang === "ar" ? "حقيبة التسوق فارغة." : "Your shopping bag is empty.");
      }

      // Validate payment method is enabled
      const pm = queryOne<any>(
        db,
        `SELECT * FROM payment_methods WHERE code = ? AND is_enabled = 1`,
        [paymentMethodCode]
      );
      if (!pm) {
        throw new Error(
          lang === "ar"
            ? "وسيلة الدفع المختارة غير متاحة حالياً."
            : "Selected payment method is currently unavailable."
        );
      }

      // Validate stock for all items atomically against available on-hand stock
      for (const item of cart.items) {
        const inv = queryOne<any>(db, `SELECT * FROM inventory WHERE variant_id = ?`, [item.variantId]);
        const onHand = Number(inv?.on_hand || 0);
        if (item.quantity > onHand) {
          throw new Error(
            lang === "ar"
              ? `الكمية المطلوبة من (${item.nameAr} - مقاس ${item.size}) غير متوفرة بالمخزن. المتاح: ${onHand}`
              : `Insufficient stock for (${item.nameEn} - Size ${item.size}). Available: ${onHand}`
          );
        }
      }

      // Calculate server-side shipping
      const shipCalc = calculateShippingServer(db, {
        governorateId,
        cityId: cityName,
        cityName,
        areaId: areaName,
        areaName,
        subtotalAfterDiscount: cart.finalSubtotalAfterDiscount,
        shippingMethod,
      });

      if (!shipCalc.allowed || !shipCalc.governorate) {
        throw new Error(lang === "ar" ? shipCalc.errorAr || "الشحن غير متاح" : shipCalc.errorEn || "Shipping unavailable");
      }

      // Optional voluntary registration during guest checkout
      let finalUserId = customer?.id || null;
      let newCreatedUserId: string | null = null;
      if (!finalUserId && createOptionalAccount && email && optionalPassword.length >= 6) {
        const existingUser = queryOne<any>(db, `SELECT id FROM users WHERE email = ?`, [email]);
        if (!existingUser) {
          const newUid = generateId("usr");
          runSql(
            db,
            `INSERT INTO users (id, email, phone, password_hash, status, email_verified, phone_verified, preferred_language, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'ACTIVE', 0, 0, ?, ?, ?)`,
            [newUid, email, phone, hashPasswordSync(optionalPassword), lang, now, now]
          );
          runSql(
            db,
            `INSERT INTO customer_profiles (user_id, full_name, internal_notes, total_orders, total_paid_spending, updated_at)
             VALUES (?, ?, '', 0, 0, ?)`,
            [newUid, fullName, now]
          );
          finalUserId = newUid;
          newCreatedUserId = newUid;
        }
      }

      // Guest customer record if not registered
      let guestCustomerId: string | null = null;
      if (!finalUserId) {
        guestCustomerId = generateId("gcus");
        runSql(
          db,
          `INSERT INTO guest_customers (id, guest_session_id, full_name, phone, email, governorate_name_en, governorate_name_ar, internal_notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)`,
          [
            guestCustomerId,
            guest?.id || null,
            fullName,
            phone,
            email,
            shipCalc.governorate.name_en,
            shipCalc.governorate.name_ar,
            now,
          ]
        );
      }

      const orderId = generateId("ord");
      const orderNumber = generateUniqueOrderNumber(db);
      const guestAccessTokenPlain = generateSecureToken(16);
      const guestAccessTokenHash = sha256Hex(guestAccessTokenPlain);

      const finalTotal =
        Math.round(
          (cart.finalSubtotalAfterDiscount + shipCalc.shippingFee + shipCalc.additionalFees) * 100
        ) / 100;

      // Handle checkout receipt upload if provided by customer
      let savedReceiptPath = "";
      if (receiptBase64 && receiptBase64.includes("base64,")) {
        try {
          const receiptsDir = path.join(process.cwd(), "data", "receipts");
          if (!fs.existsSync(receiptsDir)) {
            fs.mkdirSync(receiptsDir, { recursive: true });
          }
          const ext = path.extname(receiptFileName).replace(/[^a-zA-Z0-9.]/g, "") || ".jpg";
          const safeFile = `rcpt-${orderNumber}-${Date.now()}${ext}`;
          const fullPath = path.join(receiptsDir, safeFile);
          const base64Data = receiptBase64.split("base64,")[1];
          fs.writeFileSync(fullPath, Buffer.from(base64Data, "base64"));
          savedReceiptPath = safeFile;
        } catch (saveErr) {
          console.error("Error saving receipt at checkout:", saveErr);
        }
      }

      const initialPaymentStatus = savedReceiptPath ? "UNDER_REVIEW" : "AWAITING_PAYMENT";
      const initialOrderStatus = savedReceiptPath ? "PAYMENT_UNDER_REVIEW" : "PENDING_PAYMENT";

      runSql(
        db,
        `INSERT INTO orders (
          id, order_number, user_id, guest_customer_id, guest_session_id,
          guest_access_token_hash, guest_access_token_plain,
          customer_type, customer_name, customer_phone, customer_email, language_used,
          governorate_id, governorate_name_en, governorate_name_ar,
          city_id, city_name_en, city_name_ar,
          area_id, area_name_en, area_name_ar,
          street_address, building_number, floor_number, apartment_number, landmark, delivery_notes,
          shipping_method, delivery_estimate_en, delivery_estimate_ar,
          subtotal, discount_amount, coupon_code_snapshot, shipping_fee, additional_fees, total_amount,
          payment_method_code, payment_status, order_status,
          whatsapp_transactional_consent, whatsapp_marketing_consent,
          idempotency_key, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?
        )`,
        [
          orderId,
          orderNumber,
          finalUserId,
          guestCustomerId,
          guest?.id || null,
          guestAccessTokenHash,
          guestAccessTokenPlain,
          finalUserId ? "REGISTERED" : "GUEST",
          fullName,
          phone,
          email,
          lang,
          shipCalc.governorate.id,
          shipCalc.governorate.name_en,
          shipCalc.governorate.name_ar,
          shipCalc.city?.id || cityName,
          shipCalc.city?.name_en || cityName,
          shipCalc.city?.name_ar || cityName,
          shipCalc.area?.id || areaName,
          shipCalc.area?.name_en || areaName,
          shipCalc.area?.name_ar || areaName,
          streetAddress,
          buildingNumber,
          floorNumber,
          apartmentNumber,
          landmark,
          deliveryNotes,
          shippingMethod,
          shipCalc.estimatedDaysEn,
          shipCalc.estimatedDaysAr,
          cart.subtotal,
          cart.couponDiscount,
          cart.couponCode,
          shipCalc.shippingFee,
          shipCalc.additionalFees,
          finalTotal,
          paymentMethodCode,
          initialPaymentStatus,
          initialOrderStatus,
          whatsappTransactionalConsent ? 1 : 0,
          whatsappMarketingConsent ? 1 : 0,
          idempotencyKey || null,
          now,
          now,
        ]
      );

      // Save Order Items + Reserve Stock + Create Invoice
      const rules = queryOne<any>(db, `SELECT reservation_expiry_minutes FROM shipping_rules WHERE id = 'default'`);
      const expiryMins = Number(rules?.reservation_expiry_minutes || 120);
      const reservationExpiresAt = new Date(Date.now() + expiryMins * 60 * 1000).toISOString();

      const invoiceId = generateId("inv");
      const invoiceNumber = generateUniqueInvoiceNumber(db);
      const deliveryAddressEn = [
        streetAddress,
        `Bldg ${buildingNumber}`,
        floorNumber ? `Floor ${floorNumber}` : "",
        apartmentNumber ? `Apt ${apartmentNumber}` : "",
        shipCalc.area?.name_en || "",
        shipCalc.city?.name_en || "",
        shipCalc.governorate.name_en,
      ]
        .filter(Boolean)
        .join(", ");

      const deliveryAddressAr = [
        streetAddress,
        `عقار ${buildingNumber}`,
        floorNumber ? `دور ${floorNumber}` : "",
        apartmentNumber ? `شقة ${apartmentNumber}` : "",
        shipCalc.area?.name_ar || "",
        shipCalc.city?.name_ar || "",
        shipCalc.governorate.name_ar,
      ]
        .filter(Boolean)
        .join("، ");

      runSql(
        db,
        `INSERT INTO invoices (
          id, invoice_number, order_id, order_number,
          customer_name, customer_phone, customer_email,
          delivery_address_en, delivery_address_ar,
          subtotal, discount_amount, shipping_fee, total_amount,
          payment_method_code, payment_status, issued_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          invoiceNumber,
          orderId,
          orderNumber,
          fullName,
          phone,
          email,
          deliveryAddressEn,
          deliveryAddressAr,
          cart.subtotal,
          cart.couponDiscount,
          shipCalc.shippingFee + shipCalc.additionalFees,
          finalTotal,
          paymentMethodCode,
          initialPaymentStatus,
          now,
        ]
      );

      // If customer attached payment receipt at checkout, insert payment submission record
      if (savedReceiptPath) {
        const subId = generateId("psub");
        runSql(
          db,
          `INSERT INTO payment_submissions (
            id, order_id, payment_method_code, transaction_reference,
            sender_identifier, transfer_date, transfer_amount, receipt_file_path,
            status, admin_notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNDER_REVIEW', 'Attached by customer during checkout', ?)`,
          [
            subId,
            orderId,
            paymentMethodCode,
            transactionReference || `TX-${orderNumber}`,
            senderIdentifier || phone,
            now,
            finalTotal,
            savedReceiptPath,
            now,
          ]
        );
      }

      for (const item of cart.items) {
        runSql(
          db,
          `INSERT INTO order_items (
            id, order_id, product_id, variant_id, sku_snapshot, product_type_snapshot,
            product_name_en_snapshot, product_name_ar_snapshot, product_image_snapshot,
            size_snapshot, color_en_snapshot, color_ar_snapshot,
            unit_regular_price_snapshot, unit_final_price_snapshot, discount_per_unit_snapshot,
            quantity, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId("oi"),
            orderId,
            item.productId,
            item.variantId,
            item.sku,
            item.productType || "SHOES",
            item.nameEn,
            item.nameAr,
            item.imageUrl,
            item.size,
            item.colorEn,
            item.colorAr,
            item.regularPrice,
            item.finalPrice,
            item.discountPerUnit,
            item.quantity,
            item.lineSubtotal,
          ]
        );

        runSql(
          db,
          `INSERT INTO invoice_items (
            id, invoice_id, sku, product_name_en, product_name_ar,
            size, color_en, color_ar, quantity, unit_price, discount_amount, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId("ii"),
            invoiceId,
            item.sku,
            item.nameEn,
            item.nameAr,
            item.size,
            item.colorEn,
            item.colorAr,
            item.quantity,
            item.finalPrice,
            item.discountPerUnit * item.quantity,
            item.lineSubtotal,
          ]
        );

        // Strictly verify physical stock exists without deducting it yet.
        // Business Rule: Inventory deduction happens ONLY when admin confirms payment ("تم الدفع").
        // Placing an order leaves on_hand untouched so available stock does not decrease until payment is confirmed.
        const inv = queryOne<any>(db, `SELECT * FROM inventory WHERE variant_id = ?`, [item.variantId]);
        const currentOnHand = Number(inv?.on_hand || 0);

        // Record tracking reservation without altering inventory table
        runSql(
          db,
          `INSERT INTO inventory_reservations (id, order_id, variant_id, quantity, status, expires_at, created_at)
           VALUES (?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?)`,
          [generateId("res"), orderId, item.variantId, item.quantity, reservationExpiresAt, now]
        );

        // Check low stock / out of stock admin notification based on current stock
        const remAvailable = currentOnHand;
        const threshold = Number(inv?.low_stock_threshold || 3);
        if (remAvailable <= threshold) {
          runSql(
            db,
            `INSERT INTO notifications (
              id, recipient_type, recipient_user_id, order_id, event_type,
              title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
            ) VALUES (?, 'ADMIN', NULL, ?, ?, ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
            [
              generateId("notif"),
              orderId,
              remAvailable === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
              remAvailable === 0 ? `Out of Stock: ${item.sku}` : `Low Stock Alert: ${item.sku}`,
              remAvailable === 0 ? `نفاد المخزون: ${item.sku}` : `تنبيه انخفاض المخزون: ${item.sku}`,
              `${item.nameEn} (${item.colorEn} / Size ${item.size}) has ${remAvailable} available units remaining.`,
              `${item.nameAr} (${item.colorAr} / مقاس ${item.size}) متبقي منه ${remAvailable} قطع متاحة.`,
              now,
            ]
          );
        }
      }

      // Record order status history
      runSql(
        db,
        `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, created_at)
         VALUES (?, ?, 'ORDER_STATUS', '', ?, ?, ?)`,
        [
          generateId("osh"),
          orderId,
          initialOrderStatus,
          savedReceiptPath ? "Order placed with transfer receipt attached" : "Order created at checkout",
          now,
        ]
      );
      runSql(
        db,
        `INSERT INTO order_status_history (id, order_id, status_type, previous_status, new_status, note, created_at)
         VALUES (?, ?, 'PAYMENT_STATUS', '', ?, ?, ?)`,
        [
          generateId("osh"),
          orderId,
          initialPaymentStatus,
          savedReceiptPath ? "Payment receipt submitted for admin review" : "Awaiting manual transfer confirmation",
          now,
        ]
      );

      // Record coupon usage if applied
      if (cart.couponCode) {
        const coupon = queryOne<any>(db, `SELECT id FROM coupons WHERE UPPER(code) = UPPER(?)`, [
          cart.couponCode,
        ]);
        if (coupon) {
          runSql(db, `UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`, [coupon.id]);
          runSql(
            db,
            `INSERT INTO coupon_usages (id, coupon_id, order_id, user_id, customer_phone, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [generateId("cu"), coupon.id, orderId, finalUserId, phone, now]
          );
        }
      }

      // Update customer profile stats if registered
      if (finalUserId) {
        runSql(
          db,
          `UPDATE customer_profiles
           SET total_orders = total_orders + 1, most_recent_order_at = ?, updated_at = ?
           WHERE user_id = ?`,
          [now, now, finalUserId]
        );
      }

      // Create Customer & Admin Notifications
      if (finalUserId) {
        runSql(
          db,
          `INSERT INTO notifications (
            id, recipient_type, recipient_user_id, order_id, event_type,
            title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
          ) VALUES (?, 'CUSTOMER', ?, ?, 'ORDER_CREATED', ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
          [
            generateId("notif"),
            finalUserId,
            orderId,
            `Order ${orderNumber} Created`,
            `تم إنشاء الطلب ${orderNumber}`,
            `Your order ${orderNumber} for EGP ${finalTotal} has been created. Please complete your ${paymentMethodCode} transfer.`,
            `تم إنشاء طلبك رقم ${orderNumber} بقيمة ${finalTotal} ج.م. يرجى استكمال التحويل عبر ${paymentMethodCode}.`,
            now,
          ]
        );
      }

      runSql(
        db,
        `INSERT INTO notifications (
          id, recipient_type, recipient_user_id, order_id, event_type,
          title_en, title_ar, message_en, message_ar, is_read, external_delivery_status, created_at
        ) VALUES (?, 'ADMIN', NULL, ?, 'NEW_ORDER', ?, ?, ?, ?, 0, 'INTERNAL_ONLY', ?)`,
        [
          generateId("notif"),
          orderId,
          `New Order ${orderNumber}`,
          `طلب جديد ${orderNumber}`,
          `${fullName} placed order ${orderNumber} (EGP ${finalTotal}) via ${paymentMethodCode}.`,
          `قام العميل ${fullName} بإنشاء طلب رقم ${orderNumber} بقيمة ${finalTotal} ج.م عبر ${paymentMethodCode}.`,
          now,
        ]
      );

      // Build rich order summary for WhatsApp notification
      const orderSummary = cart.items
        .map((it: any) => {
          const pName = lang === "ar" ? (it.nameAr || it.nameEn) : it.nameEn;
          const color = it.colorEn || "Monochrome";
          return `${pName} — EU ${it.size} (${color}) x${it.quantity}`;
        })
        .join(" | ");

      const formattedTotal = lang === "ar"
        ? `${finalTotal.toLocaleString("en-US")} ج.م`
        : `EGP ${finalTotal.toLocaleString("en-US")}`;

      const formattedPaymentMethod =
        paymentMethodCode === "VODAFONE_CASH"
          ? (lang === "ar" ? "فودافون كاش (Vodafone Cash)" : "Vodafone Cash")
          : (lang === "ar" ? "انستاباي (InstaPay)" : "InstaPay");

      // Save WhatsApp Consent & Trigger ORDER_RECEIVED WhatsApp Notification
      saveWhatsAppConsent(db, {
        userId: finalUserId,
        guestCustomerId,
        phone,
        transactionalConsent: whatsappTransactionalConsent,
        marketingConsent: whatsappMarketingConsent,
        source: "CHECKOUT",
      });

      queueWhatsAppNotification(db, {
        eventType: "ORDER_RECEIVED",
        recipientPhone: phone,
        customerName: fullName,
        relatedOrderNumber: orderNumber,
        userId: finalUserId,
        orderId,
        lang,
        forceSend: true, // Essential transactional order receipt is always sent
        trackingToken: guestAccessTokenPlain,
        variables: {
          customer_name: fullName,
          order_number: orderNumber,
          order_summary: orderSummary,
          order_total: formattedTotal,
          payment_method: formattedPaymentMethod,
          tracking_token: guestAccessTokenPlain,
        },
      });

      // Clear cart items after successful order creation
      runSql(db, `DELETE FROM cart_items WHERE cart_id = ?`, [cartRow.id]);
      runSql(db, `UPDATE carts SET coupon_code = '', updated_at = ? WHERE id = ?`, [now, cartRow.id]);

      return {
        orderId,
        orderNumber,
        invoiceNumber,
        accessToken: guestAccessTokenPlain,
        newCreatedUserId,
      };
    });

    if (result.newCreatedUserId) {
      await createCustomerAuthSession(result.newCreatedUserId);
    }

    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Order creation failed" }, { status: 400 });
  }
}

