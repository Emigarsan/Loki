import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './AppRouter.jsx';
import './styles.css';

// Set a CSS variable `--vh` equal to 1% of the innerHeight.
// This avoids issues with mobile UI chrome (address bar / nav bar) changing viewport height.
function setVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
setVh();
window.addEventListener('resize', setVh);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
