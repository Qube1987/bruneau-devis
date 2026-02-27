import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

function cleanBase64(base64Data: string): string {
  let cleaned = base64Data
  const dataUriMatch = base64Data.match(/^data:[^;]+;base64,(.+)$/)
  if (dataUriMatch) {
    cleaned = dataUriMatch[1]
  } else if (base64Data.startsWith('data:')) {
    const commaIndex = base64Data.indexOf(',')
    if (commaIndex !== -1) {
      cleaned = base64Data.substring(commaIndex + 1)
    }
  }
  return cleaned.replace(/[\s\r\n]/g, '')
}

async function sendWithBrevo(apiKey: string, from: string, to: string, subject: string, html: string, pdfBase64: string, fileName: string) {
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
      bcc: [{ email: 'quentin@bruneau27.com' }],
      subject: subject,
      htmlContent: html,
      attachment: [{
        name: fileName,
        content: pdfBase64
      }]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Brevo API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

async function sendWithExchange(
  host: string,
  port: number,
  user: string,
  password: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  pdfBase64: string,
  fileName: string
) {
  console.log('Connecting to Exchange SMTP:', { host, port, user, from });

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port: port,
      tls: port === 465,
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
      bcc: 'quentin@bruneau27.com',
      subject: subject,
      content: html,
      html: html,
      attachments: [{
        filename: fileName,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf',
      }],
    });

    console.log('Email sent successfully via Exchange');
    await client.close();
  } catch (error) {
    console.error('Exchange SMTP error:', error);
    await client.close();
    throw error;
  }
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  pdfData: string;
  fileName: string;
  devisData: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    const startTime = Date.now();
    console.log('=== Email request received ===');
    console.log('Method:', req.method);
    console.log('Content-Type:', req.headers.get('content-type'));

    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Body size:', bodyText.length, 'bytes');
      requestBody = JSON.parse(bodyText);
      console.log('JSON parsed successfully');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { to, subject, html, pdfData, fileName }: EmailRequest = requestBody
    console.log('Request data extracted');

    if (!to || !subject || !pdfData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('PDF size received:', Math.round(pdfData.length / 1024), 'KB');

    // Déterminer le provider d'email à utiliser (par défaut: brevo)
    const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'brevo';
    const smtpFrom = Deno.env.get('SMTP_FROM') || 'quentin@bruneau27.com';

    console.log('Email Provider:', emailProvider);

    console.log('Cleaning PDF data...');
    const cleanPdfData = cleanBase64(pdfData);
    console.log('Cleaned PDF size:', Math.round(cleanPdfData.length / 1024), 'KB');

    // Envoyer avec le provider sélectionné
    if (emailProvider === 'exchange') {
      // Configuration Exchange
      const smtpHost = Deno.env.get('SMTP_HOST');
      const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
      const smtpUser = Deno.env.get('SMTP_USER');
      const smtpPassword = Deno.env.get('SMTP_PASSWORD');

      console.log('Exchange Config:', {
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

      console.log('Sending email via Exchange SMTP...');
      await sendWithExchange(
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        smtpFrom,
        to,
        subject,
        html,
        cleanPdfData,
        fileName
      );
    } else {
      // Configuration Brevo (par défaut)
      const brevoApiKey = Deno.env.get('BREVO_API_KEY');

      console.log('Brevo Config:', {
        from: smtpFrom,
        hasApiKey: !!brevoApiKey
      });

      if (!brevoApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'BREVO_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Sending email via Brevo API...');
      await sendWithBrevo(brevoApiKey, smtpFrom, to, subject, html, cleanPdfData, fileName);
    }

    const duration = Date.now() - startTime;
    console.log(`Email sent successfully via ${emailProvider} in ${duration}ms`);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending email:', error);
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