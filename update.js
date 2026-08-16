const fs = require('fs');
let code = fs.readFileSync('UDEKI/udeki_sync_bookmarklet.js', 'utf8');

// Replace the loop
const oldLoopRegex = /const processRows = async \(\) => \{[\s\S]*?await processRows\(\);/m;

const newLoop = \const processRows = async () => {
      // Find the maximum number of rows to avoid infinite loops, but re-query every time
      let maxRows = document.querySelectorAll('tbody tr').length;
      
      for (let i = 0; i < maxRows; i++) {
        // Re-query the rows inside the loop because Vue detaches the DOM on re-render!
        const currentRows = Array.from(document.querySelectorAll('tbody tr')).filter(r => r.querySelectorAll('td').length >= 2);
        if (i >= currentRows.length) break;
        
        const row = currentRows[i];
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) continue;
        
        const udekiStudentName = cells[1].innerText.trim();
        const cleanUName = cleanName(udekiStudentName);

        let match = localGrades[cleanUName];
        if (!match) {
          const keys = Object.keys(localGrades);
          const uWords = cleanUName.split(' ');
          // Better fuzzy match: match first two surnames and first name
          const bestKey = keys.find(k => {
             const kWords = k.split(' ');
             if (uWords.length >= 3 && kWords.length >= 3) {
                return uWords[0] === kWords[0] && uWords[1] === kWords[1] && uWords[2] === kWords[2];
             }
             if (uWords.length >= 2 && kWords.length >= 2) {
                return uWords[0] === kWords[0] && uWords[1] === kWords[1];
             }
             return false;
          });
          if (bestKey) match = localGrades[bestKey];
        }

        if (match) {
          matchedCount++;
          const fSelects = row.querySelectorAll('.f-select');
          
          for (const fSelect of fSelects) {
            let valToSet = match.desempeño || match.desempeo; 
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

            // Open the dropdown
            if (toggle) {
               toggle.click();
               // Wait for Vue to render the DOM
               await new Promise(r => setTimeout(r, 60));
            }

            // After opening, re-query the fSelect because it might have been detached if the row re-rendered? 
            // No, opening the dropdown shouldn't detach the whole row, but selecting an item DOES.
            // Just query the document for the menu if it's attached to the body, but Udeki attaches it inside fSelect.
            // But wait, to be perfectly safe, let's just query inside the row we have.
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
              
              // CRITICAL: Wait for Vue to process the click and re-render the table BEFORE moving to the next element
              await new Promise(r => setTimeout(r, 200));
            } else {
              // Close it if we couldn't find the item
              if (toggle) toggle.click();
            }
          }
        }
      }
      alert(\\\Sincronización completada:\\n- Alumnos emparejados: \/\\\n- Campos de notas actualizados: \\\n\\nRevisa los cambios y haz clic en "Guardar Calificaciones".\\\);
    };

    await processRows();\

code = code.replace(oldLoopRegex, newLoop);
fs.writeFileSync('UDEKI/udeki_sync_bookmarklet.js', code);
