import { useCallback, useEffect, useMemo, useState } from 'react';
import centralImage from '../assets/50103a.png';
import celda1 from '../assets/secondary/5A Entorno Celda 1.jpg';
import celda2 from '../assets/secondary/6A Entorno Celda 2.jpg';
import celda3 from '../assets/secondary/7A Entorno Celda 3.jpg';
import celda4 from '../assets/secondary/8A Entorno Celda 4.jpg';
import celda5 from '../assets/secondary/9A Entorno Celda 5.jpg';
import celda6 from '../assets/secondary/10A Entorno Celda 6.jpg';
import celda7 from '../assets/secondary/11A Entorno Celda 7.jpg';
import celda7Accesorio from '../assets/secondary/11B Accesorio Masivo.jpg';
import tertiaryCore from '../assets/43021.png';

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

  const secondaryImages = useMemo(
    () => [celda1, celda2, celda3, celda4, celda5, celda6, celda7],
    []
  );

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
      const rawIndex = withFallback(data.secondaryImageIndex, initialState.secondaryImageIndex);
      const normalizedIndex =
        ((Math.trunc(rawIndex) % secondaryImages.length) + secondaryImages.length) % secondaryImages.length;
      return {
        primary: sanitizeCounter(data.primary, initialState.primary),
        secondary: sanitizeCounter(data.secondary, initialState.secondary),
        tertiary: sanitizeCounter(data.tertiary, initialState.tertiary),
        secondaryImageIndex: normalizedIndex
      };
    },
    [secondaryImages]
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

  const onLastImage = state.secondaryImageIndex === secondaryImages.length - 1;
  const secondaryLocked = onLastImage && state.secondary === 0;
  const primaryRevealed = secondaryLocked;
  const displayedSecondaryImage = secondaryLocked
    ? celda7Accesorio
    : (secondaryImages[state.secondaryImageIndex] ?? secondaryImages[initialState.secondaryImageIndex]);
  const secondaryTitle = secondaryLocked ? 'Accesorio M.Y.T.H.O.S.' : 'Celdas de Contención';
  const secondaryNumberLabel = `Celda ${state.secondaryImageIndex + 1}`;

  return (
    <div className="display-layout">
      <div className="dashboard">
      {error && <p className="error">{error}</p>}

      {primaryRevealed && (
        <section className="counter-card">
          <h2>Vida M.O.D.O.K.</h2>
          <img src={centralImage} alt="M.O.D.O.K" className="counter-art" />
          <div className="counter-value">{state.primary}</div>
        </section>
      )}

      <section className="counter-card">
        <h2>{secondaryTitle}</h2>
        <div className="counter-subtitle">{secondaryNumberLabel}</div>
        <img
          src={displayedSecondaryImage}
          alt={`Celda ${state.secondaryImageIndex + 1}`}
          className="counter-art"
        />
        {!secondaryLocked && <div className="counter-value">{state.secondary}</div>}
      </section>

      {state.tertiary > 0 && (
        <section className="counter-card">
          <h2>Entrenamiento especializado</h2>
          <img src={tertiaryCore} alt="Entrenamiento Especializado" className="counter-art" />
          <div className="counter-value">{state.tertiary}</div>
        </section>
      )}

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
