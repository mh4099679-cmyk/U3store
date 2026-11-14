const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));
  db.run("UPDATE admin_permissions SET name_ar = 'إدارة إعدادات المتجر', name_en = 'Manage Store Settings' WHERE id = 'perm-settings'");
  const data = db.export();
  fs.writeFileSync('data/u3store.sqlite', Buffer.from(data));
  console.log("Updated admin_permissions in SQLite database successfully.");
  fs.unlinkSync('update_perm.js');
})();

