<?php
require_once __DIR__ . '/../php_build/htdocs/api/shipping.php';
$testGovs = ['gov-01', 'gov-02', 'gov-03', 'gov-05', 'gov-24', 'gov-25'];
foreach ($testGovs as $g) {
    $res = calculateShippingServer(['governorateId' => $g, 'subtotalAfterDiscount' => 1000]);
    echo "{$g} ({$res['governorate']['name_en']} / {$res['governorate']['name_ar']}): Fee = {$res['shippingFee']} EGP | Time = {$res['estimatedDaysAr']}\n";
}
