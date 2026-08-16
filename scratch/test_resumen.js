const SB_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnJkcmloemRoaGp4b2thYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA5OTIsImV4cCI6MjA5MTQyNjk5Mn0.FnQWmxg0p4oUgAQBVhoy6wqIMOk3qk4pifI2voeQvV0";

function prom(arr) {
  const valid = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, x) => acc + x, 0);
  return sum / valid.length;
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

  const grado = '901';
  const period = 1;
  const asigs = asignaturas.filter(a => a.grado === grado);
  const ests = estudiantes.filter(e => e.grado === grado);
  const asigIds = asigs.map(a => a.id);
  const actIds = actividades.filter(a => asigIds.includes(a.asignatura_id)).map(a => a.id);

  const filteredNotas = notas.filter(n => actIds.includes(n.actividad_id) && n.año === 2026 && n.periodo === period);

  const notasEst = {};
  filteredNotas.forEach(n => { (notasEst[n.estudiante_id] = notasEst[n.estudiante_id] || []).push(n); });

  console.log(`Resumen grupo ${grado} - Periodo ${period}:`);
  const results = ests.sort((a,b) => a.nombre_completo.localeCompare(b.nombre_completo)).map((est, idx) => {
    const mis_n = notasEst[est.id] || [];
    let line = `${idx+1}. ${est.nombre_completo}:`;
    asigs.forEach(asig => {
      const actsA = actividades.filter(a => a.asignatura_id === asig.id && a.periodo === period);
      const v70 = actsA.filter(a => a.porcentaje === 1).map(a => {
        const n = mis_n.find(n => n.actividad_id === a.id); return n ? Number(n.valor) : null;
      });
      // Use !== 1 to match 0 or 2
      const v30 = actsA.filter(a => a.porcentaje !== 1).map(a => {
        const n = mis_n.find(n => n.actividad_id === a.id); return n ? Number(n.valor) : null;
      });
      const d = defin(v70, v30);
      line += ` ${asig.nombre}=${d !== null ? d.toFixed(1) : 'null'} (${getDesempeño(d)})`;
    });
    return line;
  });

  results.forEach(r => console.log(r));
}

run();
