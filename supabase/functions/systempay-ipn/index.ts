import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Verify SystemPay signature
async function verifySignature(params: Record<string, string>, receivedSignature: string, key: string): Promise<boolean> {
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

  return signatureBase64 === receivedSignature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse form data from SystemPay IPN
    const formData = await req.formData();
    const params: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    // Check if POST data is empty
    if (Object.keys(params).length === 0) {
      console.error('POST is empty');
      return new Response('POST is empty', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Check if this is an IPN notification (must have vads_hash)
    if (!params['vads_hash']) {
      console.error('Not a Form API notification - missing vads_hash');
      return new Response('Not a Form API notification', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.log('Data received - Form API notification detected');

    // Get signature from params
    const signature = params['signature'];
    if (!signature) {
      console.error('No signature in IPN');
      return new Response('Missing signature', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Verify signature
    const certificate = Deno.env.get('SYSTEMPAY_CERTIFICATE');
    if (!certificate) {
      console.error('SYSTEMPAY_CERTIFICATE not configured');
      return new Response('Server configuration error', {
        status: 500,
        headers: corsHeaders,
      });
    }

    const isValid = await verifySignature(params, signature, certificate);
    if (!isValid) {
      console.error('An error occurred while computing the signature');
      return new Response('An error occurred while computing the signature', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.log('Signature verification successful');

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract payment information
    const transId = params['vads_trans_id'];
    const transUuid = params['vads_trans_uuid'];
    const devisId = params['vads_order_id'];
    const transStatus = params['vads_trans_status'];
    const authResult = params['vads_auth_result'];
    const amount = parseInt(params['vads_amount']);
    const cardBrand = params['vads_card_brand'];
    const cardNumber = params['vads_card_number'];
    const authNumber = params['vads_auth_number'];
    const paymentMethod = params['vads_payment_method'];

    // Determine payment status based on SystemPay documentation
    let paymentStatus = 'pending';
    const successStatuses = ['ACCEPTED', 'AUTHORISED', 'AUTHORISED_TO_VALIDATE', 'CAPTURED', 'INITIAL', 'UNDER_VERIFICATION', 'WAITING_AUTHORISATION', 'WAITING_AUTHORISATION_TO_VALIDATE', 'WAITING_FOR_PAYMENT'];

    if (successStatuses.includes(transStatus)) {
      paymentStatus = 'success';
    } else if (transStatus === 'REFUSED') {
      paymentStatus = 'failed';
    } else if (transStatus === 'CANCELLED') {
      paymentStatus = 'cancelled';
    } else if (transStatus === 'ABANDONED') {
      paymentStatus = 'abandoned';
    }

    console.log(`Transaction ${transId}: status=${transStatus}, mapped to payment_status=${paymentStatus}`);

    // Check if payment record exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', transId)
      .maybeSingle();

    if (existingPayment) {
      // Update existing payment record
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          transaction_uuid: transUuid,
          status: paymentStatus,
          payment_method: paymentMethod,
          card_brand: cardBrand,
          card_number: cardNumber,
          auth_number: authNumber,
          systempay_data: params,
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', transId);

      if (updateError) {
        console.error('Error updating payment:', updateError);
        throw updateError;
      }
    } else {
      // Create new payment record (in case it wasn't created by the form generation)
      console.log('Creating payment record from IPN');
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          devis_id: devisId,
          transaction_id: transId,
          transaction_uuid: transUuid,
          amount: amount,
          currency: 'EUR',
          status: paymentStatus,
          payment_method: paymentMethod,
          card_brand: cardBrand,
          card_number: cardNumber,
          auth_number: authNumber,
          systempay_data: params,
        });

      if (insertError) {
        console.error('Error creating payment:', insertError);
        throw insertError;
      }
    }

    // Update devis payment status if payment is successful
    if (paymentStatus === 'success') {
      const { error: devisError } = await supabase
        .from('devis')
        .update({
          payment_status: 'deposit_paid',
          statut: 'accepte',
          updated_at: new Date().toISOString(),
        })
        .eq('id', devisId);

      if (devisError) {
        console.error('Error updating devis:', devisError);
      } else {
        console.log(`Devis ${devisId} updated to deposit_paid`);
      }

      // Create notification for admin
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          type: 'payment_received',
          title: 'Paiement reçu',
          message: `Un acompte de ${(amount / 100).toFixed(2)}€ a été reçu pour le devis.`,
          metadata: {
            devis_id: devisId,
            transaction_id: transId,
            amount: amount / 100,
            card_brand: cardBrand,
          },
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }

      console.log(`Payment successful for devis ${devisId} - amount: ${(amount / 100).toFixed(2)}€`);
    }

    // Return success response (required by SystemPay)
    console.log('Order successfully updated');
    return new Response('Order successfully updated', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('An error occurred while updating the order:', error);
    return new Response('An error occurred while updating the order', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
});