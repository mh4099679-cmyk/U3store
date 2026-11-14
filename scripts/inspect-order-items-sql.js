const fs = require('fs');
const content = fs.readFileSync('src/app/api/checkout/route.ts', 'utf8');

const idx = content.indexOf('INSERT INTO order_items');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 800));
} else {
  console.log('INSERT INTO order_items not found');
}

