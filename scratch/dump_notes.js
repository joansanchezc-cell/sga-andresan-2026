const SB_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnJkcmloemRoaGp4b2thYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA5OTIsImV4cCI6MjA5MTQyNjk5Mn0.FnQWmxg0p4oUgAQBVhoy6wqIMOk3qk4pifI2voeQvV0";

async function dump() {
  try {
    const fetchTable = async (table) => {
      const r = await fetch(`${SB_URL}/rest/v1/${table}?select=*`, {
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
      });
      return r.json();
    };

    console.log("Fetching data...");
    const asignaturas = await fetchTable('asignaturas');
    const estudiantes = await fetchTable('estudiantes');
    const actividades = await fetchTable('actividades');
    const notas = await fetchTable('notas');

    console.log(`Asignaturas: ${asignaturas.length}`);
    console.log(`Estudiantes: ${estudiantes.length}`);
    console.log(`Actividades: ${actividades.length}`);
    console.log(`Notas: ${notas.length}`);

    // Print some examples
    console.log("\nAsignaturas sample:", asignaturas.slice(0, 3));
    console.log("\nEstudiantes sample:", estudiantes.slice(0, 3));
    console.log("\nActividades sample:", actividades.slice(0, 3));
    console.log("\nNotas sample:", notas.slice(0, 3));
  } catch (e) {
    console.error("Error:", e);
  }
}

dump();
