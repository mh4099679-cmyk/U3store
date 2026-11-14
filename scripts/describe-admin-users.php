<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '');
$cols = $pdo->query("DESCRIBE admin_users")->fetchAll(PDO::FETCH_ASSOC);
print_r($cols);
$rows = $pdo->query("SELECT * FROM admin_users")->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);

