const fs = require('fs');
const initSqlJs = require('sql.js');

async function run() {
  const wasmBinary = fs.readFileSync('node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));

  const o = db.exec("SELECT id, order_number, order_status, payment_status, inventory_deducted FROM orders WHERE order_number = 'U3-20261108-00022'");
  console.log('Order:', JSON.stringify(o[0] ? o[0].values : 'Not found'));

  const items = db.exec("SELECT id, sku_snapshot, size_snapshot, variant_id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_number = 'U3-20261108-00022')");
  console.log('Items:', JSON.stringify(items[0] ? items[0].values : 'None'));

  const history = db.exec("SELECT status_type, previous_status, new_status, note FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE order_number = 'U3-20261108-00022')");
  console.log('History:', JSON.stringify(history[0] ? history[0].values : 'None'));

  const mov = db.exec("SELECT variant_id, movement_type, previous_on_hand, new_on_hand, reason FROM inventory_movements WHERE related_order_id IN (SELECT id FROM orders WHERE order_number = 'U3-20261108-00022')");
  console.log('Movements:', JSON.stringify(mov[0] ? mov[0].values : 'None'));
}

run();

