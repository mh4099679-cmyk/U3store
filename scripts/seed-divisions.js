const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const GOV_CODE_MAP = {
  EG01: 'gov-01', // Cairo
  EG02: 'gov-03', // Alexandria
  EG03: 'gov-12', // Port Said
  EG04: 'gov-14', // Suez
  EG11: 'gov-11', // Damietta
  EG12: 'gov-06', // Dakahlia
  EG13: 'gov-05', // Sharqia
  EG14: 'gov-04', // Qalyubia
  EG15: 'gov-10', // Kafr El Sheikh
  EG16: 'gov-07', // Gharbia
  EG17: 'gov-08', // Monufia
  EG18: 'gov-09', // Beheira
  EG19: 'gov-13', // Ismailia
  EG21: 'gov-02', // Giza
  EG22: 'gov-17', // Beni Suef
  EG23: 'gov-18', // Fayoum
  EG24: 'gov-19', // Minya
  EG25: 'gov-20', // Asyut
  EG26: 'gov-21', // Sohag
  EG27: 'gov-22', // Qena
  EG28: 'gov-24', // Aswan
  EG29: 'gov-23', // Luxor
  EG31: 'gov-25', // Red Sea
  EG32: 'gov-26', // New Valley
  EG33: 'gov-27', // Matrouh
  EG34: 'gov-15', // North Sinai
  EG35: 'gov-16', // South Sinai
};

async function main() {
  const dbPath = path.join(process.cwd(), 'data', 'u3store.sqlite');
  const flatPath = path.join(process.cwd(), 'data', 'all-flat.json');
  const shiyakhaPath = path.join(process.cwd(), 'data', 'all-shiyakha.json');

  if (!fs.existsSync(flatPath) || !fs.existsSync(shiyakhaPath)) {
    console.error('Data files not found in data/');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const filebuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(filebuffer);

  const flat = JSON.parse(fs.readFileSync(flatPath, 'utf8'));
  const shiyakha = JSON.parse(fs.readFileSync(shiyakhaPath, 'utf8'));

  const level2 = flat.data.filter((x) => x.level === 2);
  const now = new Date().toISOString();

  db.run('BEGIN TRANSACTION;');

  db.run('CREATE INDEX IF NOT EXISTS idx_cities_gov ON cities(governorate_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_areas_city ON areas(city_id);');

  const cityStmt = db.prepare(
    'INSERT OR REPLACE INTO cities (id, governorate_id, name_en, name_ar, shipping_rate, estimated_days_en, estimated_days_ar, is_enabled, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?, 1, ?)'
  );

  let insertedCities = 0;
  for (const c of level2) {
    const govId = GOV_CODE_MAP[c.parent.id];
    if (!govId) {
      console.error('Unknown gov parent for city:', c.id, c.parent);
      continue;
    }
    const nameEn = c.name.en || c.name.local;
    const nameAr = c.name.local || c.name.en;
    cityStmt.run([c.id, govId, nameEn, nameAr, '', '', now]);
    insertedCities++;
  }
  cityStmt.free();

  const areaStmt = db.prepare(
    'INSERT OR REPLACE INTO areas (id, city_id, name_en, name_ar, shipping_rate, estimated_days_en, estimated_days_ar, is_enabled, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?, 1, ?)'
  );

  let insertedAreas = 0;
  for (const a of shiyakha) {
    const nameEn = a.name.en || a.name.local;
    const nameAr = a.name.local || a.name.en;
    areaStmt.run([a.id, a.parent.id, nameEn, nameAr, '', '', now]);
    insertedAreas++;
  }
  areaStmt.free();

  db.run('COMMIT;');

  const exported = db.export();
  fs.writeFileSync(dbPath, Buffer.from(exported));

  console.log('--- DATABASE SEEDING COMPLETED ---');
  console.log('Cities inserted:', insertedCities);
  console.log('Areas inserted:', insertedAreas);

  const cCount = db.exec('SELECT count(*) FROM cities')[0].values[0][0];
  const aCount = db.exec('SELECT count(*) FROM areas')[0].values[0][0];
  console.log('Total verified in DB:');
  console.log('Cities:', cCount);
  console.log('Areas:', aCount);

  // Sharqia check
  const tenthCities = db.exec(
    "SELECT id, name_en, name_ar FROM cities WHERE governorate_id = 'gov-05' AND (name_en LIKE '%Ramadan%' OR name_ar LIKE '%رمضان%')"
  )[0].values;
  console.log('Sharqia 10th Ramadan cities:', tenthCities);

  const tenthAreas = db.exec(
    "SELECT id, city_id, name_en, name_ar FROM areas WHERE city_id IN ('EG1309', 'EG1321')"
  )[0].values;
  console.log('10th Ramadan areas count:', tenthAreas.length);
  console.log('10th Ramadan areas:', tenthAreas);
}

main().catch(console.error);

