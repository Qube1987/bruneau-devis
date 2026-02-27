import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface PaymentResultProps {
  searchParams?: URLSearchParams;
}

export default function PaymentResult({ searchParams }: PaymentResultProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    // Get URL parameters from SystemPay return
    const params = searchParams || new URLSearchParams(window.location.search);

    const vadsTransStatus = params.get('vads_trans_status');
    const vadsOrderId = params.get('vads_order_id');
    const vadsAmount = params.get('vads_amount');
    const vadsTransId = params.get('vads_trans_id');
    const vadsAuthResult = params.get('vads_auth_result');

    const data = {
      orderId: vadsOrderId,
      transId: vadsTransId,
      amount: vadsAmount ? parseInt(vadsAmount) / 100 : 0,
      authResult: vadsAuthResult,
      transStatus: vadsTransStatus,
    };

    setTransactionData(data);

    // Determine status based on trans_status (according to SystemPay documentation)
    const successStatuses = ['ACCEPTED', 'AUTHORISED', 'AUTHORISED_TO_VALIDATE', 'CAPTURED', 'INITIAL', 'UNDER_VERIFICATION', 'WAITING_AUTHORISATION', 'WAITING_AUTHORISATION_TO_VALIDATE', 'WAITING_FOR_PAYMENT'];

    if (successStatuses.includes(vadsTransStatus || '')) {
      setStatus('success');
    } else if (vadsTransStatus === 'REFUSED' || vadsTransStatus === 'ABANDONED') {
      setStatus('failed');
    } else if (vadsTransStatus === 'CANCELLED') {
      setStatus('cancelled');
    } else {
      setStatus('failed');
    }
  }, [searchParams]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Traitement en cours...
            </h2>
            <p className="text-gray-600">
              Veuillez patienter pendant que nous vérifions votre paiement.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Paiement réussi !
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Votre acompte a été payé avec succès.
            </p>

            {transactionData && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Détails de la transaction</h3>
                <div className="space-y-2 text-sm">
                  {transactionData.transId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Numéro de transaction :</span>
                      <span className="font-medium text-gray-900">{transactionData.transId}</span>
                    </div>
                  )}
                  {transactionData.amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant payé :</span>
                      <span className="font-medium text-gray-900">{transactionData.amount.toFixed(2)} €</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Un email de confirmation vous a été envoyé. Vous pouvez maintenant fermer cette page.
              </p>
            </div>

            <button
              onClick={() => window.close()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Fermer cette page
            </button>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center">
            <div className="flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Paiement refusé
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Votre paiement n'a pas pu être effectué.
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                Le paiement a été refusé par votre banque. Veuillez vérifier vos informations
                bancaires et réessayer, ou contacter votre banque pour plus d'informations.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Réessayer
              </button>
              <button
                onClick={() => window.close()}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        );

      case 'cancelled':
        return (
          <div className="text-center">
            <div className="flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Paiement annulé
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Vous avez annulé le paiement.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                Aucun montant n'a été débité de votre compte. Vous pouvez réessayer le paiement
                en utilisant le lien dans l'email de confirmation.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Réessayer
              </button>
              <button
                onClick={() => window.close()}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        {renderContent()}
      </div>
    </div>
  );
}
