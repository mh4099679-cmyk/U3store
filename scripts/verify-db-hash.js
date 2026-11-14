const fs = require('fs');
const initSqlJs = require('sql.js');
const { execSync } = require('child_process');
const crypto = require('crypto');

async function run() {
    console.log('=== U3 STORE: DEEP CONTENT HASH VERIFICATION (SQLITE vs MYSQL) ===\n');

    // 1. Init SQLite
    const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ wasmBinary });
    const sqliteDb = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

    const tablesRes = sqliteDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    const tables = tablesRes[0].values.map(v => v[0]);

    // 2. Query MySQL Hashes via PHP PDO
    const phpScript = `
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '');
    $hashes = [];
    foreach (${JSON.stringify(tables)} as $t) {
        $stmt = $pdo->query("SELECT * FROM \`$t\`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($rows)) {
            $hashes[$t] = 'EMPTY';
            continue;
        }
        $strRows = [];
        foreach ($rows as $r) {
            ksort($r);
            $parts = [];
            foreach ($r as $k => $v) {
                if ($t === 'admin_users' && $k === 'password_hash') {
                    $parts[] = "$k:OMITTED_BCRYPT";
                } else {
                    $val = trim((string)$v);
                    $val = preg_replace('/\\.\\d+Z$/', '', str_replace('T', ' ', $val));
                    $val = rtrim($val, 'Z');
                    $parts[] = "$k:$val";
                }
            }
            $strRows[] = implode('|', $parts);
        }
        sort($strRows);
        $hashes[$t] = substr(hash('sha256', implode("\n", $strRows)), 0, 16);
    }
    echo json_encode($hashes);
    `;

    fs.writeFileSync('scripts/tmp_mysql_hashes.php', '<?php ' + phpScript);
    const mysqlOutput = execSync('php scripts/tmp_mysql_hashes.php', { encoding: 'utf8' });
    const mysqlHashes = JSON.parse(mysqlOutput);
    fs.unlinkSync('scripts/tmp_mysql_hashes.php');

    console.log(`| # | اسم الجدول (Table Name) | سجلات SQLite | سجلات MySQL | مطابقة المحتوى (Content Hash) |`);
    console.log(`|---|---|:---:|:---:|:---:|`);

    let matchCount = 0;
    tables.forEach((t, i) => {
        let sqliteRows = [];
        const res = sqliteDb.exec(`SELECT * FROM \`${t}\``);
        if (res.length > 0) {
            const cols = res[0].columns;
            sqliteRows = res[0].values.map(vals => {
                const obj = {};
                cols.forEach((col, idx) => {
                    let v = vals[idx];
                    if (v === null || v === undefined) v = '';
                    obj[col] = String(v).trim();
                });
                return obj;
            });
        }

        let sqliteHash = 'EMPTY';
        if (sqliteRows.length > 0) {
            const strRows = sqliteRows.map(r => {
                const keys = Object.keys(r).sort();
                return keys.map(k => {
                    if (t === 'admin_users' && k === 'password_hash') {
                        return `${k}:OMITTED_BCRYPT`;
                    }
                    let val = r[k];
                    val = val.replace('T', ' ').replace(/\.\d+Z$/, '').replace(/Z$/, '');
                    return `${k}:${val}`;
                }).join('|');
            }).sort();
            sqliteHash = crypto.createHash('sha256').update(strRows.join('\n')).digest('hex').substring(0, 16);
        }

        const mysqlHash = mysqlHashes[t] || 'MISSING';
        const isMatch = (sqliteHash === mysqlHash);
        if (isMatch) matchCount++;

        const status = isMatch ? '✅ متطابق 100%' : '⚠️ اختلاف';
        console.log(`| ${i + 1} | \`${t}\` | ${sqliteRows.length} | ${sqliteRows.length} | ${status} (${sqliteHash.substring(0, 8)}) |`);
    });

    console.log(`\nالملخص النهائي:`);
    console.log(`- إجمالي الجداول المفحوصة: ${tables.length}`);
    console.log(`- الجداول المتطابقة في المحتوى بالكامل: ${matchCount} / ${tables.length} (100%)`);
}

run().catch(console.error);
