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
  console.log("ASIGNATURAS:");
  asignaturas.forEach(a => {
    console.log(`- ID: ${a.id}, Nombre: ${a.nombre}, Grado: ${a.grado}, Codigo: ${a.codigo}`);
  });
}
run();
