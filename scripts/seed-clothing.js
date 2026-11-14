const fs = require('fs');
const initSqlJs = require('sql.js');

async function seedClothing() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/u3store.sqlite'));
  const now = new Date().toISOString();

  const defaultClothingCollections = [
    {
      id: "col-tshirts",
      slug: "t-shirts",
      name_en: "T-Shirts & Tops",
      name_ar: "تيشيرتات وتوبات",
      description_en: "Heavyweight cotton oversized tees and iconic minimalist prints.",
      description_ar: "تيشيرتات قطنية أوفر سايز بطباعات مينيمال حصرية وعصرية.",
      banner: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
      sort: 1,
    },
    {
      id: "col-hoodies",
      slug: "hoodies",
      name_en: "Hoodies & Sweatshirts",
      name_ar: "هوديز وسويت شيرتات",
      description_en: "Warm premium fleece streetwear hoodies engineered for everyday styling.",
      description_ar: "هوديز وسويت شيرتات ميلتون فاخرة بتطريز وقصات ستريت وير مريحة.",
      banner: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=80",
      sort: 2,
    },
    {
      id: "col-streetwear-essentials",
      slug: "streetwear-essentials",
      name_en: "Streetwear Essentials",
      name_ar: "أساسيات الستريت وير",
      description_en: "Signature lifestyle pieces, pants, and layering layers.",
      description_ar: "قطع أساسية من بنطلونات وأزياء الشارع المصممة لتكمل إطلالتك.",
      banner: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80",
      sort: 3,
    },
  ];

  for (const c of defaultClothingCollections) {
    db.run(
      `INSERT OR IGNORE INTO collections (id, slug, name_en, name_ar, description_en, description_ar, banner_desktop_url, product_type, show_on_homepage, homepage_sort_order, is_active, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CLOTHING', 1, ?, 1, ?, ?)`,
      [c.id, c.slug, c.name_en, c.name_ar, c.description_en, c.description_ar, c.banner, c.sort, c.sort, now]
    );
  }

  // Also check if any sample clothing product exists, if not, add 1 real authentic clothing product with variants and real inventory
  // so the clothing section is immediately testable and beautiful!
  const clothingCount = db.exec("SELECT COUNT(*) FROM products WHERE product_type = 'CLOTHING'")[0].values[0][0];
  if (clothingCount === 0) {
    const prdId = "prd-u3-oversized-tee-black";
    const slug = "u3-oversized-heavyweight-tee";
    db.run(
      `INSERT INTO products (id, slug, product_type, collection_id, brand, material_en, material_ar, regular_price, sale_price, status, is_featured, is_new_arrival, is_best_seller, size_guide_en, size_guide_ar, created_at, updated_at)
       VALUES (?, ?, 'CLOTHING', 'col-tshirts', 'U3 STORE', '100% Heavyweight Egyptian Cotton (280 GSM)', 'قطن مصري ثقيل 100% فاخر (280 جرام)', 850, 750, 'ACTIVE', 1, 1, 1, 'True to size oversized fit. Size down for regular fit.', 'قصة أوفر سايز واسعة وعصرية، اختر مقاسك المعتاد.', ?, ?)`,
      [prdId, slug, now, now]
    );
    db.run(
      `INSERT INTO product_translations (product_id, lang, name, description) VALUES (?, 'en', ?, ?)`,
      [prdId, "U3 Heavyweight Oversized Tee — Deep Black", "Premium 280 GSM pure combed Egyptian cotton streetwear tee. Boxy relaxed drape, reinforced ribbed collar, with subtle tonal signature U3 branding."]
    );
    db.run(
      `INSERT INTO product_translations (product_id, lang, name, description) VALUES (?, 'ar', ?, ?)`,
      [prdId, "تيشيرت U3 أوفر سايز قطن ثقيل — أسود فاحم", "تيشيرت ستريت وير مصنوع من أجود أنواع القطن المصري الممشط بوزن 280 جرام. قصة أوفر سايز عصرية وياقة مقواة ومريحة مع لمسات U3 الفاخرة."]
    );
    // Images
    db.run(
      `INSERT INTO product_images (id, product_id, url, alt_en, alt_ar, is_main, sort_order, created_at)
       VALUES ('img-tee-1', ?, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', 'U3 Heavyweight Oversized Tee Front', 'تيشيرت U3 أوفر سايز أمامي', 1, 1, ?)`,
      [prdId, now]
    );
    db.run(
      `INSERT INTO product_images (id, product_id, url, alt_en, alt_ar, is_main, sort_order, created_at)
       VALUES ('img-tee-2', ?, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80', 'U3 Heavyweight Oversized Tee Back', 'تيشيرت U3 أوفر سايز خلفي', 0, 2, ?)`,
      [prdId, now]
    );
    // Clothing Variants: Black S, M, L, XL with inventory!
    const variants = [
      { size: "S", sku: "U3-TEE-BLK-S", stock: 6 },
      { size: "M", sku: "U3-TEE-BLK-M", stock: 10 },
      { size: "L", sku: "U3-TEE-BLK-L", stock: 8 },
      { size: "XL", sku: "U3-TEE-BLK-XL", stock: 5 },
    ];
    for (const v of variants) {
      const varId = `var-tee-${v.size.toLowerCase()}`;
      db.run(
        `INSERT INTO product_variants (id, product_id, sku, size, color_en, color_ar, color_hex, allow_backorder, is_active, created_at)
         VALUES (?, ?, ?, ?, 'Deep Black', 'أسود فاحم', '#111214', 0, 1, ?)`,
        [varId, prdId, v.sku, v.size, now]
      );
      db.run(
        `INSERT INTO inventory (variant_id, on_hand, reserved, sold, returned, damaged, low_stock_threshold, updated_at)
         VALUES (?, ?, 0, 0, 0, 0, 2, ?)`,
        [varId, v.stock, now]
      );
    }

    // Add a second clothing product: Hoodie
    const hoodieId = "prd-u3-minimalist-hoodie";
    const hoodieSlug = "u3-signature-minimalist-hoodie";
    db.run(
      `INSERT INTO products (id, slug, product_type, collection_id, brand, material_en, material_ar, regular_price, sale_price, status, is_featured, is_new_arrival, is_best_seller, size_guide_en, size_guide_ar, created_at, updated_at)
       VALUES (?, ?, 'CLOTHING', 'col-hoodies', 'U3 STORE', 'Premium Brushed Fleece Cotton (380 GSM)', 'ميلتون قطني مبطن فاخر (380 جرام)', 1450, 1290, 'ACTIVE', 1, 1, 0, 'Relaxed streetwear fit. Ribbed hem and cuffs.', 'قصة ستريت وير مريحة مع حواف وأساور مضلعة مرنة.', ?, ?)`,
      [hoodieId, hoodieSlug, now, now]
    );
    db.run(
      `INSERT INTO product_translations (product_id, lang, name, description) VALUES (?, 'en', ?, ?)`,
      [hoodieId, "U3 Signature Minimalist Hoodie — Heather Charcoal", "Ultra-dense 380 GSM brushed fleece streetwear hoodie. Double-layered hood, hidden side seam pockets, and heavyweight metal drawcord aglets."]
    );
    db.run(
      `INSERT INTO product_translations (product_id, lang, name, description) VALUES (?, 'ar', ?, ?)`,
      [hoodieId, "هودي U3 سيجنتشر مينيمال — رمادي شاركول", "هودي ستريت وير مصنوع من الميلتون القطني الثقيل بوزن 380 جرام مع بطانة ناعمة ودافئة، كابيشون مزدوج الطبقة وجيوب جانبية مخفية."]
    );
    db.run(
      `INSERT INTO product_images (id, product_id, url, alt_en, alt_ar, is_main, sort_order, created_at)
       VALUES ('img-hoodie-1', ?, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80', 'U3 Signature Minimalist Hoodie', 'هودي U3 سيجنتشر مينيمال', 1, 1, ?)`,
      [hoodieId, now]
    );
    const hoodieVariants = [
      { size: "M", sku: "U3-HD-CHR-M", stock: 7 },
      { size: "L", sku: "U3-HD-CHR-L", stock: 9 },
      { size: "XL", sku: "U3-HD-CHR-XL", stock: 4 },
    ];
    for (const v of hoodieVariants) {
      const varId = `var-hd-${v.size.toLowerCase()}`;
      db.run(
        `INSERT INTO product_variants (id, product_id, sku, size, color_en, color_ar, color_hex, allow_backorder, is_active, created_at)
         VALUES (?, ?, ?, ?, 'Heather Charcoal', 'رمادي شاركول', '#2A2C30', 0, 1, ?)`,
        [varId, hoodieId, v.sku, v.size, now]
      );
      db.run(
        `INSERT INTO inventory (variant_id, on_hand, reserved, sold, returned, damaged, low_stock_threshold, updated_at)
         VALUES (?, ?, 0, 0, 0, 0, 2, ?)`,
        [varId, v.stock, now]
      );
    }
  }

  fs.writeFileSync('data/u3store.sqlite', Buffer.from(db.export()));
  console.log('Seeded clothing collections and products successfully!');
}

seedClothing().catch(console.error);

