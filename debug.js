const fs=require('fs');
let code=fs.readFileSync('UDEKI/udeki_sync_bookmarklet.js','utf8');
code = code.replace(/const gradeInputs = row\.querySelectorAll\('select'\);/, "const gradeInputs = row.querySelectorAll('select'); if (gradeInputs.length === 0) console.log('NO SELECT IN ROW!');");
fs.writeFileSync('UDEKI/udeki_sync_bookmarklet.js', code);
