import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const extrabatApiKey = Deno.env.get("EXTRABAT_API_KEY");
    const extrabatSecurityKey = Deno.env.get("EXTRABAT_SECURITY_KEY");

    const envVars = {
      EXTRABAT_API_KEY: extrabatApiKey ? `Present (${extrabatApiKey.substring(0, 10)}...)` : "MISSING",
      EXTRABAT_SECURITY_KEY: extrabatSecurityKey ? `Present (${extrabatSecurityKey.substring(0, 10)}...)` : "MISSING",
      TWILIO_ACCOUNT_SID: Deno.env.get("TWILIO_ACCOUNT_SID") ? `Present (${Deno.env.get("TWILIO_ACCOUNT_SID")?.substring(0, 10)}...)` : "MISSING",
      TWILIO_AUTH_TOKEN: Deno.env.get("TWILIO_AUTH_TOKEN") ? `Present (${Deno.env.get("TWILIO_AUTH_TOKEN")?.length} chars)` : "MISSING",
      TWILIO_PHONE_NUMBER: Deno.env.get("TWILIO_PHONE_NUMBER") || "MISSING",
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") ? "Present" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "Present" : "MISSING"
    };

    return new Response(
      JSON.stringify(envVars, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});