import fs from "fs";
import path from "path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { SCHEMA_SQL } from "./schema";
import {
  EGYPT_GOVERNORATES,
  ROLES_SEED,
  PERMISSIONS_SEED,
  ROLE_PERMISSION_MAP,
  INITIAL_WEBSITE_SECTIONS,
  INITIAL_WEBSITE_PAGES,
  INITIAL_WHATSAPP_TEMPLATES,
  hashPasswordSync,
} from "./seed-data";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "u3store.sqlite");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const LATEST_BACKUP_PATH = path.join(BACKUP_DIR, "u3store_backup_latest.sqlite");

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
let dbInstance: Database | null = null;
let lastLoadedMtime = 0;
let lastTimestampedBackupTime = 0;

async function getSqlJs() {
  if (!sqlJsPromise) {
    const wasmBinaryPath = path.join(
      process.cwd(),
      "node_modules",
      "sql.js",
      "dist",
      "sql-wasm.wasm"
    );
    const wasmBinary = fs.readFileSync(wasmBinaryPath);
    sqlJsPromise = initSqlJs({ wasmBinary: wasmBinary.buffer as ArrayBuffer });
  }
  return sqlJsPromise;
}

export function persistDb(db: Database) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const binaryArray = db.export();
  const buffer = Buffer.from(binaryArray);
  const tempPath = `${DB_PATH}.tmp`;

  // 1. Atomic write to main database file
  fs.writeFileSync(tempPath, buffer);
  fs.renameSync(tempPath, DB_PATH);
  const stat = fs.statSync(DB_PATH);
  lastLoadedMtime = stat.mtimeMs;

  // 2. Continuous Safety Mirror (Always has the latest verified state)
  try {
    fs.copyFileSync(DB_PATH, LATEST_BACKUP_PATH);

    // 3. Periodic Timestamped Backups (Every hour at most to prevent loss)
    const now = Date.now();
    if (now - lastTimestampedBackupTime > 60 * 60 * 1000) {
      const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 13);
      const snapshotPath = path.join(BACKUP_DIR, `u3store_backup_${dateStr}.sqlite`);
      if (!fs.existsSync(snapshotPath)) {
        fs.copyFileSync(DB_PATH, snapshotPath);
      }
      lastTimestampedBackupTime = now;
    }
  } catch (err) {
    console.error("Backup mirror notice:", err);
  }
}

