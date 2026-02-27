import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/AuthForm';
import { Navigation } from './components/Navigation';
import { DevisForm } from './components/DevisForm';
import { DevisList } from './components/DevisList';
import { ProductManagement } from './components/ProductManagement';
import { MediaLibrary } from './components/MediaLibrary';
import { ClientManagement } from './components/ClientManagement';
import { DevisViewer } from './components/DevisViewer';
import PaymentPage from './components/PaymentPage';
import PaymentResult from './components/PaymentResult';
import NotificationsPanel from './components/NotificationsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { Devis } from './types';

function App() {
  const [currentView, setCurrentView] = useState('devis');
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [publicDevisToken, setPublicDevisToken] = useState<string | null>(null);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [isPaymentResult, setIsPaymentResult] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const path = window.location.pathname;
      console.log('Current path:', path);

      const devisMatch = path.match(/^\/devis\/([a-f0-9-]+)$/);
      const paymentMatch = path.match(/^\/payment\/([a-f0-9-]+)$/);
      const paymentResultMatch = path.match(/^\/payment-result/);

      if (devisMatch) {
        console.log('Setting public devis token:', devisMatch[1]);
        setPublicDevisToken(devisMatch[1]);
      } else if (paymentMatch) {
        console.log('Setting payment token:', paymentMatch[1]);
        setPaymentToken(paymentMatch[1]);
      } else if (paymentResultMatch) {
        console.log('Payment result page');
        setIsPaymentResult(true);
      }
    } catch (error) {
      console.error('Error in App initialization:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  const { user, loading } = useAuth();

  if (initError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#29235C] to-[#1a1640] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur d'initialisation</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <p className="text-sm text-gray-500">Veuillez contacter le support technique.</p>
        </div>
      </div>
    );
  }

  if (publicDevisToken) {
    console.log('Rendering DevisViewer with token:', publicDevisToken);
    return (
      <ErrorBoundary>
        <DevisViewer token={publicDevisToken} />
      </ErrorBoundary>
    );
  }

  if (paymentToken) {
    console.log('Rendering PaymentPage with token:', paymentToken);
    return (
      <ErrorBoundary>
        <PaymentPage token={paymentToken} />
      </ErrorBoundary>
    );
  }

  if (isPaymentResult) {
    console.log('Rendering PaymentResult');
    return (
      <ErrorBoundary>
        <PaymentResult />
      </ErrorBoundary>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#29235C] to-[#1a1640] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Chargement de Devis...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'devis':
        if (selectedDevis) {
          return (
            <DevisForm 
              initialDevis={selectedDevis}
              onBack={() => {
                setSelectedDevis(null);
                setCurrentView('list');
              }}
            />
          );
        }
        return <DevisForm />;
      case 'list':
        return (
          <DevisList 
            onLoadDevis={(devis) => {
              setSelectedDevis(devis);
              setCurrentView('devis');
            }}
            onNewDevis={() => {
              setSelectedDevis(null);
              setCurrentView('devis');
            }}
          />
        );
      case 'products':
        return (
          <ProductManagement />
        );
      case 'media':
        return (
          <MediaLibrary />
        );
      case 'clients':
        return (
          <ClientManagement />
        );
      case 'notifications':
        return (
          <NotificationsPanel />
        );
      default:
        return <DevisForm />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="py-6">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;