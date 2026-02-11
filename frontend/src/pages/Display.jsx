import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = '/api/counter';

const initialState = {
  primary: 1792,
  secondary: 128,
  tertiary: 640,
  secondaryImageIndex: 0
};

export default function DisplayPage() {
  const [state, setState] = useState(initialState);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

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
        secondary: sanitizeCounter(data.secondary, initialState.secondary),
        tertiary: sanitizeCounter(data.tertiary, initialState.tertiary),
        secondaryImageIndex: initialState.secondaryImageIndex
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

  const primaryImage = '/55027a.png';
  const secondaryOverlayImage = '/55028b.png';
  const tertiaryMaxLabel = initialState.tertiary;

  return (
    <div className="display-layout">
      <div className="dashboard">
        {error && <p className="error">{error}</p>}

        <section className="counter-card">
          <h2>Loki, Dios de las mentiras</h2>
          <div className="image-overlay image-overlay--loki">
            <img src={primaryImage} alt="Loki, Dios de las mentiras" />
            <div className="image-overlay-badge image-overlay-badge--center">{state.primary}</div>
          </div>
        </section>

        <section className="counter-card">
          <h2>Mundos en Colision</h2>
          <div className="image-overlay image-overlay--mundos">
            <img src={secondaryOverlayImage} alt="Mundos en Colision" />
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
