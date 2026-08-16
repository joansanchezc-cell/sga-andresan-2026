const fs=require('fs');
let code=fs.readFileSync('UDEKI/udeki_sync_bookmarklet.js','utf8');

// Replace all single-line comments manually
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
