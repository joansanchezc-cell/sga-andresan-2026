export default async function handler(req, res) {
  const SB_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co/rest/v1/eval_resultados?select=grado,periodo&limit=1";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnJkcmloemRoaGp4b2thYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA5OTIsImV4cCI6MjA5MTQyNjk5Mn0.FnQWmxg0p4oUgAQBVhoy6wqIMOk3qk4pifI2voeQvV0";

  try {
    const response = await fetch(SB_URL, {
      method: 'GET',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Supabase returned status ${response.status}: ${errorText}`
      });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      message: "Ping exitoso a Supabase",
      dataLength: data.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
