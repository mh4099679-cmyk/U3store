const fs = require('fs');
const initSqlJs = require('sql.js');

async function test() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));
  
  // Apply our migrations directly on the backup/sqlite if needed
  const dualCategoryMigrations = [
    "ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT 'SHOES';",
    "ALTER TABLE products ADD COLUMN brand TEXT DEFAULT 'U3';",
    "ALTER TABLE products ADD COLUMN material_en TEXT DEFAULT '';",
    "ALTER TABLE products ADD COLUMN material_ar TEXT DEFAULT '';",
    "ALTER TABLE collections ADD COLUMN product_type TEXT NOT NULL DEFAULT 'SHOES';",
    "ALTER TABLE collections ADD COLUMN show_on_homepage INTEGER NOT NULL DEFAULT 1;",
    "ALTER TABLE collections ADD COLUMN homepage_sort_order INTEGER NOT NULL DEFAULT 0;",
    "ALTER TABLE order_items ADD COLUMN product_type_snapshot TEXT DEFAULT 'SHOES';",
    "ALTER TABLE store_settings ADD COLUMN visible_categories TEXT NOT NULL DEFAULT 'BOTH';",
    "ALTER TABLE store_settings ADD COLUMN shop_by_category_enabled INTEGER NOT NULL DEFAULT 1;",
    "ALTER TABLE store_settings ADD COLUMN category_shoes_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80';",
    "ALTER TABLE store_settings ADD COLUMN category_clothing_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80';",
    "ALTER TABLE store_settings ADD COLUMN category_shoes_title_en TEXT DEFAULT 'SHOES';",
    "ALTER TABLE store_settings ADD COLUMN category_shoes_title_ar TEXT DEFAULT 'أحذية';",
    "ALTER TABLE store_settings ADD COLUMN category_clothing_title_en TEXT DEFAULT 'CLOTHING';",
    "ALTER TABLE store_settings ADD COLUMN category_clothing_title_ar TEXT DEFAULT 'ملابس';",
    "ALTER TABLE store_settings ADD COLUMN category_shoes_link TEXT DEFAULT '/shoes';",
    "ALTER TABLE store_settings ADD COLUMN category_clothing_link TEXT DEFAULT '/clothing';",
    "ALTER TABLE store_settings ADD COLUMN homepage_shoes_enabled INTEGER NOT NULL DEFAULT 1;",
    "ALTER TABLE store_settings ADD COLUMN homepage_clothing_enabled INTEGER NOT NULL DEFAULT 1;",
    "ALTER TABLE store_settings ADD COLUMN homepage_shoes_title_en TEXT DEFAULT 'SHOES COLLECTION';",
    "ALTER TABLE store_settings ADD COLUMN homepage_shoes_title_ar TEXT DEFAULT 'تشكيلة الأحذية';",
    "ALTER TABLE store_settings ADD COLUMN homepage_clothing_title_en TEXT DEFAULT 'CLOTHING COLLECTION';",
    "ALTER TABLE store_settings ADD COLUMN homepage_clothing_title_ar TEXT DEFAULT 'تشكيلة الملابس';",
    "ALTER TABLE store_settings ADD COLUMN homepage_shoes_desc_en TEXT DEFAULT 'Engineered for performance and streetwear culture.';",
    "ALTER TABLE store_settings ADD COLUMN homepage_shoes_desc_ar TEXT DEFAULT 'تصاميم استثنائية وثقافة ستريت وير أصلية.';",
    "ALTER TABLE store_settings ADD COLUMN homepage_clothing_desc_en TEXT DEFAULT 'Modern streetwear essentials crafted for comfort and style.';",
    "ALTER TABLE store_settings ADD COLUMN homepage_clothing_desc_ar TEXT DEFAULT 'أساسيات الستريت وير الحديثة لأناقة وراحة فائقة.';",
    "ALTER TABLE store_settings ADD COLUMN homepage_carousel_limit INTEGER NOT NULL DEFAULT 12;",
  ];

  for (const m of dualCategoryMigrations) {
    try {
      db.run(m);
    } catch (e) {
      // column probably already exists
    }
  }

  db.run("UPDATE products SET product_type = 'SHOES' WHERE product_type IS NULL OR product_type = ''");
  db.run("UPDATE collections SET product_type = 'SHOES' WHERE product_type IS NULL OR product_type = ''");

  // Save back to data/u3store.sqlite
  fs.writeFileSync('data/u3store.sqlite', Buffer.from(db.export()));
  console.log('Migrations executed successfully on data/u3store.sqlite!');
}

test().catch(console.error);

