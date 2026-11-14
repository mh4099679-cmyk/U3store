const fs = require('fs');
const lines = fs.readFileSync('src/app/api/admin/route.ts', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes("save_product") || l.includes("save_collection") || l.includes("save_store_settings")) {
    console.log(i + ': ' + l);
  }
});
