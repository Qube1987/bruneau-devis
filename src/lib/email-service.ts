import { supabase } from './supabase';
import { Devis } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface EmailOptions {
  to: string;
  subject?: string;
  message?: string;
}

export const sendDevisEmail = async (
  devis: Devis,
  pdfData: string,
  options: EmailOptions,
  devisToken?: string,
  paymentToken?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const sanitizedNom = devis.client.nom.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `devis-${format(new Date(), 'yyyyMMdd')}-${sanitizedNom}.pdf`;

    const devisUrl = devisToken
      ? `${window.location.origin}/devis/${devisToken}`
      : null;

    const paymentUrl = paymentToken
      ? `${window.location.origin}/payment/${paymentToken}`
      : null;

    const isUpsellEntretien = devis.devis_type === 'upsell_entretien';
    const devisReference = devis.devis_number ? `${devis.devis_number} - ` : '';
    const defaultSubject = isUpsellEntretien
      ? `Votre visite d'entretien - quelques idées d'amélioration`
      : `${devisReference}${devis.titre_affaire} - Bruneau Protection`;

    const mainMessage = isUpsellEntretien
      ? `<p>Votre visite d'entretien aura lieu dans quelques jours. C'est peut-être l'occasion d'envisager quelques compléments intéressants pour étoffer la sécurité de votre domicile.</p>

         <p>Nous vous proposons ici une sélection de produits qui pourraient être installés lors de la visite du technicien, <strong>vous faisant ainsi économiser les frais d'installation !</strong></p>

         <p>N'hésitez pas à prendre contact ou à faire vous-même votre panier via le devis modifiable en ligne.</p>`
      : `<p>Nous vous remercions de votre confiance et avons le plaisir de vous transmettre votre devis pour : <h3 style="margin: 0; color: #29235C;">${devisReference}${devis.titre_affaire}</h3></p>`;

    const defaultMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #29235C; color: white; padding: 20px; text-align: center;">
          <h1>Bruneau Protection</h1>
          <p>${isUpsellEntretien ? 'Suggestion d\'équipements complémentaires' : 'Votre devis personnalisé'}</p>
        </div>

        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #29235C;">Bonjour ${devis.client.prenom} ${devis.client.nom},</h2>

          ${mainMessage}

          ${devis.intro_text ? `
          <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #29235C;">
            <p style="color: #333; line-height: 1.6; margin: 0; font-size: 15px;">${devis.intro_text.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}

          <p><strong>Ce devis est optimisé pour une consultation en ligne</strong>, accessible via le bouton ci-dessous :</p>

          ${options.message ? `<div style="background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4 style="color: #29235C;">Message personnalisé :</h4>
            <p>${options.message.replace(/\n/g, '<br>')}</p>
          </div>` : ''}

          ${devisUrl ? `
          <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
              <tr>
                <td bgcolor="#29235C" style="background-color: #29235C; border-radius: 5px; padding: 12px 30px;">
                  <a href="${devisUrl}" style="color: #ffffff !important; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                    Voir le devis en ligne
                  </a>
                </td>
              </tr>
            </table>
            <p style="color: #999; font-size: 12px; margin-top: 15px;">Vous pourrez accepter et éditer le devis depuis cette page</p>
          </div>
          ` : ''}

          <p>Le devis PDF officiel est joint à cet emai pour conservation et impression.</p>

          <div style="background-color: #E72C63; color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin: 0;">⏰ Validité du devis : 30 jours</h4>
            <p style="margin: 5px 0;">Ce devis est valable jusqu'au ${format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy', { locale: fr })}</p>
          </div>

          <p>Pour toute question ou pour valider votre commande, n'hésitez pas à nous contacter :</p>

          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            <p style="margin: 5px 0;"><strong>📞 Téléphone :</strong> 02 32 51 77 00</p>
            <p style="margin: 5px 0;"><strong>📧 Email :</strong> info@bruneau27.com</p>
            <p style="margin: 5px 0;"><strong>🌐 Site web :</strong> www.bruneau27.com</p>
          </div>

          <p style="margin-top: 30px;">Nous restons à votre disposition et vous remercions de votre confiance.</p>

          <p style="color: #29235C; font-weight: bold;">L'équipe Bruneau Protection</p>
        </div>

        <div style="background-color: #29235C; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 Bruneau Protection - Tous droits réservés</p>
        </div>
      </div>
    `;

    console.log('Invoking send-devis-email function...');

    const { data, error } = await supabase.functions.invoke('send-devis-email', {
      body: {
        to: options.to,
        subject: options.subject || defaultSubject,
        html: defaultMessage,
        pdfData: pdfData,
        fileName: fileName,
        devisData: devis
      }
    });

    console.log('Function invocation result:', { data, error });

    if (error) {
      console.error('Supabase function error:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'appel de la fonction' };
    }

    if (!data) {
      console.error('No data returned from function');
      return { success: false, error: 'Aucune réponse de la fonction d\'envoi' };
    }

    if (!data.success) {
      console.error('Email service error:', data.error);
      if (data.details) {
        console.error('Error details:', data.details);
      }
      return {
        success: false,
        error: data.error || 'Erreur du service d\'envoi'
      };
    }

    console.log('Email sent successfully');
    return { success: true };

  } catch (error) {
    console.error('Email sending failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};