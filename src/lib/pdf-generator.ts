import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Devis, Product } from '../types';
import { getPublicImageUrl, imageUrlToBase64, STORAGE_BUCKETS } from './supabase';

interface SelectedOption {
  product: Product;
  quantity: number;
}

async function compressImage(base64: string, maxWidth: number = 200, quality: number = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export const generatePDF = async (
  devis: Devis,
  returnBase64: boolean = false,
  logoBase64?: string,
  selectedOptions?: SelectedOption[],
  customQuantities?: { [lineId: string]: number }
): Promise<string | void> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  const primaryColor = '#29235C';
  const accentColor = '#E72C63';
  const lightGray = '#F5F5F5';

  let yPos = 0;

  // En-tête bleu foncé avec logo et "DEVIS"
  pdf.setFillColor(41, 35, 92);
  pdf.rect(0, 0, pageWidth, 35, 'F');

  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, 'PNG', margin, 8, 50, 16);
    } catch (error) {
      console.error('Erreur lors du chargement du logo:', error);
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  const devisTitle = devis.devis_number ? `${devis.devis_number}` : 'DEVIS';
  pdf.text(devisTitle, pageWidth - margin, 23, { align: 'right' });

  yPos = 45;

  // Encadré blanc avec informations client
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(220, 220, 220);
  pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 28, 3, 3, 'FD');

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLIENT :', margin + 5, yPos + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const clientName = `${devis.client.prenom || ''} ${devis.client.nom || ''}`.trim();
  pdf.text(clientName, margin + 5, yPos + 11);
  pdf.text(devis.client.adresse || '', margin + 5, yPos + 15);
  pdf.text(`${devis.client.code_postal || ''} ${devis.client.ville || ''}`, margin + 5, yPos + 19);
  pdf.text(devis.client.telephone || '', margin + 5, yPos + 23);

  // Date et validité à droite
  const dateText = `Date : ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`;
  const validityText = 'Validité : 30 jours';
  pdf.text(dateText, pageWidth - margin - 5, yPos + 11, { align: 'right' });
  pdf.text(validityText, pageWidth - margin - 5, yPos + 15, { align: 'right' });

  yPos += 33;

  // Liste des produits avec cartes - convertir et compresser les images
  console.log('Converting and compressing product images...');
  const productImages = await Promise.all(
    devis.lignes.map(async (line) => {
      // Priorité 1: media_items (nouveau système) - prendre la première image seulement
      if (line.product?.media_items && line.product.media_items.length > 0) {
        const primaryMedia = line.product.media_items[0];
        if (primaryMedia && primaryMedia.media_type === 'image') {
          const imagePath = primaryMedia.thumbnail_path || primaryMedia.file_path;

          let base64Image: string | null = null;
          if (imagePath.startsWith('data:')) {
            base64Image = imagePath;
          } else {
            const publicUrl = getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, imagePath);
            if (publicUrl) {
              base64Image = await imageUrlToBase64(publicUrl);
            }
          }

          if (base64Image) {
            const compressed = await compressImage(base64Image, 200, 0.6);
            console.log(`Compressed ${line.product?.name}: ${Math.round(base64Image.length/1024)}KB -> ${Math.round(compressed.length/1024)}KB`);
            return compressed;
          }
        }
      }

      // Priorité 2: photo_square_path (plus petit) puis photo_path
      const imagePath = line.product?.photo_square_path || line.product?.photo_path;
      if (!imagePath || imagePath.trim() === '') return null;

      let base64Image: string | null = null;
      if (imagePath.startsWith('data:')) {
        base64Image = imagePath;
      } else {
        const publicUrl = getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, imagePath);
        if (publicUrl) {
          base64Image = await imageUrlToBase64(publicUrl);
        }
      }

      if (base64Image) {
        const compressed = await compressImage(base64Image, 200, 0.6);
        console.log(`Compressed ${line.product?.name}: ${Math.round(base64Image.length/1024)}KB -> ${Math.round(compressed.length/1024)}KB`);
        return compressed;
      }

      return null;
    })
  );
  console.log('All images processed.');

  for (let index = 0; index < devis.lignes.length; index++) {
    const line = devis.lignes[index];
    const imageBase64 = productImages[index];

    const cardHeight = 32;
    const imageSize = 30;
    const contentX = margin + 6;
    const imageX = contentX + 1;

    if (yPos + cardHeight > pageHeight - 25) {
      pdf.addPage();
      yPos = margin;
    }

    // Fond de carte
    pdf.setFillColor(245, 245, 245);
    pdf.setDrawColor(230, 230, 230);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, cardHeight, 3, 3, 'FD');

    // Image du produit
    if (imageBase64) {
      try {
        let imageFormat = 'JPEG';
        if (imageBase64.includes('data:image/png')) {
          imageFormat = 'PNG';
        }
        pdf.addImage(imageBase64, imageFormat, imageX, yPos + 1, imageSize, imageSize);

        // Badge PDF P3/P4/P5
        const badge = line.product?.reference?.includes('P3') ? 'PDF P3' :
                     line.product?.reference?.includes('P4') ? 'PDF P4' :
                     line.product?.reference?.includes('P5') ? 'PDF P5' : '';

        if (badge) {
          pdf.setFillColor(41, 35, 92);
          pdf.rect(imageX, yPos + 1, 18, 6, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.text(badge, imageX + 9, yPos + 5, { align: 'center' });
        }
      } catch (error) {
        console.error('Error adding product image:', error);
        pdf.setFillColor(220, 220, 220);
        pdf.rect(imageX, yPos + 1, imageSize, imageSize, 'F');
      }
    } else {
      pdf.setFillColor(220, 220, 220);
      pdf.rect(imageX, yPos + 1, imageSize, imageSize, 'F');
    }

    // Contenu texte
    const textX = imageX + imageSize + 5;
    const rightX = pageWidth - margin - 5;

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const nameLines = pdf.splitTextToSize(line.name, rightX - textX - 35);
    pdf.text(nameLines[0] || line.name, textX, yPos + 7);

    // Description
    const description = line.product?.description_short || '';
    if (description) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      const descLines = pdf.splitTextToSize(description, rightX - textX - 35);
      const maxLines = 3;
      for (let i = 0; i < Math.min(descLines.length, maxLines); i++) {
        pdf.text(descLines[i], textX, yPos + 12 + (i * 3.5));
      }
    }

    // Quantité et prix à droite
    const quantity = customQuantities?.[line.id] ?? line.quantity;
    const totalHT = line.price_ht * quantity;
    const totalTTC = totalHT * (1 + line.vat_rate / 100);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Qte', rightX - 30, yPos + 7, { align: 'right' });
    pdf.text('Total TTC', rightX, yPos + 7, { align: 'right' });

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(quantity.toString(), rightX - 30, yPos + 15, { align: 'right' });
    pdf.text(`${totalTTC.toFixed(2)} €`, rightX, yPos + 15, { align: 'right' });

    yPos += cardHeight + 3;
  }

  // Section Options
  if (selectedOptions && selectedOptions.length > 0) {
    yPos += 5;

    if (yPos + 15 > pageHeight - 20) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFillColor(231, 44, 99);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OPTIONS AJOUTÉES', margin + 5, yPos + 5.5);

    yPos += 11;

    for (const option of selectedOptions) {
      const cardHeight = 25;

      if (yPos + cardHeight > pageHeight - 25) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFillColor(255, 250, 250);
      pdf.setDrawColor(231, 44, 99);
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, cardHeight, 3, 3, 'FD');

      const contentX = margin + 5;
      const rightX = pageWidth - margin - 5;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(option.product.name, contentX, yPos + 7);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(option.product.reference, contentX, yPos + 12);

      const totalHT = option.product.price_ht * option.quantity;
      const totalTTC = totalHT * (1 + option.product.default_vat_rate / 100);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Qte', rightX - 30, yPos + 7, { align: 'right' });
      pdf.text('Total TTC', rightX, yPos + 7, { align: 'right' });

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(231, 44, 99);
      pdf.text(option.quantity.toString(), rightX - 30, yPos + 14, { align: 'right' });
      pdf.text(`${totalTTC.toFixed(2)} €`, rightX, yPos + 14, { align: 'right' });

      yPos += cardHeight + 3;
    }
  }

  // Section totaux
  yPos += 8;
  if (yPos + 50 > pageHeight - 20) {
    pdf.addPage();
    yPos = margin;
  }

  // Calcul des totaux avec quantités personnalisées et options
  let baseHT = 0;
  let baseTVA: { [key: string]: number } = {};

  devis.lignes.forEach((line) => {
    const quantity = customQuantities?.[line.id] ?? line.quantity;
    const lineHT = line.price_ht * quantity;
    const vatRate = line.vat_rate;
    const lineTVA = lineHT * (vatRate / 100);

    baseHT += lineHT;
    baseTVA[vatRate] = (baseTVA[vatRate] || 0) + lineTVA;
  });

  let optionsHT = 0;
  let optionsTVA: { [key: string]: number } = {};

  if (selectedOptions && selectedOptions.length > 0) {
    selectedOptions.forEach(option => {
      const lineHT = option.product.price_ht * option.quantity;
      const vatRate = option.product.default_vat_rate;
      const lineTVA = lineHT * (vatRate / 100);

      optionsHT += lineHT;
      optionsTVA[vatRate] = (optionsTVA[vatRate] || 0) + lineTVA;
    });
  }

  const totalHT = baseHT + optionsHT;
  const totalTVA = { ...baseTVA };

  Object.entries(optionsTVA).forEach(([rate, amount]) => {
    totalTVA[rate] = (totalTVA[rate] || 0) + amount;
  });

  const totalTVAAmount = Object.values(totalTVA).reduce((a, b) => a + b, 0);
  const totalTTC = totalHT + totalTVAAmount;
  const acompte = totalTTC * 0.4;

  // Bloc Règlement (à gauche)
  const reglementX = margin;
  const reglementWidth = 95;
  const reglementHeight = optionsHT > 0 ? 55 : 45;

  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(reglementX, yPos, reglementWidth, reglementHeight, 2, 2, 'F');

  pdf.setTextColor(41, 35, 92);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RÈGLEMENT', reglementX + 5, yPos + 6);

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');

  let reglementYPos = yPos + 11;
  pdf.text('Mode de règlement :', reglementX + 5, reglementYPos);
  reglementYPos += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Chèque / Virement', reglementX + 5, reglementYPos);

  reglementYPos += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('BANQUE : CAISSE D\'ÉPARGNE', reglementX + 5, reglementYPos);
  reglementYPos += 4;
  pdf.text('Destinataire :', reglementX + 5, reglementYPos);
  reglementYPos += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('SARL Jean-Marie BRUNEAU', reglementX + 5, reglementYPos);

  reglementYPos += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.text('IBAN :', reglementX + 5, reglementYPos);
  reglementYPos += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('FR76 1142 5009 0008 0046 3591 972', reglementX + 5, reglementYPos);

  reglementYPos += 4;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('BIC :', reglementX + 5, reglementYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CEPAFRPP142', reglementX + 20, reglementYPos);

  // Bloc Totaux (à droite)
  const totalsX = pageWidth - margin - 80;

  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(totalsX, yPos, 80, optionsHT > 0 ? 55 : 45, 2, 2, 'F');

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  let totalsYPos = yPos + 8;

  const hasCustomQuantities = customQuantities && Object.keys(customQuantities).length > 0;

  if (hasCustomQuantities || optionsHT > 0) {
    pdf.text('Total HT base :', totalsX + 5, totalsYPos);
    pdf.text(`${baseHT.toFixed(2)} €`, totalsX + 75, totalsYPos, { align: 'right' });
    totalsYPos += 7;

    if (optionsHT > 0) {
      pdf.setTextColor(231, 44, 99);
      pdf.text('Options HT :', totalsX + 5, totalsYPos);
      pdf.text(`${optionsHT.toFixed(2)} €`, totalsX + 75, totalsYPos, { align: 'right' });
      totalsYPos += 7;
      pdf.setTextColor(0, 0, 0);
    }
  }

  pdf.text('Total HT :', totalsX + 5, totalsYPos);
  pdf.text(`${totalHT.toFixed(2)} €`, totalsX + 75, totalsYPos, { align: 'right' });
  totalsYPos += 7;

  pdf.text('TVA :', totalsX + 5, totalsYPos);
  pdf.text(`${totalTVAAmount.toFixed(2)} €`, totalsX + 75, totalsYPos, { align: 'right' });
  totalsYPos += 7;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('Total TTC :', totalsX + 5, totalsYPos);
  pdf.text(`${totalTTC.toFixed(2)} €`, totalsX + 75, totalsYPos, { align: 'right' });
  totalsYPos += 7;

  pdf.setTextColor(231, 44, 99);
  pdf.setFontSize(11);
  pdf.text(`Acompte (40%) : ${acompte.toFixed(2)} €`, totalsX + 5, totalsYPos);

  // Observations si disponibles
  if (devis.observations && devis.observations.trim() !== '') {
    yPos += optionsHT > 0 ? 60 : 50;

    if (yPos + 30 > pageHeight - 20) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFillColor(245, 245, 245);
    pdf.setDrawColor(200, 200, 200);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 5, 2, 2);

    pdf.setTextColor(41, 35, 92);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OBSERVATIONS', margin + 5, yPos + 3.5);

    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    const observationsLines = pdf.splitTextToSize(devis.observations, pageWidth - 2 * margin - 10);

    for (let i = 0; i < observationsLines.length; i++) {
      if (yPos > pageHeight - 25) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text(observationsLines[i], margin + 5, yPos);
      yPos += 5;
    }
  }

  // Croquis si disponible
  if (devis.croquis_path) {
    let croquisBase64: string | null = devis.croquis_path;

    if (!croquisBase64.startsWith('data:')) {
      const publicUrl = getPublicImageUrl(STORAGE_BUCKETS.CROQUIS, croquisBase64);
      if (publicUrl) {
        croquisBase64 = await imageUrlToBase64(publicUrl);
      }
    }

    if (croquisBase64) {
      pdf.addPage();
      pdf.setFontSize(18);
      pdf.setTextColor(41, 35, 92);
      pdf.text('ANNEXE - Croquis de l\'installation', margin, 30);

      try {
        const maxWidth = pageWidth - 2 * margin;
        const maxHeight = 200;
        pdf.addImage(croquisBase64, 'PNG', margin, 50, maxWidth, maxHeight);
      } catch (error) {
        console.error('Error adding croquis to PDF:', error);
      }
    }
  }

  // Photos si disponibles
  if (devis.photos && devis.photos.length > 0) {
    pdf.addPage();
    pdf.setFontSize(18);
    pdf.setTextColor(41, 35, 92);
    pdf.text('ANNEXE - Photos', margin, 30);

    let photoYPos = 45;
    const photoMaxWidth = pageWidth - 2 * margin;
    const photoMaxHeight = 160;
    let photoIndex = 0;

    for (const photo of devis.photos) {
      try {
        const compressed = await compressImage(photo, 800, 0.85);

        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = compressed;
        });

        const aspectRatio = img.width / img.height;
        let displayWidth = photoMaxWidth;
        let displayHeight = displayWidth / aspectRatio;

        if (displayHeight > photoMaxHeight) {
          displayHeight = photoMaxHeight;
          displayWidth = displayHeight * aspectRatio;
        }

        const xPos = margin + (photoMaxWidth - displayWidth) / 2;

        if (photoYPos + displayHeight > pageHeight - 20) {
          pdf.addPage();
          photoYPos = margin;
          pdf.setFontSize(18);
          pdf.setTextColor(41, 35, 92);
          pdf.text('ANNEXE - Photos (suite)', margin, 20);
          photoYPos = 30;
        }

        let imageFormat = 'JPEG';
        if (compressed.includes('data:image/png')) {
          imageFormat = 'PNG';
        }

        pdf.addImage(compressed, imageFormat, xPos, photoYPos, displayWidth, displayHeight);

        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Photo ${photoIndex + 1}`, margin, photoYPos + displayHeight + 5);

        photoYPos += displayHeight + 15;
        photoIndex++;
      } catch (error) {
        console.error('Error adding photo to PDF:', error);
      }
    }
  }

  if (returnBase64) {
    return pdf.output('datauristring');
  } else {
    const fileName = `devis-${format(new Date(), 'yyyyMMdd')}.pdf`;
    pdf.save(fileName);
  }
};