const fs = require('fs');
const initSqlJs = require('sql.js');
const { execSync } = require('child_process');

async function check() {
    const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ wasmBinary });
    const sqliteDb = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

    const sRes = sqliteDb.exec("SELECT * FROM collections WHERE id='col-mw0v4jqk-e4f3b4a0cac9'");
    console.log('SQLite row:');
    console.log(sRes[0].columns);
    console.log(sRes[0].values[0]);

    const phpScript = `
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u3store;charset=utf8mb4', 'root', '');
    $row = $pdo->query("SELECT * FROM collections WHERE id='col-mw0v4jqk-e4f3b4a0cac9'")->fetch(PDO::FETCH_ASSOC);
    echo json_encode($row);
    `;
    fs.writeFileSync('scripts/tmp_cmp.php', '<?php ' + phpScript);
    const mOut = execSync('php scripts/tmp_cmp.php', { encoding: 'utf8' });
    fs.unlinkSync('scripts/tmp_cmp.php');
    console.log('MySQL row:');
    console.log(JSON.parse(mOut));
}
check();

