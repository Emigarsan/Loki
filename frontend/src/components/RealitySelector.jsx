import { useState } from 'react';

// Placeholder heroes list
const PLACEHOLDER_HEROES = [
  'Iron Man', 'Spider-Man', 'Captain America', 'Thor', 'Hulk',
  'Black Widow', 'Hawkeye', 'Black Panther', 'Doctor Strange', 'Scarlet Witch',
  'Vision', 'Ant-Man', 'Wasp', 'Captain Marvel', 'Star-Lord',
  'Gamora', 'Drax', 'Rocket Raccoon', 'Groot', 'Mantis'
];

// Generate random heroes for each reality using Fisher-Yates shuffle
function getRandomHeroes() {
  const count = Math.floor(Math.random() * 3) + 4; // 4-6 heroes
  const shuffled = [...PLACEHOLDER_HEROES];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}

export default function RealitySelector({ onConfirm, onCancel }) {
  const [selectedReality, setSelectedReality] = useState('');
  const [availableHeroes, setAvailableHeroes] = useState([]);

  const handleRealityChange = (e) => {
    const reality = e.target.value;
    setSelectedReality(reality);
    // Generate random heroes for this reality
    if (reality) {
      setAvailableHeroes(getRandomHeroes());
    } else {
      setAvailableHeroes([]);
    }
  };

  const handleConfirm = () => {
    if (!selectedReality) {
      alert('Por favor selecciona una realidad');
      return;
    }
    onConfirm({ reality: selectedReality, availableHeroes });
  };

  return (
    <div className="reality-selector">
      <div className="reality-selector__content">
        <h2>Selección de Realidad</h2>
        
        {/* Placeholder Image */}
        <div className="reality-selector__image">
          <div className="placeholder-image">
            <span>Imagen de Realidad</span>
          </div>
        </div>

        {/* Reality Dropdown */}
        <label className="field-label">
          <span className="field-label-title">Selecciona Realidad</span>
          <select value={selectedReality} onChange={handleRealityChange} required>
            <option value="" disabled>
              Elige una realidad
            </option>
            {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={`Realidad ${num}`}>
                Realidad {num}
              </option>
            ))}
          </select>
        </label>

        {selectedReality && (
          <>
            {/* Description Section */}
            <div className="reality-section">
              <h3>Descripción de la Realidad</h3>
              <div className="reality-section__content">
                {/* Empty for now as per requirements */}
              </div>
            </div>

            {/* Selectable Heroes Section */}
            <div className="reality-section">
              <h3>Héroes Seleccionables</h3>
              <div className="reality-section__content">
                <ul className="heroes-list">
                  {availableHeroes.map((hero) => (
                    <li key={hero}>{hero}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modulares Section */}
            <div className="reality-section">
              <h3>Modulares</h3>
              <div className="reality-section__content">
                {/* Empty for now as per requirements */}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="reality-selector__actions">
          <button type="button" onClick={handleConfirm} disabled={!selectedReality}>
            Confirmar
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="secondary">
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
