import { useEffect, useMemo, useState } from 'react';

const CHALLENGES = [
  {
    id: 'challenge-1',
    name: 'La Sala Roja',
    imageFile: 'la-sala-roja.jpg',
  },
  {
    id: 'challenge-2',
    name: 'Celdas Falsas',
    imageFile: 'celdas-falsas.jpg',
  },
  {
    id: 'challenge-3',
    name: 'Thunder Force',
    imageFile: 'thunder-force.jpg',
  },
  {
    id: 'challenge-4',
    name: 'Hail H.Y.D.R.A.',
    imageFile: 'hail-hydra.jpg',
  },
  {
    id: 'challenge-5',
    name: 'Ultrón Infinito',
    imageFile: 'ultron-infinito.jpg',
  },
];

const POINT_TARGET = 20;

const sanitizePoints = (value) => (Number.isFinite(value) ? value : 0);

const computeTableScore = (table) => {
  if (!table) return 0;
  const challenge = table.inevitableChallenge;
  if (!challenge || challenge === '(Ninguno)') return 0;
  if (!table.scenarioCleared) return 0;
  const base = table.difficulty === 'Experto' ? 5 : 3;
  const legacyCount = Array.isArray(table.playersInfo)
    ? table.playersInfo.filter((p) => p && p.legacy && String(p.legacy) !== 'Ninguno').length
    : 0;
  const victoryPoints = typeof table.victoryPoints === 'number' ? table.victoryPoints : 0;
  return sanitizePoints(base + legacyCount + victoryPoints);
};

export default function ChallengesDisplay() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = () => {
      fetch('/api/tables/freegame/list')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (!isMounted) return;
          setTables(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => {
          if (!isMounted) return;
          setTables([]);
          setLoading(false);
        });
    };

    load();
    const id = setInterval(load, 5000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  const statsByChallenge = useMemo(() => {
    const totals = new Map();
    CHALLENGES.forEach((c) =>
      totals.set(c.name, { points: 0, tables: 0, wins: 0 })
    );

    tables.forEach((table) => {
      const challengeName = table?.inevitableChallenge;
      if (!challengeName || !totals.has(challengeName)) {
        return;
      }
      const stats = totals.get(challengeName);
      stats.tables += 1;
      if (table?.scenarioCleared) {
        stats.wins += 1;
      }
      stats.points += computeTableScore(table);
    });

    return totals;
  }, [tables]);

  return (
    <div className="display-wrapper">
      <section className="challenge-board-card">
        <header className="display-header">
          <h1>Retos Inevitables</h1>
        </header>

        {loading && tables.length === 0 ? (
          <div className="display-loading">Cargando datos...</div>
        ) : (
          <div className="challenge-grid">
            {CHALLENGES.map((challenge) => {
              const stats = statsByChallenge.get(challenge.name) || { points: 0, tables: 0, wins: 0 };
              const totalPoints = stats.points || 0;
              const overflow = totalPoints > POINT_TARGET;
              const winsGoalMet = stats.wins >= 3;
              const pointsGoalMet = totalPoints >= POINT_TARGET;
              const imageSrc = `${import.meta.env.BASE_URL}challenges/${challenge.imageFile}`;

              return (
                <article key={challenge.id} className="challenge-card">
                  <div className="challenge-image-wrapper">
                    <img
                      src={imageSrc}
                      alt={challenge.name}
                      className="challenge-image"
                      loading="lazy"
                    />
                  </div>
                  <div className="challenge-body">
                    <h2>{challenge.name}</h2>
                    <div className="challenge-stats">
                      <div className="challenge-stat">
                        <span className="challenge-stat-label">Mesas</span>
                        <span className="challenge-stat-value">{stats.tables}</span>
                      </div>
                      <div className="challenge-stat">
                        <span className="challenge-stat-label">Victorias</span>
                        <span className={`challenge-stat-value${winsGoalMet ? ' is-complete' : ''}`}>
                          {`${stats.wins} / 3`}
                        </span>
                      </div>
                      <div className="challenge-stat">
                        <span className="challenge-stat-label">Puntos</span>
                        <div className={`challenge-progress${pointsGoalMet ? ' is-complete' : ''}`}>
                          <span className="challenge-progress-value">{totalPoints}</span>
                          <span className="challenge-progress-max">/ {POINT_TARGET}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
