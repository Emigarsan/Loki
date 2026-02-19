import { useState, useEffect } from 'react';

export default function RealitySelector({ onConfirm, onCancel }) {
  const [selectedReality, setSelectedReality] = useState('');
  const [realityData, setRealityData] = useState(null);

  // Datos placeholder para realidades
  const realitiesData = {
    'reality-1': {
      id: 'reality-1',
      name: 'Realidad 1',
      description: 'La primera realidad, donde todo comienza. Un mundo lleno de posibilidades y misterios por descubrir.',
      image: 'placeholder-image-1',
      selectableHeroes: ['Iron Man', 'Captain America', 'Hulk'],
      mandatoryModulars: []
    },
    'reality-2': {
      id: 'reality-2',
      name: 'Realidad 2',
      description: 'Una realidad alternativa donde las reglas son diferentes. Los héroes enfrentan nuevos desafíos.',
      image: 'placeholder-image-2',
      selectableHeroes: ['Thor', 'Black Widow', 'Hawkeye', 'Spider-Man'],
      mandatoryModulars: []
    },
    'reality-3': {
      id: 'reality-3',
      name: 'Realidad 3',
      description: 'Un universo oscuro donde la magia y la tecnología se entrelazan de formas inesperadas.',
      image: 'placeholder-image-3',
      selectableHeroes: ['Doctor Strange', 'Wanda Maximoff', 'Vision', 'Black Panther', 'Ant-Man'],
      mandatoryModulars: []
    },
    // Más realidades...
    'reality-4': {
      id: 'reality-4',
      name: 'Realidad 4',
      description: 'En esta realidad, los guardianes del universo mantienen el equilibrio cósmico.',
      image: 'placeholder-image-4',
      selectableHeroes: ['Star-Lord', 'Gamora', 'Drax', 'Rocket', 'Groot', 'Adam Warlock'],
      mandatoryModulars: []
    }
  };

  const realities = Object.values(realitiesData).slice(0, 40); // Limitar a 40 como en el placeholder

  useEffect(() => {
    if (selectedReality && realitiesData[selectedReality]) {
      setRealityData(realitiesData[selectedReality]);
    } else {
      setRealityData(null);
    }
  }, [selectedReality]);

  const handleConfirm = () => {
    if (selectedReality && realityData) {
      onConfirm({
        realityId: selectedReality,
        realityName: realityData.name,
        selectableHeroes: realityData.selectableHeroes,
        mandatoryModulars: realityData.mandatoryModulars
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content reality-selector">
        <h2>Seleccionar Realidad</h2>

        <form className="form" onSubmit={(e) => e.preventDefault()}>
          {/* Imagen placeholder */}
          <div className="reality-image-container">
            {realityData ? (
              <div className="reality-image-placeholder">{realityData.image}</div>
            ) : (
              <div className="reality-image-placeholder">Selecciona una realidad</div>
            )}
          </div>

          {/* Desplegable de realidades */}
          <label className="field-label">
            <span className="field-label-title">Elige una Realidad</span>
            <select
              value={selectedReality}
              onChange={(e) => setSelectedReality(e.target.value)}
              required
            >
              <option value="">Selecciona una realidad...</option>
              {realities.map((reality, idx) => (
                <option key={reality.id} value={reality.id}>
                  Realidad {idx + 1} - {reality.name}
                </option>
              ))}
            </select>
          </label>

          {realityData && (
            <>
              {/* Descripción de la realidad */}
              <div className="reality-section">
                <h3>Descripción</h3>
                <p>{realityData.description}</p>
              </div>

              {/* Héroes seleccionables */}
              <div className="reality-section">
                <h3>Héroes Seleccionables</h3>
                <div className="heroes-list">
                  {realityData.selectableHeroes.map((hero) => (
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
