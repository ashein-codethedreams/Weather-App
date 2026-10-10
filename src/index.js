import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) {
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`, {
        updateViaCache: 'none',
      })
      .then((registration) => {
        const announceUpdate = (worker) => {
          if (worker && navigator.serviceWorker.controller) {
            window.dispatchEvent(
              new CustomEvent('skyward:updateavailable', { detail: worker })
            );
          }
        };
        const applyUpdate = (event) => {
          if (event.detail) {
            refreshing = true;
            event.detail.postMessage({ type: 'SKIP_WAITING' });
          }
        };
        const checkWhenVisible = () => {
          if (document.visibilityState === 'visible') {
            checkForUpdates();
          }
        };

        if (registration.waiting) {
          announceUpdate(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              announceUpdate(registration.waiting);
            }
          });
        });

        const checkForUpdates = () => {
          registration.update().catch((error) => {
            console.error('Skyward could not check for app updates:', error);
          });
        };
        const updateCheckInterval = window.setInterval(
          checkForUpdates,
          60 * 60 * 1000
        );
        window.addEventListener('focus', checkForUpdates);
        document.addEventListener('visibilitychange', checkWhenVisible);
        window.addEventListener('skyward:apply-update', applyUpdate);

        window.addEventListener('beforeunload', () => {
          window.clearInterval(updateCheckInterval);
          window.removeEventListener('focus', checkForUpdates);
          document.removeEventListener('visibilitychange', checkWhenVisible);
          window.removeEventListener('skyward:apply-update', applyUpdate);
        });
      })
      .catch((error) => {
        console.error('Skyward could not register its service worker:', error);
      });
  });
}
