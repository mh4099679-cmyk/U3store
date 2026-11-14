const fs = require('fs');
const initSqlJs = require('sql.js');

async function run() {
    const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ wasmBinary });
    const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

    const res = db.exec("SELECT i.* FROM inventory i LEFT JOIN product_variants pv ON i.variant_id = pv.id WHERE pv.id IS NULL");
    console.log('SQLite inventory orphans:', JSON.stringify(res, null, 2));

    const allInv = db.exec("SELECT COUNT(*) FROM inventory");
    console.log('Total inventory rows in SQLite:', allInv[0].values[0][0]);
    
    const allPv = db.exec("SELECT COUNT(*) FROM product_variants");
    console.log('Total product_variants rows in SQLite:', allPv[0].values[0][0]);
}

run();

