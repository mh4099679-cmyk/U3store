<?php
require_once __DIR__ . '/../php_build/htdocs/config/database.php';
$p = 'U3Admin@2026';
$h = password_hash($p, PASSWORD_BCRYPT);
executeQuery("UPDATE admin_users SET password_hash = ? WHERE id = ?", [$h, 'admin-owner-1']);
echo "Updated admin-owner-1 password_hash to bcrypt: " . $h . "\n";

