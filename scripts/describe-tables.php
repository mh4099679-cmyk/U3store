<?php
require_once __DIR__ . '/../php_build/htdocs/config/database.php';
$tables = ['customer_profiles','shipping_companies','invoices','website_sections','roles','whatsapp_templates'];
foreach ($tables as $t) {
    $cols = array_column(queryAll("DESCRIBE $t"), 'Field');
    echo "$t: " . implode(', ', $cols) . "\n";
}

