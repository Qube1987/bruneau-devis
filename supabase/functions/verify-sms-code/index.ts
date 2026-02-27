import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  devisId: string;
  phoneNumber: string;
  code: string;
  token: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { devisId, phoneNumber, code, token }: RequestPayload = await req.json();

    if (!devisId || !phoneNumber || !code || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the devis exists and token is valid
    const { data: devis, error: devisError } = await supabase
      .from("devis")
      .select("id")
      .eq("id", devisId)
      .eq("public_token", token)
      .maybeSingle();

    if (devisError || !devis) {
      return new Response(
        JSON.stringify({ error: "Invalid devis or token" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find the verification code
    const { data: verificationCode, error: codeError } = await supabase
      .from("sms_verification_codes")
      .select("*")
      .eq("devis_id", devisId)
      .eq("phone_number", phoneNumber)
      .eq("code", code)
      .eq("verified", false)
      .maybeSingle();

    if (codeError || !verificationCode) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(verificationCode.expires_at);
    
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: "Verification code has expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark the code as verified
    const { error: updateError } = await supabase
      .from("sms_verification_codes")
      .update({ verified: true, verified_at: now.toISOString() })
      .eq("id", verificationCode.id);

    if (updateError) {
      console.error("Error updating verification code:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Code verified successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in verify-sms-code:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});