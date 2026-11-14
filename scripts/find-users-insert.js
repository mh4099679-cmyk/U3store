const fs = require('fs');
const content = fs.readFileSync('php_build/database/u3store_mysql.sql', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('INSERT INTO `users`')) {
        console.log(lines.slice(i, i + 10).join('\n'));
        break;
    }
}

