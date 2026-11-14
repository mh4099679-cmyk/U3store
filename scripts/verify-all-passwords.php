<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '');

echo "=== USER & ADMIN CREDENTIAL VERIFICATION ===\n\n";

echo "--- 1. ADMIN USERS TABLE ---\n";
$admins = $pdo->query("SELECT id, username, email, role, password_hash, status FROM admin_users")->fetchAll(PDO::FETCH_ASSOC);
foreach ($admins as $admin) {
    echo "Admin ID: {$admin['id']}\n";
    echo "  Username: {$admin['username']}\n";
    echo "  Email: {$admin['email']}\n";
    echo "  Role: {$admin['role']}\n";
    echo "  Hash: {$admin['password_hash']}\n";
    
    // Test with U3Admin@2026
    $match = password_verify('U3Admin@2026', $admin['password_hash']);
    echo "  Verify with 'U3Admin@2026': " . ($match ? "SUCCESS (PASSWORD VERIFIED)" : "FAILED") . "\n";
    echo "----------------------------------------\n";
}

echo "\n--- 2. STORE USERS / CUSTOMERS TABLE ---\n";
$users = $pdo->query("SELECT id, email, phone, password_hash, status FROM users")->fetchAll(PDO::FETCH_ASSOC);
foreach ($users as $user) {
    echo "User ID: {$user['id']}\n";
    echo "  Email: {$user['email']}\n";
    echo "  Phone: {$user['phone']}\n";
    
    if ($user['id'] === 'usr-mw243sky-ae3b6651678d') {
        // Check if scrypt or bcrypt
        if (strpos($user['password_hash'], '$2y$') === 0) {
            $match = password_verify('12345678', $user['password_hash']);
            echo "  Verify with '12345678': " . ($match ? "SUCCESS (PASSWORD VERIFIED)" : "FAILED") . "\n";
        } else {
            echo "  Notice: password_hash is Node.js scrypt format: {$user['password_hash']}\n";
        }
    }
    echo "----------------------------------------\n";
}
