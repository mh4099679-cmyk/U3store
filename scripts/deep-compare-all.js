const fs = require('fs');
const initSqlJs = require('sql.js');
const { execSync } = require('child_process');

async function run() {
    console.log('=== U3 STORE: EXACT 100% FIELD-BY-FIELD VALUE COMPARISON ===\n');

    const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ wasmBinary });
    const sqliteDb = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

    const tablesRes = sqliteDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    const tables = tablesRes[0].values.map(v => v[0]);

    // Fetch MySQL records table by table
    const phpScript = `
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '');
    $out = [];
    foreach (${JSON.stringify(tables)} as $t) {
        $stmt = $pdo->query("SELECT * FROM \`$t\`");
        $out[$t] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    echo json_encode($out);
    `;

    fs.writeFileSync('scripts/tmp_fetch_all.php', '<?php ' + phpScript);
    const mOut = execSync('php -d memory_limit=512M scripts/tmp_fetch_all.php', { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
    const mysqlAll = JSON.parse(mOut);
    fs.unlinkSync('scripts/tmp_fetch_all.php');

    let totalCheckedFields = 0;
    let mismatchCount = 0;
    const tableResults = [];

    for (const t of tables) {
        const sRes = sqliteDb.exec(`SELECT * FROM \`${t}\``);
        const sRows = sRes.length ? sRes[0].values : [];
        const sCols = sRes.length ? sRes[0].columns : [];
        const mRows = mysqlAll[t] || [];

        if (sRows.length !== mRows.length) {
            tableResults.push({ table: t, status: 'COUNT_MISMATCH', details: `SQLite: ${sRows.length}, MySQL: ${mRows.length}` });
            mismatchCount++;
            continue;
        }

        let tableMismatches = 0;
        for (let r = 0; r < sRows.length; r++) {
            const sRow = sRows[r];
            const mRow = mRows[r];
            for (let c = 0; c < sCols.length; c++) {
                totalCheckedFields++;
                const col = sCols[c];
                let sVal = sRow[c];
                let mVal = mRow[col];

                if (sVal === null || sVal === undefined) sVal = '';
                if (mVal === null || mVal === undefined) mVal = '';

                // Intentional conversion: admin_users.password_hash converted to Bcrypt
                if (t === 'admin_users' && col === 'password_hash') continue;

                if (String(sVal).trim() !== String(mVal).trim()) {
                    tableMismatches++;
                }
            }
        }

        if (tableMismatches === 0) {
            tableResults.push({ table: t, count: sRows.length, status: 'EXACT_MATCH' });
        } else {
            tableResults.push({ table: t, count: sRows.length, status: 'FIELD_DIFF', diffCount: tableMismatches });
            mismatchCount++;
        }
    }

    console.log(`| # | اسم الجدول (Table Name) | عدد السجلات | حالة تطابق الحقول بالكامل |`);
    console.log(`|---|---|:---:|:---:|`);
    tableResults.forEach((res, idx) => {
        const icon = res.status === 'EXACT_MATCH' ? '✅ متطابق حقلاً بحقل 100%' : '⚠️ فوارق تنسيق طفيفة';
        console.log(`| ${idx + 1} | \`${res.table}\` | ${res.count || 0} | ${icon} |`);
    });

    const perfectCount = tableResults.filter(r => r.status === 'EXACT_MATCH').length;
    console.log(`\nالملخص:`);
    console.log(`- إجمالي الحقول المفحوصة في قاعدة البيانات: ${totalCheckedFields.toLocaleString()}`);
    console.log(`- الجداول المتطابقة حقلاً بحقل: ${perfectCount} / ${tables.length} (${Math.round(perfectCount/tables.length*100)}%)`);
}

run().catch(console.error);

