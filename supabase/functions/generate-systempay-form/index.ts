import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SystemPayParams {
  vads_action_mode: string;
  vads_amount: string;
  vads_ctx_mode: string;
  vads_currency: string;
  vads_page_action: string;
  vads_payment_config: string;
  vads_site_id: string;
  vads_trans_date: string;
  vads_trans_id: string;
  vads_version: string;
  vads_order_id: string;
  vads_cust_email: string;
  vads_cust_first_name?: string;
  vads_cust_last_name?: string;
  vads_cust_phone?: string;
  vads_order_info?: string;
  vads_url_return: string;
}

// Generate HMAC-SHA-256 signature for SystemPay
async function generateSignature(params: Record<string, string>, key: string): Promise<string> {
  // Filter and sort parameters starting with vads_
  const vadsParams = Object.keys(params)
    .filter(k => k.startsWith('vads_'))
    .sort()
    .map(k => params[k])
    .join('+');

  // Add the certificate at the end
  const dataToSign = vadsParams + '+' + key;

  // Generate HMAC-SHA-256
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const dataToSignData = encoder.encode(dataToSign);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    dataToSignData
  );

  // Convert to base64
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));

  return signatureBase64;
}

// Generate trans_id (6 digits, unique per day)
function generateTransId(): string {
  const now = new Date();
  const timestamp = now.getTime().toString();
  return timestamp.slice(-6);
}

// Format date for SystemPay (YYYYMMDDHHmmss in UTC)
function formatTransDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get parameters from query string
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get devis by payment_link_token
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .select('*')
      .eq('payment_link_token', token)
      .maybeSingle();

    if (devisError || !devis) {
      return new Response(
        JSON.stringify({ error: 'Devis not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get SystemPay credentials from environment
    const siteId = Deno.env.get('SYSTEMPAY_SITE_ID');
    const certificate = Deno.env.get('SYSTEMPAY_CERTIFICATE');
    const ctxMode = Deno.env.get('SYSTEMPAY_CTX_MODE') || 'TEST'; // TEST or PRODUCTION
    const formAction = Deno.env.get('SYSTEMPAY_FORM_ACTION') || 'https://paiement.systempay.fr/vads-payment/';

    if (!siteId || !certificate) {
      return new Response(
        JSON.stringify({ error: 'SystemPay not configured. Please add SYSTEMPAY_SITE_ID and SYSTEMPAY_CERTIFICATE to environment variables.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate amount (40% deposit) in cents
    const totaux = devis.totaux as any;
    const amountTTC = totaux.ttc || 0;
    const depositAmount = Math.round(amountTTC * 0.40 * 100); // 40% in cents

    // Get client info
    const client = devis.client as any;

    // Generate trans_id and trans_date
    const transId = generateTransId();
    const transDate = formatTransDate();

    // Get return URL from environment or use default
    const returnUrl = Deno.env.get('SYSTEMPAY_RETURN_URL') || `${supabaseUrl.replace('//', '//').split('/')[0]}//${supabaseUrl.split('/')[2]}/payment-result`;

    // Build SystemPay parameters
    const params: Record<string, string> = {
      vads_action_mode: 'INTERACTIVE',
      vads_amount: depositAmount.toString(),
      vads_ctx_mode: ctxMode,
      vads_currency: '978', // EUR
      vads_page_action: 'PAYMENT',
      vads_payment_config: 'SINGLE',
      vads_site_id: siteId,
      vads_trans_date: transDate,
      vads_trans_id: transId,
      vads_version: 'V2',
      vads_order_id: devis.id,
      vads_cust_email: client.email || '',
      vads_cust_first_name: client.prenom || '',
      vads_cust_last_name: client.nom || '',
      vads_cust_phone: client.telephone || '',
      vads_order_info: `Acompte devis ${devis.titre_affaire}`,
      vads_url_return: returnUrl,
    };

    // Generate signature
    const signature = await generateSignature(params, certificate);

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        devis_id: devis.id,
        transaction_id: transId,
        amount: depositAmount,
        currency: 'EUR',
        status: 'pending',
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
    }

    // Return form data
    return new Response(
      JSON.stringify({
        formAction,
        params: {
          ...params,
          signature,
        },
        devis: {
          id: devis.id,
          titre_affaire: devis.titre_affaire,
          client: client,
          amount: depositAmount / 100,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating SystemPay form:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});