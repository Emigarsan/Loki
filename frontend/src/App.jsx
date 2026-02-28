import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = '/api/counter';

const initialState = {
  primary: 4000,
  primaryMax: 4000,
  tertiary: 0
};

const indicatorDefs = [
  { key: 'mangog', label: 'Mangog' },
  { key: 'gate', label: 'Portal entre dos mundos' }
];

const AVATARS = {
  0: { name: 'granuja', imagePath: '/55029a.png' },
  1: { name: 'bribón', imagePath: '/55030a.png' },
  2: { name: 'bellaco', imagePath: '/55031a.png' },
  3: { name: 'canalla', imagePath: '/55032a.png' }
};

const GROUP_NAMES = {
  0: 'Frente único',
  1: 'Resistencia pertinaz',
  2: 'Fuerza dominante',
  3: 'Retirada fingida'
};

const CELESTIAL_NAMES = [
  'Arishem el Juez',
  'Ashema la que escucha',
  'Devron el Experimentador',
  'Eson el Buscador',
  'Exitar el Exterminador',
  'Gamiel el Manipulador',
  'Gammenon el Recolector',
  'Groffon el Regurgitador',
  'Hargen el Medidor',
  'Jemiah el Analizador',
  'Nezarr el Calculador',
  'Oneg el Sondeador',
  'Scathan el Aprobador',
  'Tefral el Supervisor',
  'Zgreb el Aspirante',
  'Ziran el Probador'
];

const getSectorName = (sectorId) => {
  if (!sectorId || sectorId < 1) return 'Desconocido';
  const index = (sectorId - 1) % CELESTIAL_NAMES.length;
  return CELESTIAL_NAMES[index];
};

const getSectorLabel = (sectorId) => `${getSectorName(sectorId)} (#${sectorId})`;

const getAvatarData = (index) => {
  if (index === null || index === undefined) return AVATARS[0];
  const idx = parseInt(index, 10);
  if (isNaN(idx) || idx < 0 || idx > 3) return AVATARS[0];
  return AVATARS[idx];
};

const getGroupName = (avatarIndex) => {
  return GROUP_NAMES[avatarIndex] || 'Entorno Y';
};

