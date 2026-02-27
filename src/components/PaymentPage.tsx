import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentFormData {
  formAction: string;
  params: Record<string, string>;
  devis: {
    id: string;
    titre_affaire: string;
    client: {
      nom: string;
      prenom: string;
      email: string;
    };
    amount: number;
  };
}

interface PaymentPageProps {
  token?: string;
}

export default function PaymentPage({ token }: PaymentPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PaymentFormData | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!token) {
      setError('Lien de paiement invalide');
      setLoading(false);
      return;
    }

    loadPaymentForm();
  }, [token]);

  const loadPaymentForm = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-systempay-form?token=${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération du formulaire');
      }

      const data = await response.json();
      setFormData(data);
    } catch (err: any) {
      console.error('Error loading payment form:', err);
      setError(err.message || 'Erreur lors du chargement du formulaire de paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du formulaire de paiement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Erreur
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center justify-center mb-4">
              <CreditCard className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold text-center mb-2">
              Paiement de l'acompte
            </h1>
            <p className="text-blue-100 text-center">
              Paiement sécurisé par SystemPay
            </p>
          </div>

          {/* Devis Info */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Détails du devis
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Affaire :</span>
                <span className="font-medium text-gray-900">{formData.devis.titre_affaire}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client :</span>
                <span className="font-medium text-gray-900">
                  {formData.devis.client.prenom} {formData.devis.client.nom}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email :</span>
                <span className="font-medium text-gray-900">{formData.devis.client.email}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Montant de l'acompte (40%) :</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formData.devis.amount.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="p-6">
            <form
              ref={formRef}
              action={formData.formAction}
              method="POST"
              onSubmit={handleSubmit}
            >
              {Object.entries(formData.params).map(([key, value]) => (
                <input
                  key={key}
                  type="hidden"
                  name={key}
                  value={value}
                />
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Paiement sécurisé :</strong> Vous allez être redirigé vers la plateforme
                  de paiement sécurisée SystemPay pour finaliser votre transaction.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-lg font-semibold"
              >
                <CreditCard className="w-5 h-5" />
                Procéder au paiement
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                En cliquant sur "Procéder au paiement", vous acceptez les conditions générales
                de vente et serez redirigé vers notre prestataire de paiement sécurisé.
              </p>
            </form>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Paiement 100% sécurisé par SystemPay (Lyra Network) - Certifié PCI-DSS
          </p>
        </div>
      </div>
    </div>
  );
}
