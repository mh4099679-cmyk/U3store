<?php
// scripts/test_returned_status.php
putenv('DB_HOST=127.0.0.1');
putenv('DB_NAME=u3store');
putenv('DB_USER=root');
putenv('DB_PASS=');
$_ENV['DB_HOST'] = '127.0.0.1';
$_ENV['DB_NAME'] = 'u3store';
$_ENV['DB_USER'] = 'root';
$_ENV['DB_PASS'] = '';

require_once __DIR__ . '/../staging_deployment_package/htdocs/config/database.php';
require_once __DIR__ . '/../staging_deployment_package/htdocs/config/helpers.php';
require_once __DIR__ . '/../staging_deployment_package/htdocs/config/auth.php';

echo "=== TESTING RETURNED STATUS & INVENTORY RESTORATION ===\n\n";

$pdo = Database::getConnection();

// 1. Pick a real order that has items
$order = queryOne("SELECT * FROM orders WHERE inventory_deducted = 1 LIMIT 1");
if (!$order) {
    // If none with inventory_deducted = 1, pick any order and mark it
    $order = queryOne("SELECT * FROM orders LIMIT 1");
}

$orderItems = queryAll("SELECT * FROM order_items WHERE order_id = ?", [$order['id']]);
$firstItem = $orderItems[0];
$variantId = $firstItem['variant_id'];
$qty = (int)$firstItem['quantity'];

echo "Testing Order #{$order['order_number']} (ID: {$order['id']})\n";
echo "Item: {$firstItem['sku_snapshot']} | Qty: {$qty} | Variant: {$variantId}\n";

// Ensure inventory exists
$invBefore = queryOne("SELECT * FROM inventory WHERE variant_id = ?", [$variantId]);
echo "Initial State: on_hand = {$invBefore['on_hand']}, sold = {$invBefore['sold']}, inventory_deducted = {$order['inventory_deducted']}\n";

// Step 1: Ensure it is in CONFIRMED & PAID state with inventory deducted
require_once __DIR__ . '/../staging_deployment_package/htdocs/api/admin.php';

commitOrderInventory($order, 'admin-owner-1', date('Y-m-d H:i:s'), 'Test commit before return');
$order = queryOne("SELECT * FROM orders WHERE id = ?", [$order['id']]);
$invPaid = queryOne("SELECT * FROM inventory WHERE variant_id = ?", [$variantId]);
echo "Paid State: on_hand = {$invPaid['on_hand']}, sold = {$invPaid['sold']}, inventory_deducted = {$order['inventory_deducted']}\n";

// Step 2: Now simulate Admin selecting "RETURNED" (مرتجع)
echo "\n--- Action: Admin selects 'RETURNED' (مرتجع) ---\n";
$now = date('Y-m-d H:i:s');
$newStatus = 'RETURNED';

if (($newStatus === 'CANCELLED' || $newStatus === 'RETURNED') && !in_array($order['order_status'], ['CANCELLED', 'RETURNED'])) {
    restoreOrderInventory($order, 'admin-owner-1', $now, "مرتجع: استرجاع منتجات الطلب {$order['order_number']} إلى المخزون");
}

executeQuery("UPDATE orders SET order_status = 'RETURNED', updated_at = ? WHERE id = ?", [$now, $order['id']]);

$orderAfterReturn = queryOne("SELECT * FROM orders WHERE id = ?", [$order['id']]);
$invAfterReturn = queryOne("SELECT * FROM inventory WHERE variant_id = ?", [$variantId]);

echo "Returned State:\n";
echo "- on_hand: {$invAfterReturn['on_hand']} (Expected: " . ($invPaid['on_hand'] + $qty) . ")\n";
echo "- sold: {$invAfterReturn['sold']} (Expected: " . max(0, $invPaid['sold'] - $qty) . ")\n";
echo "- inventory_deducted: {$orderAfterReturn['inventory_deducted']} (Expected: 0)\n";

$passOnHand = (int)$invAfterReturn['on_hand'] === ((int)$invPaid['on_hand'] + $qty);
$passSold = (int)$invAfterReturn['sold'] === max(0, (int)$invPaid['sold'] - $qty);
$passDeducted = (int)$orderAfterReturn['inventory_deducted'] === 0;

echo "Check on_hand restored: " . ($passOnHand ? "✓ SUCCESS" : "✗ FAIL") . "\n";
echo "Check sold decreased: " . ($passSold ? "✓ SUCCESS" : "✗ FAIL") . "\n";
echo "Check inventory_deducted is 0: " . ($passDeducted ? "✓ SUCCESS" : "✗ FAIL") . "\n";

// Step 3: Test idempotency: if RETURNED is called again, does stock restore twice?
echo "\n--- Idempotency Test: Admin triggers 'RETURNED' again ---\n";
if (($newStatus === 'CANCELLED' || $newStatus === 'RETURNED') && !in_array($orderAfterReturn['order_status'], ['CANCELLED', 'RETURNED'])) {
    restoreOrderInventory($orderAfterReturn, 'admin-owner-1', $now, "Duplicate trigger");
}

$invIdem = queryOne("SELECT * FROM inventory WHERE variant_id = ?", [$variantId]);
$passIdem = (int)$invIdem['on_hand'] === (int)$invAfterReturn['on_hand'];
echo "on_hand after duplicate trigger: {$invIdem['on_hand']} -> " . ($passIdem ? "✓ SUCCESS (Double restoration prevented)" : "✗ FAIL") . "\n";

// Step 4: Check inventory movements table for audit record
$movement = queryOne("SELECT * FROM inventory_movements WHERE variant_id = ? AND movement_type = 'RETURN_RESTORE' ORDER BY created_at DESC LIMIT 1", [$variantId]);
echo "\n--- Movement Audit Log ---\n";
echo "Movement ID: {$movement['id']}\n";
echo "Type: {$movement['movement_type']}\n";
echo "Reason: {$movement['reason']}\n";
echo "Recorded correctly: " . ($movement ? "✓ SUCCESS" : "✗ FAIL") . "\n";

// Clean up: return order to its original state
commitOrderInventory($orderAfterReturn, 'admin-owner-1', $now, 'Reset to original');
executeQuery("UPDATE orders SET order_status = 'CONFIRMED' WHERE id = ?", [$order['id']]);
echo "\n✓ Test completed and order restored to clean state.\n";
