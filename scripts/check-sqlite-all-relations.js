const fs = require('fs');
const initSqlJs = require('sql.js');

async function run() {
    const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ wasmBinary });
    const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

    // Check all possible relationships
    const pairs = [
        { c: 'order_items', ccol: 'order_id', p: 'orders', pcol: 'id' },
        { c: 'order_status_history', ccol: 'order_id', p: 'orders', pcol: 'id' },
        { c: 'invoices', ccol: 'order_id', p: 'orders', pcol: 'id' },
        { c: 'payment_submissions', ccol: 'order_id', p: 'orders', pcol: 'id' },
        { c: 'product_variants', ccol: 'product_id', p: 'products', pcol: 'id' },
        { c: 'product_images', ccol: 'product_id', p: 'products', pcol: 'id' },
        { c: 'inventory', ccol: 'variant_id', p: 'product_variants', pcol: 'id' },
        { c: 'customer_profiles', ccol: 'user_id', p: 'users', pcol: 'id' },
        { c: 'admin_profiles', ccol: 'user_id', p: 'users', pcol: 'id' },
        { c: 'sessions', ccol: 'user_id', p: 'users', pcol: 'id' },
        { c: 'orders', ccol: 'customer_id', p: 'users', pcol: 'id', nullable: true },
        { c: 'guest_orders', ccol: 'order_id', p: 'orders', pcol: 'id' },
        { c: 'guest_orders', ccol: 'guest_id', p: 'guest_customers', pcol: 'id' },
        { c: 'cities', ccol: 'governorate_id', p: 'governorates', pcol: 'id' },
        { c: 'shipping_rates', ccol: 'governorate_id', p: 'governorates', pcol: 'id' },
        { c: 'product_categories', ccol: 'product_id', p: 'products', pcol: 'id' },
        { c: 'product_categories', ccol: 'category_id', p: 'categories', pcol: 'id' },
        { c: 'order_events', ccol: 'order_id', p: 'orders', pcol: 'id' }
    ];

    console.log("=== CHECKING ALL RELATIONSHIPS IN ORIGINAL SQLITE ===");
    for (const pair of pairs) {
        try {
            const nullCond = pair.nullable ? `AND c.${pair.ccol} IS NOT NULL AND c.${pair.ccol} != ''` : '';
            const q = `SELECT count(*) FROM ${pair.c} c LEFT JOIN ${pair.p} p ON c.${pair.ccol} = p.${pair.pcol} WHERE p.${pair.pcol} IS NULL ${nullCond}`;
            const res = db.exec(q);
            const count = res[0].values[0][0];
            console.log(`${pair.c}.${pair.ccol} -> ${pair.p}.${pair.pcol}: ${count} orphans`);
        } catch (e) {
            // table might not exist
        }
    }
}

run();

