<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '');
$rows = $pdo->query("SELECT i.* FROM inventory i LEFT JOIN product_variants pv ON i.variant_id = pv.id WHERE pv.id IS NULL")->fetchAll(PDO::FETCH_ASSOC);
echo "MySQL Orphans in inventory:\n";
print_r($rows);

// Also check original SQLite database!
$sqlite = new PDO('sqlite:data/u3store.sqlite');
$sqlRows = $sqlite->query("SELECT i.* FROM inventory i LEFT JOIN product_variants pv ON i.variant_id = pv.id WHERE pv.id IS NULL")->fetchAll(PDO::FETCH_ASSOC);
echo "\nSQLite Orphans in inventory:\n";
print_r($sqlRows);

