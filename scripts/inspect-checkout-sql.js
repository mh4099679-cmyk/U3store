const fs = require('fs');
const content = fs.readFileSync('src/app/api/checkout/route.ts', 'utf8');

const idx = content.indexOf('INSERT INTO orders');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1200));
} else {
  console.log('INSERT INTO orders not found');
}

