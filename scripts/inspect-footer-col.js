const fs = require('fs');
const initSqlJs = require('sql.js');

async function checkFooter() {
  const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));
  const res = db.exec("PRAGMA table_info('footer_settings');");
  console.log(JSON.stringify(res[0].values.filter(c => c[1] === 'maps_embed_url'), null, 2));
}

checkFooter();

