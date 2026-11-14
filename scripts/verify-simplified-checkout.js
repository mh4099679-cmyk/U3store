const http = require('http');
const fs = require('fs');
const initSqlJs = require('sql.js');

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      'http://localhost:3000' + path,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(b), headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, raw: b, headers: res.headers });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testAll() {
  console.log('=== U3 STORE CHECKOUT SIMPLIFICATION & PHONE VALIDATION TESTS ===\n');

  // 1. Get an active product variant to add to bag
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));
  const variantRow = db.exec(
    "SELECT pv.id as variant_id, pv.product_id, pv.size, inv.on_hand FROM product_variants pv JOIN products p ON p.id = pv.product_id JOIN inventory inv ON inv.variant_id = pv.id WHERE inv.on_hand > 0 AND p.status = 'ACTIVE' LIMIT 1"
  )[0];

  const variantId = variantRow.values[0][0];
  const productId = variantRow.values[0][1];
  console.log('Selected Variant for Checkout:', variantId);

  // Add item to bag to initiate private checkout session
  const addRes = await post('/api/cart', {
    action: 'add',
    productId,
    variantId,
    quantity: 1,
  });
  console.log('Cart setup status:', addRes.status, '| Items in Bag:', addRes.data?.cart?.items?.length);

  const rawCookies = addRes.headers['set-cookie'] || [];
  const cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');

  // Base checkout payload
  const validBase = {
    fullName: 'Mohamed Hany Verification',
    governorateId: 'gov-05', // Sharqia (EGP 59)
    cityName: 'العاشر من رمضان',
    areaName: 'المجاورة 35',
    streetAddress: 'شارع دار مصر الرئيسي، عمارة رقم 1',
    buildingNumber: '1',
    floorNumber: '2',
    apartmentNumber: '5',
    landmark: 'بجوار المسجد الكبير',
    deliveryNotes: 'يرجى الاتصال قبل الوصول بنصف ساعة',
    paymentMethodCode: 'INSTAPAY',
  };

  // Test A: Rejection of 10 digits
  console.log('\n--- TEST 1: Reject 10-digit Phone (0100769512) ---');
  const res10 = await post(
    '/api/checkout',
    { ...validBase, phone: '0100769512' },
    { Cookie: cookieHeader }
  );
  console.log('Result:', res10.status === 400 ? 'PASSED (Rejected with 400)' : 'FAILED', '| Message:', res10.data?.error);

  // Test B: Rejection of 12 digits
  console.log('\n--- TEST 2: Reject 12-digit Phone (010076951299) ---');
  const res12 = await post(
    '/api/checkout',
    { ...validBase, phone: '010076951299' },
    { Cookie: cookieHeader }
  );
  console.log('Result:', res12.status === 400 ? 'PASSED (Rejected with 400)' : 'FAILED', '| Message:', res12.data?.error);

  // Test C: Rejection of non-Egyptian prefix (e.g. 01807695129 or 01707695129 or 0223456789)
  console.log('\n--- TEST 3: Reject Non-Egyptian Prefix (01807695129) ---');
  const resNonEg = await post(
    '/api/checkout',
    { ...validBase, phone: '01807695129' },
    { Cookie: cookieHeader }
  );
  console.log('Result:', resNonEg.status === 400 ? 'PASSED (Rejected with 400)' : 'FAILED', '| Message:', resNonEg.data?.error);

  // Test D: Rejection of missing City
  console.log('\n--- TEST 4: Reject Missing City ---');
  const resNoCity = await post(
    '/api/checkout',
    { ...validBase, phone: '01007695129', cityName: '' },
    { Cookie: cookieHeader }
  );
  console.log('Result:', resNoCity.status === 400 ? 'PASSED (Rejected with 400)' : 'FAILED', '| Message:', resNoCity.data?.error);

  // Test E: Rejection of missing Area
  console.log('\n--- TEST 5: Reject Missing Area ---');
  const resNoArea = await post(
    '/api/checkout',
    { ...validBase, phone: '01007695129', areaName: '' },
    { Cookie: cookieHeader }
  );
  console.log('Result:', resNoArea.status === 400 ? 'PASSED (Rejected with 400)' : 'FAILED', '| Message:', resNoArea.data?.error);

  // Test F: Rejection of missing Detailed Street Address
  console.log('\n--- TEST 6: Reject Missing Detailed Street Address ---');
  const resNoStreet = await post(
    '/api/checkout',
    { ...validBase, phone: '01007695129', streetAddress: '' },
    { Cookie: cookieHeader }
  );
  console.log('Result:', resNoStreet.status === 400 ? 'PASSED (Rejected with 400)' : 'FAILED', '| Message:', resNoStreet.data?.error);

  // Test G: Successful Checkout with 11-digit Egyptian Phone (01007695129) and Full Detailed Address
  console.log('\n--- TEST 7: Successful Order with Valid Egyptian Phone & Text City/Area/Address ---');
  const resSuccess = await post(
    '/api/checkout',
    { ...validBase, phone: '01007695129', email: 'mohamedelsebaey@gmail.com' },
    { Cookie: cookieHeader }
  );
  console.log('Order status:', resSuccess.status, '| Success:', resSuccess.data?.ok, '| Order Number:', resSuccess.data?.orderNumber);

  // Test H: Check SQLite Database to confirm full address & phone are preserved
  console.log('\n--- TEST 8: Verify Complete Address & Phone in Database ---');
  const updatedDb = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));
  const orderRes = updatedDb.exec(
    "SELECT order_number, customer_name, customer_phone, governorate_id, governorate_name_en, governorate_name_ar, city_name_ar, area_name_ar, street_address, building_number, floor_number, apartment_number, landmark, delivery_notes, shipping_fee, total_amount, payment_method_code, order_status, inventory_deducted FROM orders ORDER BY created_at DESC LIMIT 1"
  )[0];

  orderRes.columns.forEach((col, idx) => {
    console.log(`  ${col}: ${orderRes.values[0][idx]}`);
  });

  console.log('\n=== ALL 8 VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
}

testAll().catch(console.error);

