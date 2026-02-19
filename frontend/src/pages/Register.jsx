import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RealitySelector from '../components/RealitySelector.jsx';
import CharacterSelectorByReality from '../components/CharacterSelectorByReality.jsx';

const HELP = {
  mesaNumber: 'Número único e identificativo de tu mesa, estará indicado físicamente en la misma',
  mesaName: 'Nombre del grupo de jugadores, es opcional.',
  difficulty: 'Dificultad en la que se va a jugar la partida.',
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
  const [joinCode, setJoinCode] = useState('');
  const [existing, setExisting] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [aspects, setAspects] = useState([]);
  const [swAspects, setSwAspects] = useState([]);
  const [showRealitySelector, setShowRealitySelector] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [selectedReality, setSelectedReality] = useState(null);
  const [selectedHeroes, setSelectedHeroes] = useState(null);

  const handleRealityConfirm = (realityData) => {
    setSelectedReality(realityData);
    setShowRealitySelector(false);
    setShowCharacterSelector(true);
  };

  const handleHeroesConfirm = (heroesData) => {
    setSelectedHeroes(heroesData);
    setShowCharacterSelector(false);
  };

  const handleCancelReality = () => {
    setShowRealitySelector(false);
  };

  const handleCancelCharacters = () => {
    setShowCharacterSelector(false);
    setSelectedReality(null);
  };

  useEffect(() => {
    fetch('/api/tables/register/list')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setExisting(Array.isArray(data) ? data : []))
      .catch(() => setExisting([]));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'create') {
        if (!mesaNumber || !difficulty || !selectedHeroes) {
          alert('Completa numero de mesa, dificultad y selecciona los héroes');
          return;
        }
        const num = parseInt(mesaNumber, 10) || 0;
        if ((existing || []).some((t) => Number(t.tableNumber) === num)) {
          alert('La mesa ya existe');
          return;
        }
        const total = selectedHeroes.length;
        if (total > 4 || total < 1) {
          alert('Debe haber entre 1 y 4 jugadores');
          return;
        }
        const body = {
          tableNumber: num,
          tableName: mesaName,
          difficulty,
          players: total,
          realityId: selectedReality?.realityId || null,
          realityName: selectedReality?.realityName || null,
          playersInfo: selectedHeroes.map((p) => ({
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

        {!selectedReality ? (
          <button
            type="button"
            className="btn-select-reality"
            onClick={() => setShowRealitySelector(true)}
          >
            Seleccionar Realidad
          </button>
        ) : (
          <>
            <div className="selected-reality-info">
              <p><strong>Realidad seleccionada:</strong> {selectedReality.realityName}</p>
            </div>

            {selectedHeroes && (
              <div className="selected-heroes-info">
                <p><strong>Héroes seleccionados:</strong></p>
                <div className="heroes-display">
                  {selectedHeroes.map((hero, idx) => (
                    <span key={idx} className="hero-display">
                      {hero.character} - {hero.aspect}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!selectedHeroes && (
              <button
                type="button"
                className="btn-select-characters"
                onClick={() => setShowCharacterSelector(true)}
              >
                Seleccionar Héroes y Aspectos
              </button>
            )}

            {selectedHeroes && (
              <button type="submit">Crear y continuar</button>
            )}
          </>
        )}
      </form>

      {/* Modal Realidad Selector */}
      {showRealitySelector && (
        <RealitySelector
          onConfirm={handleRealityConfirm}
          onCancel={handleCancelReality}
        />
      )}

      {/* Modal Character Selector By Reality */}
      {showCharacterSelector && selectedReality && (
        <CharacterSelectorByReality
          selectableHeroes={selectedReality.selectableHeroes}
          aspects={aspects}
          swAspects={swAspects}
          onConfirm={handleHeroesConfirm}
          onCancel={handleCancelCharacters}
        />
      )}

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

