import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

async function sendWithBrevo(apiKey: string, from: string, to: string, subject: string, html: string, pdfBase64?: string) {
  const emailPayload: any = {
    sender: {
      name: 'Bruneau Protection',
      email: from
    },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html,
  };

  // Ajouter le PDF en pièce jointe si fourni
  if (pdfBase64) {
    // Enlever le préfixe data:application/pdf;base64, si présent
    const base64Content = pdfBase64.includes('base64,')
      ? pdfBase64.split('base64,')[1]
      : pdfBase64;

    emailPayload.attachment = [{
      content: base64Content,
      name: 'devis-accepte.pdf'
    }];
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(emailPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error: ${response.status} - ${errorText}`);
  }

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
  console.log('[Exchange] Connecting to SMTP:', { host, port, user, from });

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
      subject: subject,
      content: html,
      html: html,
    });

    console.log('[Exchange] Email sent successfully');
    await client.close();
  } catch (error) {
    console.error('[Exchange] SMTP error:', error);
    await client.close();
    throw error;
  }
}

interface AcceptanceEmailRequest {
  clientEmail: string;
  clientName: string;
  companyEmail: string;
  pdfBase64?: string;
  devisData: {
    titre_affaire: string;
    client: {
      prenom: string;
      nom: string;
      telephone?: string;
      adresse?: string;
    };
    totaux: {
      ttc: number;
      acompte: number;
    };
    has_options?: boolean;
    accepted_at: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    console.log('[send-acceptance-email] Received request');
    const { clientEmail, clientName, companyEmail, pdfBase64, devisData }: AcceptanceEmailRequest = await req.json()

    console.log('[send-acceptance-email] Request data:', {
      clientEmail,
      clientName,
      companyEmail,
      titre: devisData?.titre_affaire,
      hasPDF: !!pdfBase64,
      hasOptions: devisData?.has_options
    });

    if (!clientEmail || !companyEmail || !devisData) {
      console.error('[send-acceptance-email] Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Déterminer le provider d'email à utiliser (par défaut: brevo)
    const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'brevo';
    const smtpFrom = Deno.env.get('SMTP_FROM') || 'quentin@bruneau27.com';

    console.log('[send-acceptance-email] Email Provider:', emailProvider);

    // Valider la configuration selon le provider
    if (emailProvider === 'exchange') {
      const smtpHost = Deno.env.get('SMTP_HOST');
      const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
      const smtpUser = Deno.env.get('SMTP_USER');
      const smtpPassword = Deno.env.get('SMTP_PASSWORD');

      console.log('[send-acceptance-email] Exchange config:', {
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
    } else {
      const brevoApiKey = Deno.env.get('BREVO_API_KEY');

      console.log('[send-acceptance-email] Brevo config:', {
        from: smtpFrom,
        hasApiKey: !!brevoApiKey
      });

      if (!brevoApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'BREVO_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const clientHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #29235C 0%, #1a1640 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #E72C63; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #29235C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-badge { display: inline-block; background: #fff3cd; color: #856404; padding: 8px 15px; border-radius: 5px; margin: 10px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Merci pour votre confiance !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${clientName},</p>

              <p>Nous vous remercions d'avoir accepté notre devis pour <strong>${devisData.titre_affaire}</strong>${devisData.has_options ? ' <strong>avec les options sélectionnées</strong>' : ''}.</p>

              <div class="highlight">
                <h2 style="margin: 0;">Montant total : ${devisData.totaux.ttc.toFixed(2)} € TTC</h2>
                ${devisData.has_options ? '<div class="info-badge" style="margin-top: 10px;">✓ Options incluses</div>' : ''}
                <!-- TEMPORAIREMENT MASQUÉ : <p style="margin: 10px 0 0 0;">Acompte à régler : ${devisData.totaux.acompte.toFixed(2)} €</p> -->
              </div>

              <p><strong>Prochaines étapes :</strong></p>
              <ul>
                <li>Nous vous contacterons dans les plus brefs délais pour planifier l'installation</li>
                <!-- TEMPORAIREMENT MASQUÉ : <li>L'acompte de ${devisData.totaux.acompte.toFixed(2)} € est à régler avant le début des travaux</li> -->
                <li>Les modalités de paiement seront discutées lors de notre prise de contact</li>
                <!-- TEMPORAIREMENT MASQUÉ : <li>Le solde sera payable à la livraison</li> -->
              </ul>

              ${pdfBase64 ? '<p><strong>📎 Le devis complet est joint à cet email.</strong></p>' : ''}

              <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>

              <p>Cordialement,<br>
              <strong>L'équipe Bruneau Protection</strong></p>
            </div>
            <div class="footer">
              <p>Bruneau Protection - Solutions de sécurité professionnelles</p>
            </div>
          </div>
        </body>
      </html>
    `

    const companyHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #29235C 0%, #1a1640 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #E72C63; margin: 15px 0; }
            .success { background: #E8F5E9; color: #2E7D32; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; }
            .badge { display: inline-block; background: #E72C63; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Nouveau devis accepté !</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>Un client vient d'accepter un devis${devisData.has_options ? ' avec options' : ''}</strong>
              </div>

              <h2>Informations du devis</h2>

              <div class="info-box">
                <p><strong>Projet :</strong> ${devisData.titre_affaire}${devisData.has_options ? '<span class="badge">Avec options</span>' : ''}</p>
              </div>

              <div class="info-box">
                <p><strong>Client :</strong> ${devisData.client.prenom} ${devisData.client.nom}</p>
                ${devisData.client.telephone ? `<p><strong>Téléphone :</strong> ${devisData.client.telephone}</p>` : ''}
                ${devisData.client.adresse ? `<p><strong>Adresse :</strong> ${devisData.client.adresse}</p>` : ''}
              </div>

              <div class="info-box">
                <p><strong>Montant total TTC :</strong> ${devisData.totaux.ttc.toFixed(2)} €</p>
                ${devisData.has_options ? '<p style="color: #E72C63; font-size: 14px;">✓ Ce montant inclut les options sélectionnées par le client</p>' : ''}
                <!-- TEMPORAIREMENT MASQUÉ : <p><strong>Acompte (40%) :</strong> ${devisData.totaux.acompte.toFixed(2)} €</p> -->
              </div>

              <div class="info-box">
                <p><strong>Date d'acceptation :</strong> ${new Date(devisData.accepted_at).toLocaleString('fr-FR')}</p>
              </div>

              ${pdfBase64 ? '<p><strong>📎 Le devis complet avec signature est joint à cet email.</strong></p>' : ''}

              <p><strong>Actions à faire :</strong></p>
              <ul>
                <li>Contacter le client pour planifier l'installation</li>
                <!-- TEMPORAIREMENT MASQUÉ : <li>Confirmer la réception de l'acompte</li> -->
                <li>Discuter des modalités de paiement</li>
                ${devisData.has_options ? '<li><strong>Vérifier les options sélectionnées dans le PDF joint</strong></li>' : ''}
                <li>Préparer le matériel nécessaire</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `

    let clientEmailSent = false;
    let companyEmailSent = false;
    let clientEmailError = null;
    let companyEmailError = null;

    // Fonction helper pour envoyer un email selon le provider
    async function sendEmail(to: string, subject: string, html: string, attachPdf: boolean = false) {
      const pdf = attachPdf ? pdfBase64 : undefined;

      if (emailProvider === 'exchange') {
        const smtpHost = Deno.env.get('SMTP_HOST')!;
        const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
        const smtpUser = Deno.env.get('SMTP_USER')!;
        const smtpPassword = Deno.env.get('SMTP_PASSWORD')!;

        // Note: Exchange SMTP via denomailer ne supporte pas facilement les pièces jointes
        // Le PDF sera disponible via lien de téléchargement dans l'interface
        await sendWithExchange(smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, to, subject, html);
      } else {
        const brevoApiKey = Deno.env.get('BREVO_API_KEY')!;
        await sendWithBrevo(brevoApiKey, smtpFrom, to, subject, html, pdf);
      }
    }

    console.log('[send-acceptance-email] Sending email to client:', clientEmail);
    try {
      await sendEmail(clientEmail, 'Confirmation d\'acceptation de votre devis', clientHtml, true);
      console.log('[send-acceptance-email] Client email sent successfully');
      clientEmailSent = true;
    } catch (error) {
      console.error('[send-acceptance-email] Failed to send client email:', error);
      console.error('[send-acceptance-email] Client email error details:', error instanceof Error ? error.stack : error);
      clientEmailError = error instanceof Error ? error.message : 'Unknown error';
    }

    console.log('[send-acceptance-email] Waiting 2 seconds before sending company email (rate limit prevention)...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('[send-acceptance-email] Sending email to company:', companyEmail);
    try {
      await sendEmail(companyEmail, `✅ Devis accepté - ${devisData.client.prenom} ${devisData.client.nom}`, companyHtml, true);
      console.log('[send-acceptance-email] Company email sent successfully');
      companyEmailSent = true;
    } catch (error) {
      console.error('[send-acceptance-email] Failed to send company email:', error);
      console.error('[send-acceptance-email] Company email error details:', error instanceof Error ? error.stack : error);
      companyEmailError = error instanceof Error ? error.message : 'Unknown error';
    }

    if (!clientEmailSent && !companyEmailSent) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send both emails',
          details: {
            clientError: clientEmailError,
            companyError: companyEmailError
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const message = clientEmailSent && companyEmailSent
      ? 'Emails sent successfully'
      : clientEmailSent
      ? 'Client email sent, but company email failed'
      : 'Company email sent, but client email failed';

    return new Response(
      JSON.stringify({
        success: true,
        message,
        partialSuccess: !clientEmailSent || !companyEmailSent,
        details: {
          clientEmailSent,
          companyEmailSent,
          clientError: clientEmailError,
          companyError: companyEmailError
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
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