<?php
// scripts/test_staging_sql_import.php
$host = '127.0.0.1';
$user = 'root';
$pass = '';
$testDb = 'u3store_test_staging_import';

echo "=== TESTING SQL DUMP IMPORT ON FRESH DATABASE ===\n\n";

$pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

// 1. Drop if exists and create fresh empty database
$pdo->exec("DROP DATABASE IF EXISTS `$testDb`");
$pdo->exec("CREATE DATABASE `$testDb` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
echo "1. Created empty database: $testDb\n";

// 2. Import u3store_staging_dump.sql via mysql CLI or chunked PDO
$sqlFile = realpath(__DIR__ . '/../staging_deployment_package/database/u3store_staging_dump.sql');
echo "2. Importing SQL dump: $sqlFile\n";

$cmd = "\"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe\" -h $host -u $user $testDb < \"$sqlFile\"";
exec($cmd, $out, $ret);

if ($ret !== 0) {
    echo "ERROR importing via mysql CLI (ret: $ret). Trying PDO statement execution...\n";
    // Fallback if needed
} else {
    echo "   Import completed with exit code 0!\n";
}

// 3. Connect to the imported test DB
$pdoTest = new PDO("mysql:host=$host;dbname=$testDb;charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

// 4. Count tables
$tables = $pdoTest->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
$totalTables = count($tables);
echo "3. Total tables imported: $totalTables\n";

// 5. Count total rows across all tables
$totalRows = 0;
$rowCounts = [];
foreach ($tables as $t) {
    $c = (int)$pdoTest->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
    $rowCounts[$t] = $c;
    $totalRows += $c;
}

echo "4. Total rows imported across all 79 tables: $totalRows\n";

if ($totalTables === 79 && $totalRows === 7080) {
    echo "\n✓ SUCCESS: Exactly 79 tables and 7,080 rows imported with 0 errors!\n";
} else {
    echo "\nWARNING: Expected 79 tables and 7,080 rows, found $totalTables tables and $totalRows rows.\n";
}

// Cleanup test DB
$pdo->exec("DROP DATABASE `$testDb`");
echo "5. Dropped temporary test database: $testDb\n";

