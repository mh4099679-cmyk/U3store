const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function exportSqliteToMysql() {
  const wasmBinary = fs.readFileSync(path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({ wasmBinary });
  const dbFile = fs.readFileSync(path.join(__dirname, '../data/u3store.sqlite'));
  const db = new SQL.Database(dbFile);

  const outDir = path.join(__dirname, '../php_build/database');
  fs.mkdirSync(outDir, { recursive: true });

  const tablesRes = db.exec("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  if (!tablesRes.length || !tablesRes[0].values) {
    console.error('No tables found');
    return;
  }

  const tables = tablesRes[0].values;
  console.log(`Found ${tables.length} tables in SQLite database.`);

  let sqlStatements = [];
  sqlStatements.push('-- U3 STORE MySQL Database Dump for InfinityFree Hosting');
  sqlStatements.push('-- Export Date: ' + new Date().toISOString());
  sqlStatements.push('SET NAMES utf8mb4;');
  sqlStatements.push('SET FOREIGN_KEY_CHECKS = 0;');
  sqlStatements.push('');

  let totalExportedRows = 0;

  for (const [tblName, createSql] of tables) {
    // Get table info (columns, types, pk, notnull, dflt_value)
    const infoRes = db.exec(`PRAGMA table_info(\`${tblName}\`);`);
    const cols = infoRes[0].values; // [cid, name, type, notnull, dflt_value, pk]

    let colDefs = [];
    let pkCols = [];

    for (const col of cols) {
      const [cid, cName, cType, notNull, dfltVal, pk] = col;
      let mysqlType = 'VARCHAR(255)';
      const upperType = (cType || '').toUpperCase();
      const lowerCol = (cName || '').toLowerCase();

      const isLargeText = lowerCol.includes('description') ||
                          lowerCol.includes('content') ||
                          lowerCol.includes('json') ||
                          lowerCol.includes('body') ||
                          lowerCol.includes('message') ||
                          lowerCol.includes('notes') ||
                          lowerCol.includes('metadata') ||
                          lowerCol.includes('address_line') ||
                          lowerCol.includes('payload');

      if (upperType.includes('INT')) {
        if (upperType.includes('TINYINT')) mysqlType = 'TINYINT';
        else if (upperType.includes('BIGINT')) mysqlType = 'BIGINT';
        else mysqlType = 'INT';
      } else if (upperType.includes('DECIMAL') || upperType.includes('NUMERIC') || upperType.includes('FLOAT') || upperType.includes('REAL') || upperType.includes('DOUBLE')) {
        mysqlType = 'DECIMAL(10,2)';
      } else if (upperType.includes('BOOL')) {
        mysqlType = 'TINYINT(1)';
      } else if (upperType.includes('DATETIME') || upperType.includes('TIMESTAMP')) {
        mysqlType = 'DATETIME';
      } else if (upperType.includes('DATE')) {
        mysqlType = 'DATE';
      } else {
        // Text / String
        if (pk > 0) {
          mysqlType = 'VARCHAR(191)';
        } else if (dfltVal !== null && String(dfltVal).length > 200) {
          mysqlType = 'VARCHAR(2000)';
        } else if (isLargeText && dfltVal === null) {
          mysqlType = 'LONGTEXT';
        } else {
          mysqlType = 'VARCHAR(255)';
        }
      }

      let colDef = `\`${cName}\` ${mysqlType}`;
      if (notNull) colDef += ' NOT NULL';
      
      // Auto increment check
      if (pk === 1 && cols.filter(c => c[5] > 0).length === 1 && upperType.includes('INT')) {
        colDef += ' AUTO_INCREMENT';
      }

      if (dfltVal !== null && dfltVal !== undefined) {
        if (dfltVal.toUpperCase() === 'CURRENT_TIMESTAMP') {
          colDef += ' DEFAULT CURRENT_TIMESTAMP';
        } else {
          // If default value is string and mysqlType is VARCHAR or INT, keep it clean
          colDef += ` DEFAULT ${dfltVal}`;
        }
      }

      colDefs.push(colDef);
      if (pk > 0) {
        pkCols.push(`\`${cName}\``);
      }
    }

    if (pkCols.length > 0) {
      colDefs.push(`PRIMARY KEY (${pkCols.join(', ')})`);
    }

    sqlStatements.push(`DROP TABLE IF EXISTS \`${tblName}\`;`);
    sqlStatements.push(`CREATE TABLE \`${tblName}\` (\n  ${colDefs.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n`);

    // Fetch data
    const rowsRes = db.exec(`SELECT * FROM \`${tblName}\`;`);
    if (rowsRes.length && rowsRes[0].values && rowsRes[0].values.length > 0) {
      const colNames = rowsRes[0].columns.map(c => `\`${c}\``).join(', ');
      const rows = rowsRes[0].values;
      totalExportedRows += rows.length;

      // Batch insert 100 rows at a time
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valStrings = chunk.map(row => {
          const vals = row.map(v => {
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            // escape string
            const str = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            return `'${str}'`;
          });
          return `(${vals.join(', ')})`;
        });
        sqlStatements.push(`INSERT INTO \`${tblName}\` (${colNames}) VALUES\n${valStrings.join(',\n')};`);
      }
      sqlStatements.push('');
    }
  }

  sqlStatements.push('SET FOREIGN_KEY_CHECKS = 1;');

  const dumpPath = path.join(outDir, 'u3store_mysql.sql');
  fs.writeFileSync(dumpPath, sqlStatements.join('\n'), 'utf8');
  console.log(`Successfully exported ${tables.length} tables and ${totalExportedRows} rows to ${dumpPath}`);
}

exportSqliteToMysql().catch(err => {
  console.error(err);
  process.exit(1);
});
