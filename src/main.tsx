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
      // Listen for controllerchange to reload once
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return; refreshing = true; window.location.reload();
      });
      // If waiting SW appears, trigger activation
      if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing; if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            sw.postMessage('SKIP_WAITING');
          }
        });
      });
      navigator.serviceWorker.addEventListener('message', (evt) => {
        if (evt.data?.type === 'SW_ACTIVATED') {
          console.info('[sw] activated version', evt.data.version);
        }
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
