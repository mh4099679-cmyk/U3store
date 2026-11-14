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

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));
  const variantRow = db.exec(
    "SELECT pv.id as variant_id, pv.product_id, pv.size, inv.on_hand FROM product_variants pv JOIN products p ON p.id = pv.product_id JOIN inventory inv ON inv.variant_id = pv.id WHERE inv.on_hand > 0 AND p.status = 'ACTIVE' LIMIT 1"
  )[0];

  const variantId = variantRow.values[0][0];
  const productId = variantRow.values[0][1];
  console.log('Using Variant:', variantId, 'Product:', productId);

  console.log('\n--- TEST 1: Add to Bag ---');
  const cartRes = await post('/api/cart', {
    action: 'add',
    productId: productId,
    variantId: variantId,
    quantity: 1,
  });
  console.log('Add to cart status:', cartRes.status, 'Items:', cartRes.data?.cart?.items?.length);

  // Collect cookies
  const rawCookies = cartRes.headers['set-cookie'] || [];
  const cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');
  console.log('Session Cookies:', cookieHeader);

  console.log('\n--- TEST 2: Validation on Missing City ---');
  const failRes = await post(
    '/api/checkout',
    {
      fullName: 'Mohamed Hany Test',
      phone: '01007695129',
      governorateId: 'gov-05',
      cityId: '',
      streetAddress: 'دار مصر',
      buildingNumber: '1',
    },
    { Cookie: cookieHeader }
  );
  console.log('Blocked as expected! Status:', failRes.status, '| Error:', failRes.data?.error);

  console.log('\n--- TEST 3: Successful Order with Full Cascade (Sharqia -> 10th of Ramadan -> Area) ---');
  const validRes = await post(
    '/api/checkout',
    {
      fullName: 'Mohamed Hany Delivery Test',
      phone: '01007695129',
      email: 'mohamedelsebaey@gmail.com',
      governorateId: 'gov-05',
      cityId: 'EG1309',
      areaId: 'EG130901',
      streetAddress: 'دار مصر',
      buildingNumber: '1',
      floorNumber: '1',
      apartmentNumber: '1',
      landmark: 'بجوار المسجد الكبير',
      deliveryNotes: 'الاتصال قبل الوصول بـ 15 دقيقة',
      paymentMethodCode: 'INSTAPAY',
    },
    { Cookie: cookieHeader }
  );
  console.log('Order created! Status:', validRes.status, '| Response:', validRes.data);

  console.log('\n--- TEST 4: SQLite Database Verification for Created Order ---');
  const updatedDb = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));
  const res = updatedDb.exec(
    "SELECT order_number, customer_name, customer_phone, governorate_id, governorate_name_en, governorate_name_ar, city_id, city_name_en, city_name_ar, area_id, area_name_en, area_name_ar, street_address, building_number, floor_number, apartment_number, landmark, delivery_notes, shipping_fee, total_amount FROM orders ORDER BY created_at DESC LIMIT 1"
  )[0];

  res.columns.forEach((col, idx) => {
    console.log(`  ${col}: ${res.values[0][idx]}`);
  });
}

run().catch(console.error);
