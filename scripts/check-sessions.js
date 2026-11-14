const fs = require('fs');
const initSqlJs = require('sql.js');

async function run() {
  const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

  const s = db.exec("SELECT id, subject_type, subject_id, expires_at FROM auth_sessions WHERE subject_type = 'ADMIN'");
  console.log('Admin sessions in sqlite:', s[0] ? s[0].values : 'None');
  console.log('Now:', new Date().toISOString());
}

run();

