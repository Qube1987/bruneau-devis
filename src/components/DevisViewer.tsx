import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Phone, AlertCircle, Loader, X, ZoomIn, ChevronLeft, ChevronRight, Maximize2, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Devis, Product } from '../types';
import { supabase, getPublicImageUrl, STORAGE_BUCKETS } from '../lib/supabase';
import { generatePDF } from '../lib/pdf-generator';
import { AcceptanceDocument } from './AcceptanceDocument';

interface DevisViewerProps {
  token: string;
}

interface ProductModalData {
  product: Product;
  lineName: string;
}

export const DevisViewer: React.FC<DevisViewerProps> = ({ token }) => {
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [selectedProductModal, setSelectedProductModal] = useState<ProductModalData | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [optionalProducts, setOptionalProducts] = useState<Product[]>([]);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<{ [productId: string]: number }>({});
  const [customQuantities, setCustomQuantities] = useState<{ [lineId: string]: number }>({});
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDevis();
    loadLogo();
    loadOptionalProducts();
  }, [token]);

  const loadLogo = async () => {
    try {
      const response = await fetch('/BRUNEAU_PROTECTION_LOGO_QUADRI_RESERVE.png');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => setLogoBase64(reader.result as string);
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  };

  const loadDevis = async () => {
    try {
      console.log('Loading devis with token:', token);
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('devis')
        .select('*')
        .eq('access_token', token)
        .maybeSingle();

      console.log('Devis fetch result:', { data, error: fetchError });

      if (fetchError) throw fetchError;
      if (!data) {
        setError('Devis introuvable ou lien expiré');
        return;
      }

      const lignesWithProducts = await Promise.all(
        (data.lignes || []).map(async (line: any) => {
          if (line.product_id) {
            const { data: product } = await supabase
              .from('products')
              .select('*')
              .eq('id', line.product_id)
              .maybeSingle();

            if (product) {
              const { data: mediaItems } = await supabase
                .from('product_media')
                .select('*')
                .eq('product_id', product.id)
                .order('display_order', { ascending: true });

              return {
                ...line,
                ref_extrabat: product.ref_extrabat || null,
                product: {
                  ...product,
                  media_items: mediaItems || []
                }
              };
            }

            return {
              ...line,
              ref_extrabat: product?.ref_extrabat || null,
              product: product || undefined
            };
          }
          return line;
        })
      );

      const formattedDevis: Devis = {
        id: data.id,
        client: data.client,
        titre_affaire: data.titre_affaire,
        taux_tva: data.taux_tva || 20,
        lignes: lignesWithProducts,
        totaux: data.totaux,
        observations: data.observations || '',
        options: data.options || {},
        signatures: data.signatures || {},
        status: data.status,
        croquis_path: data.croquis_path,
        photos: data.photos || undefined,
        access_token: data.access_token,
        public_token: data.public_token,
        accepted_at: data.accepted_at,
        accepted_status: data.accepted_status || 'pending',
        custom_quantities: data.custom_quantities || {},
        intro_text: data.intro_text || undefined,
        devis_number: data.devis_number,
        created_at: data.created_at
      };

      setDevis(formattedDevis);
      setCustomQuantities(data.custom_quantities || {});
    } catch (err) {
      console.error('Error loading devis:', err);
      setError('Erreur lors du chargement du devis');
    } finally {
      setLoading(false);
    }
  };

  const loadOptionalProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('proposer_en_option', true)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      const productsWithMedia = await Promise.all(
        (data || []).map(async (product) => {
          const { data: mediaItems } = await supabase
            .from('product_media')
            .select('*')
            .eq('product_id', product.id)
            .order('display_order', { ascending: true });

          return {
            ...product,
            media_items: mediaItems || []
          };
        })
      );

      setOptionalProducts(productsWithMedia);
    } catch (error) {
      console.error('Error loading optional products:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!devis || !logoBase64) return;

    try {
      const pdfData: Devis = { ...devis };

      const optionsArray = Object.entries(selectedOptions)
        .filter(([_, quantity]) => quantity > 0)
        .map(([productId, quantity]) => {
          const product = optionalProducts.find(p => p.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter((item): item is { product: any; quantity: number } => item !== null);

      await generatePDF(pdfData, false, logoBase64, optionsArray, customQuantities);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const handleOptionQuantityChange = (productId: string, delta: number) => {
    setSelectedOptions(prev => {
      const currentQuantity = prev[productId] || 0;
      const newQuantity = Math.max(0, currentQuantity + delta);

      if (newQuantity === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [productId]: newQuantity };
    });
  };

  const handleLineQuantityChange = async (lineId: string, delta: number) => {
    if (!devis || isAccepted) return;

    const line = devis.lignes.find(l => l.id === lineId);
    if (!line) return;

    const currentQuantity = customQuantities[lineId] ?? line.quantity;
    const newQuantity = Math.max(1, currentQuantity + delta);

    const updatedQuantities = { ...customQuantities };

    if (newQuantity === line.quantity) {
      delete updatedQuantities[lineId];
    } else {
      updatedQuantities[lineId] = newQuantity;
    }

    setCustomQuantities(updatedQuantities);

    try {
      const { error } = await supabase
        .from('devis')
        .update({ custom_quantities: Object.keys(updatedQuantities).length > 0 ? updatedQuantities : null })
        .eq('access_token', token);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving custom quantities:', error);
    }
  };

  const calculateTotalsWithOptions = () => {
    if (!devis) return devis?.totaux;

    let baseHT = 0;
    let baseTVA: { [key: string]: number } = {};

    devis.lignes.forEach((line) => {
      const quantity = customQuantities[line.id] ?? line.quantity;
      const lineHT = line.price_ht * quantity;
      const vatRate = line.vat_rate;
      const lineTVA = lineHT * (vatRate / 100);

      baseHT += lineHT;
      baseTVA[vatRate] = (baseTVA[vatRate] || 0) + lineTVA;
    });

    let optionsHT = 0;
    let optionsTVA: { [key: string]: number } = {};

    Object.entries(selectedOptions).forEach(([productId, quantity]) => {
      const product = optionalProducts.find(p => p.id === productId);
      if (product && quantity > 0) {
        const lineHT = product.price_ht * quantity;
        const vatRate = product.default_vat_rate;
        const lineTVA = lineHT * (vatRate / 100);

        optionsHT += lineHT;
        optionsTVA[vatRate] = (optionsTVA[vatRate] || 0) + lineTVA;
      }
    });

    const totalHT = baseHT + optionsHT;
    const totalTVA = { ...baseTVA };

    Object.entries(optionsTVA).forEach(([rate, amount]) => {
      totalTVA[rate] = (totalTVA[rate] || 0) + amount;
    });

    const totalTTCAmount = totalHT + Object.values(totalTVA).reduce((a, b) => a + b, 0);

    return {
      ht: totalHT,
      tva: totalTVA,
      ttc: totalTTCAmount,
      acompte: totalTTCAmount * 0.4,
      baseHT,
      optionsHT,
      optionsTVA: Object.values(optionsTVA).reduce((a, b) => a + b, 0)
    };
  };

  const groupProductsByCategory = () => {
    const grouped: { [category: string]: Product[] } = {};
    optionalProducts.forEach(product => {
      if (!grouped[product.category]) {
        grouped[product.category] = [];
      }
      grouped[product.category].push(product);
    });
    return grouped;
  };

  const handleAcceptDevis = async (signatureData: string, signatoryName: string, acceptedTerms: boolean) => {
    if (!devis || !signatoryName || !acceptedTerms) return;

    try {
      setAccepting(true);

      const acceptedAt = new Date().toISOString();

      const updatedSignatures = {
        ...devis.signatures,
        acceptance: {
          signatory_name: signatoryName,
          accepted_at: acceptedAt,
          accepted_terms: acceptedTerms
        }
      };

      const selectedOptionsArray = Object.entries(selectedOptions)
        .filter(([_, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({
          product_id: productId,
          quantity
        }));

      const { error: updateError } = await supabase
        .from('devis')
        .update({
          accepted_status: 'accepted',
          accepted_at: acceptedAt,
          accepted_ip: 'web-client',
          signatures: updatedSignatures,
          selected_options: selectedOptionsArray
        })
        .eq('access_token', token);

      if (updateError) throw updateError;

      // Save notification in database for reliable tracking
      const totals = calculateTotalsWithOptions();
      const notificationData = {
        type: 'devis_accepted',
        devis_id: devis.id,
        title: `Nouveau devis accepté - ${devis.client.prenom} ${devis.client.nom}`,
        message: `Le devis "${devis.titre_affaire}" a été accepté par ${devis.client.prenom} ${devis.client.nom}${selectedOptionsArray.length > 0 ? ' avec options' : ''}`,
        metadata: {
          client: devis.client,
          titre_affaire: devis.titre_affaire,
          montant_ttc: totals?.ttc || devis.totaux.ttc,
          acompte: totals?.acompte || devis.totaux.acompte,
          has_options: selectedOptionsArray.length > 0,
          accepted_at: acceptedAt
        },
        read: false
      };

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (notificationError) {
        console.error('Error saving notification:', notificationError);
      } else {
        console.log('Notification saved successfully');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const companyEmail = import.meta.env.VITE_COMPANY_EMAIL || 'quentin@bruneau27.com';

      if (devis.client.email) {
        try {
          console.log('Sending acceptance email to:', devis.client.email);
          console.log('Company email:', companyEmail);

          // Générer le PDF avec les options
          console.log('Generating PDF with options...');
          const optionsArray = selectedOptionsArray.map(opt => {
            const product = optionalProducts.find(p => p.id === opt.product_id);
            return product ? { product, quantity: opt.quantity } : null;
          }).filter((item): item is { product: any; quantity: number } => item !== null);

          const pdfBase64 = await generatePDF(devis, true, logoBase64, optionsArray, customQuantities) as string;
          console.log('PDF generated successfully');

          const response = await fetch(`${supabaseUrl}/functions/v1/send-acceptance-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              clientEmail: devis.client.email,
              clientName: `${devis.client.prenom} ${devis.client.nom}`,
              companyEmail: companyEmail,
              pdfBase64: pdfBase64,
              devisData: {
                titre_affaire: devis.titre_affaire,
                client: devis.client,
                totaux: totals || devis.totaux,
                has_options: selectedOptionsArray.length > 0,
                accepted_at: acceptedAt
              }
            })
          });

          const responseData = await response.json();
          console.log('Email API response status:', response.status);
          console.log('Email API response:', responseData);

          if (!response.ok) {
            console.error('Failed to send acceptance emails. Status:', response.status, 'Response:', responseData);
            alert('Note : Le devis a été accepté, mais l\'envoi des emails de confirmation a échoué. Nous vous contacterons prochainement.');
          } else if (responseData.partialSuccess) {
            console.warn('Partial success:', responseData.message);
            if (responseData.details?.companyEmailSent && !responseData.details?.clientEmailSent) {
              alert('Note : Le devis a été accepté. Une notification a été envoyée à notre équipe, mais nous n\'avons pas pu envoyer l\'email de confirmation au client. Nous vous contacterons prochainement.');
            } else {
              console.log('Client email sent, company notification may have failed but will be handled internally');
            }
          } else {
            console.log('Acceptance emails sent successfully to both client and company');
          }
        } catch (emailError) {
          console.error('Error sending acceptance emails:', emailError);
          alert('Note : Le devis a été accepté, mais l\'envoi des emails de confirmation a échoué. Nous vous contacterons prochainement.');
        }
      } else {
        console.warn('No client email available, skipping acceptance email');
      }

      await loadDevis();
      setShowAcceptModal(false);
      alert('Devis accepté avec succès ! Nous vous contacterons prochainement.');
    } catch (error) {
      console.error('Error accepting devis:', error);
      alert('Erreur lors de l\'acceptation du devis');
    } finally {
      setAccepting(false);
    }
  };

  const getProductMedia = (product: Product & { media_items?: any[] }) => {
    const media: Array<{ type: 'image' | 'video'; url: string }> = [];

    if (product.media_items && product.media_items.length > 0) {
      product.media_items.forEach((item) => {
        media.push({
          type: item.media_type as 'image' | 'video',
          url: getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, item.file_path) || ''
        });
      });
    } else {
      if (product.photo_square_path) {
        media.push({
          type: 'image',
          url: getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, product.photo_square_path) || ''
        });
      }

      if (product.photo_path && product.photo_path !== product.photo_square_path) {
        media.push({
          type: 'image',
          url: getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, product.photo_path) || ''
        });
      }
    }

    return media;
  };

  const handleOpenProductModal = (product: Product, lineName: string) => {
    setSelectedProductModal({ product, lineName });
    setCurrentMediaIndex(0);
    setIsFullscreen(false);
  };

  const handleCloseProductModal = () => {
    setSelectedProductModal(null);
    setCurrentMediaIndex(0);
    setIsFullscreen(false);
  };

  const handlePrevMedia = () => {
    if (!selectedProductModal) return;
    const media = getProductMedia(selectedProductModal.product);
    setCurrentMediaIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const handleNextMedia = () => {
    if (!selectedProductModal) return;
    const media = getProductMedia(selectedProductModal.product);
    setCurrentMediaIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#29235C] to-[#1a1640] flex items-center justify-center p-4">
        <div className="text-white text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error || !devis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#29235C] to-[#1a1640] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accès impossible</h2>
          <p className="text-gray-600">{error || 'Devis introuvable'}</p>
        </div>
      </div>
    );
  }

  const isAccepted = devis.accepted_status === 'accepted';

  const isUpsellEntretien = devis.devis_type === 'upsell_entretien';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-[#29235C] to-[#1a1640] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">
                  {isUpsellEntretien ? 'Proposition d\'amélioration' : 'Devis'}
                </h1>
                <p className="text-sm opacity-90">Bruneau Protection</p>
              </div>
            </div>
            {isAccepted && (
              <div className="flex items-center gap-2 bg-green-500 px-3 py-1 rounded-full text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Accepté</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        {isAccepted && devis.accepted_at && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">
                  {isUpsellEntretien ? 'Proposition acceptée' : 'Devis accepté'}
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Accepté le {format(new Date(devis.accepted_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {isUpsellEntretien
                    ? 'Nous vous remercions pour votre confiance. Ces équipements seront installés lors de votre visite d\'entretien.'
                    : 'Nous vous remercions pour votre confiance et vous contacterons prochainement pour planifier l\'installation.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#29235C] mb-2">Client</h2>
              <p className="font-medium text-gray-900">
                {devis.client.prenom} {devis.client.nom}
              </p>
              {devis.client.adresse && (
                <p className="text-sm text-gray-600 mt-1">{devis.client.adresse}</p>
              )}
              {devis.client.telephone && (
                <p className="text-sm text-gray-600 mt-1">{devis.client.telephone}</p>
              )}
            </div>
            <div className="text-left sm:text-right">
              {devis.devis_number && (
                <div className="mb-3">
                  <div className="inline-block bg-[#29235C] text-white px-4 py-2 rounded-lg font-semibold">
                    Devis n° {devis.devis_number}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500">Date du devis</p>
              <p className="font-medium text-gray-900">
                {devis.created_at
                  ? format(new Date(devis.created_at), 'dd/MM/yyyy', { locale: fr })
                  : format(new Date(), 'dd/MM/yyyy', { locale: fr })}
              </p>
              <p className="text-sm text-gray-500 mt-2">Validité</p>
              <p className="font-medium text-gray-900">30 jours</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-[#29235C] mb-2">
            {devis.devis_number && `${devis.devis_number} - `}{devis.titre_affaire}
          </h2>
          {isUpsellEntretien ? (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p className="text-gray-800 font-medium mb-2">
                Profitez de votre visite d'entretien pour améliorer votre système
              </p>
              {devis.intro_text ? (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {devis.intro_text}
                </p>
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  Lors de la visite d'entretien prévue, notre technicien peut installer ces équipements complémentaires.
                  <strong> Vous économisez ainsi les frais d'installation !</strong> Cette proposition n'est pas obligatoire,
                  mais c'est une excellente opportunité pour renforcer votre système de sécurité.
                </p>
              )}
            </div>
          ) : devis.intro_text ? (
            <div className="bg-blue-50 border-l-4 border-[#29235C] p-4 rounded">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {devis.intro_text}
              </p>
            </div>
          ) : (
            <p className="text-gray-600">
              Protection et sécurisation de votre domicile avec des équipements professionnels de haute qualité.
            </p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 px-1">Détail des prestations</h3>
          {devis.lignes.map((line) => {
            const hasDetails = line.product?.description_long || line.product?.description_short;

            // Get product image (priority: thumbnail from media_items, then full image, then photo_square_path)
            const productImageUrl = line.product
              ? line.product.media_items && line.product.media_items.length > 0
                ? getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, line.product.media_items[0].thumbnail_path || line.product.media_items[0].file_path)
                : line.product.photo_square_path
                ? getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, line.product.photo_square_path)
                : null
              : null;

            return (
              <div key={line.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      {productImageUrl && (
                        <div className="relative group">
                          <img
                            src={productImageUrl}
                            alt={line.name}
                            className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg cursor-pointer transition-all group-hover:shadow-lg"
                            onClick={() => line.product && handleOpenProductModal(line.product, line.name)}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all rounded-lg flex items-center justify-center">
                            <div className="bg-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100">
                              <ZoomIn className="w-6 h-6 text-[#29235C]" />
                            </div>
                          </div>
                        </div>
                      )}
                      {hasDetails && line.product && (
                        <button
                          onClick={() => handleOpenProductModal(line.product!, line.name)}
                          className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#29235C] hover:text-[#1f1a4d] font-medium"
                        >
                          <ZoomIn className="w-4 h-4" />
                          Voir détails
                        </button>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{line.name}</h4>
                        <p className="text-sm text-gray-500 mb-3">{line.reference}</p>
                        {line.product?.description_short && (
                          <p className="text-sm text-gray-700 leading-relaxed mb-4">
                            {line.product.description_short}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-end gap-6 mt-auto">
                        <div>
                          <span className="text-sm text-gray-600 block mb-1.5">Quantité</span>
                          {!isAccepted ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLineQuantityChange(line.id, -1)}
                                disabled={customQuantities[line.id] === 1 || (line.quantity === 1 && !customQuantities[line.id])}
                                className="w-8 h-8 flex items-center justify-center bg-white border-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-4 h-4 text-gray-600" />
                              </button>
                              <span className="w-10 text-center font-bold text-gray-900 text-lg">
                                {customQuantities[line.id] ?? line.quantity}
                              </span>
                              <button
                                onClick={() => handleLineQuantityChange(line.id, 1)}
                                className="w-8 h-8 flex items-center justify-center bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <p className="font-bold text-gray-900 text-lg">{customQuantities[line.id] ?? line.quantity}</p>
                          )}
                        </div>

                        <div>
                          <span className="text-sm text-gray-600 block mb-1.5">Prix unitaire HT</span>
                          <p className="font-bold text-gray-900 text-lg">{line.price_ht.toFixed(2)} €</p>
                        </div>

                        <div className="ml-auto text-right">
                          <span className="text-sm text-gray-600 block mb-1.5">Total TTC</span>
                          <p className="text-2xl font-bold text-[#29235C]">
                            {(() => {
                              const quantity = customQuantities[line.id] ?? line.quantity;
                              const totalHT = line.price_ht * quantity;
                              const totalTTC = totalHT * (1 + line.vat_rate / 100);
                              return totalTTC.toFixed(2);
                            })()} €
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(devis.options.leasing || devis.options.telesurveillance) && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Options incluses</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              {devis.options.leasing && <li>✓ Possibilité de Crédit/Leasing</li>}
              {devis.options.telesurveillance && <li>✓ Télésurveillance</li>}
            </ul>
          </div>
        )}

        {devis.observations && (
          <div className="bg-gray-50 rounded-lg border p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Observations</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{devis.observations}</p>
          </div>
        )}

        {optionalProducts.length > 0 && !isAccepted && (
          <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-900">Ajouter des options à votre devis</span>
              {showOptionsMenu ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {showOptionsMenu && (
              <div className="border-t p-4 space-y-4">
                {Object.entries(groupProductsByCategory()).map(([category, products]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-semibold text-[#29235C] text-sm uppercase tracking-wide">{category}</h4>
                    <div className="space-y-2">
                      {products.map(product => {
                        const quantity = selectedOptions[product.id] || 0;
                        const productImageUrl = product.media_items && product.media_items.length > 0
                          ? getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, product.media_items[0].thumbnail_path || product.media_items[0].file_path)
                          : product.photo_square_path
                          ? getPublicImageUrl(STORAGE_BUCKETS.PRODUCTS, product.photo_square_path)
                          : null;

                        return (
                          <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            {productImageUrl && (
                              <img
                                src={productImageUrl}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.reference}</p>
                              <p className="text-sm font-semibold text-[#29235C] mt-1">
                                {product.price_ht.toFixed(2)} € HT
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOptionQuantityChange(product.id, -1)}
                                disabled={quantity === 0}
                                className="p-2 bg-white border rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-4 h-4 text-gray-600" />
                              </button>
                              <span className="w-8 text-center font-semibold text-gray-900">{quantity}</span>
                              <button
                                onClick={() => handleOptionQuantityChange(product.id, 1)}
                                className="p-2 bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-gradient-to-br from-[#29235C] to-[#1a1640] text-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Récapitulatif</h3>
          <div className="space-y-3">
            {(() => {
              const totals = calculateTotalsWithOptions();
              const hasOptions = Object.keys(selectedOptions).length > 0;

              return (
                <>
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-white/90">Total HT initial</span>
                    <span className="text-xl font-semibold">{devis.totaux.ht.toFixed(2)} €</span>
                  </div>
                  {hasOptions && totals && (
                    <>
                      <div className="flex justify-between items-center pb-3 border-b border-white/20">
                        <span className="text-white/90">Options HT</span>
                        <span className="text-xl font-semibold text-[#E72C63]">+ {totals.optionsHT.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-white/20">
                        <span className="text-white/90">Total HT</span>
                        <span className="text-xl font-semibold">{totals.ht.toFixed(2)} €</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-white/90">TVA</span>
                    <span className="text-xl font-semibold">
                      {totals ? Object.values(totals.tva).reduce((a, b) => a + b, 0).toFixed(2) : '0.00'} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total TTC</span>
                    <span className="text-2xl font-bold">{totals ? totals.ttc.toFixed(2) : devis.totaux.ttc.toFixed(2)} €</span>
                  </div>
                </>
              );
            })()}

            {/* TEMPORAIREMENT MASQUÉ - Système de paiement en configuration
            <div className="flex justify-between items-center pt-2">
              <span className="text-[#E72C63]">Acompte à la commande (40%)</span>
              <span className="text-2xl font-bold text-[#E72C63]">{devis.totaux.acompte.toFixed(2)} €</span>
            </div>
            */}
          </div>
        </div>

        {devis.photos && devis.photos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos jointes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {devis.photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-32 sm:h-40 object-cover rounded-lg border shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center">
                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border p-4 text-xs text-gray-600 space-y-2">
          <p>
            <strong>Validité :</strong> Ce devis est valable 30 jours à compter de sa date d'émission.
          </p>
          {/* TEMPORAIREMENT MASQUÉ - Système de paiement en configuration
          <p>
            <strong>Acompte :</strong> Un acompte de 40% est requis à la commande. Le solde est payable à la livraison.
          </p>
          */}
          <p>
            <strong>Paiement :</strong> Les modalités de paiement seront discutées lors de notre prise de contact.
          </p>
          <p>
            <strong>Délais :</strong> Les délais de livraison et d'installation seront confirmés après acceptation du devis.
          </p>
        </div>
      </main>

      {!isAccepted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => window.open('tel:0232517700')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-[#29235C] text-white rounded-lg hover:bg-[#1f1a4d] transition-colors text-sm"
              >
                <Phone className="w-4 h-4" />
                <span>Nous contacter</span>
              </button>
              <button
                onClick={() => setShowAcceptModal(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isUpsellEntretien ? 'J\'accepte cette proposition' : 'Accepter le devis'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isAccepted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger le PDF</span>
              </button>
              <button
                onClick={() => window.open('tel:0232517700')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-[#29235C] text-white rounded-lg hover:bg-[#1f1a4d] transition-colors text-sm"
              >
                <Phone className="w-4 h-4" />
                <span>Nous contacter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && (
        <AcceptanceDocument
          devis={devis}
          totalsWithOptions={calculateTotalsWithOptions()}
          onAccept={handleAcceptDevis}
          onCancel={() => setShowAcceptModal(false)}
          accepting={accepting}
        />
      )}

      {selectedProductModal && (() => {
        const media = getProductMedia(selectedProductModal.product);
        const hasMultipleMedia = media.length > 1;
        const currentMedia = media[currentMediaIndex];

        return (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={isFullscreen ? undefined : handleCloseProductModal}
          >
            <div
              className={`bg-white rounded-lg w-full ${
                isFullscreen ? 'h-full' : 'max-w-4xl max-h-[90vh]'
              } overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b z-10 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-[#29235C] text-lg">{selectedProductModal.lineName}</h3>
                <div className="flex items-center gap-2">
                  {!isFullscreen && media.length > 0 && (
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Plein écran"
                    >
                      <Maximize2 className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={handleCloseProductModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {media.length > 0 && (
                <div className="relative bg-gray-900">
                  <div className={`relative ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'aspect-video'}`}>
                    {currentMedia.type === 'image' ? (
                      <img
                        src={currentMedia.url}
                        alt={selectedProductModal.lineName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <video
                        src={currentMedia.url}
                        controls
                        className="w-full h-full object-contain"
                      />
                    )}

                    {hasMultipleMedia && (
                      <>
                        <button
                          onClick={handlePrevMedia}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                          <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <button
                          onClick={handleNextMedia}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                          <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                      </>
                    )}

                    {hasMultipleMedia && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 rounded-full">
                        <span className="text-white text-sm font-medium">
                          {currentMediaIndex + 1} / {media.length}
                        </span>
                      </div>
                    )}

                    {isFullscreen && (
                      <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-4 right-4 px-4 py-2 bg-black/70 hover:bg-black/90 rounded-lg transition-colors"
                      >
                        <span className="text-white text-sm font-medium">Quitter plein écran</span>
                      </button>
                    )}
                  </div>

                  {hasMultipleMedia && !isFullscreen && (
                    <div className="flex gap-2 p-4 bg-gray-800 overflow-x-auto">
                      {media.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentMediaIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all ${
                            index === currentMediaIndex
                              ? 'border-[#E72C63] scale-105'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          {item.type === 'image' ? (
                            <img
                              src={item.url}
                              alt={`${selectedProductModal.lineName} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <span className="text-white text-xs">Vidéo</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(selectedProductModal.product.description_short || selectedProductModal.product.description_long) && !isFullscreen && (
                <div className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Description</h4>
                  <div className="prose prose-sm max-w-none space-y-4">
                    {selectedProductModal.product.description_short && (
                      <p className="text-gray-700 font-medium">
                        {selectedProductModal.product.description_short}
                      </p>
                    )}
                    {selectedProductModal.product.description_long && (
                      <p className="text-gray-700 whitespace-pre-line">
                        {selectedProductModal.product.description_long}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Référence</p>
                      <p className="font-medium text-gray-900">{selectedProductModal.product.reference}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Catégorie</p>
                      <p className="font-medium text-gray-900">{selectedProductModal.product.category}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Photo modal */}
      {selectedPhotoIndex !== null && devis?.photos && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/10 p-2 rounded-lg transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {devis.photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIndex((prev) =>
                    prev === null ? null : prev === 0 ? devis.photos!.length - 1 : prev - 1
                  );
                }}
                className="absolute left-4 text-white hover:bg-white/10 p-3 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIndex((prev) =>
                    prev === null ? null : prev === devis.photos!.length - 1 ? 0 : prev + 1
                  );
                }}
                className="absolute right-4 text-white hover:bg-white/10 p-3 rounded-lg transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <div
            className="relative max-w-7xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={devis.photos[selectedPhotoIndex]}
              alt={`Photo ${selectedPhotoIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
              {selectedPhotoIndex + 1} / {devis.photos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
