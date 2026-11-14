const fs = require('fs');
const content = fs.readFileSync('src/app/api/admin/route.ts', 'utf8');

function showResource(resName) {
  const start = content.indexOf(`resource === "${resName}"`);
  if (start === -1) return `${resName}: not found`;
  const nextRes = content.indexOf(`resource === "`, start + 30);
  const end = nextRes === -1 ? content.indexOf(`return NextResponse.json({ ok: false, error: "Unknown resource"`) : nextRes;
  return content.slice(start, end).slice(0, 1500);
}

console.log('--- catalog ---');
console.log(showResource('catalog'));

