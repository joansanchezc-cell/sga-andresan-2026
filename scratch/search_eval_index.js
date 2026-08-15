const fs = require('fs');
const content = fs.readFileSync('g:\\Otros ordenadores\\Asus\\Desktop\\Evaluandonos\\index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.from(') || line.includes('eval_') || line.includes('nota') || line.includes('Matem')) {
    if (line.length < 200) console.log(`${idx + 1}: ${line.trim()}`);
  }
});
