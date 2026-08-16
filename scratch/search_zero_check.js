const fs = require('fs');
const content = fs.readFileSync('g:\\Otros ordenadores\\Asus\\Desktop\\control notas\\index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('=== 0') || line.includes('== 0') || line.includes('=== null') || line.includes('valor ===') || line.includes('val ===')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
