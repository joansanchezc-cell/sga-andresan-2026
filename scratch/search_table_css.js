const fs = require('fs');
const content = fs.readFileSync('g:\\Otros ordenadores\\Asus\\Desktop\\control notas\\index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (idx < 1800 && (line.includes('table') || line.includes('td,') || line.includes('tr,') || line.includes('tbody') || line.includes('thead'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
