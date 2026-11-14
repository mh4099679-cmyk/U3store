const fs = require('fs');
const initSqlJs = require('sql.js');

async function run() {
    console.log('=== INVESTIGATING 4 ORPHAN INVENTORY RECORDS ===\n');

    const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ wasmBinary });
    const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

    const orphanVariants = [
        'var-mw0v3if3-43cf4dff55ca',
        'var-mw0v3if4-3e6c6d7a6b7b',
        'var-mw0v3if4-3061eff149a1',
        'var-mw0v3if4-4832750cee85'
    ];

    // 1. Details from inventory table
    console.log('1. Inventory Table Details:');
    for (const vid of orphanVariants) {
        const res = db.exec(`SELECT * FROM inventory WHERE variant_id = '${vid}'`);
        console.log(JSON.stringify(res[0].values[0]));
    }

    // 2. Search all other tables in SQLite to see where these IDs appear!
    console.log('\n2. Searching all 79 tables for references to these variant IDs:');
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")[0].values.map(v => v[0]);

    for (const vid of orphanVariants) {
        console.log(`\n--- References for variant_id: ${vid} ---`);
        let foundAny = false;
        for (const tbl of tables) {
            try {
                // Search each text/varchar column
                const colsRes = db.exec(`PRAGMA table_info(${tbl});`);
                const cols = colsRes[0].values.map(c => c[1]);
                for (const col of cols) {
                    const q = `SELECT count(*) FROM "${tbl}" WHERE "${col}" LIKE '%${vid}%'`;
                    const cntRes = db.exec(q);
                    const cnt = cntRes[0].values[0][0];
                    if (cnt > 0) {
                        foundAny = true;
                        console.log(`  Found in table "${tbl}" column "${col}": ${cnt} row(s)`);
                        // show sample
                        const sample = db.exec(`SELECT * FROM "${tbl}" WHERE "${col}" LIKE '%${vid}%' LIMIT 1`);
                        console.log(`    Sample:`, JSON.stringify(sample[0].values[0]));
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        if (!foundAny) {
            console.log(`  No other references found across any other tables.`);
        }
    }

    // 3. Check what happened around timestamp '2026-11-03T15:47:56' in audit_logs or products
    console.log('\n3. Activity around creation time 2026-11-03:');
    const logs = db.exec("SELECT id, action, entity_type, entity_id, created_at, changes_summary FROM audit_logs WHERE created_at LIKE '2026-11-03%' ORDER BY created_at ASC LIMIT 10");
    if (logs.length > 0) {
        console.log('Sample audit logs:', JSON.stringify(logs[0].values, null, 2));
    }
}

run();

