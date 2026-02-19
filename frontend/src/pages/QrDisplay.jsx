import { useEffect, useState } from 'react';
import qrMorning from '../assets/qr-morning.svg';
import qrAfternoon from '../assets/qr-afternoon.svg';

const POLL_INTERVAL_MS = 5000;

const defaultFlags = {
  event: false
};

const normalizeFlags = (raw) => ({
  event: !!(raw && raw.event)
});

export default function QrDisplayPage() {
  const [flags, setFlags] = useState(defaultFlags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch('/api/display/qr')
        .then((response) => {
          if (!response.ok) {
            throw new Error('Respuesta no valida');
          }
          return response.json();
        })
        .then((data) => {
          if (cancelled) return;
          setFlags(normalizeFlags(data));
          setError(null);
        })
        .catch(() => {
          if (cancelled) return;
          setError('No se pudo cargar el estado de los QR');
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    };

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="qr-display-page">
      {error && <p className="error">{error}</p>}
      <div className="qr-grid">
        <section className={`qr-card ${flags.event ? 'active' : 'inactive'}`}>
          <h2>Evento (Tarde)</h2>
          <img src={qrAfternoon} alt="Codigo QR Evento por la tarde" />
          <p className="qr-status">
            {flags.event ? 'Disponible para escanear' : 'Pendiente de activar desde Admin > Ver Mesas > Event'}
          </p>
        </section>
      </div>
      {!error && (
        <p className="status-banner">Esta pantalla se actualiza automaticamente cada {Math.round(POLL_INTERVAL_MS / 1000)} segundos.</p>
      )}
      {loading && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Cargando QRs...</p>
          </div>
        </div>
      )}
    </div>
  );
}
