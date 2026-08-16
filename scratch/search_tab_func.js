const fs = require('fs');
const content = fs.readFileSync('g:\\Otros ordenadores\\Asus\\Desktop\\control notas\\index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('tab(') && line.includes('function')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
  if (line.includes('window.tab') || line.includes('const tab =')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
