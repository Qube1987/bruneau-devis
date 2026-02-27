import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

function renderErrorScreen(error: any) {
  console.error('Failed to initialize app:', error);

  root.render(
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #29235C 0%, #1a1640 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        padding: '2rem',
        maxWidth: '32rem',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#29235C', marginBottom: '1rem' }}>
          Erreur de configuration
        </h2>
        <p style={{ color: '#4B5563', marginBottom: '1rem' }}>
          L'application ne peut pas démarrer. Les variables d'environnement Supabase sont manquantes.
        </p>
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginTop: '1rem',
          textAlign: 'left'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#991B1B', marginBottom: '0.5rem' }}>
            <strong>Variables requises:</strong>
          </p>
          <ul style={{ fontSize: '0.875rem', color: '#991B1B', marginLeft: '1.5rem' }}>
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '1rem' }}>
          Si vous êtes l'administrateur, consultez NETLIFY_ENV_SETUP.md pour configurer ces variables.
        </p>
      </div>
    </div>
  );
}

import('./App.tsx')
  .then((module) => {
    const App = module.default;
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch(renderErrorScreen);
