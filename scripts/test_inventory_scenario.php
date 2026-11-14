<?php
/**
 * U3 STORE - Strict Inventory Allocation & Rollback Test Suite
 */
require_once __DIR__ . '/../php_build/htdocs/config/database.php';
require_once __DIR__ . '/../php_build/htdocs/config/helpers.php';
require_once __DIR__ . '/../php_build/htdocs/config/auth.php';
require_once __DIR__ . '/../php_build/htdocs/api/cart.php';
require_once __DIR__ . '/../php_build/htdocs/api/shipping.php';

// Include admin functions
require_once __DIR__ . '/../php_build/htdocs/api/admin.php';

$pdo = getDb();
$now = date('Y-m-d H:i:s');
$testProdId = 'test-prod-' . bin2hex(random_bytes(4));
$testVarId = 'test-var-' . bin2hex(random_bytes(4));
$testSku = 'TEST-SKU-42';

echo "=== اختبار سيناريو المخزون والطلبات الصارم ===\n\n";

try {
    // 1. Setup test product & variant with initial stock = 5
    $pdo->prepare("INSERT INTO products (id, slug, product_type, regular_price, status, created_at, updated_at) VALUES (?, 'test-shoe', 'SHOES', 1500, 'ACTIVE', ?, ?)")->execute([$testProdId, $now, $now]);
    $pdo->prepare("INSERT INTO product_translations (product_id, lang, name, description) VALUES (?, 'en', 'Test Shoe', 'Test Description')")->execute([$testProdId]);
    $pdo->prepare("INSERT INTO product_translations (product_id, lang, name, description) VALUES (?, 'ar', 'حذاء تجريبي', 'وصف تجريبي')")->execute([$testProdId]);
    $pdo->prepare("INSERT INTO product_variants (id, product_id, sku, size, color_en, color_ar, color_hex, is_active, created_at) VALUES (?, ?, ?, '42', 'Black', 'أسود', '#000000', 1, ?)")->execute([$testVarId, $testProdId, $testSku, $now]);
    $pdo->prepare("INSERT INTO inventory (variant_id, on_hand, reserved, sold, low_stock_threshold, updated_at) VALUES (?, 5, 0, 0, 3, ?)")->execute([$testVarId, $now]);

    function getTestStock($varId) {
        return queryOne("SELECT on_hand, reserved, sold FROM inventory WHERE variant_id = ?", [$varId]);
    }

    $initialStock = getTestStock($testVarId);
    echo "1. المخزون المبدئي: OnHand = {$initialStock['on_hand']}, Reserved = {$initialStock['reserved']}, Sold = {$initialStock['sold']}\n";
    assert((int)$initialStock['on_hand'] === 5, "Initial on_hand must be 5");

    // -------------------------------------------------------------
    // SCENARIO A: Unpaid Order & Cancellation
    // -------------------------------------------------------------
    echo "\n--- السيناريو (أ): إنشاء طلب غير مدفوع ثم إلغاؤه ---\n";
    $orderAId = 'test-ord-A-' . bin2hex(random_bytes(3));
    $orderANum = 'U3-TEST-A';
    
    // Helper to insert test order
    function insertTestOrder($orderId, $orderNum, $token) {
        global $pdo, $now;
        $orderSql = "INSERT INTO orders (
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
            idempotency_key, created_at, updated_at, inventory_deducted
        ) VALUES (
            ?, ?, NULL, NULL, NULL,
            ?, ?,
            'GUEST', 'Test Customer', '01012345678', 'test@example.com', 'en',
            'gov_cairo', 'Cairo', 'القاهرة',
            NULL, 'Nasr City', 'مدينة نصر',
            NULL, 'District 1', 'الحي الأول',
            'Street 10', '5', '3', '12', 'Near Mosque', '',
            'STANDARD', '2-4 Days', '٢-٤ أيام',
            3000, 0, NULL, 50, 0, 3050,
            'INSTAPAY', 'AWAITING_PAYMENT', 'PENDING_PAYMENT',
            1, 0,
            NULL, ?, ?, 0
        )";
        $pdo->prepare($orderSql)->execute([$orderId, $orderNum, hash('sha256', $token), $token, $now, $now]);
    }

    $expiresAt = date('Y-m-d H:i:s', time() + 86400 * 2);
    // Simulate order placement with quantity 2
    insertTestOrder($orderAId, $orderANum, 'tok_a');
    $pdo->prepare("INSERT INTO order_items (id, order_id, product_id, variant_id, sku_snapshot, product_type_snapshot, product_name_en_snapshot, product_name_ar_snapshot, product_image_snapshot, size_snapshot, color_en_snapshot, color_ar_snapshot, unit_regular_price_snapshot, unit_final_price_snapshot, discount_per_unit_snapshot, quantity, line_total) VALUES (?, ?, ?, ?, ?, 'SHOES', 'Test Shoe', 'حذاء تجريبي', '', '42', 'Black', 'أسود', 1500, 1500, 0, 2, 3000)")->execute([generateId('oi'), $orderAId, $testProdId, $testVarId, $testSku]);
    $pdo->prepare("INSERT INTO inventory_reservations (id, order_id, variant_id, quantity, status, expires_at, created_at) VALUES (?, ?, ?, 2, 'ACTIVE', ?, ?)")->execute([generateId('res'), $orderAId, $testVarId, $expiresAt, $now]);
    $pdo->prepare("UPDATE inventory SET reserved = reserved + 2 WHERE variant_id = ?")->execute([$testVarId]);

    $stockAfterOrderA = getTestStock($testVarId);
    echo "بعد إنشاء الطلب A بكمية 2: OnHand = {$stockAfterOrderA['on_hand']} (لم يخصم!), Reserved = {$stockAfterOrderA['reserved']}\n";
    if ((int)$stockAfterOrderA['on_hand'] !== 5) throw new Exception("FAIL: on_hand was deducted at order placement!");
    if ((int)$stockAfterOrderA['reserved'] !== 2) throw new Exception("FAIL: reserved was not updated!");

    // Cancel unpaid order A
    $ordARecord = queryOne("SELECT * FROM orders WHERE id = ?", [$orderAId]);
    restoreOrderInventory($ordARecord, 'admin-test', $now, 'Test cancel unpaid');
    $stockAfterCancelA = getTestStock($testVarId);
    echo "بعد إلغاء الطلب غير المدفوع: OnHand = {$stockAfterCancelA['on_hand']} (لا تغيير!), Reserved = {$stockAfterCancelA['reserved']} (تم فك الحجز!)\n";
    if ((int)$stockAfterCancelA['on_hand'] !== 5) throw new Exception("FAIL: on_hand changed on unpaid cancellation!");
    if ((int)$stockAfterCancelA['reserved'] !== 0) throw new Exception("FAIL: reservation was not released!");

    // -------------------------------------------------------------
    // SCENARIO B: Paid Order, Idempotency, and Paid Cancellation
    // -------------------------------------------------------------
    echo "\n--- السيناريو (ب): إنشاء طلب ودفع وتكرار التأكيد ثم الإلغاء وتكرار الإلغاء ---\n";
    $orderBId = 'test-ord-B-' . bin2hex(random_bytes(3));
    $orderBNum = 'U3-TEST-B';

    // Place order B with quantity 2
    insertTestOrder($orderBId, $orderBNum, 'tok_b');
    $pdo->prepare("INSERT INTO order_items (id, order_id, product_id, variant_id, sku_snapshot, product_type_snapshot, product_name_en_snapshot, product_name_ar_snapshot, product_image_snapshot, size_snapshot, color_en_snapshot, color_ar_snapshot, unit_regular_price_snapshot, unit_final_price_snapshot, discount_per_unit_snapshot, quantity, line_total) VALUES (?, ?, ?, ?, ?, 'SHOES', 'Test Shoe', 'حذاء تجريبي', '', '42', 'Black', 'أسود', 1500, 1500, 0, 2, 3000)")->execute([generateId('oi'), $orderBId, $testProdId, $testVarId, $testSku]);
    $pdo->prepare("INSERT INTO inventory_reservations (id, order_id, variant_id, quantity, status, expires_at, created_at) VALUES (?, ?, ?, 2, 'ACTIVE', ?, ?)")->execute([generateId('res'), $orderBId, $testVarId, $expiresAt, $now]);
    $pdo->prepare("UPDATE inventory SET reserved = reserved + 2 WHERE variant_id = ?")->execute([$testVarId]);

    $stockBeforePay = getTestStock($testVarId);
    echo "1. قبل الدفع: OnHand = {$stockBeforePay['on_hand']}, Reserved = {$stockBeforePay['reserved']}\n";
    if ((int)$stockBeforePay['on_hand'] !== 5) throw new Exception("FAIL: stock deducted before payment!");

    // Admin marks payment as confirmed (commitOrderInventory)
    $ordBRecord = queryOne("SELECT * FROM orders WHERE id = ?", [$orderBId]);
    $didCommit1 = commitOrderInventory($ordBRecord, 'admin-test', $now, 'Test mark paid 1');
    $stockAfterPay = getTestStock($testVarId);
    echo "2. بعد تأكيد الدفع: OnHand = {$stockAfterPay['on_hand']} (تم خصم 2 بالضبط!), Sold = {$stockAfterPay['sold']}\n";
    if ((int)$stockAfterPay['on_hand'] !== 3) throw new Exception("FAIL: on_hand should be 3 (5 - 2)!");
    if ((int)$stockAfterPay['sold'] !== 2) throw new Exception("FAIL: sold should be 2!");

    // Duplicate call: Repeat payment confirmation on already paid order
    $ordBRecordReload = queryOne("SELECT * FROM orders WHERE id = ?", [$orderBId]);
    $didCommit2 = commitOrderInventory($ordBRecordReload, 'admin-test', $now, 'Test mark paid duplicate');
    $stockAfterDupPay = getTestStock($testVarId);
    echo "3. تكرار تأكيد الدفع: OnHand = {$stockAfterDupPay['on_hand']} (لم يخصم مرة أخرى! منع التكرار بنجاح: didCommit = " . ($didCommit2 ? 'true' : 'false') . ")\n";
    if ((int)$stockAfterDupPay['on_hand'] !== 3) throw new Exception("FAIL: Double deduction occurred!");
    if ($didCommit2 !== false) throw new Exception("FAIL: commitOrderInventory allowed duplicate deduction!");

    // Cancel paid order: Must restore 2 units back to on_hand
    $ordBRecordPaid = queryOne("SELECT * FROM orders WHERE id = ?", [$orderBId]);
    $didRestore1 = restoreOrderInventory($ordBRecordPaid, 'admin-test', $now, 'Test cancel paid order 1');
    $stockAfterCancelPaid = getTestStock($testVarId);
    echo "4. بعد إلغاء الطلب المدفوع: OnHand = {$stockAfterCancelPaid['on_hand']} (تمت استعادة الـ 2 بنجاح ليصبح 5!), Sold = {$stockAfterCancelPaid['sold']}\n";
    if ((int)$stockAfterCancelPaid['on_hand'] !== 5) throw new Exception("FAIL: on_hand should be restored to 5!");
    if ((int)$stockAfterCancelPaid['sold'] !== 0) throw new Exception("FAIL: sold should be 0!");

    // Duplicate call: Repeat cancellation
    $ordBRecordCancelled = queryOne("SELECT * FROM orders WHERE id = ?", [$orderBId]);
    $didRestore2 = restoreOrderInventory($ordBRecordCancelled, 'admin-test', $now, 'Test cancel paid duplicate');
    $stockAfterDupCancel = getTestStock($testVarId);
    echo "5. تكرار الإلغاء: OnHand = {$stockAfterDupCancel['on_hand']} (لم يزد مرة أخرى! منع التكرار بنجاح)\n";
    if ((int)$stockAfterDupCancel['on_hand'] !== 5) throw new Exception("FAIL: Double restoration occurred!");

    // Clean up test records
    $pdo->prepare("DELETE FROM order_items WHERE order_id IN (?, ?)")->execute([$orderAId, $orderBId]);
    $pdo->prepare("DELETE FROM inventory_reservations WHERE order_id IN (?, ?)")->execute([$orderAId, $orderBId]);
    $pdo->prepare("DELETE FROM inventory_movements WHERE related_order_id IN (?, ?)")->execute([$orderAId, $orderBId]);
    $pdo->prepare("DELETE FROM orders WHERE id IN (?, ?)")->execute([$orderAId, $orderBId]);
    $pdo->prepare("DELETE FROM inventory WHERE variant_id = ?")->execute([$testVarId]);
    $pdo->prepare("DELETE FROM product_variants WHERE id = ?")->execute([$testVarId]);
    $pdo->prepare("DELETE FROM product_translations WHERE product_id = ?")->execute([$testProdId]);
    $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$testProdId]);

    echo "\n✅ نجح اختبار السيناريو الصارم بالكامل 100% بدون أي خلل!\n";

} catch (Exception $e) {
    echo "\n❌ فشل الاختبار: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
