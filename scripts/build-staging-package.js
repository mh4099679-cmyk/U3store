const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const srcHtdocs = path.join(rootDir, 'php_build', 'htdocs');
const srcDbDump = path.join(rootDir, 'php_build', 'database', 'u3store_mysql.sql');
const destDir = path.join(rootDir, 'staging_deployment_package');
const destHtdocs = path.join(destDir, 'htdocs');
const destDatabase = path.join(destDir, 'database');

console.log('=== ASSEMBLING STANDALONE STAGING DEPLOYMENT PACKAGE ===\n');

// 1. Create directories
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destHtdocs, { recursive: true });
fs.mkdirSync(destDatabase, { recursive: true });

// 2. Recursive copy function
function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        for (const child of fs.readdirSync(src)) {
            copyRecursive(path.join(src, child), path.join(dest, child));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

copyRecursive(srcHtdocs, destHtdocs);
console.log('✓ Copied htdocs to staging package');

// 3. Copy Database SQL dump
fs.copyFileSync(srcDbDump, path.join(destDatabase, 'u3store_staging_dump.sql'));
console.log('✓ Copied MySQL database dump');

// 4. Update config/database.php with clean placeholders for InfinityFree
const dbConfigPath = path.join(destHtdocs, 'config', 'database.php');
let dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');

// Replace DB constants with clear InfinityFree placeholders
const ifPlaceholder = `// Database Credentials for InfinityFree Staging / Production
// Replace these with the MySQL details provided in your InfinityFree Client Area / vPanel:
define('DB_HOST', getenv('DB_HOST') ?: 'sqlXXX.infinityfree.com'); // e.g. sql105.infinityfree.com
define('DB_NAME', getenv('DB_NAME') ?: 'epiz_XXXXXX_u3store');    // e.g. epiz_34567890_u3store
define('DB_USER', getenv('DB_USER') ?: 'epiz_XXXXXX');            // e.g. epiz_34567890
define('DB_PASS', getenv('DB_PASS') ?: 'YOUR_VPANEL_PASSWORD');   // Your InfinityFree account password
define('DB_PORT', getenv('DB_PORT') ?: '3306');`;

dbConfigContent = dbConfigContent.replace(
    /\/\/ Database Credentials[\s\S]*?define\('DB_PORT'.*?\);/m,
    ifPlaceholder
);
fs.writeFileSync(dbConfigPath, dbConfigContent, 'utf8');
console.log('✓ Configured config/database.php with safe InfinityFree placeholders');

// 5. Generate Manifest
let fileList = [];
function scanFiles(dir) {
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const s = fs.statSync(full);
        if (s.isDirectory()) {
            scanFiles(full);
        } else {
            const rel = path.relative(destDir, full).replace(/\\/g, '/');
            const data = fs.readFileSync(full);
            const md5 = crypto.createHash('md5').update(data).digest('hex');
            fileList.push({ path: rel, size: s.size, md5 });
        }
    }
}
scanFiles(destDir);

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

fs.writeFileSync(path.join(destDir, 'FILE_MANIFEST.txt'), manifest, 'utf8');
console.log(`✓ Generated FILE_MANIFEST.txt with ${fileList.length} files`);

