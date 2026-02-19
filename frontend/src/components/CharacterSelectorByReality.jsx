import { useState } from 'react';
import CharacterSelector from './CharacterSelector.jsx';

export default function CharacterSelectorByReality({ selectableHeroes, aspects = [], swAspects = [], onConfirm, onCancel }) {
  const [players, setPlayers] = useState(
    Array(1).fill(null).map(() => ({ character: '', aspect: '' }))
  );
  const [playersCount, setPlayersCount] = useState('1');

  const handlePlayersCountChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setPlayersCount('');
      setPlayers([]);
      return;
    }
    let parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      setPlayersCount('');
      setPlayers([]);
      return;
    }
    parsed = Math.min(4, Math.max(1, parsed));
    setPlayersCount(String(parsed));

    // Ajustar el array de jugadores
    setPlayers((prev) => {
      const next = [...prev];
      if (next.length < parsed) {
        while (next.length < parsed) {
          next.push({ character: '', aspect: '' });
        }
      } else if (next.length > parsed) {
        next.length = parsed;
      }
      return next;
    });
  };

  const handleCharacterChange = (idx, character) => {
    setPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        // Si cambia el personaje, resetear el aspecto
        if (p.character !== character) {
          return { character, aspect: '' };
        }
        return { ...p, character };
      })
    );
  };

  const handleAspectChange = (idx, aspect) => {
    setPlayers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, aspect } : p))
    );
  };

  const handleConfirm = () => {
    const isValid = players.every((p) => p.character);
    if (!isValid) {
      alert('Todos los jugadores deben tener un personaje seleccionado');
      return;
    }
    onConfirm(players);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content character-selector-by-reality">
        <h2>Seleccionar Héroes y Aspectos</h2>

        <form className="form" onSubmit={(e) => e.preventDefault()}>
          {/* Número de jugadores */}
          <label className="field-label">
            <span className="field-label-title">Número de jugadores</span>
            <input
              type="number"
              min={1}
              max={4}
              step={1}
              value={playersCount}
              onChange={handlePlayersCountChange}
              required
            />
          </label>

          {/* Selección de jugadores */}
          {players.map((p, idx) => (
            <div key={idx} className="player-row">
              <label className="field-label">
                <span className="field-label-title">Personaje {idx + 1}</span>
                <CharacterSelector
                  value={p.character}
                  options={selectableHeroes}
                  onChange={(next) => handleCharacterChange(idx, next)}
                  placeholder="Busca héroe"
                />
              </label>
              <label className="field-label">
                <span className="field-label-title">Aspecto</span>
                {(() => {
                  const isAdam = p.character === 'Adam Warlock';
                  const isSW = p.character === 'Spider-woman';
                  const options = isSW ? swAspects : aspects;
                  return (
                    <select
                      value={p.aspect}
                      disabled={isAdam}
                      onChange={(e) => handleAspectChange(idx, e.target.value)}
                    >
                      <option value="" disabled>
                        {isAdam ? 'No aplica' : 'Selecciona aspecto'}
                      </option>
                      {options.map((aspect) => (
                        <option key={aspect} value={aspect}>
                          {aspect}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </label>
            </div>
          ))}

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleConfirm}
            >
              Confirmar Héroes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
