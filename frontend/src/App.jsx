import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = '/api/counter';

const initialState = {
  primary: 4000,
  tertiary: 0
};

const indicatorDefs = [
  { key: 'mangog', label: 'Mangog' },
  { key: 'gate', label: 'Puerta entre mundos' }
];

export function EventView({ mesaId = null } = {}) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState(null);
  const [modalMessage, setModalMessage] = useState(null);
  const [tertiaryLocked, setTertiaryLocked] = useState(false);
  const [sectorState, setSectorState] = useState(null);
  const [sectorError, setSectorError] = useState(null);

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
        tertiary: sanitizeCounter(data.tertiary, initialState.tertiary)
      };
    },
    []
  );

  const fetchState = useCallback((isInitial = false) => {
    fetch(API_BASE)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Respuesta inv?lida del servidor');
        }
        return response.json();
      })
      .then((data) => {
        setState(normalizeState(data));
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo cargar el estado de los contadores.');
      })
      .finally(() => {});
  }, [normalizeState]);

  // Initial load only once
  useEffect(() => {
    fetchState(true);
  }, [fetchState]);

  // Background refresh every 3s, paused when a modal is open
  useEffect(() => {
    const id = setInterval(() => {
      if (!modalMessage) {
        fetchState();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [fetchState, modalMessage]);

  const fetchSectorState = useCallback(() => {
    if (!mesaId) return;
    fetch(`/api/sector/${mesaId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Respuesta invalida del servidor');
        }
        return response.json();
      })
      .then((data) => {
        setSectorState(data);
        setSectorError(null);
      })
      .catch((err) => {
        console.error(err);
        setSectorError('No se pudo cargar el estado del sector.');
      });
  }, [mesaId]);

  useEffect(() => {
    if (!mesaId) return;
    fetchSectorState();
    const id = setInterval(fetchSectorState, 3000);
    return () => clearInterval(id);
  }, [fetchSectorState, mesaId]);

  const previousTertiary = useRef(initialState.tertiary);

  useEffect(() => {
    if (previousTertiary.current !== state.tertiary) {
      if (state.tertiary === 0) {
        // Lock tertiary immediately when it reaches 0 and open modal
        setTertiaryLocked(true);
        setModalMessage('Alto, habeis derrotado el Plan Secundario, escucha las instrucciones de los coordinadores');
      }
      previousTertiary.current = state.tertiary;
    }
  }, [state.tertiary]);

  const closeModal = useCallback(() => {
    setModalMessage(null);
  }, []);

  const previousDefeated = useRef({});

  useEffect(() => {
    if (!sectorState?.indicatorsByMesa || !sectorState?.mesas) return;
    const defeatKey = (mesaId, indicator) => `${mesaId}-${indicator}`;
    
    sectorState.mesas.forEach((targetMesaId) => {
      const mesaInds = sectorState.indicatorsByMesa[targetMesaId];
      if (!mesaInds) return;
      indicatorDefs.forEach((indicator) => {
        const current = mesaInds[indicator.key];
        if (!current) return;
        const key = defeatKey(targetMesaId, indicator.key);
        const wasDefeated = previousDefeated.current[key];
        if (!wasDefeated && current.defeated) {
          setModalMessage(`Se ha derrotado ${indicator.label} en la mesa ${targetMesaId}`);
        }
        previousDefeated.current[key] = current.defeated;
      });
    });
  }, [sectorState]);

  const setIndicatorActive = useCallback((indicatorKey, active) => {
    if (!mesaId) return;
    fetch(`/api/sector/${mesaId}/indicator/${indicatorKey}/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    })
      .then((response) => response.ok ? response.json() : response.json().then((d) => Promise.reject(new Error(d?.error || 'Error'))))
      .then((data) => {
        setSectorState(data);
        setSectorError(null);
      })
      .catch((err) => {
        console.error(err);
        if (err.message !== 'indicator defeated') {
          setSectorError(err.message);
        }
      });
  }, [mesaId]);

  const updateIndicatorValue = useCallback((targetMesaId, indicatorKey, delta) => {
    if (!mesaId) return;
    fetch(`/api/sector/${mesaId}/indicator/${indicatorKey}/delta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetMesaId, delta })
    })
      .then((response) => response.ok ? response.json() : response.json().then((d) => Promise.reject(new Error(d?.error || 'Error'))))
      .then((data) => {
        setSectorState(data);
        setSectorError(null);
      })
      .catch((err) => {
        console.error(err);
        if (err.message !== 'indicator defeated') {
          setSectorError(err.message);
        }
      });
  }, [mesaId]);

  const renderIndicators = () => {
    if (!mesaId || !sectorState?.indicatorsByMesa || !sectorState?.mesas) return null;
    return (
      <div className="indicators-by-mesa">
        {sectorState.mesas.map((targetMesaId) => {
          const mesaInds = sectorState.indicatorsByMesa[targetMesaId];
          if (!mesaInds) return null;
          const isMyMesa = targetMesaId === mesaId;
          
          // Para mi mesa: siempre mostrar. Para otras: solo si hay activos/derrotados
          const shouldShowGroup = isMyMesa || Object.values(mesaInds).some((ind) => ind.activeMesaId != null || ind.defeated);
          if (!shouldShowGroup) return null;
          
          return (
            <div key={`mesa-${targetMesaId}`} className="mesa-indicators-group">
              <div className="mesa-indicators-title">Mesa {targetMesaId}</div>
              <div className="indicator-list">
                {indicatorDefs.map((indicator) => {
                  const current = mesaInds[indicator.key] || {};
                  const isActive = current.activeMesaId != null;
                  const isDefeated = !!current.defeated;
                  
                  // Para mi mesa: siempre mostrar. Para otras: solo si activo o derrotado
                  if (!isMyMesa && !isActive && !isDefeated) return null;
                  
                  return (
                    <div key={`${targetMesaId}-${indicator.key}`} className="indicator-row">
                      {isMyMesa && (
                        <label className="indicator-toggle">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(event) => setIndicatorActive(indicator.key, event.target.checked)}
                            disabled={isDefeated}
                          />
                          <span>{indicator.label}</span>
                        </label>
                      )}
                      {!isMyMesa && (
                        <div className="indicator-label">{indicator.label}</div>
                      )}
                      {isActive && (
                        <div className="indicator-controls">
                          <button type="button" onClick={() => updateIndicatorValue(targetMesaId, indicator.key, -1)}>-</button>
                          <span className="indicator-value">{current.value ?? 0}</span>
                          <button type="button" onClick={() => updateIndicatorValue(targetMesaId, indicator.key, 1)}>+</button>
                        </div>
                      )}
                      {isDefeated && (
                        <div className="indicator-note">
                          Derrotado
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderIndicatorsForMesa = (targetMesaId) => {
    if (!sectorState?.indicatorsByMesa) return null;
    const mesaInds = sectorState.indicatorsByMesa[targetMesaId];
    if (!mesaInds) return null;
    const isMyMesa = targetMesaId === mesaId;
    
    // Para mi mesa: siempre mostrar. Para otras: mostrar si activo o derrotado
    const shouldShow = isMyMesa || Object.values(mesaInds).some((ind) => ind.activeMesaId != null || ind.defeated);
    if (!shouldShow) return null;
    
    return (
      <div className="indicator-list">
        {indicatorDefs.map((indicator) => {
          const current = mesaInds[indicator.key] || {};
          const isActive = current.activeMesaId != null;
          const isDefeated = !!current.defeated;
          
          // Para mi mesa: siempre mostrar. Para otras: mostrar si activo o derrotado
          if (!isMyMesa && !isActive && !isDefeated) return null;
          
          return (
            <div key={`${targetMesaId}-${indicator.key}`} className="indicator-row">
              <div className="indicator-header">
                {isMyMesa && (
                  <label className="indicator-toggle">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIndicatorActive(indicator.key, event.target.checked)}
                      disabled={isDefeated}
                    />
                    <span>{indicator.label}</span>
                  </label>
                )}
                {!isMyMesa && (
                  <div className="indicator-label">{indicator.label}</div>
                )}
                {isDefeated && (
                  <div className="indicator-defeated">
                    Derrotado
                  </div>
                )}
              </div>
              {isActive && !isDefeated && (
                <div className="indicator-controls">
                  <button type="button" onClick={() => updateIndicatorValue(targetMesaId, indicator.key, -1)}>-</button>
                  <span className="indicator-value">{current.value ?? 0}</span>
                  <button type="button" onClick={() => updateIndicatorValue(targetMesaId, indicator.key, 1)}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {error && <p className="error">{error}</p>}
      <div className="dashboard dashboard--mesa">
        <section className="counter-card">
          <h2>Loki, Dios de las mentiras</h2>
          <div className="counter-value">{state.primary}</div>
          <div className="mesa-actions">
            <button type="button" className="mesa-action">Avatar Derrotado</button>
          </div>
        </section>

        {!tertiaryLocked && (
          <section className="counter-card">
            <h2>Mundos en Colisión</h2>
            <div className="counter-value">{state.tertiary}</div>
            <div className="mesa-actions">
              <button type="button" className="mesa-action">Héroe derrotado</button>
              <button type="button" className="mesa-action">Plan principal completado</button>
            </div>
          </section>
        )}

      </div>

      {mesaId && sectorState && (
        <section className="counter-card counter-card--sector">
          <h2>Sector {sectorState.sectorId}</h2>
          <div className="sector-grid">
            {(sectorState.mesas || []).map((mesaNumber) => (
              <div
                key={`sector-mesa-${mesaNumber}`}
                className={`sector-tile${mesaId === mesaNumber ? ' sector-tile--active' : ''}`}
              >
                <div className="sector-tile-title">Mesa {mesaNumber}{mesaId === mesaNumber && <em> (tu mesa)</em>}</div>
                {renderIndicatorsForMesa(mesaNumber)}
              </div>
            ))}
          </div>
        </section>
      )}

      {sectorError && <p className="error">{sectorError}</p>}

      {modalMessage && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <p>{modalMessage}</p>
            <button type="button" onClick={closeModal}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}


export default function App() {
  return <EventView />;
}



