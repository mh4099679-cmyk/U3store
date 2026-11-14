const fs = require('fs');
const content = fs.readFileSync('src/app/api/admin/route.ts', 'utf8');

const resources = [];
const resRegex = /resource === ["']([^"']+)["']/g;
let m;
while ((m = resRegex.exec(content)) !== null) {
  resources.push(m[1]);
}
console.log('Resources found:', resources);

