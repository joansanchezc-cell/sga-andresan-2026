const fs = require('fs');
const content = fs.readFileSync('g:\\Otros ordenadores\\Asus\\Desktop\\Evaluandonos\\index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('pmfrdrihzdhhjxokabjm') || line.includes('notas') || line.includes('siga')) {
    if (line.length < 200) console.log(`${idx + 1}: ${line.trim()}`);
  }
});
