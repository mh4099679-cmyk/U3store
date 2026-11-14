const fs = require('fs');
const initSqlJs = require('sql.js');

async function check() {
    const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ wasmBinary });
    const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

    const pCols = db.exec("PRAGMA table_info(products);")[0].values.map(c => c[1]);
    console.log('Products columns:', pCols);

    const pvCols = db.exec("PRAGMA table_info(product_variants);")[0].values.map(c => c[1]);
    console.log('Product_variants columns:', pvCols);

    const p = db.exec("SELECT * FROM products WHERE id = 'prd-mw0v3iey-77096177f666'");
    console.log('Product row:', p[0] ? p[0].values : 'Not found');

    const v = db.exec("SELECT * FROM product_variants WHERE product_id = 'prd-mw0v3iey-77096177f666'");
    console.log('Product variants rows:', v[0] ? v[0].values : 'None');
}
check();
