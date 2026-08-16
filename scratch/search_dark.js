const fs = require('fs');
const content = fs.readFileSync('g:\\Otros ordenadores\\Asus\\Desktop\\control notas\\index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('dark') || line.includes('theme') || line.includes('#1f2937') || line.includes('#0f172a')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
