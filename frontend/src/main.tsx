import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { register as registerSW } from './utils/serviceWorker'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerSW({
    onSuccess: (registration) => {
      console.log('SW registered: ', registration);
    },
    onUpdate: (registration) => {
      console.log('SW updated: ', registration);
      // Could show a toast notification here
    },
    onOffline: () => {
      console.log('App is running in offline mode');
    },
    onOnline: () => {
      console.log('App is back online');
    }
  });
}