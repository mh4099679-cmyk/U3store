<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '');
$stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
$stmt->execute(['$2y$12$BHLoAuFFXa4wLxWoJmVE2uDaYw72Vw9zx89HN18g3SfMWX54V9Jn.', 'usr-mw243sky-ae3b6651678d']);

// Verify immediately:
$u = $pdo->query("SELECT id, email, password_hash FROM users WHERE id = 'usr-mw243sky-ae3b6651678d'")->fetch(PDO::FETCH_ASSOC);
echo "User: " . $u['email'] . "\nHash: " . $u['password_hash'] . "\n";
echo "Verify 12345678: " . (password_verify('12345678', $u['password_hash']) ? "SUCCESS" : "FAIL") . "\n";
