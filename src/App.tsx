import React, { useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { Navigation } from './components/Navigation';
import { DevisForm } from './components/DevisForm';
import { DevisList } from './components/DevisList';
import { ProductManagement } from './components/ProductManagement';
import { MediaLibrary } from './components/MediaLibrary';
import { ClientManagement } from './components/ClientManagement';
import { ExtrabatReconciliation } from './components/ExtrabatReconciliation';
import { DevisViewer } from './components/DevisViewer';
import PaymentPage from './components/PaymentPage';
import PaymentResult from './components/PaymentResult';
import NotificationsPanel from './components/NotificationsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { Devis } from './types';

// Detect public routes synchronously BEFORE React renders
// This avoids calling useAuth (which touches supabase.auth) on public pages
const path = window.location.pathname;
const devisMatch = path.match(/^\/devis\/([a-f0-9-]+)$/);
const paymentMatch = path.match(/^\/payment\/([a-f0-9-]+)$/);
const paymentResultMatch = path.match(/^\/payment-result/);

const isPublicRoute = !!(devisMatch || paymentMatch || paymentResultMatch);

// Component for authenticated app (admin dashboard)
function AuthenticatedApp() {
  const [currentView, setCurrentView] = useState('devis');
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);

  const { user, loading } = useAuth();

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
      case 'extrabat':
        return (
          <ExtrabatReconciliation />
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

// Main App component - routes between public and authenticated views
function App() {
  // Public routes: render directly WITHOUT useAuth (no auth interference)
  if (devisMatch) {
    const token = devisMatch[1];
    console.log('Rendering DevisViewer with token:', token);
    return (
      <ErrorBoundary>
        <DevisViewer token={token} />
      </ErrorBoundary>
    );
  }

  if (paymentMatch) {
    const token = paymentMatch[1];
    console.log('Rendering PaymentPage with token:', token);
    return (
      <ErrorBoundary>
        <PaymentPage token={token} />
      </ErrorBoundary>
    );
  }

  if (paymentResultMatch) {
    console.log('Rendering PaymentResult');
    return (
      <ErrorBoundary>
        <PaymentResult />
      </ErrorBoundary>
    );
  }

  // Authenticated app (admin dashboard)
  return <AuthenticatedApp />;
}

export default App;