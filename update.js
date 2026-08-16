const fs = require('fs');
let code = fs.readFileSync('UDEKI/udeki_sync_bookmarklet.js', 'utf8');

// Fix getDesempeño
code = code.replace(/function getDesempeo\(n\) \{[\s\S]*?return '';\s*\}/, \unction getDesempeño(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    if (n < 3.0) return 'BJ';
    if (n >= 3 && n <= 3.99) return 'B';
    if (n >= 4 && n <= 4.59) return 'A';
    if (n >= 4.6 && n <= 5) return 'S';
    return '';
  }\);

// Replace the loop
const oldLoop = \ows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      
      const udekiStudentName = cells[1].innerText.trim();
      const cleanUName = cleanName(udekiStudentName);

      let match = localGrades[cleanUName];
      if (!match) {
        const keys = Object.keys(localGrades);
        const bestKey = keys.find(k => k.includes(cleanUName) || cleanUName.includes(k) || k.substring(0, 15) === cleanUName.substring(0, 15));
        if (bestKey) {
          match = localGrades[bestKey];
        }
      }

      if (match) {
        matchedCount++;
        const fSelects = row.querySelectorAll('.f-select');
        
        fSelects.forEach((fSelect) => {
          let valToSet = match.desempeo;
          if (!valToSet) return;
          
          const toggle = fSelect.querySelector('.dropdown-toggle');
          if (toggle && toggle.innerText.trim() === valToSet) {
             return; 
          }

          const items = fSelect.querySelectorAll('.dropdown-item');
          let targetItem = null;
          items.forEach(item => {
             if (item.innerText.trim() === valToSet) {
                 targetItem = item;
             }
          });

          if (targetItem) {
            targetItem.click();
            const innerSpan = targetItem.querySelector('span');
            if (innerSpan) innerSpan.click(); // Just in case the listener is strictly on the span
            updatedCount++;
          }
        });
      }
    });

    alert(\\\Sincronizacin completada:\\n- Alumnos emparejados: \/\\\n- Campos de notas actualizados: \\\n\\nRevisa los cambios y haz clic en "Guardar Calificaciones".\\\);\;

const newLoop = \const processRows = async () => {
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) continue;
        
        const udekiStudentName = cells[1].innerText.trim();
        const cleanUName = cleanName(udekiStudentName);

        let match = localGrades[cleanUName];
        if (!match) {
          const keys = Object.keys(localGrades);
          const bestKey = keys.find(k => k.includes(cleanUName) || cleanUName.includes(k) || k.substring(0, 15) === cleanUName.substring(0, 15));
          if (bestKey) match = localGrades[bestKey];
        }

        if (match) {
          matchedCount++;
          const fSelects = row.querySelectorAll('.f-select');
          
          for (const fSelect of fSelects) {
            let valToSet = match.desempeño || match.desempeo; // handle encoding issues
            if (!valToSet) continue;
            
            const toggle = fSelect.querySelector('.dropdown-toggle');
            
            let currentVal = "";
            const toggleSpan = toggle ? toggle.querySelector('span.badge') : null;
            if (toggleSpan) {
              currentVal = toggleSpan.innerText.trim();
            } else if (toggle) {
              currentVal = toggle.innerText.trim();
            }
            
            if (currentVal === valToSet) continue;

            // Vue might use v-if for the dropdown-menu, so we MUST click the toggle first
            if (toggle) {
               toggle.click();
               // Wait for Vue to render the DOM
               await new Promise(r => setTimeout(r, 60));
            }

            const items = fSelect.querySelectorAll('.dropdown-item');
            let targetItem = null;
            items.forEach(item => {
               if (item.innerText.trim() === valToSet) {
                   targetItem = item;
               }
            });

            if (targetItem) {
              targetItem.click();
              const innerSpan = targetItem.querySelector('span');
              if (innerSpan) innerSpan.click();
              updatedCount++;
            } else {
              // Close it if we couldn't find the item
              if (toggle) toggle.click();
            }
            // Small delay between selects so Vue doesn't panic
            await new Promise(r => setTimeout(r, 40));
          }
        }
      }
      alert(\\\Sincronizacin completada:\\n- Alumnos emparejados: \/\\\n- Campos de notas actualizados: \\\n\\nRevisa los cambios y haz clic en "Guardar Calificaciones".\\\);
    };
    
    await processRows();\;

code = code.replace(oldLoop, newLoop);
fs.writeFileSync('UDEKI/udeki_sync_bookmarklet.js', code);
