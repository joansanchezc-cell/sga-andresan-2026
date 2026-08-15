const SB_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnJkcmloemRoaGp4b2thYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA5OTIsImV4cCI6MjA5MTQyNjk5Mn0.FnQWmxg0p4oUgAQBVhoy6wqIMOk3qk4pifI2voeQvV0";

async function run() {
  const fetchTable = async (table) => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?select=*`, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    return r.json();
  };

  const asignaturas = await fetchTable('asignaturas');
  const actividades = await fetchTable('actividades');
  const notas = await fetchTable('notas');

  console.log("ACTIVITIES AND GRADES BY SUBJECT:");
  for (const asig of asignaturas) {
    const asigActs = actividades.filter(a => a.asignatura_id === asig.id);
    console.log(`\n=== Subject: ${asig.nombre} - Grado: ${asig.grado} ===`);
    if (asigActs.length === 0) {
      console.log("  No activities found.");
      continue;
    }
    for (const act of asigActs) {
      const actNotas = notas.filter(n => n.actividad_id === act.id);
      console.log(`  - Actividad ID: ${act.id}, Nombre: "${act.nombre}", Periodo: ${act.periodo}, Porcentaje: ${act.porcentaje}%. Total Notas: ${actNotas.length}`);
    }
  }
}
run();
