import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './AppRouter.jsx';
import './styles.css';

// Set a CSS variable `--vh` equal to 1% of the visible viewport height.
// visualViewport is more accurate on mobile devices with dynamic browser bars.
function setVh() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--vh', `${viewportHeight * 0.01}px`);
}
setVh();
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', setVh);
window.visualViewport?.addEventListener('resize', setVh);
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
