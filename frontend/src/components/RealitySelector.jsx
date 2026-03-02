import { useState, useEffect } from 'react';
import { REALITIES_DATA } from '../data/realitiesData.js';

export default function RealitySelector({ onConfirm, onCancel }) {
  const [selectedReality, setSelectedReality] = useState('');
  const [realityData, setRealityData] = useState(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const realitiesData = REALITIES_DATA;
  const allHeroes = Array.from(new Set(
    Object.values(realitiesData)
      .flatMap((reality) => Array.isArray(reality?.selectableHeroes) ? reality.selectableHeroes : [])
      .filter(Boolean)
  ));

  const resolveSelectableHeroes = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim().toLowerCase() === 'cualquiera') return allHeroes;
    return [];
  };

  useEffect(() => {
    const current = parseInt(document.body.dataset.popupLockCount || '0', 10) || 0;
    document.body.dataset.popupLockCount = String(current + 1);
    document.body.classList.add('popup-scroll-lock');

    return () => {
      const next = Math.max(0, (parseInt(document.body.dataset.popupLockCount || '1', 10) || 1) - 1);
      if (next === 0) {
        delete document.body.dataset.popupLockCount;
        document.body.classList.remove('popup-scroll-lock');
      } else {
        document.body.dataset.popupLockCount = String(next);
      }
    };
  }, []);

  // Obtener las IDs en el orden definido en el objeto
  const realityIds = Object.keys(realitiesData);
  const realities = realityIds.map((id, idx) => ({ ...realitiesData[id], id, number: idx + 1 }));

  useEffect(() => {
    if (selectedReality && realitiesData[selectedReality]) {
      setRealityData(realitiesData[selectedReality]);
    } else {
      setRealityData(null);
    }
    setDescriptionExpanded(false);
  }, [selectedReality]);

  const handleConfirm = () => {
    if (selectedReality && realityData) {
      onConfirm({
        realityId: selectedReality,
        realityName: realityData.name,
        selectableHeroes: resolveSelectableHeroes(realityData.selectableHeroes),
        mandatoryModulars: realityData.mandatoryModulars,
        specialRules: realityData.specialRules
      });
    }
  };

  return (
    <div className="modal-overlay popup-fullscreen">
      <div
        className={`modal-content reality-selector${realityData?.image ? ' reality-selector--with-bg' : ''}`}
        style={realityData?.image ? { '--reality-bg-image': `url(${realityData.image})` } : undefined}
      >
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          {/* Desplegable de realidades */}
          <label className="field-label">
            <span className="field-label-title">Elige una Realidad</span>
            <select
              value={selectedReality}
              onChange={(e) => setSelectedReality(e.target.value)}
              required
            >
              <option value="">Selecciona una realidad...</option>
              {realities.map((reality) => {
                const isCollapsed = reality.id === 'mojoverso';
                return (
                  <option
                    key={reality.id}
                    value={reality.id}
                    disabled={isCollapsed}
                    style={isCollapsed ? { color: '#888', backgroundColor: '#eee' } : {}}
                  >
                    {`Realidad #${reality.number}: ${reality.name}`}
                    {isCollapsed ? ' (colapsada)' : ''}
                  </option>
                );
              })}
            </select>
          </label>

          {realityData && (
            <>
              {/* Descripción de la realidad */}
              <div className="reality-section">
                <h3>Descripción</h3>
                {(() => {
                  const text = realityData.description || '';
                  const canCollapse = text.length > 80;
                  const visibleText = canCollapse && !descriptionExpanded
                    ? `${text.slice(0, 80).trimEnd()}…`
                    : text;
                  return (
                    <>
                      <p>{visibleText}</p>
                      {canCollapse && (
                        <button
                          type="button"
                          className="reality-read-more"
                          onClick={() => setDescriptionExpanded((prev) => !prev)}
                        >
                          {descriptionExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Héroes seleccionables */}
              <div className="reality-section">
                <h3>Héroes Seleccionables</h3>
                <div className="heroes-list">
                  {resolveSelectableHeroes(realityData.selectableHeroes).map((hero) => (
                    <span key={hero} className="hero-badge">
                      {hero}
                    </span>
                  ))}
                </div>
              </div>

              {/* Modulares obligatorios */}
              <div className="reality-section">
                <h3>Modulares Obligatorios</h3>
                <div className="modulars-list">
                  {realityData.mandatoryModulars.length === 0 ? (
                    <p className="empty-state">No hay modulares obligatorios</p>
                  ) : (
                    realityData.mandatoryModulars.map((modular) => (
                      <span key={modular} className="modular-badge">
                        {modular}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {realityData.specialRules && (
                <div className="reality-section">
                  <h3>Reglas especiales</h3>
                  <p>{realityData.specialRules}</p>
                </div>
              )}
            </>
          )}

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!selectedReality}
              onClick={handleConfirm}
            >
              Confirmar Realidad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
