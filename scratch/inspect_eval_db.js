const SB_URL = "https://txnecdeccianklqqyrav.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bmVjZGVjY2lhbmtscXF5cmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDQzMDIsImV4cCI6MjA5MTk4MDMwMn0.e2ybyt2Y8yHsZwRC-MZqi_qK525-CWpk-huQcQy-icM";

async function run() {
  const fetchTable = async (table, query = "select=*&limit=5") => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    return r.text();
  };

  try {
    console.log("Checking tables...");
    const eval_resultados = await fetchTable('eval_resultados');
    console.log("eval_resultados response:", eval_resultados);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
