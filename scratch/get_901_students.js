const SB_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnJkcmloemRoaGp4b2thYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA5OTIsImV4cCI6MjA5MTQyNjk5Mn0.FnQWmxg0p4oUgAQBVhoy6wqIMOk3qk4pifI2voeQvV0";

// Helper functions for calculating definitive grade
function prom(arr) {
  if (!arr || arr.length === 0) return null;
  const sum = arr.reduce((acc, x) => acc + (isNaN(x) ? 0 : x), 0);
  return sum / arr.length;
}

function defin(n70, n30) {
  const p70 = prom(n70), p30 = prom(n30);
  if (p70 === null && p30 === null) return null;
  if (p70 === null) return p30;
  if (p30 === null) return p70;
  return (p70 * 0.7) + (p30 * 0.3);
}

function getDesempeño(n) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  if (n === 0) return 'NP';
  return n >= 8.4 ? 'S' : n >= 7.2 ? 'A' : n >= 6.0 ? 'B' : 'BJ';
}

async function run() {
  const fetchTable = async (table) => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?select=*`, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    return r.json();
  };

  const [asignaturas, estudiantes, actividades, notas] = await Promise.all([
    fetchTable('asignaturas'),
    fetchTable('estudiantes'),
    fetchTable('actividades'),
    fetchTable('notas')
  ]);

  const p1_acts = actividades.filter(a => a.periodo === 1);

  // Group 901
  const asigs901 = asignaturas.filter(a => a.grado === '901');
  console.log("901 Asignaturas:", asigs901.map(a => `${a.nombre} (ID: ${a.id})`));

  const ests901 = estudiantes.filter(e => e.grado === '901');
  console.log(`901 Students count: ${ests901.length}`);

  // Let's calculate P1 grades for Algebra (asig ID: 1)
  const algebraAsigId = 1;
  const algActs = p1_acts.filter(a => a.asignatura_id === algebraAsigId);
  const act70 = algActs.filter(a => a.nombre !== 'Evaluandonos');
  const act30 = algActs.filter(a => a.nombre === 'Evaluandonos');

  console.log("\nAlgebra 901 P1 activities:", algActs.map(a => `${a.nombre} (ID: ${a.id}, %: ${a.porcentaje})`));

  const studentsGrades = ests901.map(e => {
    const sNotas = notas.filter(n => n.estudiante_id === e.id && n.asignatura_id === algebraAsigId && n.periodo === 1);
    
    const grades70 = sNotas.filter(n => act70.some(a => a.id === n.actividad_id)).map(n => n.valor);
    const grades30 = sNotas.filter(n => act30.some(a => a.id === n.actividad_id)).map(n => n.valor);

    const defVal = defin(grades70, grades30);
    return {
      nombre: e.nombre_completo,
      def: defVal !== null ? defVal.toFixed(1) : 'N/A',
      desempeño: getDesempeño(defVal)
    };
  }).sort((a,b) => a.nombre.localeCompare(b.nombre));

  console.log("\nAlgebra 901 Period 1 Calculated Definitivas:");
  studentsGrades.forEach(sg => {
    console.log(`${sg.nombre}: Def=${sg.def} -> ${sg.desempeño}`);
  });
}

run();
