const fs=require('fs');
let code=fs.readFileSync('UDEKI/udeki_sync_bookmarklet.js','utf8');

// Replace the old select finding logic with the new robust logic
const oldLogic = let subjectSelect = null;
  for (const s of document.querySelectorAll('select')) {
    const text = (s.options[s.selectedIndex]?.text || "").trim();
    if (text.includes(" - ")) {
      subjectSelect = s;
      break;
    }
  }

  if (!subjectSelect) {
    alert("No se encontró el selector de asignaturas en Udeki.");
    return;
  }

  const selectedSubjectText = subjectSelect.options[subjectSelect.selectedIndex]?.text || "";
  console.log("Selected Subject in Udeki:", selectedSubjectText);;

const newLogic = let selectedSubjectText = "";
  for (const key of Object.keys(MAPPING)) {
    if (document.body.innerText.includes(key)) {
      selectedSubjectText = key;
      break;
    }
  }
  
  if (!selectedSubjectText) {
    let p = prompt("No se detectó la asignatura automáticamente.\\nEscríbela exactamente igual (ej: 1002 - Educación Física):");
    if (!p) return;
    selectedSubjectText = p.trim();
  }
  console.log("Selected Subject in Udeki:", selectedSubjectText);;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('UDEKI/udeki_sync_bookmarklet.js', code);

// Minify safely
let lines = code.split('\n');
let newLines = [];
for(let line of lines) {
    if (line.includes('//') && !line.includes('https://')) {
        line = line.split('//')[0];
    }
    newLines.push(line);
}
code = newLines.join(' ');
code = code.replace(/\s+/g, ' ');

let encoded = 'javascript:' + encodeURIComponent(code);
fs.writeFileSync('encoded_bookmarklet.txt', encoded);

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/href="javascript:\(async%20function.*?"/, 'href="' + encoded + '"');
fs.writeFileSync('index.html', html);

let fixHtml = fs.readFileSync('fix.html', 'utf8');
fixHtml = fixHtml.replace(/href="javascript:\(async%20function.*?"/, 'href="' + encoded + '"');
fs.writeFileSync('fix.html', fixHtml);

console.log('DONE');