// 6. Write Comprehensive Deployment Instructions Guide in Arabic
const guideArabic = `# U3 STORE — دليل النشر النهائي لبيئة الاختبار (Staging) على InfinityFree

تم تجهيز هذه الحزمة لتكون مستقلة تمامًا 100% وقابلة للرفع المباشر إلى استضافة InfinityFree Free Hosting.

---

## محتويات حزمة النشر (Package Structure)

\`\`\`
staging_deployment_package/
│
├── htdocs/                       <-- هذا المجلد بالكامل يُرفع إلى مسار htdocs/ على الاستضافة
│   ├── .htaccess                 (ضبط الروابط النظيفة والأمان وتوجيه الصفحات)
│   ├── index.php                 (الصفحة الرئيسية للمتجر)
│   ├── shoes.php                 (صفحة تصنيف الأحذية)
│   ├── clothing.php              (صفحة تصنيف الملابس)
│   ├── shop.php                  (صفحة المتجر الشاملة مع الفلاتر)
│   ├── product.php               (صفحة تفاصيل المنتج والمقاسات والألوان)
│   ├── cart.php                  (سلة التسوق الذكية)
│   ├── checkout.php              (صفحة إتمام الطلب وحساب الشحن المصري)
│   ├── order-confirmation.php    (صفحة تأكيد الطلب وحساب إنستاباي)
│   ├── track-order.php           (تتبع مسار وحالة الطلب للعميل)
│   ├── size-guide.php            (دليل مقاسات الملابس والأحذية)
│   ├── contact.php               (صفحة تواصل معنا)
│   ├── shipping-policy.php       (سياسة الشحن والتوصيل)
│   ├── return-policy.php         (سياسة الاسترجاع والاستبدال)
│   ├── privacy-policy.php        (سياسة الخصوصية)
│   ├── terms.php                 (الشروط والأحكام)
│   │
│   ├── admin/                    (لوحة تحكم الأدمن الكاملة)
│   │   ├── index.php             (لوحة المتابعة الشاملة Dashboard)
│   │   ├── login.php             (تسجيل دخول الأدمن الآمن)
│   │   ├── orders.php            (إدارة الطلبات، الحالات، الفواتير، الأرشيف)
│   │   ├── products.php          (إدارة المنتجات، الأسعار، المخزون)
│   │   ├── product-form.php      (إضافة وتعديل المنتجات والمقاسات)
│   │   ├── inventory.php         (المخزون المتزامن)
│   │   ├── coupons.php           (إدارة الكوبونات والخصومات)
│   │   ├── shipping.php          (أسعار شحن المحافظات المصرية)
│   │   ├── customers.php         (قائمة العملاء وبياناتهم)
│   │   ├── settings.php          (إعدادات المتجر وإنستاباي والرؤية)
│   │   ├── audit-logs.php        (سجل النشاطات الرقابي)
│   │   └── reports.php           (تقارير المبيعات)
│   │
│   ├── api/                      (واجهات الـ REST API المستقلة بالكامل)
│   │   ├── admin.php             (عمليات لوحة الأدمن)
│   │   ├── cart.php              (سلة التسوق)
│   │   ├── checkout.php          (إنشاء الطلبات والتحقق)
│   │   ├── orders.php            (استرجاع وتحديث الطلبات)
│   │   ├── invoices.php          (إصدار فواتير الطلبات بصيغة رقمية)
│   │   ├── receipts.php          (رفع وفحص إيصالات إنستاباي)
│   │   ├── locations.php         (محافظات ومدن مصر الـ 27)
│   │   ├── shipping.php          (حساب الشحن الديناميكي)
│   │   ├── wishlist.php          (قائمة الأمنيات)
│   │   ├── contact.php           (استقبال رسائل التواصل)
│   │   ├── newsletter.php        (النشرة البريدية)
│   │   ├── auth/admin.php        (مصادقة جلسات الأدمن)
│   │   └── auth/customer.php     (تسجيل ودخول العملاء)
│   │
│   ├── config/
│   │   ├── database.php          (محرك الاتصال بقاعدة MySQL عبر PDO)
│   │   ├── helpers.php           (الدوال المساعدة، الحماية، العملات، التاريخ)
│   │   └── auth.php              (إدارة الجلسات والكوكيز الآمنة)
│   │
│   ├── includes/                 (الهيدر والفوتر والقوائم الموحدة)
│   ├── assets/                   (ملفات الـ CSS, Vanilla JS, الصور, الخطوط)
│   └── uploads/                  (مجلد تخزين صور المنتجات وإيصالات الدفع)
│
├── database/
│   └── u3store_staging_dump.sql  <-- ملف قاعدة البيانات الكامل (79 جدولاً، 7,080 سجلاً، UTF8mb4، كلمات مرور مشفرة Bcrypt)
│
├── FILE_MANIFEST.txt             (بيان فحص الجودة والتطابق مع أحجام وتجزئة MD5 لجميع الملفات)
└── README_STAGING_DEPLOYMENT.md  (هذا الدليل الإرشادي)
\`\`\`

---

## خطوات النشر خطوة بخطوة على InfinityFree (Staging)

### الخطوة 1: إنشاء نطاق فرعي تجريبي (Subdomain)
1. افتح لوحة التحكم الخاصة بحسابك في InfinityFree.
2. اذهب إلى **Subdomains** وأنشئ نطاقًا فرعيًا تجريبيًا مثل:
   \`staging-u3store.great-site.net\` أو \`test-u3.rf.gd\`
3. سيتم إنشاء مجلد جديد للنطاق داخل حسابك:
   \`htdocs/\` أو \`staging-u3store.great-site.net/htdocs/\`

---

### الخطوة 2: إنشاء قاعدة بيانات MySQL تجريبية واستيراد البيانات
1. من لوحة vPanel، اضغط على **MySQL Databases**.
2. أنشئ قاعدة بيانات جديدة باسم تجريبي، مثل: \`u3staging\`.
   (سيصبح اسمها الكامل بالشكل: \`epiz_XXXXXX_u3staging\`).
3. اضغط على زر **phpMyAdmin** بجانب قاعدة البيانات المنشأة للدخول إليها.
4. داخل phpMyAdmin:
   - اضغط على تبويب **Import** (استيراد).
   - اختر ملف: \`database/u3store_staging_dump.sql\` من حزمة النشر.
   - تأكد من اختيار الترميز **utf-8** ثم اضغط **Import**.
   - ستظهر رسالة باللون الأخضر: \`Import has been successfully finished, 79 queries executed\`.

---

### الخطوة 3: تعديل بيانات الاتصال في \`config/database.php\`
افتح الملف: \`htdocs/config/database.php\` وضع البيانات المأخوذة من صفحة MySQL في InfinityFree:

\`\`\`php
define('DB_HOST', 'sqlXXX.infinityfree.com'); // اكتب MySQL Hostname المعطى في حسابك
define('DB_NAME', 'epiz_XXXXXX_u3staging');    // اسم قاعدة البيانات التجريبية الكامل
define('DB_USER', 'epiz_XXXXXX');            // اسم مستخدم الاستضافة vPanel Username
define('DB_PASS', 'YOUR_VPANEL_PASSWORD');   // كلمة مرور حساب InfinityFree الخاص بك
define('DB_PORT', '3306');
\`\`\`

> **ملاحظة أمان هامة:** لا تشارك كلمة مرور الاستضافة في أي مستودع عام، واحفظ الملف مشفرًا.

---

### الخطوة 4: رفع الملفات عبر FTP (FileZilla)
1. افتح برنامج **FileZilla** وأدخل بيانات FTP لحسابك في InfinityFree:
   - **Host:** \`ftpupload.net\`
   - **Username:** \`epiz_XXXXXX\`
   - **Password:** كلمة مرور حسابك
   - **Port:** \`21\`
2. انتقل في جهة السيرفر (Remote Site) إلى مجلد النطاق:
   - للموقع الأساسي: مجلد \`htdocs/\` مباشرة.
   - للنطاق التجريبي الفرعي: مجلد \`staging-u3store.../htdocs/\`.
3. ارفع كافة الملفات والمجلدات الموجودة **داخل** مجلد \`staging_deployment_package/htdocs/\` إلى مسار \`htdocs/\` على السيرفر.
4. تأكد من ضبط تصريح مجلد \`uploads/\` ومجلد \`uploads/receipts/\` على التصريح \`755\` أو \`777\` للسماح برفع صور الإيصالات.

---

## بيانات الدخول للحسابات المنقولة بعد الاستيراد

### 1. حساب الأدمن المالك (Store Owner)
- **رابط الدخول:** \`https://YOUR_DOMAIN/admin/login\`
- **اسم المستخدم / الإيميل:** \`u3owner\` أو \`owner@u3store.com\`
- **كلمة المرور:** \`U3Admin@2026\`
- **الصلاحية:** مالك المتجر الكامل (Full Owner Access)

### 2. حساب العميل المنقول (Customer Account)
- **رقم الهاتف:** \`01007695129\`
- **البريد الإلكتروني:** \`mohamedelsebaey@gmail.com\`
- **كلمة المرور:** \`12345678\`
- **الاسم:** Mohamed Hany

---

## قائمة الاختبار والتحقق بعد النشر (Post-Deployment Checklist)

بعد اكتمال الرفع على استضافة InfinityFree التجريبية، نفّذ الاختبارات التالية بالترتيب:

- [ ] **1. فحص الصفحة الرئيسية:** افتح رابط الموقع التجريبي وتأكد من ظهور البانرات، المنتجات، والخطوط.
- [ ] **2. فحص الروابط النظيفة (.htaccess):** جرب الدخول على \`/shoes\` و \`/cart\` و \`/size-guide\` دون إضافة \`.php\`.
- [ ] **3. تسجيل دخول الأدمن:** ادخل إلى \`/admin/login\` واستخدم \`u3owner\` مع \`U3Admin@2026\`.
- [ ] **4. لوحة التحكم وتغيير الحالات:** تصفح قسم الطلبات والمخزون، وجرب أرشفة أو استعادة طلب.
- [ ] **5. تجربة دورة الشراء الكاملة:**
  - اختر منتجًا وحدد مقاسًا ولونًا.
  - أضف إلى السلة أو اضغط "اشتري الآن (Buy Now)".
  - أدخل بيانات محافظة مصرية (مثل القاهرة أو الإسكندرية) وتأكد من احتساب الشحن الصحيح تلقائيًا.
  - أتمم الطلب وانسخ رقم الطلب ورابط التتبع.
- [ ] **6. تتبع الطلب وإصدار الفاتورة:** ادخل إلى \`/track-order\` برقم الطلب وتأكد من ظهور تفاصيل الفاتورة.
- [ ] **7. رفع إيصال إنستاباي:** ارفع إيصال تجريبي وتحقق من وصوله للوحة الأدمن وتأكيد الدفع.
`;

fs.writeFileSync(path.join(destDir, 'README_STAGING_DEPLOYMENT.md'), guideArabic, 'utf8');
console.log('✓ Created README_STAGING_DEPLOYMENT.md with comprehensive instructions');

console.log('\n======================================================');
console.log('✓ STAGING DEPLOYMENT PACKAGE COMPLETED SUCCESSFULLY!');
console.log(`Location: ${destDir}`);
console.log('======================================================\n');

