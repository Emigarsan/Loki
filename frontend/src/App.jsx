import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = '/api/counter';

const initialState = {
  primary: 4000,
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
  const [sectorState, setSectorState] = useState(null);
  const [sectorError, setSectorError] = useState(null);
  const [mesaDifficulty, setMesaDifficulty] = useState('Normal');
  const [mesaDifficultyLoaded, setMesaDifficultyLoaded] = useState(false);
  const [mesaAvatar, setMesaAvatar] = useState(null);
  const [lastDefeatedAvatar, setLastDefeatedAvatar] = useState(null);
  const [mesaHeroes, setMesaHeroes] = useState([]);
  const [selectedHero, setSelectedHero] = useState('');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [defeatModalVisible, setDefeatModalVisible] = useState(false);
  const [defeatRupturaValue, setDefeatRupturaValue] = useState(0);
  const [heroDefeatModalVisible, setHeroDefeatModalVisible] = useState(false);
  const [planCompleteModalVisible, setPlanCompleteModalVisible] = useState(false);

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
    setMesaHeroes([]);
    setSelectedHero('');
    setAvatarModalVisible(false);
    setHeroDefeatModalVisible(false);
    setPlanCompleteModalVisible(false);
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

        setMesaAvatar(avatar);
        const playersInfo = Array.isArray(data?.playersInfo) ? data.playersInfo : [];
        const heroes = playersInfo
          .map((p) => (p && typeof p.character === 'string' ? p.character.trim() : ''))
          .filter((name) => name);
        setMesaHeroes([...new Set(heroes)]);
        setSelectedHero(heroes[0] || '');
        if (avatar !== null) {
          setAvatarModalVisible(true);
        }
        setMesaDifficultyLoaded(true);
      })
      .catch(() => {
        setMesaDifficulty('Normal');
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


  useEffect(() => {
    if (!mesaId) return;
    if (!mesaDifficultyLoaded) return;
    const primaryHalf = Math.floor(initialState.primary / 2);
    if (!primaryNoticeShown && state.primary <= primaryHalf) {
      setPrimaryNoticeVisible(true);
      setPrimaryNoticeShown(true);
    }
  }, [mesaId, mesaDifficultyLoaded, primaryNoticeShown, state.primary]);

  const closeModal = useCallback(() => {
    setModalMessage(null);
  }, []);

  const closePrimaryNotice = useCallback(() => {
    setPrimaryNoticeVisible(false);
  }, []);

  const closeAvatarModal = useCallback(() => {
    setAvatarModalVisible(false);
  }, []);

  const getRandomAvatarExcluding = useCallback((avatarToExclude) => {
    // Ensure we have a valid numeric avatar index to exclude
    const avatarToExcludeNum = typeof avatarToExclude === 'number' && avatarToExclude >= 0 && avatarToExclude <= 3 
      ? avatarToExclude 
      : -1;
    
    let validAvatars = [0, 1, 2, 3].filter((idx) => idx !== avatarToExcludeNum);
    
    // Safety check: if somehow all avatars got filtered, use all
    if (validAvatars.length === 0) {
      validAvatars = [0, 1, 2, 3];
    }
    
    const randomIdx = Math.floor(Math.random() * validAvatars.length);
    return validAvatars[randomIdx];
  }, []);

  const openAvatarDefeatModal = useCallback(() => {
    setDefeatRupturaValue(0);
    setDefeatModalVisible(true);
  }, []);

  const closeAvatarDefeatModal = useCallback((defeatedAvatarIndex) => {
    setDefeatModalVisible(false);
    // Guardar el avatar derrotado
    setLastDefeatedAvatar(defeatedAvatarIndex);
    // Seleccionar nuevo avatar aleatorio excluyendo el que se acaba de derrotar
    if (typeof defeatedAvatarIndex === 'number' && defeatedAvatarIndex >= 0 && defeatedAvatarIndex <= 3) {
      const newAvatar = getRandomAvatarExcluding(defeatedAvatarIndex);
      setMesaAvatar(newAvatar);
      setAvatarModalVisible(true);
    }
  }, [getRandomAvatarExcluding]);

  const increaseTertiary = useCallback((delta = 1) => {
    return fetch(`${API_BASE}/tertiary/increase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al actualizar el contador');
        }
        return response.json();
      })
      .then((data) => {
        setState(normalizeState(data));
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo actualizar el contador de Mundos en Colisión.');
        throw err;
      });
  }, [normalizeState]);

  const recordHeroDefeat = useCallback(() => {
    if (!mesaId || !selectedHero) {
      return Promise.resolve();
    }
    return fetch('/api/tables/register/hero-defeated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: mesaId, hero: selectedHero })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al guardar el héroe derrotado');
        }
        return response.json();
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo guardar el héroe derrotado.');
        throw err;
      });
  }, [mesaId, selectedHero]);

  const recordAvatarDefeatMetrics = useCallback((rupturaDelta) => {
    if (!mesaId || mesaAvatar === null || mesaAvatar === undefined) {
      return Promise.resolve();
    }
    return fetch('/api/mesas/avatar-defeated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesaId, avatarIndex: mesaAvatar, ruptura: rupturaDelta })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al guardar la derrota del avatar');
        }
        return response.json();
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo guardar la derrota del avatar.');
        throw err;
      });
  }, [mesaAvatar, mesaId]);

  const recordThreatAdded = useCallback((delta = 1, source) => {
    if (!mesaId) {
      return Promise.resolve();
    }
    return fetch('/api/mesas/threat-added', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesaId, delta, source })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al guardar la amenaza añadida');
        }
        return response.json();
      })
      .catch((err) => {
        console.error(err);
        setError('No se pudo guardar la amenaza añadida.');
        throw err;
      });
  }, [mesaId]);

  const openHeroDefeatModal = useCallback(() => {
    setHeroDefeatModalVisible(true);
  }, []);

  const closeHeroDefeatModal = useCallback(() => {
    setHeroDefeatModalVisible(false);
  }, []);

  const handleHeroDefeatConfirm = useCallback(() => {
    if (mesaHeroes.length > 0 && !selectedHero) return;
    recordHeroDefeat()
      .then(() => recordThreatAdded(1, 'hero'))
      .then(() => increaseTertiary(1))
      .then(() => setHeroDefeatModalVisible(false))
      .catch(() => { });
  }, [increaseTertiary, mesaHeroes.length, recordHeroDefeat, recordThreatAdded, selectedHero]);

  const handlePlanComplete = useCallback(() => {
    recordThreatAdded(1, 'plan')
      .then(() => increaseTertiary(1))
      .then(() => setPlanCompleteModalVisible(true))
      .catch(() => { });
  }, [increaseTertiary, recordThreatAdded]);

  const closePlanCompleteModal = useCallback(() => {
    setPlanCompleteModalVisible(false);
  }, []);

  const handleAvatarDefeatSubmit = useCallback(() => {
    const rupturaDelta = Math.max(0, defeatRupturaValue);
    const updatePrimary = () => {
      if (rupturaDelta <= 0) {
        return Promise.resolve();
      }
      return fetch(`${API_BASE}/primary/reduce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: rupturaDelta })
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al actualizar el contador');
          }
          return response.json();
        })
        .then((data) => {
          setState(normalizeState(data));
        });
    };

    // Guardar el avatar que se va a derrotar ANTES de cualquier async operation
    const defeatedAvatarIndex = mesaAvatar;

    Promise.all([
      recordAvatarDefeatMetrics(rupturaDelta),
      updatePrimary()
    ])
      .then(() => closeAvatarDefeatModal(defeatedAvatarIndex))
      .catch((err) => {
        console.error(err);
        setError('No se pudo registrar la derrota del avatar');
      });
  }, [defeatRupturaValue, normalizeState, recordAvatarDefeatMetrics, mesaAvatar]);

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

        <section className="counter-card">
          <h2>Mundos en Colisión</h2>
          <div className="counter-value">{state.tertiary}</div>
          <div className="mesa-actions">
            <button type="button" className="mesa-action" onClick={openHeroDefeatModal}>Héroe derrotado</button>
            <button type="button" className="mesa-action" onClick={handlePlanComplete}>Plan principal completado</button>
          </div>
        </section>

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

      {heroDefeatModalVisible && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Héroe derrotado</h3>
            {mesaHeroes.length > 0 ? (
              <label className="form" style={{ gap: 8 }}>
                Selecciona el héroe derrotado
                <select
                  value={selectedHero}
                  onChange={(event) => setSelectedHero(event.target.value)}
                >
                  {mesaHeroes.map((hero) => (
                    <option key={hero} value={hero}>
                      {hero}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p style={{ opacity: 0.8 }}>No hay héroes disponibles en esta mesa.</p>
            )}
            <p>
              Cambia este Superhéroe a su identidad de Alter ego y fija su medidor de Vida en 1.
              <br />
              <br />
              Se ha añadido 1 de Amenaza a Mundos en Colisión.
            </p>
            <div className="defeat-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleHeroDefeatConfirm}
                disabled={mesaHeroes.length === 0 || !selectedHero}
              >
                Confirmar
              </button>
              <button type="button" className="btn-secondary" onClick={closeHeroDefeatModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {planCompleteModalVisible && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <p>
              Quita toda la Amenaza que haya sobre Maldad y Alevosía.
              <br />
              <br />
              Se ha añadido 1 de Amenaza a Mundos en Colisión.
            </p>
            <button type="button" onClick={closePlanCompleteModal}>
              Cerrar
            </button>
          </div>
        </div>
      )}

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
                ? 'Dale la vuelta al Accesorio Concentración intensa vinculada a tu Avatar para ponerlo por la cara Concentración total.'
                : 'Vincula el Accesorio Concentración intensa a tu Avatar.'}
            </p>
            <button type="button" onClick={closePrimaryNotice}>
              Cerrar
            </button>
          </div>
        </div>
      )}
      {avatarModalVisible && mesaAvatar !== null && !primaryNoticeVisible && (
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
                <button type="button" onClick={() => setDefeatRupturaValue(Math.max(0, defeatRupturaValue - 1))}>−</button>
                <input
                  id="ruptura-input"
                  type="number"
                  min="0"
                  value={defeatRupturaValue}
                  onChange={(e) => setDefeatRupturaValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
                <button type="button" onClick={() => setDefeatRupturaValue(defeatRupturaValue + 1)}>+</button>
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
    </>
  );
}


export default function App() {
  return <EventView />;
}