function seedBaselineOnly(db: Database) {
  const now = new Date().toISOString();

  // 1. Check if roles exist
  const roleCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM roles");
  if (!roleCount || roleCount.c === 0) {
    for (const r of ROLES_SEED) {
      runSql(
        db,
        `INSERT INTO roles (id, code, name_en, name_ar, description_en, description_ar) VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.code, r.name_en, r.name_ar, r.description_en, r.description_ar]
      );
    }
    for (const p of PERMISSIONS_SEED) {
      runSql(
        db,
        `INSERT INTO permissions (id, code, module, name_en, name_ar) VALUES (?, ?, ?, ?, ?)`,
        [p.id, p.code, p.module, p.name_en, p.name_ar]
      );
    }
    for (const [roleId, permIds] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const permId of permIds) {
        runSql(
          db,
          `INSERT INTO admin_role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleId, permId]
        );
      }
    }
  }

  // 2. Seed initial Owner Admin account if no admin exists (supports both Username and Email login)
  const adminCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM admin_users");
  if (!adminCount || adminCount.c === 0) {
    const defaultPasswordHash = hashPasswordSync("U3Admin@2026");
    runSql(
      db,
      `INSERT INTO admin_users (id, username, email, full_name, password_hash, role_id, status, preferred_language, preferred_theme, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 'en', 'light', ?)`,
      [
        "admin-owner-1",
        "u3owner",
        "owner@u3store.com",
        "U3 STORE Owner",
        defaultPasswordHash,
        "role-owner",
        now,
      ]
    );
  }

  // 3. Seed all 27 Egyptian Governorates with NULL shipping_rate (Owner configures actual prices)
  const govCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM governorates");
  if (!govCount || govCount.c === 0) {
    for (const g of EGYPT_GOVERNORATES) {
      runSql(
        db,
        `INSERT INTO governorates (id, code, name_en, name_ar, shipping_rate, express_rate, estimated_days_en, estimated_days_ar, is_enabled, sort_order)
         VALUES (?, ?, ?, ?, NULL, NULL, '2-4 Business Days', '٢-٤ أيام عمل', 1, ?)`,
        [g.id, g.code, g.name_en, g.name_ar, g.sort_order]
      );
    }
  }

  // 3b. Seed Egyptian Cities and Areas from embedded dataset if not already loaded
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_cities_gov ON cities(governorate_id)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_areas_city ON areas(city_id)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, payment_status)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_variants_active ON product_variants(is_active)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_pay_subs_order ON payment_submissions(order_id)`);
  runSql(db, `CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id)`);

  const cityCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM cities");
  if (!cityCount || cityCount.c === 0) {
    try {
      const flatPath = path.join(process.cwd(), "data", "all-flat.json");
      const shiyakhaPath = path.join(process.cwd(), "data", "all-shiyakha.json");
      if (fs.existsSync(flatPath) && fs.existsSync(shiyakhaPath)) {
        const GOV_CODE_MAP: Record<string, string> = {
          EG01: "gov-01",
          EG02: "gov-03",
          EG03: "gov-12",
          EG04: "gov-14",
          EG11: "gov-11",
          EG12: "gov-06",
          EG13: "gov-05",
          EG14: "gov-04",
          EG15: "gov-10",
          EG16: "gov-07",
          EG17: "gov-08",
          EG18: "gov-09",
          EG19: "gov-13",
          EG21: "gov-02",
          EG22: "gov-17",
          EG23: "gov-18",
          EG24: "gov-19",
          EG25: "gov-20",
          EG26: "gov-21",
          EG27: "gov-22",
          EG28: "gov-24",
          EG29: "gov-23",
          EG31: "gov-25",
          EG32: "gov-26",
          EG33: "gov-27",
          EG34: "gov-15",
          EG35: "gov-16",
        };
        const flat = JSON.parse(fs.readFileSync(flatPath, "utf8"));
        const shiyakha = JSON.parse(fs.readFileSync(shiyakhaPath, "utf8"));
        const level2 = flat.data.filter((x: any) => x.level === 2);

        for (const c of level2) {
          const govId = GOV_CODE_MAP[c.parent?.id];
          if (govId) {
            runSql(
              db,
              `INSERT OR REPLACE INTO cities (id, governorate_id, name_en, name_ar, shipping_rate, estimated_days_en, estimated_days_ar, is_enabled, created_at)
               VALUES (?, ?, ?, ?, NULL, '', '', 1, ?)`,
              [c.id, govId, c.name.en || c.name.local, c.name.local || c.name.en, now]
            );
          }
        }

        for (const a of shiyakha) {
          runSql(
            db,
            `INSERT OR REPLACE INTO areas (id, city_id, name_en, name_ar, shipping_rate, estimated_days_en, estimated_days_ar, is_enabled, created_at)
             VALUES (?, ?, ?, ?, NULL, '', '', 1, ?)`,
            [a.id, a.parent?.id, a.name.en || a.name.local, a.name.local || a.name.en, now]
          );
        }
      }
    } catch (e) {
      console.error("Failed to auto-seed administrative divisions:", e);
    }
  }

  // 4. Seed Shipping Rules row (unconfigured rates by default)
  const ruleCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM shipping_rules");
  if (!ruleCount || ruleCount.c === 0) {
    runSql(
      db,
      `INSERT INTO shipping_rules (id, free_shipping_threshold, minimum_order_value, default_shipping_rate, express_delivery_enabled, special_handling_fee, reservation_expiry_minutes, updated_at)
       VALUES ('default', NULL, 0, NULL, 0, 0, 120, ?)`,
      [now]
    );
  }

  // 5. Seed Payment Methods (InstaPay & Vodafone Cash with official default recipient info)
  const pmCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM payment_methods");
  if (!pmCount || pmCount.c === 0) {
    runSql(
      db,
      `INSERT INTO payment_methods (id, code, name_en, name_ar, is_enabled, recipient_name, receiving_account, instructions_en, instructions_ar, updated_at)
       VALUES (?, 'INSTAPAY', 'InstaPay', 'إنستاباي (InstaPay)', 1, 'U3 STORE', 'u3store@instapay', 'Transfer the exact order total via InstaPay to the official U3 STORE account above, then click "I HAVE PAID" and enter your transaction reference.', 'قم بتحويل إجمالي مبلغ الطلب عبر تطبيق إنستا باي إلى عنوان U3 STORE الموضح أعلاه، ثم ارفع صورة إيصال التحويل واضغط تأكيد.', ?)`,
      ["pm-instapay", now]
    );
    runSql(
      db,
      `INSERT INTO payment_methods (id, code, name_en, name_ar, is_enabled, recipient_name, receiving_account, instructions_en, instructions_ar, updated_at)
       VALUES (?, 'VODAFONE_CASH', 'Vodafone Cash', 'فودافون كاش (Vodafone Cash)', 1, 'U3 STORE', '01000000000', 'Transfer the exact order total to the official Vodafone Cash wallet number above, then click "I HAVE PAID" and enter the sender number and reference.', 'قم بتحويل إجمالي مبلغ الطلب إلى رقم محفظة فودافون كاش الموضح أعلاه، ثم ارفع صورة إيصال التحويل واضغط تأكيد.', ?)`,
      ["pm-vodafone", now]
    );
  } else {
    // If seeded with empty strings, ensure default recipient values are available
    runSql(
      db,
      `UPDATE payment_methods SET recipient_name = 'U3 STORE' WHERE (recipient_name IS NULL OR recipient_name = '')`
    );
    runSql(
      db,
      `UPDATE payment_methods SET receiving_account = 'u3store@instapay' WHERE code = 'INSTAPAY' AND (receiving_account IS NULL OR receiving_account = '')`
    );
    runSql(
      db,
      `UPDATE payment_methods SET receiving_account = '01000000000' WHERE code = 'VODAFONE_CASH' AND (receiving_account IS NULL OR receiving_account = '')`
    );
  }

  // 6. Seed Store Settings & Appearance Settings & WhatsApp Settings/Templates
  const settingsCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM store_settings");
  if (!settingsCount || settingsCount.c === 0) {
    runSql(
      db,
      `INSERT INTO store_settings (id, updated_at) VALUES ('default', ?)`,
      [now]
    );
  }

  const appCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM appearance_settings");
  if (!appCount || appCount.c === 0) {
    runSql(
      db,
      `INSERT INTO appearance_settings (id, updated_at) VALUES ('default', ?)`,
      [now]
    );
  }

  const waSettingsCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM whatsapp_settings");
  if (!waSettingsCount || waSettingsCount.c === 0) {
    const hasEnv = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    runSql(
      db,
      `INSERT INTO whatsapp_settings (id, is_enabled, provider, phone_number_id, waba_id, connection_status, webhook_status, updated_at)
       VALUES ('default', ?, 'WHATSAPP_CLOUD_API', ?, ?, ?, ?, ?)`,
      [
        hasEnv ? 1 : 0,
        process.env.WHATSAPP_PHONE_NUMBER_ID || "",
        process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
        hasEnv ? "CONNECTED" : "NOT_CONNECTED",
        hasEnv ? "VERIFIED" : "NOT_CONNECTED",
        now,
      ]
    );
  }

  const waTplCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM whatsapp_templates");
  if (!waTplCount || waTplCount.c === 0) {
    for (const wt of INITIAL_WHATSAPP_TEMPLATES) {
      runSql(
        db,
        `INSERT INTO whatsapp_templates (id, event_type, template_name, is_enabled, body_en, body_ar, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?)`,
        [wt.id, wt.event_type, wt.template_name, wt.body_en, wt.body_ar, now]
      );
    }
  }

  // 7. Seed Initial Editable Website Sections (Homepage structure, 0 fake products)
  const secCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM website_sections");
  if (!secCount || secCount.c === 0) {
    for (const s of INITIAL_WEBSITE_SECTIONS) {
      runSql(
        db,
        `INSERT INTO website_sections (id, section_type, title_en, title_ar, subtitle_en, subtitle_ar, description_en, description_ar, button_text_en, button_text_ar, button_link, desktop_image_url, mobile_image_url, is_visible, sort_order, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.section_type,
          s.title_en,
          s.title_ar,
          s.subtitle_en,
          s.subtitle_ar,
          s.description_en,
          s.description_ar,
          s.button_text_en,
          s.button_text_ar,
          s.button_link,
          s.desktop_image_url,
          s.mobile_image_url,
          s.is_visible,
          s.sort_order,
          now,
        ]
      );
    }
  }

  // 8. Seed Initial Website Policy Pages
  const pageCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM website_pages");
  if (!pageCount || pageCount.c === 0) {
    for (const p of INITIAL_WEBSITE_PAGES) {
      runSql(
        db,
        `INSERT INTO website_pages (id, slug, title_en, title_ar, content_en, content_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', ?)`,
        [p.id, p.slug, p.title_en, p.title_ar, p.content_en, p.content_ar, p.title_en, p.title_ar, now]
      );
    }
  }

  // 9. Seed Default Header/Footer Navigation Links
  const navCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM navigation_links");
  if (!navCount || navCount.c === 0) {
    const navItems = [
      { id: "nav-1", loc: "HEADER", en: "Shop", ar: "المتجر", href: "/shop", order: 1 },
      { id: "nav-2", loc: "HEADER", en: "New Arrivals", ar: "وصل حديثاً", href: "/new-arrivals", order: 2 },
      { id: "nav-3", loc: "HEADER", en: "Collections", ar: "المجموعات", href: "/collections", order: 3 },
      { id: "nav-4", loc: "HEADER", en: "Track Order", ar: "تتبع الطلب", href: "/track-order", order: 4 },
      { id: "nav-5", loc: "FOOTER", en: "About U3 STORE", ar: "عن U3 STORE", href: "/about", order: 1 },
      { id: "nav-6", loc: "FOOTER", en: "Contact Us", ar: "تواصل معنا", href: "/contact", order: 2 },
      { id: "nav-7", loc: "FOOTER", en: "Size Guide", ar: "دليل المقاسات", href: "/size-guide", order: 3 },
      { id: "nav-8", loc: "FOOTER", en: "Shipping Policy", ar: "سياسة الشحن", href: "/shipping-policy", order: 4 },
      { id: "nav-9", loc: "FOOTER", en: "Return Policy", ar: "سياسة الاسترجاع", href: "/return-policy", order: 5 },
      { id: "nav-10", loc: "FOOTER", en: "Privacy Policy", ar: "سياسة الخصوصية", href: "/privacy-policy", order: 6 },
      { id: "nav-11", loc: "FOOTER", en: "Terms & Conditions", ar: "الشروط والأحكام", href: "/terms", order: 7 },
    ];
    for (const n of navItems) {
      runSql(
        db,
        `INSERT INTO navigation_links (id, location, label_en, label_ar, href, sort_order, is_visible) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [n.id, n.loc, n.en, n.ar, n.href, n.order]
      );
    }
  }

  // 10. Seed Footer Settings, Marquee Settings & Archive Sale Campaign
  const footerRow = queryOne<any>(db, "SELECT * FROM footer_settings WHERE id = 'default'");
  if (!footerRow) {
    runSql(
      db,
      `INSERT INTO footer_settings (
        id, instagram_url, tiktok_url, facebook_url, telegram_url,
        phone_number, phone_tel, maps_embed_url, maps_external_url,
        maps_visible_footer, maps_visible_contact,
        social_instagram_enabled, social_tiktok_enabled, social_facebook_enabled, social_telegram_enabled,
        contact_phone_enabled, contact_telegram_enabled,
        updated_at
      ) VALUES (
        'default',
        'https://www.instagram.com/u3store_/',
        'https://www.tiktok.com/@ahmedyoosrry',
        'https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA',
        'https://t.me/u3store',
        '01115915388',
        '+201115915388',
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg',
        'https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z',
        1, 1, 1, 1, 1, 1, 1, 1,
        ?
      )`,
      [now]
    );
  } else if (!footerRow.facebook_url || footerRow.instagram_url === "https://instagram.com/u3store" || footerRow.tiktok_url === "https://tiktok.com/@u3store") {
    runSql(
      db,
      `UPDATE footer_settings
       SET instagram_url = 'https://www.instagram.com/u3store_/',
           tiktok_url = 'https://www.tiktok.com/@ahmedyoosrry',
           facebook_url = 'https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA',
           telegram_url = 'https://t.me/u3store',
           phone_number = '01115915388',
           phone_tel = '+201115915388',
           maps_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg',
           maps_external_url = 'https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z',
           maps_visible_footer = COALESCE(maps_visible_footer, 1),
           maps_visible_contact = COALESCE(maps_visible_contact, 1),
           social_instagram_enabled = COALESCE(social_instagram_enabled, 1),
           social_tiktok_enabled = COALESCE(social_tiktok_enabled, 1),
           social_facebook_enabled = COALESCE(social_facebook_enabled, 1),
           social_telegram_enabled = COALESCE(social_telegram_enabled, 1),
           contact_phone_enabled = COALESCE(contact_phone_enabled, 1),
           contact_telegram_enabled = COALESCE(contact_telegram_enabled, 1),
           updated_at = ?
       WHERE id = 'default'`,
      [now]
    );
  }

  const marqueeCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM marquee_settings");
  if (!marqueeCount || marqueeCount.c === 0) {
    runSql(
      db,
      `INSERT INTO marquee_settings (id, updated_at) VALUES ('default', ?)`,
      [now]
    );
  }

  const campCount = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM sale_campaigns");
  if (!campCount || campCount.c === 0) {
    runSql(
      db,
      `INSERT INTO sale_campaigns (id, updated_at) VALUES ('archive_sale', ?)`,
      [now]
    );
  }

  // 11. Dual Category Baseline (Shoes + Clothing)
  runSql(db, `UPDATE products SET product_type = 'SHOES' WHERE product_type IS NULL OR product_type = ''`);
  runSql(db, `UPDATE collections SET product_type = 'SHOES' WHERE product_type IS NULL OR product_type = ''`);

  const clothingColCount = queryOne<{ c: number }>(
    db,
    "SELECT COUNT(*) as c FROM collections WHERE product_type = 'CLOTHING'"
  );
  if (!clothingColCount || clothingColCount.c === 0) {
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
      runSql(
        db,
        `INSERT OR IGNORE INTO collections (id, slug, name_en, name_ar, description_en, description_ar, banner_desktop_url, product_type, show_on_homepage, homepage_sort_order, is_active, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'CLOTHING', 1, ?, 1, ?, ?)`,
        [c.id, c.slug, c.name_en, c.name_ar, c.description_en, c.description_ar, c.banner, c.sort, c.sort, now]
      );
    }
  }
}

export async function getDb(): Promise<Database> {
  const SQL = await getSqlJs();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Automatic Recovery: if primary file is missing or empty, restore from safety backup
  if ((!fs.existsSync(DB_PATH) || fs.statSync(DB_PATH).size === 0) && fs.existsSync(LATEST_BACKUP_PATH)) {
    try {
      fs.copyFileSync(LATEST_BACKUP_PATH, DB_PATH);
    } catch {}
  }

  if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0) {
    const stat = fs.statSync(DB_PATH);
    if (!dbInstance || stat.mtimeMs > lastLoadedMtime) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      dbInstance.run("PRAGMA foreign_keys = ON;");
      dbInstance.run(SCHEMA_SQL);
      try {
        dbInstance.run("ALTER TABLE orders ADD COLUMN delivered_at TEXT DEFAULT '';");
      } catch {}
      try {
        dbInstance.run("ALTER TABLE orders ADD COLUMN inventory_deducted INTEGER NOT NULL DEFAULT 0;");
      } catch {}
      try {
        dbInstance.run("ALTER TABLE orders ADD COLUMN cancellation_reason TEXT DEFAULT '';");
      } catch {}
      try {
        dbInstance.run("ALTER TABLE orders ADD COLUMN cancelled_at TEXT DEFAULT '';");
      } catch {}
      try {
        dbInstance.run("UPDATE orders SET inventory_deducted = 1 WHERE payment_status = 'PAID' AND order_status != 'CANCELLED' AND (inventory_deducted IS NULL OR inventory_deducted = 0);");
      } catch {}
      const footerCols = [
        "ALTER TABLE footer_settings ADD COLUMN facebook_url TEXT DEFAULT 'https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA';",
        "ALTER TABLE footer_settings ADD COLUMN telegram_url TEXT DEFAULT 'https://t.me/u3store';",
        "ALTER TABLE footer_settings ADD COLUMN phone_number TEXT DEFAULT '01115915388';",
        "ALTER TABLE footer_settings ADD COLUMN phone_tel TEXT DEFAULT '+201115915388';",
        "ALTER TABLE footer_settings ADD COLUMN maps_embed_url TEXT DEFAULT 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg';",
        "ALTER TABLE footer_settings ADD COLUMN maps_external_url TEXT DEFAULT 'https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z';",
        "ALTER TABLE footer_settings ADD COLUMN maps_visible_footer INTEGER DEFAULT 1;",
        "ALTER TABLE footer_settings ADD COLUMN maps_visible_contact INTEGER DEFAULT 1;",
        "ALTER TABLE footer_settings ADD COLUMN social_instagram_enabled INTEGER DEFAULT 1;",
        "ALTER TABLE footer_settings ADD COLUMN social_tiktok_enabled INTEGER DEFAULT 1;",
        "ALTER TABLE footer_settings ADD COLUMN social_facebook_enabled INTEGER DEFAULT 1;",
        "ALTER TABLE footer_settings ADD COLUMN social_telegram_enabled INTEGER DEFAULT 1;",
        "ALTER TABLE footer_settings ADD COLUMN contact_phone_enabled INTEGER DEFAULT 1;",
        "ALTER TABLE footer_settings ADD COLUMN contact_telegram_enabled INTEGER DEFAULT 1;",
        "ALTER TABLE footer_settings ADD COLUMN newsletter_success_en TEXT DEFAULT 'You are now subscribed to U3 STORE private drops.';",
        "ALTER TABLE footer_settings ADD COLUMN newsletter_success_ar TEXT DEFAULT 'تم اشتراكك بنجاح في قائمة إصدارات U3 STORE الخاصة.';",
        "ALTER TABLE footer_settings ADD COLUMN newsletter_privacy_notice_en TEXT DEFAULT 'By subscribing, you agree to our Privacy Policy.';",
        "ALTER TABLE footer_settings ADD COLUMN newsletter_privacy_notice_ar TEXT DEFAULT 'بالاشتراك، أنت توافق على سياسة الخصوصية الخاصة بنا.';",
      ];
      for (const colSql of footerCols) {
        try {
          dbInstance.run(colSql);
        } catch {}
      }

      // Safe schema migrations for dual category store (Shoes + Clothing)
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
        "ALTER TABLE store_settings ADD COLUMN last_acknowledged_order_id TEXT DEFAULT '';",
        "ALTER TABLE store_settings ADD COLUMN acknowledged_order_ids TEXT DEFAULT '[]';",
        "ALTER TABLE store_settings ADD COLUMN hero_shoes_headline_en TEXT DEFAULT 'STEP INTO LUXURY.';",
        "ALTER TABLE store_settings ADD COLUMN hero_shoes_headline_ar TEXT DEFAULT 'فخامة في كل خطوة.';",
        "ALTER TABLE store_settings ADD COLUMN hero_shoes_subtitle_en TEXT DEFAULT 'Exclusive sneakers & premium footwear engineered for bold presence and supreme comfort.';",
        "ALTER TABLE store_settings ADD COLUMN hero_shoes_subtitle_ar TEXT DEFAULT 'سنيكرز وأحذية حصرية بتصاميم استثنائية وأداء يجمع بين الأناقة والراحة المطلقة.';",
        "ALTER TABLE store_settings ADD COLUMN hero_shoes_btn_text_en TEXT DEFAULT 'SHOP FOOTWEAR';",
        "ALTER TABLE store_settings ADD COLUMN hero_shoes_btn_text_ar TEXT DEFAULT 'تسوق الأحذية';",
        "ALTER TABLE store_settings ADD COLUMN hero_both_headline_en TEXT DEFAULT 'STEP INTO YOUR OWN LANE.';",
        "ALTER TABLE store_settings ADD COLUMN hero_both_headline_ar TEXT DEFAULT 'اخطُ في مسارك الخاص.';",
        "ALTER TABLE store_settings ADD COLUMN hero_both_subtitle_en TEXT DEFAULT 'Premium footwear & modern luxury streetwear crafted for distinct individuality.';",
        "ALTER TABLE store_settings ADD COLUMN hero_both_subtitle_ar TEXT DEFAULT 'أحذية فاخرة وملابس ستريت وير عصرية تعبّر عن هويتك المتفردة وأسلوبك الاستثنائي.';",
        "ALTER TABLE store_settings ADD COLUMN hero_both_btn_text_en TEXT DEFAULT 'SHOP COLLECTION';",
        "ALTER TABLE store_settings ADD COLUMN hero_both_btn_text_ar TEXT DEFAULT 'تسوق المجموعة';",
        "ALTER TABLE store_settings ADD COLUMN hero_clothing_headline_en TEXT DEFAULT 'WEAR YOUR IDENTITY.';",
        "ALTER TABLE store_settings ADD COLUMN hero_clothing_headline_ar TEXT DEFAULT 'أناقة تعبّر عن حضورك.';",
        "ALTER TABLE store_settings ADD COLUMN hero_clothing_subtitle_en TEXT DEFAULT 'Modern luxury streetwear & premium apparel designed for distinctive street presence.';",
        "ALTER TABLE store_settings ADD COLUMN hero_clothing_subtitle_ar TEXT DEFAULT 'ملابس ستريت وير عصرية وتصاميم فاخرة صُممت لتبرز تفرد أسلوبك في كل إطلالة.';",
        "ALTER TABLE store_settings ADD COLUMN hero_clothing_btn_text_en TEXT DEFAULT 'SHOP CLOTHING';",
        "ALTER TABLE store_settings ADD COLUMN hero_clothing_btn_text_ar TEXT DEFAULT 'تسوق الملابس';",
      ];
      for (const mSql of dualCategoryMigrations) {
        try {
          dbInstance.run(mSql);
        } catch {}
      }
      seedBaselineOnly(dbInstance);
      lastLoadedMtime = stat.mtimeMs;
    }
  } else {
    dbInstance = new SQL.Database();
    dbInstance.run(SCHEMA_SQL);
    seedBaselineOnly(dbInstance);
    persistDb(dbInstance);
  }

  return dbInstance!;
}

export function runSql(db: Database, sql: string, params: any[] = []) {
  db.run(sql, params);
}

export function queryAll<T = Record<string, any>>(
  db: Database,
  sql: string,
  params: any[] = []
): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = Record<string, any>>(
  db: Database,
  sql: string,
  params: any[] = []
): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function withTransaction<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await getDb();
  db.run("BEGIN TRANSACTION;");
  try {
    const res = await fn(db);
    db.run("COMMIT;");
    persistDb(db);
    return res;
  } catch (err) {
    try {
      db.run("ROLLBACK;");
    } catch {
      // ignore rollback error if not active
    }
    throw err;
  }
}

