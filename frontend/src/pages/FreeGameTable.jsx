import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function FreeGameTablePage() {
  const { id } = useParams();
  const [table, setTable] = useState(null);
  const [vpInput, setVpInput] = useState('0');
  const [scenarioCleared, setScenarioCleared] = useState('no');
  const [error, setError] = useState(null);

  const legacyOptions = useMemo(() => ([
    'Ninguno',
    'Vástago de M',
    'Mutante hí­brido',
    'Equipo de dos',
    'Los más buscados',
    'Equipado para lo peor',
    'Guerreros araña',
    'Instruidas por Thanos',
    'Rabia irradiada',
    'Ronin',
    'Dama de la muerte',
    'Solo ante el peligro'
  ]), []);

  const fetchTable = () => {
    fetch('/api/tables/freegame/list')
      .then(r => r.ok ? r.json() : [])
      .then((list) => {
        const found = Array.isArray(list) ? list.find(t => String(t.id) === String(id)) : null;
        setTable(found || null);
        if (found) {
          const vp = (typeof found.victoryPoints === 'number') ? found.victoryPoints : 0;
          setVpInput(String(vp));
          setScenarioCleared(found.scenarioCleared ? 'si' : 'no');
          setError(null);
        }
      })
      .catch(() => setError('No se pudo cargar la mesa'));
  };

  useEffect(() => {
    fetchTable();
    const timer = setInterval(fetchTable, 3000);
    return () => clearInterval(timer);
  }, [id]);

  const persistResult = async (vpValue, scenarioValue) => {
    if (!table || !table.id) return;
    try {
      await fetch('/api/tables/freegame/victory-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: table.id,
          victoryPoints: Math.max(0, vpValue),
          scenarioCleared: scenarioValue === 'si'
        })
      });
    } catch (_) {
      // ignore network errors for now
    }
  };

  if (!table) {
    return (
      <div className="container overlay-card">
        <h2>Mesa Libre</h2>
        {error ? (<p className="error">{error}</p>) : (<p>Cargando mesa...</p>)}
        <p><Link to="/freegame">Volver</Link></p>
      </div>
    );
  }

  const playersInfo = Array.isArray(table.playersInfo) ? table.playersInfo : [];
  const noChallenge = !table.inevitableChallenge || table.inevitableChallenge === '(Ninguno)';
  const hasChallenge = !noChallenge;
  const scenarioClearedBool = scenarioCleared === 'si';
  const scoringActive = hasChallenge && scenarioClearedBool;
  const basePoints = hasChallenge ? ((table.difficulty === 'Experto') ? 5 : 3) : 0;
  const legacyCountRaw = hasChallenge ? playersInfo.filter(p => (p && p.legacy && String(p.legacy) !== 'Ninguno')).length : 0;
  const vpValue = Math.max(0, parseInt(vpInput, 10) || 0);
  const base = scoringActive ? basePoints : 0;
  const legacyCount = scoringActive ? legacyCountRaw : 0;
  const vp = scoringActive ? vpValue : 0;
  const total = base + legacyCount + vp;

  return (
    <div className="container overlay-card">
      <h2>Mesa Libre</h2>
      <div className="form" style={{ gap: 8 }}>
        <div>
          <strong>Mesa:</strong> {table.tableNumber} {table.name ? `- ${table.name}` : ''}
        </div>
        <div>
          <strong>Dificultad:</strong> {table.difficulty || 'Normal'}
        </div>
        <div>
          <strong>Reto inevitable:</strong> {table.inevitableChallenge || '(Ninguno)'}
        </div>
        <div>
          <strong>Jugadores:</strong> {table.players}
        </div>
        <div>
          <strong>Detalle jugadores:</strong>
          <div className="player-detail-list">
            {playersInfo.length > 0 ? (
              playersInfo.map((p, idx) => (
                <div key={`player-${idx}`} className="player-detail-item">
                  {p.character}
                  {p.aspect ? ` (${p.aspect})` : ''}
                  {(p.legacy && p.legacy !== 'Ninguno') ? ` [${p.legacy}]` : ''}
                </div>
              ))
            ) : (
              <span className="player-detail-empty">Sin jugadores</span>
            )}
          </div>
        </div>
        <div>
          <strong>CÃ³digo:</strong> {table.code}
        </div>
      </div>

      <div className="counter-card" style={{ marginTop: 16 }}>
        <h3>Puntuacion de la mesa</h3>
        <div className="option-toggle-group" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
          <span className="challenge-stat-label" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Escenario superado</span>
          <label className={`option-toggle${!hasChallenge ? ' is-disabled' : ''}`}>
            <input
              type="radio"
              name="table-scenario"
              value="si"
              checked={scenarioCleared === 'si'}
              onChange={() => {
                setScenarioCleared('si');
                const n = Math.max(0, parseInt(vpInput, 10) || 0);
                persistResult(n, 'si');
              }}
              disabled={!hasChallenge}
            />
            Si
          </label>
          <label className="option-toggle">
            <input
              type="radio"
              name="table-scenario"
              value="no"
              checked={scenarioCleared === 'no'}
              onChange={() => {
                setScenarioCleared('no');
                const n = Math.max(0, parseInt(vpInput, 10) || 0);
                persistResult(n, 'no');
              }}
            />
            No
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Dificultad</th>
                <th>Puntos base</th>
                <th>Legados</th>
                <th>Victoria</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{table.difficulty || 'Normal'}</td>
                <td>{base}</td>
                <td>{legacyCount}</td>
                <td>
                  <input className="vp-input" type="number" min={0} value={vpInput} onChange={(e) => {
                    const v = e.target.value; setVpInput(v);
                    const n = Math.max(0, parseInt(v, 10) || 0);
                    persistResult(n, scenarioCleared);
                  }} />
                </td>
                <td>{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="counter-meta">Si no hay reto inevitable, la puntuaciÃ³n serÃ¡ 0.</p>
      </div>

      <div className="form" style={{ marginTop: 16 }}>
        <Link to="/freegame"><button>Volver a Freegame</button></Link>
      </div>
    </div>
  );
}

