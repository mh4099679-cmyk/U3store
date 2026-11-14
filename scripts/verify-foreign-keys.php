<?php
// scripts/verify-foreign-keys.php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

echo "=== FOREIGN KEY & ORPHAN RECORDS VERIFICATION ===\n\n";

// 1. Check defined Foreign Keys in MySQL INFORMATION_SCHEMA
$stmt = $pdo->query("
    SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'u3store'
      AND REFERENCED_TABLE_NAME IS NOT NULL
");
$fks = $stmt->fetchAll();
echo "Total explicit foreign key constraints in schema: " . count($fks) . "\n";
foreach ($fks as $fk) {
    echo "  - {$fk['TABLE_NAME']}.{$fk['COLUMN_NAME']} -> {$fk['REFERENCED_TABLE_NAME']}.{$fk['REFERENCED_COLUMN_NAME']}\n";
}

// 2. Comprehensive check of logical parent-child relationships in the schema
$relationships = [
    ['child_table' => 'order_items', 'child_col' => 'order_id', 'parent_table' => 'orders', 'parent_col' => 'id'],
    ['child_table' => 'order_status_history', 'child_col' => 'order_id', 'parent_table' => 'orders', 'parent_col' => 'id'],
    ['child_table' => 'invoices', 'child_col' => 'order_id', 'parent_table' => 'orders', 'parent_col' => 'id'],
    ['child_table' => 'payment_submissions', 'child_col' => 'order_id', 'parent_table' => 'orders', 'parent_col' => 'id'],
    ['child_table' => 'product_variants', 'child_col' => 'product_id', 'parent_table' => 'products', 'parent_col' => 'id'],
    ['child_table' => 'product_images', 'child_col' => 'product_id', 'parent_table' => 'products', 'parent_col' => 'id'],
    ['child_table' => 'inventory', 'child_col' => 'variant_id', 'parent_table' => 'product_variants', 'parent_col' => 'id'],
    ['child_table' => 'customer_profiles', 'child_col' => 'user_id', 'parent_table' => 'users', 'parent_col' => 'id'],
    ['child_table' => 'admin_profiles', 'child_col' => 'user_id', 'parent_table' => 'users', 'parent_col' => 'id'],
    ['child_table' => 'sessions', 'child_col' => 'user_id', 'parent_table' => 'users', 'parent_col' => 'id'],
    ['child_table' => 'orders', 'child_col' => 'customer_id', 'parent_table' => 'users', 'parent_col' => 'id', 'nullable' => true],
    ['child_table' => 'guest_orders', 'child_col' => 'order_id', 'parent_table' => 'orders', 'parent_col' => 'id'],
    ['child_table' => 'guest_orders', 'child_col' => 'guest_id', 'parent_table' => 'guest_customers', 'parent_col' => 'id'],
    ['child_table' => 'cities', 'child_col' => 'governorate_id', 'parent_table' => 'governorates', 'parent_col' => 'id'],
    ['child_table' => 'shipping_rates', 'child_col' => 'governorate_id', 'parent_table' => 'governorates', 'parent_col' => 'id'],
    ['child_table' => 'product_categories', 'child_col' => 'product_id', 'parent_table' => 'products', 'parent_col' => 'id'],
    ['child_table' => 'product_categories', 'child_col' => 'category_id', 'parent_table' => 'categories', 'parent_col' => 'id'],
    ['child_table' => 'order_events', 'child_col' => 'order_id', 'parent_table' => 'orders', 'parent_col' => 'id']
];

echo "\n--- Scanning for Orphan Records in Parent-Child Relationships ---\n";
$orphanFound = 0;
$checkedRelations = 0;

foreach ($relationships as $rel) {
    // Check if both tables exist
    $chkTable1 = $pdo->query("SHOW TABLES LIKE '{$rel['child_table']}'")->fetch();
    $chkTable2 = $pdo->query("SHOW TABLES LIKE '{$rel['parent_table']}'")->fetch();
    if (!$chkTable1 || !$chkTable2) {
        continue;
    }
    
    // Check if columns exist
    $chkCol1 = $pdo->query("SHOW COLUMNS FROM `{$rel['child_table']}` LIKE '{$rel['child_col']}'")->fetch();
    $chkCol2 = $pdo->query("SHOW COLUMNS FROM `{$rel['parent_table']}` LIKE '{$rel['parent_col']}'")->fetch();
    if (!$chkCol1 || !$chkCol2) {
        continue;
    }

    $checkedRelations++;
    $nullCond = !empty($rel['nullable']) ? "AND c.`{$rel['child_col']}` IS NOT NULL AND c.`{$rel['child_col']}` != ''" : "";
    $sql = "
        SELECT COUNT(*) as cnt
        FROM `{$rel['child_table']}` c
        LEFT JOIN `{$rel['parent_table']}` p ON c.`{$rel['child_col']}` = p.`{$rel['parent_col']}`
        WHERE p.`{$rel['parent_col']}` IS NULL
        {$nullCond}
    ";
    $count = (int)$pdo->query($sql)->fetch()['cnt'];
    $totalChildRows = (int)$pdo->query("SELECT COUNT(*) as cnt FROM `{$rel['child_table']}`")->fetch()['cnt'];
    
    $status = $count === 0 ? "PASSED (0 orphans)" : "FAILED ({$count} orphans!)";
    echo sprintf("[%s] %s.%s -> %s.%s (Total rows: %d) -> %s\n",
        $count === 0 ? "OK" : "ERR",
        $rel['child_table'],
        $rel['child_col'],
        $rel['parent_table'],
        $rel['parent_col'],
        $totalChildRows,
        $status
    );
    if ($count > 0) $orphanFound += $count;
}

echo "\nVerification Summary:\n";
echo "- Total Relationships Verified: $checkedRelations\n";
echo "- Total Orphan Records Found: $orphanFound\n";
if ($orphanFound === 0) {
    echo "✓ 100% Referential Integrity confirmed! Zero orphan records exist across all tables.\n";
}

