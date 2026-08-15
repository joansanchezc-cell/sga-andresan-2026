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
    const valid = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, x) => acc + x, 0);
    return sum / valid.length;
  }

  function getDesempeño(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    if (n === 0) return 'BJ';
    return n >= 8.4 ? 'S' : n >= 7.2 ? 'A' : n >= 6.0 ? 'B' : 'BJ';
  }

  // Clean names for fuzzy matching
  function cleanName(name) {
    return name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, " ") // replace special chars with spaces
      .replace(/\s+/g, " ").trim();
  }

  const subjectSelect = document.querySelector('select[name="asignatura"]') || document.querySelector('select');
  if (!subjectSelect) {
    alert("No se encontró el selector de asignaturas en Udeki.");
    return;
  }
  
  const selectedSubjectText = subjectSelect.options[subjectSelect.selectedIndex]?.text || "";
  console.log("Selected Subject in Udeki:", selectedSubjectText);

  const localAsigId = MAPPING[selectedSubjectText];
  if (!localAsigId) {
    alert(`No se pudo mapear la asignatura: "${selectedSubjectText}" a la base de datos local.`);
    return;
  }

  const periodSelect = document.querySelector('select[name="periodo"]') || document.querySelectorAll('select')[1];
  const selectedPeriodText = periodSelect ? periodSelect.options[periodSelect.selectedIndex]?.text || "" : "";
  console.log("Selected Period in Udeki:", selectedPeriodText);

  let localPeriod = 2;
  if (selectedPeriodText.includes("PRIMER")) localPeriod = 1;
  else if (selectedPeriodText.includes("SEGUNDO")) localPeriod = 2;
  else if (selectedPeriodText.includes("TERCER")) localPeriod = 3;
  else if (selectedPeriodText.includes("CUARTO")) localPeriod = 4;

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

    // Calculate both 70% and 30% grades for each student
    const localGrades = {};
    estudiantes.forEach(est => {
      const mis_n = notasEst[est.id] || [];
      const v70 = actividades.filter(a => a.porcentaje === 1).map(a => {
        const n = mis_n.find(n => n.actividad_id === a.id); return n ? Number(n.valor) : null;
      });
      const v30 = actividades.filter(a => a.porcentaje !== 1).map(a => {
        const n = mis_n.find(n => n.actividad_id === a.id); return n ? Number(n.valor) : null;
      });
      
      const prom70 = prom(v70);
      const prom30 = prom(v30);

      localGrades[cleanName(est.nombre_completo)] = {
        name: est.nombre_completo,
        desempeño70: getDesempeño(prom70),
        desempeño30: getDesempeño(prom30)
      };
    });

    const table = document.querySelector('table');
    if (!table) {
      alert("No se encontró la tabla de estudiantes en Udeki.");
      return;
    }

    // Map column index to performance type based on header text
    // The table headers starting from index 2 (skip # and Student Name)
    const headersElements = Array.from(table.querySelectorAll('thead th'));
    const columnMapping = []; // will contain '70' or '30' for each column index
    
    // We start from the 3rd header (index 2)
    for (let i = 2; i < headersElements.length; i++) {
      const text = headersElements[i].innerText.toLowerCase();
      // If header text contains "evalu" or "eva", it is mapped to 30% Evaluándonos
      if (text.includes("evalu") || text.includes("eva") || text.includes("30%")) {
        columnMapping.push('30');
      } else {
        columnMapping.push('70');
      }
    }
    console.log("Column Mapping (70% Saber/Hacer vs 30% Evaluándonos):", columnMapping);

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    console.log(`Found ${rows.length} rows in Udeki table.`);

    let matchedCount = 0;
    let updatedCount = 0;

    rows.forEach(row => {
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
        const selectElements = row.querySelectorAll('select');
        
        selectElements.forEach((selectEl, colIdx) => {
          const colType = columnMapping[colIdx] || '70'; // default to 70 if out of range
          const targetDesempeño = colType === '30' ? match.desempeño30 : match.desempeño70;

          if (targetDesempeño && selectEl.value !== targetDesempeño) {
            selectEl.value = targetDesempeño;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            updatedCount++;
          }
        });
      }
    });

    alert(`Sincronización completada:\n- Alumnos emparejados: ${matchedCount}/${rows.length}\n- Campos de notas actualizados: ${updatedCount}\n\nRevisa los cambios y haz clic en "Guardar Calificaciones".`);
  } catch (e) {
    console.error("Sync Error:", e);
    alert(`Error al sincronizar: ${e.message}`);
  }
})();
