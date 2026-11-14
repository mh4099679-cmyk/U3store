const fs = require('fs');
const content = fs.readFileSync('src/lib/services/commerce.ts', 'utf8');

const idx = content.indexOf('function calculateShippingServer');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1800));
} else {
  console.log('calculateShippingServer not found');
}

