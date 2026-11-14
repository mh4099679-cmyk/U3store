<?php
ini_set('memory_limit', '512M');
set_time_limit(300);

echo "Connecting to MySQL 8.0 on localhost...\n";
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$pdo->exec("CREATE DATABASE IF NOT EXISTS u3store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
$pdo->exec("USE u3store;");
$pdo->exec("SET NAMES utf8mb4;");
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

$sqlPath = __DIR__ . '/../php_build/database/u3store_mysql.sql';
echo "Reading SQL file from $sqlPath...\n";

$handle = fopen($sqlPath, "r");
if (!$handle) {
    die("Failed to open SQL file.\n");
}

$stmt = "";
$executedCount = 0;
$startTime = microtime(true);

while (($line = fgets($handle)) !== false) {
    $trimmed = trim($line);
    if ($trimmed === '' || str_starts_with($trimmed, '--') || str_starts_with($trimmed, '/*')) {
        continue;
    }

    $stmt .= $line;
    if (str_ends_with($trimmed, ';')) {
        try {
            $pdo->exec($stmt);
            $executedCount++;
        } catch (Exception $e) {
            echo "Error executing statement: " . substr($stmt, 0, 100) . "...\n";
            echo "Error: " . $e->getMessage() . "\n";
        }
        $stmt = "";
    }
}
fclose($handle);

$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
$elapsed = round(microtime(true) - $startTime, 2);

echo "Import complete! Executed $executedCount statements in {$elapsed}s.\n";

// Count tables and rows
$tables = $pdo->query("SHOW TABLES;")->fetchAll(PDO::FETCH_COLUMN);
echo "Total tables in MySQL u3store: " . count($tables) . "\n";

$totalRows = 0;
foreach ($tables as $t) {
    $c = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
    $totalRows += $c;
}
echo "Total rows across all tables in MySQL: $totalRows\n";

