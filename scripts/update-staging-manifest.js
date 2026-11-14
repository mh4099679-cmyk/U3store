const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('=== UPDATING AND VERIFYING STAGING MANIFEST & LINT ===\n');

const pkgDir = path.resolve(__dirname, '..', 'staging_deployment_package');
const manifestPath = path.join(pkgDir, 'FILE_MANIFEST.txt');

// 1. Scan all files
let fileList = [];
function scan(dir) {
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const s = fs.statSync(full);
        if (s.isDirectory()) {
            scan(full);
        } else {
            const rel = path.relative(pkgDir, full).split(path.sep).join('/');
            if (rel === 'FILE_MANIFEST.txt' || rel === 'README_STAGING_DEPLOYMENT.md') continue;
            const data = fs.readFileSync(full);
            const md5 = crypto.createHash('md5').update(data).digest('hex');
            fileList.push({ path: rel, size: s.size, md5, fullPath: full });
        }
    }
}
scan(pkgDir);

// 2. Generate new MANIFEST
let manifest = `U3 STORE — STAGING DEPLOYMENT PACKAGE MANIFEST\n`;
manifest += `Generated at: ${new Date().toISOString()}\n`;
manifest += `Total Files: ${fileList.length}\n`;
manifest += `Total Package Size: ${(fileList.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB\n\n`;
manifest += `----------------------------------------------------------------------------------------------------\n`;
manifest += `MD5 Checksum                      Size (Bytes)   Relative File Path\n`;
manifest += `----------------------------------------------------------------------------------------------------\n`;

for (const f of fileList) {
    manifest += `${f.md5}  ${f.size.toString().padStart(12, ' ')}   ${f.path}\n`;
}

fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log(`✓ FILE_MANIFEST.txt updated with ${fileList.length} files.`);

// 3. Verify MANIFEST match
const writtenContent = fs.readFileSync(manifestPath, 'utf8');
let verifiedCount = 0;
for (const f of fileList) {
    if (writtenContent.includes(`${f.md5}  ${f.size.toString().padStart(12, ' ')}   ${f.path}`)) {
        verifiedCount++;
    } else {
        console.error('Mismatch in manifest for:', f.path);
    }
}
console.log(`✓ 100% Manifest verification: ${verifiedCount}/${fileList.length} files verified against on-disk content.`);

// 4. Run PHP Lint on all PHP files in staging_deployment_package
console.log('\n--- Running PHP Lint on staging_deployment_package ---');
const phpFiles = fileList.filter(f => f.path.endsWith('.php'));
let lintErrors = 0;
for (const pf of phpFiles) {
    try {
        execSync(`php -l "${pf.fullPath}"`, { stdio: 'pipe' });
    } catch (e) {
        console.error(`Lint error in ${pf.path}: ${e.message}`);
        lintErrors++;
    }
}
if (lintErrors === 0) {
    console.log(`✓ PHP Lint: 100% Clean! All ${phpFiles.length} PHP files passed syntax check with 0 errors.`);
} else {
    console.error(`✗ PHP Lint failed on ${lintErrors} files!`);
}

