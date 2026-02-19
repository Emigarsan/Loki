import { useCallback, useEffect, useState } from 'react';

const API_BASE = '/api/counter';

const initialState = {
  primary: 4000,
  tertiary: 0,
  tertiaryMax: 400
};

export default function DisplayPage() {
  const [state, setState] = useState(initialState);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [primaryHalfTriggered, setPrimaryHalfTriggered] = useState(false);

  // Block background scroll when loading modal is open
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    if (initialLoading) {
      root.classList.add('modal-open');
    } else {
      root.classList.remove('modal-open');
    }

    return () => {
      root.classList.remove('modal-open');
    };
  }, [initialLoading]);

  const normalizeState = useCallback(
    (data) => {
      if (!data || typeof data !== 'object') {
        return { ...initialState };
      }
      const withFallback = (value, fallback) =>
        typeof value === 'number' && Number.isFinite(value) ? value : fallback;
      const sanitizeCounter = (value, fallback) => {
        const normalized = withFallback(value, fallback);
        return Math.max(0, Math.trunc(normalized));
      };
      return {
        primary: sanitizeCounter(data.primary, initialState.primary),
        tertiary: sanitizeCounter(data.tertiary, initialState.tertiary),
        tertiaryMax: sanitizeCounter(data.tertiaryMax, initialState.tertiaryMax)
      };
    },
    []
  );

  const fetchState = useCallback(() => {
    fetch(API_BASE)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Respuesta inválida del servidor');
        }
        return response.json();
      })
      .then((data) => {
        setState(normalizeState(data));
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo cargar el estado');
      })
      .finally(() => setInitialLoading(false));
  }, [normalizeState]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 3000);
    return () => clearInterval(id);
  }, [fetchState]);

  useEffect(() => {
    const primaryHalf = Math.floor(initialState.primary / 2);
    if (!primaryHalfTriggered && state.primary <= primaryHalf) {
      setPrimaryHalfTriggered(true);
    }
  }, [primaryHalfTriggered, state.primary]);

  const primaryImage = primaryHalfTriggered ? '/55027b.png' : '/55027a.png';
  const primaryAlt = primaryHalfTriggered
    ? 'Loki, Dios de las mentiras (mitad)'
    : 'Loki, Dios de las mentiras';
  const mundosOverlayImage = '/55028b.png';
  const tertiaryMaxLabel = state.tertiaryMax;

  return (
    <div className="display-layout">
      <div className="dashboard">
        {error && <p className="error">{error}</p>}

        <section className="counter-card">
          <h2>Loki, Dios de las mentiras</h2>
          <div className="image-overlay image-overlay--loki">
            <img src={primaryImage} alt={primaryAlt} />
            <div className="image-overlay-badge image-overlay-badge--center">{state.primary}</div>
          </div>
        </section>

        <section className="counter-card">
          <h2>Mundos en Colisión</h2>
          <div className="image-overlay image-overlay--mundos">
            <img src={mundosOverlayImage} alt="Mundos en Colisión" />
            <div className="image-overlay-badge image-overlay-badge--max">{tertiaryMaxLabel}</div>
            <div className="image-overlay-badge">{state.tertiary}</div>
          </div>
        </section>

        {initialLoading && (
          <div className="modal-overlay">
            <div className="modal">
              <p>Cargando estado...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
