(async function() {
  const SB_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnJkcmloemRoaGp4b2thYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA5OTIsImV4cCI6MjA5MTQyNjk5Mn0.FnQWmxg0p4oUgAQBVhoy6wqIMOk3qk4pifI2voeQvV0";

  const MAPPING = {
    "0901 - Matemáticas": 1,
    "0902 - Matemáticas": 2,
    "0903 - Matemáticas": 3,
    "0903 - Proy: Probabilidad, Estadística y Geometría": 4,
    "1001 - Proy: Probabilidad, Estadística y Geometría": 5,
    "1002 - Proy: Probabilidad, Estadística y Geometría": 6,
    "1003 - Proy: Probabilidad, Estadística y Geometría": 7,
    "1001 - Educación Física": 8,
    "1002 - Educación Física": 9,
    "1002 - Matemáticas": 10
  };

  // Helper functions
  function prom(arr) {
    if (arr.length === 0) return null;
    const mapped = arr.map(x => (x === null || x === undefined || isNaN(x)) ? 0 : x);
    const sum = mapped.reduce((acc, x) => acc + x, 0);
    return sum / mapped.length;
  }

  function defin(n70, n30) {
    const p70 = prom(n70), p30 = prom(n30);
    if (p70 === null && p30 === null) return null;
    if (p70 === null) return p30;
    if (p30 === null) return p70;
    return (p70 * 0.7) + (p30 * 0.3);
  }

  function getDesempeño(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    if (n < 3.0) return 'BJ';
    if (n >= 3 && n <= 3.99) return 'B';
    if (n >= 4 && n <= 4.59) return 'A';
    if (n >= 4.6 && n <= 5) return 'S';
    return '';
  }

  // Clean names for fuzzy matching
  function cleanName(name) {
    return name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, " ") // replace special chars with spaces
      .replace(/\s+/g, " ").trim();
  }

  let selectedSubjectText = "";
  for (const key of Object.keys(MAPPING)) {
    if (document.body.innerText.includes(key)) {
      selectedSubjectText = key;
      break;
    }
  }

  if (!selectedSubjectText) {
    let p = prompt("No se detectó la asignatura automáticamente.\nEscríbela exactamente igual (ej: 1002 - Educación Física):");
    if (!p) return;
    selectedSubjectText = p.trim();
  }
  console.log("Selected Subject in Udeki:", selectedSubjectText);

  const localAsigId = MAPPING[selectedSubjectText];
  if (!localAsigId) {
    alert(`No se pudo mapear la asignatura: "${selectedSubjectText}" a la base de datos local.`);
    return;
  }

  let p_input = prompt("¿Qué periodo vas a subir (1, 2, 3 o 4)?", "2");
  if (!p_input) return;
  let localPeriod = parseInt(p_input);
  if (isNaN(localPeriod) || localPeriod < 1 || localPeriod > 4) {
    alert("Periodo inválido.");
    return;
  }

  console.log(`Using Local Subject ID: ${localAsigId}, Period: ${localPeriod}`);

  const headers = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
  const fetchTable = async (table, query = "") => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers });
    return r.json();
  };

  try {
    const [estudiantes, actividades, notas] = await Promise.all([
      fetchTable('estudiantes', `año=eq.2026`),
      fetchTable('actividades', `asignatura_id=eq.${localAsigId}&periodo=eq.${localPeriod}`),
      fetchTable('notas', `asignatura_id=eq.${localAsigId}&periodo=eq.${localPeriod}&año=eq.2026`)
    ]);

    console.log(`Local DB loaded: ${estudiantes.length} students, ${actividades.length} activities, ${notas.length} grades.`);

    const notasEst = {};
    notas.forEach(n => {
      (notasEst[n.estudiante_id] = notasEst[n.estudiante_id] || []).push(n);
    });

    const localGrades = {};
    estudiantes.forEach(est => {
      const mis_n = notasEst[est.id] || [];
      const v70 = actividades.filter(a => a.porcentaje === 1).map(a => {
        const n = mis_n.find(n => n.actividad_id === a.id); return n ? Number(n.valor) : null;
      });
      const v30 = actividades.filter(a => a.porcentaje !== 1).map(a => {
        const n = mis_n.find(n => n.actividad_id === a.id); return n ? Number(n.valor) : null;
      });
      
      const d = defin(v70, v30);
      localGrades[cleanName(est.nombre_completo)] = {
        name: est.nombre_completo,
        desempeño: getDesempeño(d),
        numeric: d
      };
    });

    console.log("=== DICCIONARIO DE NOTAS CALCULADO ===", JSON.parse(JSON.stringify(localGrades)));

    let initialRows = Array.from(document.querySelectorAll('tbody tr')).filter(r => r.querySelectorAll('td').length >= 2);
    
    if (initialRows.length === 0) {
      alert("No se encontraron filas de estudiantes en la página (no hay 'tr' con al menos 2 'td' dentro de un tbody).");
      return;
    }
    console.log(`Found ${initialRows.length} valid student rows in Udeki.`);

    let pendingUpdates = [];
    let matchedCount = 0;
    let updatedCount = 0;

    // Fase 1: Recolectar a quiénes hay que actualizarle notas
    for (const row of initialRows) {
        const udekiStudentName = row.querySelectorAll('td')[1].innerText.trim();
        const cleanUName = cleanName(udekiStudentName);

        let match = localGrades[cleanUName];
        if (!match) {
            // Fuzzy matching seguro basado en intersección
            const uWords = cleanUName.split(' ').filter(w => w.length > 2);
            let bestMatches = [];
            let maxScore = 0;

            for (const key of Object.keys(localGrades)) {
                const kWords = key.split(' ').filter(w => w.length > 2);
                let score = 0;
                for (const uw of uWords) {
                    if (kWords.includes(uw)) score++;
                }
                if (score > 0) {
                    if (score > maxScore) {
                        maxScore = score;
                        bestMatches = [key];
                    } else if (score === maxScore) {
                        bestMatches.push(key);
                    }
                }
            }

            if (bestMatches.length === 1 && maxScore >= 2) {
                match = localGrades[bestMatches[0]];
                console.log(`Fuzzy match: '${udekiStudentName}' -> '${bestMatches[0]}' (score: ${maxScore})`);
            } else if (bestMatches.length > 1 && maxScore >= 2) {
                console.warn(`Ambigüedad en fuzzy match para '${udekiStudentName}': demasiados empates con score ${maxScore}`, bestMatches);
            }
        }

        if (match) {
            pendingUpdates.push({ name: udekiStudentName, match: match });
            matchedCount++;
        }
    }

    // Fase 2: Aplicar actualizaciones re-consultando el DOM
    const processUpdates = async () => {
        for (const update of pendingUpdates) {
            let valToSet = update.match.desempeño || update.match.desempeo;
            if (!valToSet) continue;

            // Encontrar primero cuántos selects tiene este estudiante re-consultando la fila
            const getFSelectCount = () => {
                const r = Array.from(document.querySelectorAll('tbody tr')).find(tr => {
                    const cells = tr.querySelectorAll('td');
                    return cells.length >= 2 && cells[1].innerText.trim() === update.name;
                });
                return r ? r.querySelectorAll('.f-select').length : 0;
            };

            const selectCount = getFSelectCount();
            if (selectCount === 0) continue;

            for (let j = 0; j < selectCount; j++) {
                // Volver a buscar la fila fresca, ¡porque Vue pudo haber desmontado la tabla!
                const freshRow = Array.from(document.querySelectorAll('tbody tr')).find(tr => {
                    const cells = tr.querySelectorAll('td');
                    return cells.length >= 2 && cells[1].innerText.trim() === update.name;
                });
                if (!freshRow) break;

                const freshSelects = freshRow.querySelectorAll('.f-select');
                if (j >= freshSelects.length) break;

                const fSelect = freshSelects[j];
                const toggle = fSelect.querySelector('.dropdown-toggle');
                
                let currentVal = "";
                const toggleSpan = toggle ? toggle.querySelector('span.badge') : null;
                if (toggleSpan) {
                    currentVal = toggleSpan.innerText.trim();
                } else if (toggle) {
                    currentVal = toggle.innerText.trim();
                }

                if (currentVal === valToSet) continue;

                if (toggle) {
                    toggle.click();
                    await new Promise(r => setTimeout(r, 60)); // Esperar al render del dropdown
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
                    
                    // CRÍTICO: Esperar a que Vue procese el cambio y renderice antes del siguiente clic
                    await new Promise(r => setTimeout(r, 200));
                } else {
                    if (toggle) toggle.click(); // Cerrar si no encontró la nota
                }
            }
        }
        alert(`Sincronización completada:\n- Alumnos emparejados: ${matchedCount}/${initialRows.length}\n- Campos de notas actualizados: ${updatedCount}\n\nRevisa los cambios y haz clic en "Guardar Calificaciones".`);
    };

    await processUpdates();
  } catch (e) {
    console.error("Sync Error:", e);
    alert(`Error al sincronizar: ${e.message}`);
  }
})();
