import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

async function sendWithBrevo(apiKey: string, from: string, to: string, subject: string, html: string) {
  console.log('[test-email] Sending via Brevo API...');
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Bruneau Protection',
        email: from
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error: ${response.status} - ${errorText}`);
  }

  console.log('[test-email] Email sent via Brevo successfully');
  return await response.json();
}

async function sendWithExchange(
  host: string,
  port: number,
  user: string,
  password: string,
  from: string,
  to: string,
  subject: string,
  html: string
) {
  console.log('[test-email] Connecting to Exchange SMTP:', { host, port, user, from });

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port: port,
      tls: true,
      auth: {
        username: user,
        password: password,
      },
    },
  });

  try {
    await client.send({
      from: from,
      to: to,
      subject: subject,
      content: html,
      html: html,
    });

    console.log('[test-email] Email sent via Exchange successfully');
    await client.close();
  } catch (error) {
    console.error('[test-email] Exchange SMTP error:', error);
    await client.close();
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    const { to } = await req.json()

    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing "to" email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Déterminer le provider d'email à utiliser (par défaut: brevo)
    const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'brevo';
    const smtpFrom = Deno.env.get('SMTP_FROM') || 'quentin@bruneau27.com';

    console.log('[test-email] Testing email to:', to);
    console.log('[test-email] Email Provider:', emailProvider);

    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body>
          <h1>🧪 Test Email</h1>
          <p>Ceci est un email de test envoyé à <strong>${to}</strong></p>
          <p>Si vous recevez cet email, la configuration <strong>${emailProvider.toUpperCase()}</strong> fonctionne correctement.</p>
          <hr>
          <p><small>Provider: ${emailProvider}</small></p>
          <p><small>Date: ${new Date().toISOString()}</small></p>
        </body>
      </html>
    `;

    // Envoyer avec le provider sélectionné
    if (emailProvider === 'exchange') {
      const smtpHost = Deno.env.get('SMTP_HOST');
      const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
      const smtpUser = Deno.env.get('SMTP_USER');
      const smtpPassword = Deno.env.get('SMTP_PASSWORD');

      console.log('[test-email] Exchange config:', {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        from: smtpFrom,
        hasPassword: !!smtpPassword
      });

      if (!smtpHost || !smtpUser || !smtpPassword) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Exchange SMTP configuration incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await sendWithExchange(smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, to, 'Test Email - Bruneau Protection', testHtml);
    } else {
      const brevoApiKey = Deno.env.get('BREVO_API_KEY');

      console.log('[test-email] Brevo config:', {
        from: smtpFrom,
        hasApiKey: !!brevoApiKey
      });

      if (!brevoApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'BREVO_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await sendWithBrevo(brevoApiKey, smtpFrom, to, 'Test Email - Bruneau Protection', testHtml);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test email sent successfully to ${to} via ${emailProvider}`,
        provider: emailProvider,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[test-email] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : ''
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})