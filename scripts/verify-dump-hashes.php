<?php
// Verify admin password hash from dump
$adminHash = '$2y$12$ZjE6/rn4UIMy1ZdhfHvEAOtQwonYxhF9SbhByyClPY/8bSguH6j/W';
$custHash = '$2y$12$BHLoAuFFXa4wLxWoJmVE2uDaYw72Vw9zx89HN18g3SfMWX54V9Jn.';

echo "Admin hash verification with 'U3Admin@2026':\n";
var_dump(password_verify('U3Admin@2026', $adminHash));

echo "Customer hash verification with '12345678':\n";
var_dump(password_verify('12345678', $custHash));

