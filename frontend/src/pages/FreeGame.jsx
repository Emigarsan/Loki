import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CharacterSelector from '../components/CharacterSelector.jsx';

const LEGACY_OPTIONS = [
  'Ninguno',
  'Vastago de M',
  'Mutante hibrido',
  'Equipo de dos',
  'Los mas buscados',
  'Equipado para lo peor',
  'Guerreros arana',
  'Instruidas por Thanos',
  'Rabia irradiada',
  'Ronin',
  'Dama de la muerte',
  'Solo ante el peligro'
];

const HELP = {
  mesaNumber: 'Número único e identificativo de tu mesa, estará indicado físicamente en la misma',
  mesaName: 'Nombre del grupo de jugadores, es opcional.',
  difficulty: 'Dificultad en la que se va a jugar la partida. Supone 3 puntos si es Normal y 5 puntos si es Experto.',
  challenge: 'Reto seleccionado para la partida de la mañana. Si se elige Ninguno, la puntuacion total sera 0.',
  players: 'Entre 1 y 4 jugadores. Aparecerán tantas fichas como jugadores seleccionados.',
  playerCharacter: 'Nombre del personaje. Escribe parte del nombre y selecciona la sugerencia normalizada.',
  playerAspect: 'Lista de aspectos. Para Adam Warlock queda bloqueado.',
  playerLegacy: 'Legado seleccionado para este héroe. Cada legado distinto de "Ninguno" suma 1 punto adicional.',
  joinCode: 'Selecciona la mesa creada con anterioridad para gestionarla o ver su puntuacion. Puedes entrar de nuevo para modificar los puntos de Victoria.'
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

export default function FreeGamePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('create');
  const [mesaNumber, setMesaNumber] = useState('');
  const [mesaName, setMesaName] = useState('');
  const [difficulty, setDifficulty] = useState('Normal');
  const [inevitableChallenge, setInevitableChallenge] = useState('(Ninguno)');
  const [players, setPlayers] = useState('');
  const [playersInfo, setPlayersInfo] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [existingFree, setExistingFree] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [aspects, setAspects] = useState([]);
  const [swAspects, setSwAspects] = useState([]);

  const legacyOptions = useMemo(() => LEGACY_OPTIONS, []);

  const normalize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const charMap = useMemo(() => {
    const map = new Map();
    characters.forEach((c) => map.set(normalize(c), c));
    return map;
  }, [characters]);

  useEffect(() => {
    fetch('/api/tables/freegame/list')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setExistingFree(Array.isArray(data) ? data : []))
      .catch(() => setExistingFree([]));
  }, []);

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

  useEffect(() => {
    const parsed = parseInt(players, 10);
    const n = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    setPlayersInfo((prev) => {
      const next = [...prev];
      if (next.length < n) {
        while (next.length < n) {
          next.push({ character: '', aspect: '', legacy: 'Ninguno' });
        }
      } else if (next.length > n) {
        next.length = n;
      }
      return next;
    });
  }, [players]);

  const handleCharacterChange = (idx, value) => {
    let v = value;
    const canon = charMap.get(normalize(v));
    if (canon) v = canon;
    setPlayersInfo((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (v === 'Adam Warlock') {
          return { ...row, character: v, aspect: '' };
        }
        if (v === 'Spider-woman') {
          return swAspects.includes(row.aspect)
            ? { ...row, character: v }
            : { ...row, character: v, aspect: '' };
        }
        return aspects.includes(row.aspect)
          ? { ...row, character: v }
          : { ...row, character: v, aspect: '' };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'create') {
        if (!mesaNumber) {
          alert('Indica un numero de mesa');
          return;
        }
        const num = parseInt(mesaNumber, 10) || 0;
        const used = (existingFree || []).some((t) => Number(t.tableNumber) === num);
        if (used) {
          alert(`El numero de mesa ${num} ya existe. Elige otro.`);
          return;
        }
        const parsedPlayers = parseInt(players, 10);
        const totalPlayers = Number.isNaN(parsedPlayers) ? 0 : parsedPlayers;
        if (totalPlayers <= 0) {
          alert('Indica numero de jugadores');
          return;
        }
        if (totalPlayers > 4) {
          alert('Maximo 4 jugadores');
          return;
        }
        const res = await fetch('/api/tables/freegame/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableNumber: num,
            name: mesaName,
            difficulty,
            inevitableChallenge,
            players: totalPlayers,
            playersInfo: playersInfo.map((p) => ({
              character: p.character || '',
              aspect: p.aspect || '',
              legacy: p.legacy || 'Ninguno'
            }))
          })
        });
        if (!res.ok) throw new Error('No se pudo registrar la mesa');
        const data = await res.json();
        const numCreated =
          data && typeof data.tableNumber === 'number' ? data.tableNumber : num;
        navigate(`/freegame/${numCreated}`);
      } else {
        const res = await fetch('/api/tables/freegame/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: joinCode })
        });
        const data = await res.json();
        if (data.ok) {
          const found = (existingFree || []).find(
            (t) => String(t.code) === String(joinCode)
          );
          const mesa = found ? found.tableNumber : '';
          if (mesa !== '') {
            navigate(`/freegame/${mesa}`);
          } else {
            navigate('/freegame');
          }
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
      <h2>Retos Inevitables</h2>
      <div className="tabs">
        <button
          className={mode === 'create' ? 'active' : ''}
          onClick={() => setMode('create')}
        >
          Registrar mesa
        </button>
        <button
          className={mode === 'join' ? 'active' : ''}
          onClick={() => setMode('join')}
        >
          Unirse
        </button>
      </div>
      <form onSubmit={handleSubmit} className="form">
        {mode === 'create' ? (
          <>
            <label className="field-label">
              <span className="field-label-title">
                Numero de mesa
                <Help text={HELP.mesaNumber} />
              </span>
              <input
                type="number"
                min={1}
                value={mesaNumber}
                onChange={(e) => setMesaNumber(e.target.value)}
                placeholder="Ej. 50"
                required
              />
            </label>
            <label className="field-label">
              <span className="field-label-title">
                Nombre de mesa
                <Help text={HELP.mesaName} />
              </span>
              <input
                value={mesaName}
                onChange={(e) => setMesaName(e.target.value)}
                placeholder="Ej. Mesa Libre 1"
              />
            </label>
            <label className="field-label">
              <span className="field-label-title">
                Dificultad
                <Help text={HELP.difficulty} />
              </span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="Normal">Normal</option>
                <option value="Experto">Experto</option>
              </select>
            </label>
            <label className="field-label">
              <span className="field-label-title">
                Reto inevitable
                <Help text={HELP.challenge} />
              </span>
              <select
                value={inevitableChallenge}
                onChange={(e) => setInevitableChallenge(e.target.value)}
              >
                <option value="(Ninguno)">(Ninguno)</option>
                <option value="Celdas falsas">Celdas falsas</option>
                <option value="Hail H.Y.D.R.A.">Hail H.Y.D.R.A.</option>
                <option value="La Sala Roja">La Sala Roja</option>
                <option value="Thunder Force">Thunder Force</option>
                <option value="Ultrón Infinito">Ultrón Infinito</option>
              </select>
            </label>
            <label className="field-label">
              <span className="field-label-title">
                Numero de jugadores
                <Help text={HELP.players} />
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ej. 4"
                value={players}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^\d*$/.test(v) && (v === '' || parseInt(v, 10) <= 4)) {
                    setPlayers(v);
                  }
                }}
                required
              />
            </label>
            {playersInfo.map((p, idx) => (
              <div key={idx} className="player-row freegame-row">
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
                    const opts = isSW ? swAspects : aspects;
                    return (
                      <select
                        value={p.aspect}
                        disabled={isAdam}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPlayersInfo((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, aspect: v } : row
                            )
                          );
                        }}
                      >
                        <option value="" disabled>
                          {isAdam ? 'No aplica' : 'Selecciona aspecto'}
                        </option>
                        {opts.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </label>
                <label className="field-label">
                  <span className="field-label-title">
                    Legado
                    <Help text={HELP.playerLegacy} />
                  </span>
                  <select
                    value={p.legacy}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPlayersInfo((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, legacy: v } : row
                        )
                      );
                    }}
                  >
                    {legacyOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </>
        ) : (
          <>
            <label className="field-label">
              <span className="field-label-title">
                Unirse a mesa existente
                <Help text={HELP.joinCode} />
              </span>
              <select
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecciona una mesa
                </option>
                {existingFree.map((t) => (
                  <option key={t.id} value={t.code}>
                    {(() => {
                      const base = t.tableNumber ? `Mesa ${t.tableNumber}` : 'Mesa';
                      const name =
                        t.name && String(t.name).trim().length > 0
                          ? `${base} - ${t.name}`
                          : base;
                      return `${name} - Codigo: ${t.code}`;
                    })()}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button type="submit">Guardar</button>
      </form>
    </div>
  );
}
