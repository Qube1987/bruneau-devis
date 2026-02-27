import React, { useState, useEffect } from 'react';
import { User, FileText, Calculator, Image as ImageIcon, Save, Send, Trash2, Plus, Minus, CheckCircle, AlertCircle, Sparkles, RefreshCw, Edit3 } from 'lucide-react';
import { ProductCatalog } from './ProductCatalog';
import { DrawingCanvas } from './DrawingCanvas';
import { ClientSearch } from './ClientSearch';
import { Devis, Client, Product, DevisLine } from '../types';
import { generatePDF } from '../lib/pdf-generator';
import { sendDevisEmail } from '../lib/email-service';
import { useDevis } from '../hooks/useDevis';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../hooks/useAuth';

interface DevisFormProps {
  initialDevis?: Devis;
  onBack?: () => void;
}

export const DevisForm: React.FC<DevisFormProps> = ({ initialDevis, onBack }) => {
  const [devis, setDevis] = useState<Devis>({
    client: {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: ''
    },
    titre_affaire: 'Protection intrusion domicile',
    devis_type: 'installation_neuve',
    taux_tva: 10,
    lignes: [],
    totaux: { ht: 0, tva: {}, ttc: 0, acompte: 0 },
    observations: '',
    options: { telesurveillance: false, leasing: false },
    signatures: {},
    status: 'draft'
  });

  const [showDrawing, setShowDrawing] = useState(false);
  const [croquis, setCroquis] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ email: '', subject: '', message: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<{ lineId: string; value: string } | null>(null);
  const [generatingIntro, setGeneratingIntro] = useState(false);

  const { saveDevis, loadDevis, loading: saveLoading } = useDevis();
  const { getProductImageUrl, getPublicUrlForStoragePath, fetchUpsellProducts } = useProducts();
  const { userType } = useAuth();

  // Helper function to fetch and convert image to base64
  const fetchAndConvertToBase64 = async (imageUrl: string | null | undefined): Promise<string | null> => {
    try {
      if (!imageUrl) return null;

      // Clean URL from any invisible characters
      const cleanUrl = imageUrl.trim().replace(/[\r\n\t]/g, '');

      if (cleanUrl.startsWith('data:')) {
        return cleanUrl; // Already base64
      }

      const response = await fetch(cleanUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };
  // Load logo as base64
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/BRUNEAU_PROTECTION_LOGO_QUADRI_RESERVE.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Erreur lors du chargement du logo:', error);
      }
    };
    
    loadLogo();
  }, []);

  // Load initial devis if provided
  useEffect(() => {
    const loadInitialDevis = async () => {
      if (!initialDevis) return;

      setDevis(initialDevis);
      if (initialDevis.croquis_path) {
        const base64Croquis = await fetchAndConvertToBase64(initialDevis.croquis_path);
        setCroquis(base64Croquis);
      }
      if (initialDevis.photos) {
        setPhotos(initialDevis.photos);
      }
    };

    loadInitialDevis();
  }, [initialDevis]);

  // Load upsell products when devis_type changes to upsell_entretien
  useEffect(() => {
    const loadUpsellProducts = async () => {
      if (devis.devis_type === 'upsell_entretien' && devis.lignes.length === 0) {
        const upsellProducts = await fetchUpsellProducts();
        upsellProducts.forEach(product => {
          addProductToDevis(product);
        });
      }
    };

    loadUpsellProducts();
  }, [devis.devis_type]);

  // Recalculate totals when lines or TVA rate change
  useEffect(() => {
    calculateTotals();
  }, [devis.lignes, devis.taux_tva]);

  const calculateTotals = () => {
    const totals = devis.lignes.reduce((acc, line) => {
      const totalHT = line.quantity * line.price_ht;
      const totalVAT = totalHT * (devis.taux_tva / 100);

      acc.ht += totalHT;
      acc.tva[devis.taux_tva] = (acc.tva[devis.taux_tva] || 0) + totalVAT;
      acc.ttc += totalHT + totalVAT;

      return acc;
    }, { ht: 0, tva: {} as { [key: string]: number }, ttc: 0, acompte: 0 });

    totals.acompte = totals.ttc * 0.4; // 40% acompte

    setDevis(prev => ({ ...prev, totaux: totals }));
  };

  const addProductToDevis = (product: Product, quantity?: number) => {
    // Check if product already exists in devis
    const existingLineIndex = devis.lignes.findIndex(line => line.product?.id === product.id);

    // For upsell_entretien devis, default quantity is 0, otherwise 1
    const defaultQuantity = devis.devis_type === 'upsell_entretien' ? 0 : 1;
    const finalQuantity = quantity !== undefined ? quantity : defaultQuantity;

    const newLine: DevisLine = {
      id: existingLineIndex !== -1 ? devis.lignes[existingLineIndex].id : Math.random().toString(36).substr(2, 9),
      product,
      reference: product.reference,
      name: product.name,
      description: product.description_short,
      quantity: finalQuantity,
      price_ht: product.price_ht,
      vat_rate: devis.taux_tva,
      total_ht: product.price_ht * finalQuantity,
      total_vat: (product.price_ht * finalQuantity) * (devis.taux_tva / 100),
      total_ttc: (product.price_ht * finalQuantity) * (1 + devis.taux_tva / 100)
    };

    if (existingLineIndex !== -1) {
      // Update existing line
      setDevis(prev => ({
        ...prev,
        lignes: prev.lignes.map((line, index) =>
          index === existingLineIndex ? newLine : line
        )
      }));
    } else {
      // Add new line
      setDevis(prev => ({
        ...prev,
        lignes: [...prev.lignes, newLine]
      }));
    }
  };

  const updateLineQuantity = (lineId: string, quantity: number) => {
    if (quantity < 0) {
      return;
    }

    setDevis(prev => ({
      ...prev,
      lignes: prev.lignes.map(line => {
        if (line.id === lineId) {
          const total_ht = line.price_ht * quantity;
          const total_vat = total_ht * (prev.taux_tva / 100);
          const total_ttc = total_ht + total_vat;

          return {
            ...line,
            quantity,
            vat_rate: prev.taux_tva,
            total_ht,
            total_vat,
            total_ttc
          };
        }
        return line;
      })
    }));
  };

  const updateLinePrice = (lineId: string, newPrice: number) => {
    setDevis(prev => ({
      ...prev,
      lignes: prev.lignes.map(line => {
        if (line.id === lineId) {
          const total_ht = newPrice * line.quantity;
          const total_vat = total_ht * (prev.taux_tva / 100);
          const total_ttc = total_ht + total_vat;

          return {
            ...line,
            price_ht: newPrice,
            vat_rate: prev.taux_tva,
            total_ht,
            total_vat,
            total_ttc
          };
        }
        return line;
      })
    }));
  };

  const handlePriceClick = (lineId: string, currentPrice: number) => {
    setEditingPrice({ lineId, value: currentPrice.toFixed(2) });
  };

  const handlePriceChange = (value: string) => {
    if (editingPrice) {
      setEditingPrice({ ...editingPrice, value });
    }
  };

  const handlePriceSubmit = () => {
    if (editingPrice) {
      const newPrice = parseFloat(editingPrice.value);
      if (!isNaN(newPrice)) {
        updateLinePrice(editingPrice.lineId, newPrice);
      }
      setEditingPrice(null);
    }
  };

  const handlePriceBlur = () => {
    handlePriceSubmit();
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePriceSubmit();
    } else if (e.key === 'Escape') {
      setEditingPrice(null);
    }
  };

  const removeLine = (lineId: string) => {
    setDevis(prev => ({
      ...prev,
      lignes: prev.lignes.filter(line => line.id !== lineId)
    }));
  };

  const handleCroquisSave = (imageData: string) => {
    setCroquis(imageData);
    setShowDrawing(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    // Validation basique
    if (!devis.client.nom) {
      setSaveMessage({ type: 'error', message: 'Veuillez renseigner au minimum le nom du client' });
      return;
    }

    const devisToSave = {
      ...devis,
      croquis_path: croquis || undefined,
      photos: photos.length > 0 ? photos : undefined
    };

    const result = await saveDevis(devisToSave);

    if (result.success) {
      // Reload the devis to get all updated fields (including devis_number from Extrabat)
      if (result.id) {
        const loadResult = await loadDevis(result.id);
        if (loadResult.success && loadResult.devis) {
          setDevis(loadResult.devis);
          if (loadResult.devis.photos) {
            setPhotos(loadResult.devis.photos);
          }
          if (loadResult.devis.croquis_path) {
            setCroquis(loadResult.devis.croquis_path);
          }
        }
      }
      setSaveMessage({ type: 'success', message: 'Brouillon sauvegardé avec succès' });
    } else {
      setSaveMessage({ type: 'error', message: result.error || 'Erreur lors de la sauvegarde' });
    }

    // Clear message after 3 seconds
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleGeneratePDF = () => {
    const handleGeneratePDFAsync = async () => {
      try {
        // Convert all product images to base64
        const lignesWithBase64Images = await Promise.all(
          devis.lignes.map(async (ligne) => {
            if (!ligne.product) return ligne;
            
            const photoSquareBase64 = ligne.product.photo_square_path 
              ? await fetchAndConvertToBase64(getPublicUrlForStoragePath(ligne.product.photo_square_path))
              : null;
            
            const photoBase64 = ligne.product.photo_path 
              ? await fetchAndConvertToBase64(getPublicUrlForStoragePath(ligne.product.photo_path))
              : null;
            
            return {
              ...ligne,
              product: {
                ...ligne.product,
                photo_square_path: photoSquareBase64,
                photo_path: photoBase64
              }
            };
          })
        );
        
        const pdfData: Devis = {
          ...devis,
          croquis_path: croquis || undefined,
          photos: photos.length > 0 ? photos : undefined,
          lignes: lignesWithBase64Images
        };

        await generatePDF(pdfData, false, logoBase64 || undefined);
      } catch (error) {
        console.error('Error generating PDF:', error);
        setSaveMessage({ type: 'error', message: 'Erreur lors de la génération du PDF' });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    };
    
    handleGeneratePDFAsync();
  };

  const handleSendEmail = async () => {
    // Validate recipient email
    if (!emailData.email) {
      alert('Veuillez saisir une adresse email');
      return;
    }

    // Basic email validation for recipient
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.email)) {
      setSaveMessage({ type: 'error', message: 'Veuillez saisir une adresse email valide' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    // Check if client email is filled (required for acceptance notifications)
    if (!devis.client.email || !emailRegex.test(devis.client.email)) {
      setSaveMessage({ type: 'error', message: 'Veuillez renseigner l\'email du client dans les informations client (requis pour les notifications d\'acceptation)' });
      setTimeout(() => setSaveMessage(null), 5000);
      return;
    }

    setSendingEmail(true);

    try {
      // Save devis first to ensure we have a token
      let currentAccessToken = devis.access_token;
      let currentPaymentToken: string | undefined;
      let currentDevis = devis;

      if (!devis.id || !devis.access_token) {
        const devisToSave = {
          ...devis,
          croquis_path: croquis || undefined,
          photos: photos.length > 0 ? photos : undefined
        };
        const saveResult = await saveDevis(devisToSave);
        if (!saveResult.success) {
          setSaveMessage({ type: 'error', message: 'Erreur lors de la sauvegarde du devis' });
          setTimeout(() => setSaveMessage(null), 3000);
          return;
        }
        currentAccessToken = saveResult.token;
        currentPaymentToken = saveResult.paymentToken;

        // Reload the devis to get all updated fields (including devis_number from Extrabat)
        if (saveResult.id) {
          const loadResult = await loadDevis(saveResult.id);
          if (loadResult.success && loadResult.devis) {
            currentDevis = loadResult.devis;
            setDevis(loadResult.devis);
          }
        }
      } else {
        // If devis already exists, re-save to get payment token
        const devisToSave = {
          ...devis,
          croquis_path: croquis || undefined,
          photos: photos.length > 0 ? photos : undefined
        };
        const saveResult = await saveDevis(devisToSave);
        if (saveResult.success) {
          currentPaymentToken = saveResult.paymentToken;

          // Reload the devis to get all updated fields (including devis_number from Extrabat)
          if (saveResult.id) {
            const loadResult = await loadDevis(saveResult.id);
            if (loadResult.success && loadResult.devis) {
              currentDevis = loadResult.devis;
              setDevis(loadResult.devis);
            }
          }
        }
      }

      // Keep full devis data unchanged (for carousel display)
      console.log('Preparing devis for PDF generation...');

      const pdfData: Devis = {
        ...currentDevis,
        croquis_path: croquis || undefined,
        photos: photos.length > 0 ? photos : undefined
      };

      const pdfBase64 = (await generatePDF(pdfData, true, logoBase64 || undefined)) as string;
      console.log('PDF generated - size:', Math.round(pdfBase64.length / 1024), 'KB');

      console.log('Sending email with token:', currentAccessToken);
      console.log('Sending email with payment token:', currentPaymentToken);

      // Send email with devis token and payment token
      const result = await sendDevisEmail(
        pdfData,
        pdfBase64,
        {
          to: emailData.email,
          subject: emailData.subject,
          message: emailData.message
        },
        currentAccessToken,
        currentPaymentToken
      );

      console.log('Email send result:', result);

      if (result.success) {
        setSaveMessage({ type: 'success', message: 'Email envoyé avec succès !' });
        setShowEmailModal(false);
        setEmailData({ email: '', subject: '', message: '' });
      } else {
        setSaveMessage({ type: 'error', message: result.error || 'Erreur lors de l\'envoi de l\'email' });
      }
    } catch (error) {
      console.error('Error in handleSendEmail:', error);
      setSaveMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email'
      });
    } finally {
      setSendingEmail(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleGenerateIntro = async () => {
    if (devis.lignes.length === 0) {
      setSaveMessage({ type: 'error', message: 'Ajoutez au moins un article avant de générer l\'introduction' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setGeneratingIntro(true);

    try {
      const items = devis.lignes.map(line => ({
        label: line.name,
        qty: line.quantity,
        category: line.product?.category || '',
        reference: line.reference,
        description_short: line.product?.description_short || '',
        description_long: line.product?.description_long || ''
      }));

      console.log('DEBUG - Full devis.lignes:', JSON.stringify(devis.lignes, null, 2));
      console.log('DEBUG - Items to send to LLM:', JSON.stringify(items, null, 2));

      // Vérifier si les descriptions sont vides
      const emptyDescriptions = items.filter(item => !item.description_short && !item.description_long);
      if (emptyDescriptions.length > 0) {
        console.warn('WARNING - Some items missing descriptions:', emptyDescriptions);
      }

      const clientType = devis.taux_tva === 20 ? 'pro' : 'particulier';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-devis-intro`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items,
            client_type: clientType,
            max_chars: 5000
          })
        }
      );

      const result = await response.json();

      console.log('LLM Response:', result);

      if (result.success && result.intro_text) {
        // Vérifier si c'est le texte par défaut
        if (result.intro_text.includes('La solution proposée vise à sécuriser vos accès')) {
          console.warn('WARNING: Received fallback text - OpenAI API may not be configured');
        }

        setDevis(prev => ({
          ...prev,
          intro_text: result.intro_text,
          intro_generated_at: result.generated_at,
          intro_manual_edit: false
        }));
        setSaveMessage({ type: 'success', message: 'Introduction générée avec succès' });
      } else {
        setSaveMessage({ type: 'error', message: result.error || 'Erreur lors de la génération' });
      }
    } catch (error) {
      console.error('Error generating intro:', error);
      setSaveMessage({ type: 'error', message: 'Erreur lors de la génération de l\'introduction' });
    } finally {
      setGeneratingIntro(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleClientSelect = (clientData: {
    clientName: string;
    email?: string;
    phone?: string;
    address?: string;
    ouvrageId?: number;
    extrabatClientId: number;
  }) => {
    // Parse client name to extract parts
    const nameParts = clientData.clientName.split(' ');
    const civilite = nameParts[0]; // M., Mme, etc.
    const prenom = nameParts[1] || '';
    const nom = nameParts.slice(2).join(' ') || '';

    setDevis(prev => ({
      ...prev,
      client: {
        nom: nom,
        prenom: prenom,
        email: clientData.email || '',
        telephone: clientData.phone || prev.client.telephone,
        adresse: clientData.address || prev.client.adresse,
        extrabat_id: clientData.extrabatClientId,
      }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 w-full">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-[#29235C] mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {initialDevis ? 'Modifier le devis' : 'Nouveau devis'}
          </h2>

          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 flex items-center gap-2 text-[#29235C] hover:text-[#1f1a4d] transition-colors"
            >
              ← Retour à la liste
            </button>
          )}

          {/* Client Search - Only for internal users */}
          {userType === 'internal' && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-[#29235C] mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Recherche client Extrabat
              </h3>
              <ClientSearch onClientSelect={handleClientSelect} />
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-600">ou saisissez manuellement les informations ci-dessous</span>
              </div>
            </div>
          )}

          {/* Client Information - Manual entry for all users */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#29235C] flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations client
              </h3>
              {devis.devis_number && (
                <div className="bg-[#29235C] text-white px-4 py-2 rounded-lg font-semibold">
                  Devis n° {devis.devis_number}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={devis.client.nom}
                  onChange={(e) => setDevis(prev => ({
                    ...prev,
                    client: { ...prev.client, nom: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={devis.client.prenom}
                  onChange={(e) => setDevis(prev => ({
                    ...prev,
                    client: { ...prev.client, prenom: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(requis pour les notifications)</span>
                </label>
                <input
                  type="email"
                  value={devis.client.email}
                  onChange={(e) => setDevis(prev => ({
                    ...prev,
                    client: { ...prev.client, email: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                  placeholder="email@exemple.fr"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={devis.client.telephone}
                  onChange={(e) => setDevis(prev => ({
                    ...prev,
                    client: { ...prev.client, telephone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={devis.client.adresse}
                  onChange={(e) => setDevis(prev => ({
                    ...prev,
                    client: { ...prev.client, adresse: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* TVA Rate Selection */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-[#29235C] mb-4">Type de client et TVA</h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer hover:border-[#29235C] transition-colors"
                style={{ borderColor: devis.taux_tva === 10 ? '#29235C' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="taux_tva"
                  value="10"
                  checked={devis.taux_tva === 10}
                  onChange={() => setDevis(prev => ({ ...prev, taux_tva: 10 }))}
                  className="mt-1 w-5 h-5 text-[#29235C] focus:ring-[#29235C]"
                />
                <div>
                  <span className="font-medium text-gray-900">Client particulier</span>
                  <p className="text-sm text-gray-600">TVA à 10% (logement de plus de 2 ans)</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer hover:border-[#29235C] transition-colors"
                style={{ borderColor: devis.taux_tva === 20 ? '#29235C' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="taux_tva"
                  value="20"
                  checked={devis.taux_tva === 20}
                  onChange={() => setDevis(prev => ({ ...prev, taux_tva: 20 }))}
                  className="mt-1 w-5 h-5 text-[#29235C] focus:ring-[#29235C]"
                />
                <div>
                  <span className="font-medium text-gray-900">Client professionnel ou logement neuf</span>
                  <p className="text-sm text-gray-600">TVA à 20% (professionnel ou logement de moins de 2 ans)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Type de devis */}
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-[#29235C] mb-4">Type de devis</h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer hover:border-[#29235C] transition-colors"
                style={{ borderColor: devis.devis_type === 'installation_neuve' ? '#29235C' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="devis_type"
                  value="installation_neuve"
                  checked={devis.devis_type === 'installation_neuve'}
                  onChange={() => setDevis(prev => ({
                    ...prev,
                    devis_type: 'installation_neuve',
                    lignes: prev.lignes.map(line => {
                      if (line.quantity === 0) {
                        const quantity = 1;
                        const total_ht = line.price_ht * quantity;
                        const total_vat = total_ht * (prev.taux_tva / 100);
                        const total_ttc = total_ht + total_vat;
                        return {
                          ...line,
                          quantity,
                          total_ht,
                          total_vat,
                          total_ttc
                        };
                      }
                      return line;
                    })
                  }))}
                  className="mt-1 w-5 h-5 text-[#29235C] focus:ring-[#29235C]"
                />
                <div>
                  <span className="font-medium text-gray-900">Devis installation neuve</span>
                  <p className="text-sm text-gray-600">Installation complète d'un nouveau système de sécurité</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer hover:border-[#29235C] transition-colors"
                style={{ borderColor: devis.devis_type === 'upsell_entretien' ? '#29235C' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="devis_type"
                  value="upsell_entretien"
                  checked={devis.devis_type === 'upsell_entretien'}
                  onChange={() => setDevis(prev => ({
                    ...prev,
                    devis_type: 'upsell_entretien',
                    titre_affaire: 'Quelques idées d\'amélioration en prévision de votre visite d\'entretien',
                    lignes: prev.lignes.map(line => ({
                      ...line,
                      quantity: 0,
                      total_ht: 0,
                      total_vat: 0,
                      total_ttc: 0
                    }))
                  }))}
                  className="mt-1 w-5 h-5 text-[#29235C] focus:ring-[#29235C]"
                />
                <div>
                  <span className="font-medium text-gray-900">Devis upsell avant visite d'entretien</span>
                  <p className="text-sm text-gray-600">Proposition de compléments à installer lors de la visite du technicien</p>
                </div>
              </label>
            </div>
          </div>

          {/* Titre affaire */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'affaire</label>
            <input
              type="text"
              value={devis.titre_affaire}
              onChange={(e) => setDevis(prev => ({ ...prev, titre_affaire: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
            />
          </div>

          {/* Product Catalog */}
          <ProductCatalog onAddProduct={addProductToDevis} currentLines={devis.lignes} />

          {/* Introduction générée par IA */}
          {devis.lignes.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6 border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#29235C] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Introduction du devis (générée par IA)
                </h3>
                <div className="flex gap-2">
                  {devis.intro_text && (
                    <button
                      onClick={() => setDevis(prev => ({
                        ...prev,
                        intro_manual_edit: !prev.intro_manual_edit
                      }))}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                      title={devis.intro_manual_edit ? "Mode automatique" : "Mode manuel"}
                    >
                      <Edit3 className="w-3 h-3" />
                      {devis.intro_manual_edit ? 'Auto' : 'Manuel'}
                    </button>
                  )}
                  <button
                    onClick={handleGenerateIntro}
                    disabled={generatingIntro}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingIntro ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {devis.intro_text ? 'Régénérer' : 'Générer'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {devis.intro_text ? (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <textarea
                    value={devis.intro_text}
                    onChange={(e) => setDevis(prev => ({
                      ...prev,
                      intro_text: e.target.value,
                      intro_manual_edit: true
                    }))}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="L'introduction générée apparaîtra ici..."
                  />
                  {devis.intro_generated_at && !devis.intro_manual_edit && (
                    <p className="text-xs text-gray-500 mt-2">
                      Généré automatiquement le {new Date(devis.intro_generated_at).toLocaleString('fr-FR')}
                    </p>
                  )}
                  {devis.intro_manual_edit && (
                    <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Modifié manuellement - Cliquez sur "Régénérer" pour une nouvelle version automatique
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border border-dashed border-purple-300 text-center text-gray-500">
                  <p className="text-sm">
                    Cliquez sur "Générer" pour créer une introduction professionnelle personnalisée basée sur les articles sélectionnés
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Devis Lines */}
          {devis.lignes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-[#29235C] mb-4">Articles sélectionnés</h3>
              
              <div className="space-y-3">
                {devis.lignes.map(line => (
                  <div key={line.id} className={`p-4 rounded-lg flex items-center justify-between ${
                    line.quantity === 0
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-white'
                  }`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${line.quantity === 0 ? 'text-blue-800' : 'text-gray-900'}`}>
                              {line.name}
                            </p>
                            {line.quantity === 0 && (
                              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                                Option à commander
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{line.reference}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateLineQuantity(line.id, line.quantity - 1)}
                            className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-medium">{line.quantity}</span>
                          <button
                            onClick={() => updateLineQuantity(line.id, line.quantity + 1)}
                            className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          {editingPrice?.lineId === line.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editingPrice.value}
                              onChange={(e) => handlePriceChange(e.target.value)}
                              onBlur={handlePriceBlur}
                              onKeyDown={handlePriceKeyDown}
                              autoFocus
                              className="w-24 px-2 py-1 text-right border border-[#29235C] rounded focus:ring-2 focus:ring-[#29235C] font-semibold"
                            />
                          ) : (
                            <button
                              onClick={() => handlePriceClick(line.id, line.price_ht)}
                              className="text-right hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                              title="Cliquer pour modifier le prix"
                            >
                              {line.quantity === 0 ? (
                                <>
                                  <p className="font-semibold text-blue-700">{line.price_ht.toFixed(2)} € HT/unité</p>
                                  <p className="text-sm text-blue-600">{(line.price_ht * (1 + devis.taux_tva / 100)).toFixed(2)} € TTC/unité</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-semibold text-[#29235C]">{line.total_ttc.toFixed(2)} € TTC</p>
                                  <p className="text-sm text-gray-500">{line.price_ht.toFixed(2)} € HT/unité</p>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => removeLine(line.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-[#29235C] text-white rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Totaux</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm opacity-90">Total HT</p>
                <p className="text-xl font-bold">{devis.totaux.ht.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-sm opacity-90">TVA</p>
                <p className="text-xl font-bold">
                  {Object.values(devis.totaux.tva).reduce((a, b) => a + b, 0).toFixed(2)} €
                </p>
              </div>
              <div>
                <p className="text-sm opacity-90">Total TTC</p>
                <p className="text-xl font-bold">{devis.totaux.ttc.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-sm opacity-90">Acompte (40%)</p>
                <p className="text-xl font-bold text-[#E72C63]">{devis.totaux.acompte.toFixed(2)} €</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-[#29235C] mb-4">Options</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={devis.options.leasing}
                  onChange={(e) => setDevis(prev => ({
                    ...prev,
                    options: { ...prev.options, leasing: e.target.checked }
                  }))}
                  className="w-5 h-5 text-[#29235C] rounded focus:ring-[#29235C]"
                />
                <span>Crédit/Leasing</span>
              </label>
            </div>
          </div>

          {/* Observations */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
            <textarea
              value={devis.observations}
              onChange={(e) => setDevis(prev => ({ ...prev, observations: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
              placeholder="Informations complémentaires..."
            />
          </div>

          {/* Croquis */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Croquis
              </h4>

              {croquis ? (
                <div className="space-y-2">
                  <img src={croquis} alt="Croquis" className="w-full h-24 object-cover rounded border" />
                  <button
                    onClick={() => setShowDrawing(true)}
                    className="w-full text-sm bg-[#29235C] text-white py-2 rounded hover:bg-[#1f1a4d]"
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDrawing(true)}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#29235C] hover:text-[#29235C] transition-colors"
                >
                  + Créer un croquis
                </button>
              )}
            </div>
          </div>

          {/* Photos */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photos (annexes au devis)
              </h4>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="w-full block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#29235C] hover:text-[#29235C] transition-colors cursor-pointer text-center">
                  + Ajouter des photos
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-end">
            {saveMessage && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                saveMessage.type === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {saveMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{saveMessage.message}</span>
              </div>
            )}
            
            <button
              onClick={handleSaveDraft}
              disabled={saveLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saveLoading ? 'Sauvegarde...' : 'Enregistrer devis'}
            </button>
            
            <button
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#29235C] text-white rounded-lg hover:bg-[#1f1a4d] transition-colors"
            >
              <FileText className="w-4 h-4" />
              Générer PDF
            </button>
            
            <button
              onClick={() => {
                // Validate client email before opening modal
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!devis.client.email || !emailRegex.test(devis.client.email)) {
                  setSaveMessage({
                    type: 'error',
                    message: 'Veuillez renseigner un email client valide avant d\'envoyer le devis (requis pour les notifications d\'acceptation)'
                  });
                  setTimeout(() => setSaveMessage(null), 5000);
                  return;
                }

                setEmailData(prev => ({
                  ...prev,
                  email: devis.client.email || ''
                }));
                setShowEmailModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors"
            >
              <Send className="w-4 h-4" />
              Envoyer par email
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDrawing && (
        <DrawingCanvas
          onSave={handleCroquisSave}
          onClose={() => setShowDrawing(false)}
          initialData={croquis || undefined}
        />
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#29235C] flex items-center gap-2">
                <Send className="w-5 h-5" />
                Envoyer le devis par email
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailData.email}
                  onChange={(e) => setEmailData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                  placeholder="client@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objet (optionnel)
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                  placeholder={`Devis ${devis.titre_affaire} - Bruneau Protection`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                  placeholder="Message personnalisé à ajouter à l'email..."
                />
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  📎 Le devis sera envoyé en pièce jointe au format PDF avec un email professionnel personnalisé.
                </p>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailData.email}
                className="flex items-center gap-2 px-4 py-2 bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sendingEmail ? 'Envoi en cours...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};