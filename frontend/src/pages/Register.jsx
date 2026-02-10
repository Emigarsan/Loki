import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CharacterSelector from '../components/CharacterSelector.jsx';

const HELP = {
  mesaNumber: 'Número único e identificativo de tu mesa, estará indicado físicamente en la misma',
  mesaName: 'Nombre del grupo de jugadores, es opcional.',
  difficulty: 'Dificultad en la que se va a jugar la partida.',
  playersCount: 'Entre 1 y 4 jugadores. Aparecerán tantas fichas como jugadores seleccionados.',
  playerCharacter: 'Nombre del personaje. Escribe parte del nombre y selecciona la sugerencia normalizada.',
  playerAspect: 'Lista de aspectos. Para Adam Warlock queda bloqueado.',
  joinCode: 'Selecciona la mesa ya creada para cargarla y gestionarla.'
};

function Help({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`help-wrapper${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="help-icon"
        aria-label="Mas informacion"
        onClick={(e) => {
          e.preventDefault();
          setOpen((prev) => !prev);
        }}
        onBlur={() => setOpen(false)}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span className="help-tooltip">{text}</span>
    </span>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('create');
  const [mesaNumber, setMesaNumber] = useState('');
  const [mesaName, setMesaName] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [playersCount, setPlayersCount] = useState('');
  const [players, setPlayers] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [existing, setExisting] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [aspects, setAspects] = useState([]);
  const [swAspects, setSwAspects] = useState([]);

  const normalize = (s) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const charMap = useMemo(() => {
    const map = new Map();
    characters.forEach((c) => map.set(normalize(c), c));
    return map;
  }, [characters]);

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

  useEffect(() => {
    fetch('/api/tables/register/list')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setExisting(Array.isArray(data) ? data : []))
      .catch(() => setExisting([]));
  }, []);

  useEffect(() => {
    const parsed = parseInt(playersCount, 10);
    const count = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
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

  useEffect(() => {
    fetch('/api/tables/register/characters')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCharacters(Array.isArray(data) ? data : []))
      .catch(() => setCharacters([]));
    fetch('/api/tables/register/aspects')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAspects(Array.isArray(data) ? data : []))
      .catch(() => setAspects([]));
    fetch('/api/tables/register/spiderwoman-aspects')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSwAspects(Array.isArray(data) ? data : []))
      .catch(() => setSwAspects([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'create') {
        if (!mesaNumber || !difficulty || !playersCount) {
          alert('Completa numero de mesa, dificultad y jugadores');
          return;
        }
        const num = parseInt(mesaNumber, 10) || 0;
        if ((existing || []).some((t) => Number(t.tableNumber) === num)) {
          alert('La mesa ya existe');
          return;
        }
        const parsedPlayers = parseInt(playersCount, 10);
        const total = Number.isNaN(parsedPlayers) ? 0 : parsedPlayers;
        if (total > 4) {
          alert('Maximo 4 jugadores');
          return;
        }
        const body = {
          tableNumber: num,
          tableName: mesaName,
          difficulty,
          players: total,
          playersInfo: players.map((p) => ({
            character: p.character || '',
            aspect: p.aspect || ''
          }))
        };
        const res = await fetch('/api/tables/register/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.status === 409) {
          alert(`El numero de mesa ${num} ya existe. Elige otro.`);
          return;
        }
        if (!res.ok) throw new Error('No se pudo crear la mesa');
        await res.json();
        navigate(`/mesa/${num}`);
      } else {
        const res = await fetch('/api/tables/register/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: joinCode })
        });
        const data = await res.json();
        if (data.ok) {
          const sel = (existing || []).find((t) => String(t.code) === String(joinCode));
          const mesa = sel ? sel.tableNumber : '';
          if (mesa !== '') navigate(`/mesa/${mesa}`);
          else navigate('/register');
        } else {
          alert('Codigo no encontrado');
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container overlay-card">
      <h2>Registro de mesa</h2>
      <div className="tabs">
        <button
          className={mode === 'create' ? 'active' : ''}
          onClick={() => setMode('create')}
        >
          Crear mesa
        </button>
        <button
          className={mode === 'join' ? 'active' : ''}
          onClick={() => setMode('join')}
        >
          Unirse a mesa
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="form"
        style={{ display: mode === 'create' ? 'grid' : 'none', gap: '0.75rem' }}
      >
        <label className="field-label">
          <span className="field-label-title">
            Numero de mesa
            <Help text={HELP.mesaNumber} />
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={mesaNumber}
            onChange={(e) => setMesaNumber(e.target.value)}
            placeholder="Ej. 12"
            required
          />
        </label>
        <label className="field-label">
          <span className="field-label-title">
            Nombre de mesa (opcional)
            <Help text={HELP.mesaName} />
          </span>
          <input
            value={mesaName}
            onChange={(e) => setMesaName(e.target.value)}
            placeholder="Ej. Vengadores"
          />
        </label>
        <label className="field-label">
          <span className="field-label-title">
            Dificultad
            <Help text={HELP.difficulty} />
          </span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required>
            <option value="" disabled>
              Selecciona dificultad
            </option>
            <option value="Normal">Normal</option>
            <option value="Experto">Experto</option>
          </select>
        </label>
        <label className="field-label">
          <span className="field-label-title">
            Numero de jugadores
            <Help text={HELP.playersCount} />
          </span>
          <input
            type="number"
            min={1}
            max={4}
            step={1}
            placeholder="Ej. 4"
            value={playersCount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                setPlayersCount('');
                return;
              }
              let parsed = parseInt(value, 10);
              if (Number.isNaN(parsed)) {
                setPlayersCount('');
                return;
              }
              parsed = Math.min(4, Math.max(1, parsed));
              setPlayersCount(String(parsed));
            }}
            required
          />
        </label>

        {players.map((p, idx) => (
          <div key={idx} className="player-row">
            <label className="field-label">
              <span className="field-label-title">
                Personaje
                <Help text={HELP.playerCharacter} />
              </span>
              <CharacterSelector
                value={p.character}
                options={characters}
                onChange={(next) => handleCharacterChange(idx, next)}
              />
            </label>
            <label className="field-label">
              <span className="field-label-title">
                Aspecto
                <Help text={HELP.playerAspect} />
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

        <button type="submit">Crear y continuar</button>
      </form>

      <form
        onSubmit={handleSubmit}
        className="form"
        style={{ display: mode === 'join' ? 'grid' : 'none', gap: '0.75rem' }}
      >
        <label className="field-label">
          <span className="field-label-title">
            Unirse a mesa existente
            <Help text={HELP.joinCode} />
          </span>
          <select value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required>
            <option value="" disabled>
              Selecciona una mesa
            </option>
            {existing.map((t) => (
              <option key={t.id} value={t.code}>
                {(() => {
                  const base = t.tableNumber ? `Mesa ${t.tableNumber}` : 'Mesa';
                  const named =
                    t.tableName && String(t.tableName).trim().length > 0
                      ? `${base} - ${t.tableName}`
                      : base;
                  return `${named} - Codigo: ${t.code}`;
                })()}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Unirse y continuar</button>
      </form>
    </div>
  );
}

