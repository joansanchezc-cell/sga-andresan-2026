const fs = require('fs');
const content = fs.readFileSync('g:\\Otros ordenadores\\Asus\\Desktop\\control notas\\index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (idx < 1700 && line.includes('color:') && (line.includes('td') || line.includes('tr') || line.includes('table'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
