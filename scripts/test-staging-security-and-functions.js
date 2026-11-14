const fs = require('fs');

async function testAll() {
    console.log('=== U3 STORE STAGING DEPLOYMENT VERIFICATION SUITE ===\n');
    const baseUrl = 'http://127.0.0.1:8001';
    const results = [];

    // Helper
    async function testEndpoint(name, url, expectedStatus, method = 'GET', headers = {}, body = null) {
        try {
            const opts = { method, headers };
            if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
            const res = await fetch(baseUrl + url, opts);
            const passed = res.status === expectedStatus;
            let data = null;
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                data = await res.json();
            } else {
                data = await res.text();
            }
            results.push({ name, url, method, expectedStatus, actualStatus: res.status, passed, data });
            console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: HTTP ${res.status} (Expected: ${expectedStatus})`);
            return { status: res.status, data, headers: res.headers };
        } catch (e) {
            results.push({ name, url, method, expectedStatus, actualStatus: 'ERROR', passed: false, error: e.message });
            console.log(`[FAIL] ${name}: Error: ${e.message}`);
            return { status: 'ERROR', error: e.message };
        }
    }

    console.log('--- 1. Testing Storefront Pages ---');
    await testEndpoint('Home Page', '/', 200);
    await testEndpoint('Shoes Page', '/shoes', 200);
    await testEndpoint('Clothing Page', '/clothing', 200);
    await testEndpoint('Shop All Page', '/shop', 200);
    await testEndpoint('Cart Page', '/cart', 200);
    await testEndpoint('Checkout Page', '/checkout', 200);
    await testEndpoint('Size Guide Page', '/size-guide', 200);
    await testEndpoint('Track Order Page', '/track-order', 200);
    await testEndpoint('Admin Login Page', '/admin/login', 200);

    console.log('\n--- 2. Testing Legitimate Media & Assets (Must be HTTP 200) ---');
    await testEndpoint('Product Image', '/uploads/u3-1793709208539-7kde.png', 200);
    await testEndpoint('Store Logo', '/assets/img/logo.jpg', 200);
    await testEndpoint('Main CSS File', '/assets/css/8333f2f5b9d85243.css', 200);
    await testEndpoint('Existing Receipt Image', '/uploads/receipts/rcpt_20261107_235001_b8bea0db.jpg', 200);

    console.log('\n--- 3. Testing Security Protection & Blocking (Must be HTTP 403) ---');
    await testEndpoint('Block Direct config/database.php', '/config/database.php', 403);
    await testEndpoint('Block Direct config/helpers.php', '/config/helpers.php', 403);
    await testEndpoint('Block Direct includes/header.php', '/includes/header.php', 403);
    await testEndpoint('Block Direct SQL Dump access', '/dump.sql', 403);
    await testEndpoint('Block Direct .env access', '/.env', 403);
    await testEndpoint('Block Direct SQLite access', '/database.sqlite', 403);
    await testEndpoint('Block Direct .log access', '/debug.log', 403);
    await testEndpoint('Block uploads Directory Listing', '/uploads/', 403);
    await testEndpoint('Block uploads/receipts Listing', '/uploads/receipts/', 403);
    await testEndpoint('Block Script execution in uploads', '/uploads/exploit.php', 403);
    await testEndpoint('Block Script execution in receipts', '/uploads/receipts/shell.phtml', 403);

    console.log('\n--- 4. Testing User & Admin Authentication ---');
    // Admin login
    const adminLoginRes = await testEndpoint(
        'Admin Login with Original Password',
        '/api/auth/admin',
        200,
        'POST',
        { 'Content-Type': 'application/json' },
        { action: 'login', username: 'u3owner', password: 'U3Admin@2026' }
    );
    let adminToken = '';
    if (adminLoginRes.data && adminLoginRes.data.token) {
        adminToken = adminLoginRes.data.token;
        console.log('   Admin token received successfully.');
    }

    // Customer login
    const custLoginRes = await testEndpoint(
        'Customer Login with Original Password',
        '/api/auth/customer',
        200,
        'POST',
        { 'Content-Type': 'application/json' },
        { action: 'login', identifier: '01007695129', password: '12345678' }
    );
    if (custLoginRes.data && custLoginRes.data.customer) {
        console.log('   Customer login authenticated:', custLoginRes.data.customer.fullName);
    }

    console.log('\n--- 5. Testing Receipt Upload & Subsequent Viewing ---');
    // Upload a small valid 1x1 GIF as receipt
    const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    // We need an order number to test upload. Let's find one or use admin token.
    const uploadRes = await testEndpoint(
        'Upload Payment Receipt via API',
        '/api/receipts',
        200,
        'POST',
        {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminToken
        },
        {
            orderNumber: 'U3-20261103-00001',
            receiptBase64: dummyBase64,
            sender: 'Test Verification Sender',
            reference: 'REF-VERIFY-123',
            notes: 'Automated staging verification receipt'
        }
    );

    if (uploadRes.data && uploadRes.data.receiptUrl) {
        const uploadedUrl = uploadRes.data.receiptUrl;
        console.log('   Uploaded receipt URL:', uploadedUrl);
        await testEndpoint('View Newly Uploaded Receipt (Must be HTTP 200)', uploadedUrl, 200);
    } else {
        console.log('   Upload response detail:', uploadRes.data);
    }

    console.log('\n=============================================');
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    console.log(`TOTAL TESTS: ${total}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log('=============================================\n');

    fs.writeFileSync('scripts/staging_test_results.json', JSON.stringify(results, null, 2));
}

testAll();