export function EventView({ mesaId = null } = {}) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState(null);
  const [modalMessage, setModalMessage] = useState(null);
  const [primaryNoticeVisible, setPrimaryNoticeVisible] = useState(false);
  const [primaryNoticeShown, setPrimaryNoticeShown] = useState(false);
  const [tertiaryLocked, setTertiaryLocked] = useState(false);
  const [sectorState, setSectorState] = useState(null);
  const [sectorError, setSectorError] = useState(null);
  const [mesaDifficulty, setMesaDifficulty] = useState('Normal');
  const [mesaDifficultyLoaded, setMesaDifficultyLoaded] = useState(false);
  const [mesaAvatar, setMesaAvatar] = useState(null);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [defeatModalVisible, setDefeatModalVisible] = useState(false);
  const [defeatRupturaValue, setDefeatRupturaValue] = useState('');
  const [heroDefeatModalVisible, setHeroDefeatModalVisible] = useState(false);
  const [selectedHero, setSelectedHero] = useState('');
  const [planCompletionModalVisible, setPlanCompletionModalVisible] = useState(false);
  const [mesaPlayersInfo, setMesaPlayersInfo] = useState([]);

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
        primaryMax: sanitizeCounter(data.primaryMax, initialState.primaryMax),
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
      .finally(() => { });
  }, [normalizeState]);

  // Initial load only once
  useEffect(() => {
    fetchState(true);
  }, [fetchState]);

  // Background refresh every 3s, paused when a modal is open
  useEffect(() => {
    const id = setInterval(() => {
      if (!modalMessage && !primaryNoticeVisible) {
        fetchState();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [fetchState, modalMessage, primaryNoticeVisible]);

  useEffect(() => {
    if (!mesaId) return;
    setPrimaryNoticeVisible(false);
    setPrimaryNoticeShown(false);
    setMesaDifficultyLoaded(false);
    setMesaAvatar(null);
    setAvatarModalVisible(false);
    fetch(`/api/tables/register/by-number/${encodeURIComponent(mesaId)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Mesa no encontrada');
        }
        return response.json();
      })
      .then((data) => {
        const difficulty = data && typeof data.difficulty === 'string' ? data.difficulty : 'Normal';
        const normalized = String(difficulty || '').trim().toLowerCase();
        setMesaDifficulty(normalized === 'experto' ? 'Experto' : 'Normal');

        // Validar avatar: debe ser un número 0-3
        let avatar = null;
        if (data && data.avatar !== undefined) {
          const avatarVal = String(data.avatar).trim();
          const avatarNum = parseInt(avatarVal, 10);
          if (!isNaN(avatarNum) && avatarNum >= 0 && avatarNum <= 3) {
            avatar = avatarNum;
          }
        }

        // Save players info for hero selection
        if (data && Array.isArray(data.playersInfo)) {
          setMesaPlayersInfo(data.playersInfo);
        } else {
          setMesaPlayersInfo([]);
        }

        setMesaAvatar(avatar);
        if (avatar !== null) {
          setAvatarModalVisible(true);
        }
        setMesaDifficultyLoaded(true);
      })
      .catch(() => {
        setMesaDifficulty('Normal');
        setMesaPlayersInfo([]);
        setMesaDifficultyLoaded(true);
      });
  }, [mesaId]);

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
        setTertiaryLocked(true);
      }
      previousTertiary.current = state.tertiary;
    }
  }, [state.tertiary]);

  useEffect(() => {
    if (!mesaId) return;
    if (!mesaDifficultyLoaded) return;
    const primaryHalf = Math.floor((state.primaryMax ?? initialState.primaryMax) / 2);
    if (!primaryNoticeShown && state.primary <= primaryHalf) {
      setPrimaryNoticeVisible(true);
      setPrimaryNoticeShown(true);
    }
  }, [mesaId, mesaDifficultyLoaded, primaryNoticeShown, state.primary, state.primaryMax]);

  const closeModal = useCallback(() => {
    setModalMessage(null);
  }, []);

  const closePrimaryNotice = useCallback(() => {
    setPrimaryNoticeVisible(false);
  }, []);

  const closeAvatarModal = useCallback(() => {
    setAvatarModalVisible(false);
  }, []);

  const getRandomAvatarExcluding = useCallback((currentAvatar) => {
    const validAvatars = [0, 1, 2, 3].filter((idx) => idx !== currentAvatar);
    const randomIdx = Math.floor(Math.random() * validAvatars.length);
    return validAvatars[randomIdx];
  }, []);

  const openAvatarDefeatModal = useCallback(() => {
    setDefeatRupturaValue(0);
    setDefeatModalVisible(true);
  }, []);

  const closeAvatarDefeatModal = useCallback(() => {
    setDefeatModalVisible(false);
    // Seleccionar nuevo avatar aleatorio
    if (mesaAvatar !== null) {
      const newAvatar = getRandomAvatarExcluding(mesaAvatar);
      setMesaAvatar(newAvatar);
      setAvatarModalVisible(true);
    }
  }, [mesaAvatar, getRandomAvatarExcluding]);

  const handleAvatarDefeatSubmit = useCallback(() => {
    if (!mesaId || mesaAvatar === null) {
      closeAvatarDefeatModal();
      return;
    }

    // Convert empty string to 0 for ruptura value
    const rupturaAmount = defeatRupturaValue === '' ? 0 : parseInt(defeatRupturaValue, 10);

    // First, record the avatar defeat in mesa statistics
    fetch(`/api/mesas/${mesaId}/avatar-defeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatarIndex: mesaAvatar,
        rupturaAmount: rupturaAmount
      })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al registrar derrota del avatar');
        }
        return response.json();
      })
      .then(() => {
        // Then reduce primary counter by rupture amount
        if (rupturaAmount > 0) {
          return fetch(`${API_BASE}/primary/reduce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta: rupturaAmount, mesaId })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(state) });
      })
      .then((response) => {
        if (response && !response.ok) {
          throw new Error('Error al actualizar el contador');
        }
        return response && typeof response.json === 'function' ? response.json() : state;
      })
      .then((data) => {
        setState(normalizeState(data));
        closeAvatarDefeatModal();
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo registrar la derrota del avatar');
      });
  }, [mesaId, mesaAvatar, defeatRupturaValue, normalizeState, state]);

  // Hero Defeat Modal Functions
  const openHeroDefeatModal = useCallback(() => {
    setSelectedHero('');
    setHeroDefeatModalVisible(true);
  }, []);

  const closeHeroDefeatModal = useCallback(() => {
    setHeroDefeatModalVisible(false);
    setSelectedHero('');
  }, []);

  const handleHeroDefeatSubmit = useCallback(() => {
    if (!selectedHero || !mesaId) {
      setError('Debes seleccionar un héroe');
      return;
    }

    // Record hero defeat (1 threat automatically)
    fetch(`/api/mesas/${mesaId}/hero-defeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heroName: selectedHero,
        threatAmount: 1
      })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al registrar derrota del héroe');
        }
        return response.json();
      })
      .then(() => {
        // Increment tertiary counter (Mundos en Colisión)
        return fetch(`${API_BASE}/tertiary/increment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta: 1, mesaId })
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al actualizar Mundos en Colisión');
        }
        return response.json();
      })
      .then((data) => {
        setState(normalizeState(data));
        closeHeroDefeatModal();
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo registrar la derrota del héroe');
      });
  }, [mesaId, selectedHero, normalizeState]);

  // Plan Completion Modal Functions
  const openPlanCompletionModal = useCallback(() => {
    setPlanCompletionModalVisible(true);
  }, []);

  const closePlanCompletionModal = useCallback(() => {
    setPlanCompletionModalVisible(false);
  }, []);

  const handlePlanCompletionSubmit = useCallback(() => {
    if (!mesaId) return;

    // Record plan completion (1 threat automatically)
    fetch(`/api/mesas/${mesaId}/plan-completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threatAmount: 1 })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al registrar completación del plan');
        }
        return response.json();
      })
      .then(() => {
        // Increment tertiary counter (Mundos en Colisión)
        return fetch(`${API_BASE}/tertiary/increment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta: 1, mesaId })
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al actualizar Mundos en Colisión');
        }
        return response.json();
      })
      .then((data) => {
        setState(normalizeState(data));
        closePlanCompletionModal();
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo registrar la completación del plan');
      });
  }, [mesaId, normalizeState]);

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
          {mesaAvatar !== null && (
            <p className="avatar-name">Loki el {getAvatarData(mesaAvatar).name}</p>
          )}
          <div className="mesa-actions">
            <button type="button" className="mesa-action" onClick={openAvatarDefeatModal}>Avatar Derrotado</button>
          </div>
        </section>

        {!tertiaryLocked && (
          <section className="counter-card">
            <h2>Mundos en Colisión</h2>
            <div className="counter-value">{state.tertiary}</div>
            <div className="mesa-actions">
              <button type="button" className="mesa-action" onClick={openHeroDefeatModal}>Héroe derrotado</button>
              <button type="button" className="mesa-action" onClick={openPlanCompletionModal}>Plan principal completado</button>
            </div>
          </section>
        )}

      </div>

      {mesaId && sectorState && (
        <section className="counter-card counter-card--sector">
          <h2>{getSectorLabel(sectorState.sectorId)}</h2>
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
      {primaryNoticeVisible && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal trigger-notice">
            <img
              src={mesaDifficulty === 'Experto' ? '/55034b.png' : '/55034a.png'}
              alt="Aviso de accesorio"
            />
            <p>
              {mesaDifficulty === 'Experto'
                ? 'Dale la vuelta al accesorio Concentración intensa vinculada a tu Avatar para ponerlo por la cara Concentración total.'
                : 'Vincula el accessorio Concentración intensa a tu Avatar.'}
            </p>
            <button type="button" onClick={closePrimaryNotice}>
              Cerrar
            </button>
          </div>
        </div>
      )}
      {avatarModalVisible && mesaAvatar !== null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal trigger-notice">
            <img
              src={getAvatarData(mesaAvatar).imagePath}
              alt={`Avatar: Loki el ${getAvatarData(mesaAvatar).name}`}
            />
            <p>Enfréntate a Loki el {getAvatarData(mesaAvatar).name}.</p>
            <button type="button" onClick={closeAvatarModal}>
              Cerrar
            </button>
          </div>
        </div>
      )}
      {defeatModalVisible && mesaAvatar !== null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal defeat-modal">
            <img
              src={getAvatarData(mesaAvatar).imagePath.replace('a.png', 'b.png')}
              alt={`Avatar derrotado: Loki el ${getAvatarData(mesaAvatar).name}`}
            />
            <h3>Has derrotado a Loki {getAvatarData(mesaAvatar).name}.</h3>

            <div className="defeat-form-group">
              <label htmlFor="ruptura-input">¿Cuántos contadores de Ruptura tenía el Avatar sobre él?</label>
              <div className="ruptura-input">
                <button type="button" onClick={() => {
                  const current = defeatRupturaValue === '' ? 0 : parseInt(defeatRupturaValue, 10);
                  const newValue = Math.max(0, current - 1);
                  setDefeatRupturaValue(newValue === 0 ? '' : newValue);
                }}>−</button>
                <input
                  id="ruptura-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={defeatRupturaValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setDefeatRupturaValue('');
                    } else {
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed >= 0) {
                        setDefeatRupturaValue(parsed);
                      }
                    }
                  }}
                />
                <button type="button" onClick={() => {
                  const current = defeatRupturaValue === '' ? 0 : parseInt(defeatRupturaValue, 10);
                  setDefeatRupturaValue(current + 1);
                }}>+</button>
              </div>
            </div>

            <div className="defeat-info">
              <p>Elige un grupo de tu sector y pon tantos contadores de Sinergia como jugadores hay en ese grupo en el entorno <strong>{getGroupName(mesaAvatar)}</strong>.</p>
            </div>

            <div className="defeat-actions">
              <button type="button" className="btn-primary" onClick={handleAvatarDefeatSubmit}>
                Confirmar
              </button>
              <button type="button" className="btn-secondary" onClick={() => setDefeatModalVisible(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {heroDefeatModalVisible && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal defeat-modal">
            <h3>Registrar Héroe Derrotado</h3>

            <div className="defeat-form-group">
              <label htmlFor="hero-select">Selecciona el héroe derrotado:</label>
              <select
                id="hero-select"
                value={selectedHero}
                onChange={(e) => setSelectedHero(e.target.value)}
              >
                <option value="">-- Selecciona un héroe --</option>
                {mesaPlayersInfo && mesaPlayersInfo.length > 0 ? (
                  mesaPlayersInfo.map((player, index) => (
                    <option key={index} value={player.character}>
                      {player.character}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No hay héroes registrados</option>
                )}
              </select>
            </div>

            <div className="defeat-info">
              <p>Cambia el Superhéroe a su identidad de Alter ego y fija su medidor de Vida en 1.</p>
              <p>Se colocará 1 de Amenaza sobre Mundos en Colisión.</p>
            </div>

            <div className="defeat-actions">
              <button type="button" className="btn-primary" onClick={handleHeroDefeatSubmit}>
                Confirmar
              </button>
              <button type="button" className="btn-secondary" onClick={closeHeroDefeatModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {planCompletionModalVisible && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal defeat-modal">
            <h3>Plan Principal Completado</h3>

            <div className="defeat-info">
              <p>Quita toda la Amenaza que haya sobre Maldad y Alevosía.</p>
              <p>Se colocará 1 de Amenaza sobre Mundos en Colisión.</p>
            </div>

            <div className="defeat-actions">
              <button type="button" className="btn-primary" onClick={handlePlanCompletionSubmit}>
                Confirmar
              </button>
              <button type="button" className="btn-secondary" onClick={closePlanCompletionModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


export default function App() {
  return <EventView />;
}



