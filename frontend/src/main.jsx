import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { registerServiceWorker } from './pwaRegister'

// Register PWA service worker for 0% internet offline capability
registerServiceWorker()

// Auto-recover from stale lazy chunk hashes across production deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    console.warn('[Globetrotter] Dynamic chunk hash changed due to new deployment. Auto-refreshing...');
    window.location.reload();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
