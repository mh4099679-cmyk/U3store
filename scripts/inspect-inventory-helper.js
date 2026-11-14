const fs = require('fs');
const content = fs.readFileSync('src/app/api/admin/route.ts', 'utf8');

function extractBlock(keyword) {
  const idx = content.indexOf(keyword);
  if (idx === -1) return 'NOT FOUND';
  return content.slice(idx, idx + 2000);
}

console.log('--- commitOrderInventory ---');
console.log(extractBlock('function commitOrderInventory'));
console.log('--- releaseOrRollbackOrderInventory ---');
console.log(extractBlock('function releaseOrRollbackOrderInventory'));

