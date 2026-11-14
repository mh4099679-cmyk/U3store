const fs = require('fs');
const initSqlJs = require('sql.js');
const { execSync } = require('child_process');

async function compareDatabases() {
  const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlJs({ wasmBinary });
  const sqliteDb = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

  // Get all SQLite tables
  const tablesRes = sqliteDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const tables = tablesRes[0].values.map(v => v[0]);

  // Query MySQL table counts via PHP script
  const phpScript = `
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '');
    $counts = [];
    foreach (${JSON.stringify(tables)} as $t) {
        $c = $pdo->query("SELECT COUNT(*) FROM \`$t\`")->fetchColumn();
        $counts[$t] = (int)$c;
    }
    echo json_encode($counts);
  `;

  fs.writeFileSync('scripts/tmp_mysql_counts.php', '<?php ' + phpScript);
  const mysqlOutput = execSync('php scripts/tmp_mysql_counts.php', { encoding: 'utf8' });
  const mysqlCounts = JSON.parse(mysqlOutput);
  fs.unlinkSync('scripts/tmp_mysql_counts.php');

  console.log(`| # | اسم الجدول (Table Name) | عدد السجلات في SQLite | عدد السجلات في MySQL | النتيجة (Match) |`);
  console.log(`|---|---|---|---|---|`);

  let matchCount = 0;
  let totalSqliteRows = 0;
  let totalMysqlRows = 0;

  tables.forEach((t, i) => {
    const sRes = sqliteDb.exec(`SELECT COUNT(*) FROM \`${t}\`;`);
    const sCount = sRes[0].values[0][0];
    const mCount = mysqlCounts[t] !== undefined ? mysqlCounts[t] : 'MISSING';
    const isMatch = sCount === mCount;
    if (isMatch) matchCount++;
    totalSqliteRows += sCount;
    totalMysqlRows += (typeof mCount === 'number' ? mCount : 0);

    console.log(`| ${i + 1} | \`${t}\` | ${sCount} | ${mCount} | ${isMatch ? '✅ متطابق' : '❌ اختلاف'} |`);
  });

  console.log(`\nالملخص:`);
  console.log(`- إجمالي الجداول: ${tables.length}`);
  console.log(`- الجداول المتطابقة تماماً: ${matchCount} / ${tables.length}`);
  console.log(`- إجمالي سجلات SQLite: ${totalSqliteRows}`);
  console.log(`- إجمالي سجلات MySQL: ${totalMysqlRows}`);
}

compareDatabases().catch(console.error);

