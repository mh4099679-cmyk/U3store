const fs = require('fs');
const path = require('path');

const dir = 'src/components/layout';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('placeholder="') && !line.includes('lang === "ar"') && !line.includes('t(lang')) {
      console.log(`${f} Line ${i+1}: ${line.trim()}`);
    }
  });
});

