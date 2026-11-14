const http = require('http');

function fetchUrl(url, options = {}) {
    return new Promise((resolve) => {
        const parsed = new URL(url);
        const req = http.request({
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', (err) => resolve({ status: 500, error: err.message, body: '' }));
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function run() {
    console.log('=== U3 STORE: FULL VERIFICATION SUITE (NEXT.JS vs PHP/MYSQL) ===\n');

    // 1. Admin Login First to get session
    console.log('--- 1. Testing Admin Authentication ---');
    const loginRes = await fetchUrl('http://127.0.0.1:8000/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'u3owner', password: 'U3Admin@2026' })
    });
    let loginData = null;
    try { loginData = JSON.parse(loginRes.body); } catch(e){}
    let adminToken = loginData && loginData.token ? loginData.token : '';
    let adminCookie = '';
    if (loginRes.headers['set-cookie']) {
        adminCookie = loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
    }
    console.log(`${adminToken ? '✅' : '❌'} Admin Authentication -> Token: ${adminToken ? 'Active' : 'FAILED'} | Cookie: ${adminCookie ? 'Set' : 'None'}`);

    const pages = [
        '/',
        '/shoes',
        '/clothing',
        '/shop',
        '/collections',
        '/new-arrivals',
        '/size-guide',
        '/cart',
        '/checkout',
        '/track-order',
        '/shipping-policy',
        '/return-policy',
        '/contact',
        '/terms',
        '/privacy-policy',
        '/admin',
        '/admin/login'
    ];

    console.log('\n--- 2. Testing Storefront & Admin Pages on PHP Server (Port 8000) ---');
    let passedPages = 0;
    for (const page of pages) {
        const headers = (page === '/admin') ? { 'Cookie': adminCookie, 'Authorization': `Bearer ${adminToken}` } : {};
        const phpRes = await fetchUrl('http://127.0.0.1:8000' + page, { headers });
        const hasBody = phpRes.body && phpRes.body.length > 500;
        const is200 = phpRes.status === 200;
        const statusIcon = (is200 && hasBody) ? '✅' : '❌';
        console.log(`${statusIcon} ${page.padEnd(20)} HTTP ${phpRes.status} | Size: ${phpRes.body.length} bytes`);
        if (is200 && hasBody) passedPages++;
    }
    console.log(`\nPages Result: ${passedPages}/${pages.length} Passed.\n`);

    console.log('--- 3. Testing Public API Endpoints on PHP Server (Port 8000) ---');
    const apiLocations = await fetchUrl('http://127.0.0.1:8000/api/locations');
    let locJson = null;
    try { locJson = JSON.parse(apiLocations.body); } catch(e){}
    const govCount = locJson && locJson.data ? locJson.data.length : 0;
    console.log(`${govCount === 27 ? '✅' : '❌'} /api/locations -> ${govCount} Governorates loaded`);

    const apiShipping = await fetchUrl('http://127.0.0.1:8000/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ governorateId: 'gov-01', subtotal: 1500 })
    });
    let shipJson = null;
    try { shipJson = JSON.parse(apiShipping.body); } catch(e){}
    const shipFee = shipJson && shipJson.calculation ? shipJson.calculation.shippingFee : undefined;
    console.log(`${shipFee !== undefined ? '✅' : '❌'} /api/shipping/calculate -> Shipping Fee: ${shipFee} EGP`);

    const apiCart = await fetchUrl('http://127.0.0.1:8000/api/cart');
    let cartJson = null;
    try { cartJson = JSON.parse(apiCart.body); } catch(e){}
    console.log(`${cartJson && cartJson.cart ? '✅' : '❌'} /api/cart -> Cart initialized successfully`);

    console.log('\n--- 4. Testing Security Protection (Unauthorized Admin & Order Access) ---');
    const unauthAdmin = await fetchUrl('http://127.0.0.1:8000/api/admin?resource=dashboard');
    console.log(`${unauthAdmin.status === 401 ? '✅' : '❌'} /api/admin (No Auth) -> HTTP ${unauthAdmin.status} (Access Denied / Protected)`);

    const unauthOrders = await fetchUrl('http://127.0.0.1:8000/api/orders?orderNumber=U3-20261103-00001');
    console.log(`${unauthOrders.status === 403 ? '✅' : '❌'} /api/orders (Without Token) -> HTTP ${unauthOrders.status} (Access Denied / Protected)`);

    const authOrders = await fetchUrl('http://127.0.0.1:8000/api/orders?orderNumber=U3-20261103-00001&token=5401c8e56c8dfb24f756e96fb5f040ff');
    let ordJson = null;
    try { ordJson = JSON.parse(authOrders.body); } catch(e){}
    console.log(`${authOrders.status === 200 && ordJson && ordJson.ok ? '✅' : '❌'} /api/orders (With Valid Token) -> HTTP ${authOrders.status} | Order: ${ordJson && ordJson.order ? ordJson.order.order_number : 'FAILED'}`);

    console.log('\n--- 5. Testing Admin Endpoints (All 14 Resources) ---');
    const resources = [
        'dashboard',
        'catalog',
        'orders',
        'payments',
        'customers',
        'customer_details',
        'shipping',
        'invoices',
        'returns_discounts',
        'cms',
        'system',
        'reports',
        'whatsapp',
        'appearance'
    ];

    let passedResources = 0;
    for (const r of resources) {
        const res = await fetchUrl(`http://127.0.0.1:8000/api/admin?resource=${r}`, {
            headers: { 'Cookie': adminCookie, 'Authorization': `Bearer ${adminToken}` }
        });
        let data = null;
        try { data = JSON.parse(res.body); } catch(e){
            console.log(`PARSE ERROR for ${r}:`, res.body.substring(0, 300));
        }
        const isOk = res.status === 200 && data && data.ok;
        console.log(`${isOk ? '✅' : '❌'} Admin Resource: ${r.padEnd(16)} -> HTTP ${res.status} | Data OK: ${isOk}`);
        if (isOk) passedResources++;
    }
    console.log(`\nAdmin Resources Result: ${passedResources}/${resources.length} Passed.\n`);

    console.log('--- 6. Testing Store Visibility Toggle ---');
    for (const mode of ['SHOES_ONLY', 'CLOTHING_ONLY', 'BOTH']) {
        const toggleRes = await fetchUrl('http://127.0.0.1:8000/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie, 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ action: 'set_store_visibility', mode: mode })
        });
        let resJson = null;
        try { resJson = JSON.parse(toggleRes.body); } catch(e){}
        console.log(`${resJson && resJson.ok ? '✅' : '❌'} Set Store Visibility to ${mode} -> Success: ${resJson ? resJson.ok : false}`);
    }

    // Reset back to BOTH
    await fetchUrl('http://127.0.0.1:8000/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie, 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'set_store_visibility', mode: 'BOTH' })
    });
    console.log('✅ Store Visibility reset to BOTH.');

    console.log('\n=== ALL AUTOMATED VERIFICATION CHECKS COMPLETED ===');
}

run();
