import { useState, useEffect, useMemo } from 'react';
import CharacterSelector from './CharacterSelector.jsx';

export default function HeroSelector({ 
  availableHeroes = [], 
  playersCount, 
  aspects = [],
  swAspects = [],
  onConfirm, 
  onCancel 
}) {
  const [players, setPlayers] = useState([]);

  const normalize = (s) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const charMap = useMemo(() => {
    const map = new Map();
    availableHeroes.forEach((c) => map.set(normalize(c), c));
    return map;
  }, [availableHeroes]);

  useEffect(() => {
    const count = Number(playersCount) || 0;
    setPlayers((prev) => {
      const next = [...prev];
      if (next.length < count) {
        while (next.length < count) {
          next.push({ character: '', aspect: '' });
        }
      } else if (next.length > count) {
        next.length = count;
      }
      return next;
    });
  }, [playersCount]);

  const handleCharacterChange = (idx, raw) => {
    let value = raw;
    const canon = charMap.get(normalize(value));
    if (canon) value = canon;
    setPlayers((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (value === 'Adam Warlock') return { ...row, character: value, aspect: '' };
        if (value === 'Spider-woman') {
          return swAspects.includes(row.aspect)
            ? { ...row, character: value }
            : { ...row, character: value, aspect: '' };
        }
        return aspects.includes(row.aspect)
          ? { ...row, character: value }
          : { ...row, character: value, aspect: '' };
      })
    );
  };

  const handleConfirm = () => {
    // Validate that all players have selected their heroes
    const allSelected = players.every((p) => p.character);
    if (!allSelected) {
      alert('Todos los jugadores deben seleccionar un héroe');
      return;
    }
    onConfirm(players);
  };

  return (
    <div className="hero-selector">
      <div className="hero-selector__content">
        <h2>Selección de Héroes y Aspectos</h2>
        
        <div className="hero-selector__players">
          {players.map((p, idx) => (
            <div key={idx} className="player-row">
              <label className="field-label">
                <span className="field-label-title">
                  Personaje {idx + 1}
                </span>
                <CharacterSelector
                  value={p.character}
                  options={availableHeroes}
                  onChange={(next) => handleCharacterChange(idx, next)}
                />
              </label>
              <label className="field-label">
                <span className="field-label-title">
                  Aspecto
                </span>
                {(() => {
                  const isAdam = p.character === 'Adam Warlock';
                  const isSW = p.character === 'Spider-woman';
                  const options = isSW ? swAspects : aspects;
                  return (
                    <select
                      value={p.aspect}
                      disabled={isAdam}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPlayers((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, aspect: value } : row))
                        );
                      }}
                    >
                      <option value="" disabled>
                        {isAdam ? 'No aplica' : 'Selecciona aspecto'}
                      </option>
                      {options.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </label>
            </div>
          ))}
        </div>

        <div className="hero-selector__actions">
          <button type="button" onClick={handleConfirm}>
            Confirmar
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="secondary">
              Volver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
