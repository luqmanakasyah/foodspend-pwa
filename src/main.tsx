import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker only in production builds to avoid caching headaches during local dev.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Listen for waiting worker and auto-swap
      function onNewServiceWorker(sw: ServiceWorker | null) {
        if (!sw) return;
        // Send skip waiting so it becomes active immediately
        sw.postMessage({ type: 'SKIP_WAITING' });
      }
      if (reg.waiting) onNewServiceWorker(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (newSW) newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed') onNewServiceWorker(reg.waiting);
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return; refreshing = true; window.location.reload();
      });
    }).catch(console.error);
  });
} else if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  // In dev, ensure any previously registered SW is removed so changes reflect immediately.
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
    if (regs.length) console.info('[sw] Unregistered existing service workers for dev');
  });
}
