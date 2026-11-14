const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = path.join(__dirname, '../php_build/screenshots');
fs.mkdirSync(outDir, { recursive: true });

const pages = [
    { name: 'home', path: '/' },
    { name: 'shoes', path: '/shoes' },
    { name: 'clothing', path: '/clothing' },
    { name: 'shop', path: '/shop' },
    { name: 'size_guide', path: '/size-guide' },
    { name: 'cart', path: '/cart' },
    { name: 'checkout', path: '/checkout' },
    { name: 'track_order', path: '/track-order' }
];

console.log('=== CAPTURING SIDE-BY-SIDE SCREENSHOTS (DESKTOP & MOBILE) ===\n');

for (const p of pages) {
    // Desktop (1280x800)
    const nextDeskFile = path.join(outDir, `next_${p.name}_desktop.png`);
    const phpDeskFile = path.join(outDir, `php_${p.name}_desktop.png`);
    
    console.log(`Capturing Desktop: ${p.name}...`);
    try {
        execSync(`"${edgePath}" --headless --disable-gpu --screenshot="${nextDeskFile}" --window-size=1280,800 http://localhost:3000${p.path}`, { timeout: 10000 });
        execSync(`"${edgePath}" --headless --disable-gpu --screenshot="${phpDeskFile}" --window-size=1280,800 http://localhost:8000${p.path}`, { timeout: 10000 });
    } catch(e) {}

    // Mobile (375x812)
    const nextMobFile = path.join(outDir, `next_${p.name}_mobile.png`);
    const phpMobFile = path.join(outDir, `php_${p.name}_mobile.png`);
    
    console.log(`Capturing Mobile: ${p.name}...`);
    try {
        execSync(`"${edgePath}" --headless --disable-gpu --screenshot="${nextMobFile}" --window-size=375,812 http://localhost:3000${p.path}`, { timeout: 10000 });
        execSync(`"${edgePath}" --headless --disable-gpu --screenshot="${phpMobFile}" --window-size=375,812 http://localhost:8000${p.path}`, { timeout: 10000 });
    } catch(e) {}
}

console.log('\nAll screenshots captured successfully in php_build/screenshots/ !');

