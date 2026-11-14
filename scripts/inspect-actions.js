const fs = require('fs');
const content = fs.readFileSync('src/app/api/admin/route.ts', 'utf8');
const actions = [];
const regex = /action === ["']([^"']+)["']/g;
let match;
while ((match = regex.exec(content)) !== null) {
  actions.push(match[1]);
}
console.log('Total actions:', actions.length);
console.log(JSON.stringify(actions, null, 2));

