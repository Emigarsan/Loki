import { useCallback, useEffect, useRef, useState } from 'react';
import { REALITIES_DATA } from '../data/realitiesData.js';

const API_BASE = '/api/counter';

export default function AdminPage() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [pVal, setPVal] = useState('');
  const [tVal, setTVal] = useState('');
  const [maxThreatVal, setMaxThreatVal] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [tables, setTables] = useState({ register: [] });
  const [qrFlags, setQrFlags] = useState({ event: false });
  const [mesaSummary, setMesaSummary] = useState({});
  const [tab, setTab] = useState('mod');
  const [statsTab, setStatsTab] = useState('avatares');
  const [backups, setBackups] = useState({ dir: '', files: [] });
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [uploadingBackup, setUploadingBackup] = useState(false);
  const [purgeMinutes, setPurgeMinutes] = useState('1440');
  const [purgeKeep, setPurgeKeep] = useState('10');
  const backupFileInputRef = useRef(null);
  const allTables = Array.isArray(tables.register) ? tables.register : [];
  const totalTables = allTables.length;
  const totalPlayers = allTables.reduce((sum, table) => {
    const players = Number(table?.players);
    return sum + (Number.isFinite(players) ? Math.max(0, players) : 0);
  }, 0);
  const recommendedTertiaryMax = totalTables * 2;
  const recommendedPrimaryMax = totalPlayers * 20;

  // Campos de fijaci?n permanecen vacíos hasta que el usuario escriba.
  const parseTableNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
  };

  const syncFromState = () => { };

  const fetchState = useCallback(() => {
    fetch(API_BASE)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Respuesta inválida')))
      .then((data) => { setState(data); setError(null); syncFromState(data); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { fetchState(); const id = setInterval(fetchState, 3000); return () => clearInterval(id); }, [fetchState]);

  // No auto-login: siempre pedimos contraseña hasta pulsar "Entrar".

  const fetchTables = useCallback(() => {
    if (!isAuthed) return;
    fetch('/api/admin/tables', { headers: { 'X-Admin-Secret': adminKey } })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
      .then((data) => {
        if (!data || typeof data !== 'object') {
          setTables({ register: [] });
          return;
        }
        const register = Array.isArray(data.register) ? data.register : [];
        setTables({ register });
        const flags = data.qrFlags;
        if (flags && typeof flags === 'object') {
          setQrFlags({
            event: Boolean(flags.event)
          });
        }
      })
      .catch(() => { });
  }, [adminKey, isAuthed]);

  useEffect(() => { if (isAuthed) { fetchTables(); const id = setInterval(fetchTables, 3000); return () => clearInterval(id); } }, [isAuthed, fetchTables]);

  useEffect(() => {
    if (!isAuthed) return;
    const load = () => {
      fetch('/api/mesas/summary').then(r => r.ok ? r.json() : {}).then(setMesaSummary).catch(() => { });
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [isAuthed]);

  const fetchBackups = useCallback(() => {
    if (!isAuthed) return;
    setBackupsLoading(true);
    fetch('/api/admin/backup/list', { headers: { 'X-Admin-Secret': adminKey } })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
      .then((data) => setBackups({ dir: data.dir || '', files: Array.isArray(data.files) ? data.files : [] }))
      .catch(() => { })
      .finally(() => setBackupsLoading(false));
  }, [adminKey, isAuthed]);

  const updateQrFlag = useCallback((enabled) => {
    if (!isAuthed) return;
    fetch('/api/admin/qr/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': adminKey
      },
      body: JSON.stringify({ enabled })
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
      .then((data) => {
        if (data && typeof data === 'object') {
          setQrFlags({
            event: Boolean(data.event)
          });
        }
      })
      .catch(() => { });
  }, [adminKey, isAuthed]);

  useEffect(() => {
    if (!isAuthed) return;
    if (tab === 'backup') {
      fetchBackups();
      const id = setInterval(fetchBackups, 10000);
      return () => clearInterval(id);
    }
  }, [tab, isAuthed, fetchBackups]);

  const handleBackupImport = useCallback((event) => {
    if (!isAuthed) return;
    const file = event.target?.files?.[0];
    if (!file) return;
    setUploadingBackup(true);
    const formData = new FormData();
    formData.append('file', file);
    fetch('/api/admin/backup/upload', {
      method: 'POST',
      headers: {
        'X-Admin-Secret': adminKey
      },
      body: formData
    })
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d?.error || 'No autorizado')))))
      .then(() => {
        alert('Backup importado correctamente');
        fetchBackups();
      })
      .catch((e) => alert(e.message))
      .finally(() => {
        setUploadingBackup(false);
        if (event.target) event.target.value = '';
      });
  }, [adminKey, fetchBackups, isAuthed]);

  const setExact = (segment, value) => () => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    fetch(`${API_BASE}/${segment}/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': adminKey },
      body: JSON.stringify({ value: n })
    }).then(fetchState);
  };

  const setTertiaryMax = () => {
    const n = Math.max(0, parseInt(maxThreatVal, 10) || 0);
    fetch(`${API_BASE}/tertiary/max/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': adminKey },
      body: JSON.stringify({ value: n })
    }).then(fetchState);
  };

  const applyRecommendedPrimary = () => {
    setPVal(String(recommendedPrimaryMax));
    fetch(`${API_BASE}/primary/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': adminKey },
      body: JSON.stringify({ value: recommendedPrimaryMax })
    }).then(fetchState);
  };

  const applyRecommendedTertiaryMax = () => {
    setMaxThreatVal(String(recommendedTertiaryMax));
    fetch(`${API_BASE}/tertiary/max/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': adminKey },
      body: JSON.stringify({ value: recommendedTertiaryMax })
    }).then(fetchState);
  };


  const download = (path, filename) => {
    fetch(path, { headers: { 'X-Admin-Secret': adminKey } })
      .then((r) => r.ok ? r.blob() : Promise.reject(new Error('No autorizado')))
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }).catch((e) => alert(e.message));
  };

  const tryAuth = (e) => {
    e.preventDefault();
    if (!adminKey) return;
    // Probe a protected endpoint to validate key
    fetch('/api/admin/tables', { headers: { 'X-Admin-Secret': adminKey } })
      .then((r) => {
        if (r.ok) {
          setIsAuthed(true);
        } else {
          alert('Clave incorrecta');
        }
      })
      .catch(() => alert('Error de red'));
  };

  const logout = () => {
    setIsAuthed(false);
    setAdminKey('');
    setTables({ register: [] });
  };

  if (!isAuthed) {
    return (
      <div className="container">
        <h2>Admin</h2>
        <form className="form" onSubmit={tryAuth}>
          <label>
            Contraseña
            <input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
          </label>
          <button type="submit">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Admin</h2>
      {isAuthed && (
        <div className="form" style={{ alignSelf: 'flex-end' }}>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {!state ? (
        <p>Cargando</p>
      ) : (
        <div className="admin-content">
          {false && (<div className="form">
            <label>
              Cantidad
              <input type="number" value={amount} min={0} onChange={(e) => setAmount(Number(e.target.value))} />
            </label>
          </div>)}
          <div className="admin-tabs">
            <button className={tab === 'mod' ? 'active' : ''} onClick={() => setTab('mod')}>Modificar valores</button>
            <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>Mesas</button>
            <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Estadisticas</button>
            <button className={tab === 'backup' ? 'active' : ''} onClick={() => setTab('backup')}>Backups</button>
          </div>

          <div className="admin-grid" style={{ display: tab === 'mod' ? 'grid' : 'none' }}>
            <section className="counter-card">
              <h3>Vida Loki Dios de las Mentiras</h3>
              <div className="counter-value">{state.primary}</div>
              <p className="field-hint">
                Recomendado (20 × jugadores: {totalPlayers}): {recommendedPrimaryMax}
              </p>
              <div className="form">
                <label>
                  Fijar a
                  <input type="number" inputMode="numeric" placeholder="0" value={pVal} min={0} onChange={(e) => setPVal(e.target.value)} />
                </label>
                <button onClick={setExact('primary', pVal)}>Guardar</button>
                <button onClick={applyRecommendedPrimary}>Usar recomendado</button>
              </div>
            </section>

            <section className="counter-card">
              <h3>Mundos en Colisión</h3>
              <div className="counter-value">{state.tertiary}</div>
              <div className="form">
                <label>
                  Fijar a
                  <input type="number" inputMode="numeric" placeholder="0" value={tVal} min={0} onChange={(e) => setTVal(e.target.value)} />
                </label>
                <button onClick={setExact('tertiary', tVal)}>Guardar</button>
              </div>
            </section>

            <section className="counter-card">
              <h3>Amenaza maxima</h3>
              <div className="counter-value">{state.tertiaryMax ?? 0}</div>
              <p className="field-hint">
                Recomendado (2 × mesas: {totalTables}): {recommendedTertiaryMax}
              </p>
              <div className="form">
                <label>
                  Fijar a
                  <input type="number" inputMode="numeric" placeholder="0" value={maxThreatVal} min={0} onChange={(e) => setMaxThreatVal(e.target.value)} />
                </label>
                <button onClick={setTertiaryMax}>Guardar</button>
                <button onClick={applyRecommendedTertiaryMax}>Usar recomendado</button>
              </div>
            </section>

          </div>
          {tab === 'backup' && (
            <div className="admin-grid stats-grid" style={{ gridTemplateColumns: '1fr' }}>
              <section className="counter-card">
                <h3>Snapshots</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => {
                    fetch('/api/admin/backup/snapshot-now', { method: 'POST', headers: { 'X-Admin-Secret': adminKey } })
                      .then(r => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
                      .then(() => fetchBackups())
                      .catch((e) => alert(e.message));
                  }}>Crear snapshot ahora</button>
                  <button onClick={fetchBackups}>Refrescar</button>
                  <button
                    onClick={() => backupFileInputRef.current?.click()}
                    disabled={uploadingBackup}
                  >
                    {uploadingBackup ? 'Importando...' : 'Importar backup'}
                  </button>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={handleBackupImport}
                  />
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Dir: {backups.dir || '(desconocido)'}</span>
                  {backupsLoading && <span style={{ fontSize: 12 }}>Cargando...</span>}
                </div>
                <div className="form" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <label>
                    Borrar mayores a (min)
                    <input type="number" min={0} value={purgeMinutes} onChange={(e) => setPurgeMinutes(e.target.value)} />
                  </label>
                  <button onClick={() => {
                    const m = Math.max(0, parseInt(purgeMinutes, 10) || 0);
                    fetch(`/api/admin/backup/purge-older-than?minutes=${m}`, { method: 'POST', headers: { 'X-Admin-Secret': adminKey } })
                      .then(r => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
                      .then(() => fetchBackups())
                      .catch((e) => alert(e.message));
                  }}>Purgar por antigüedad</button>
                  <label>
                    Conservar últimos
                    <input type="number" min={0} value={purgeKeep} onChange={(e) => setPurgeKeep(e.target.value)} />
                  </label>
                  <button onClick={() => {
                    const k = Math.max(0, parseInt(purgeKeep, 10) || 0);
                    fetch(`/api/admin/backup/purge-keep-latest?keep=${k}`, { method: 'POST', headers: { 'X-Admin-Secret': adminKey } })
                      .then(r => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
                      .then(() => fetchBackups())
                      .catch((e) => alert(e.message));
                  }}>Purgar y conservar N</button>
                </div>
                <table className="data-table" style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Archivo</th>
                      <th>Tamaño</th>
                      <th>Modificado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(backups.files || []).map((f) => {
                      const name = f.name || '';
                      const size = typeof f.size === 'number' ? f.size : Number(f.size || 0);
                      const modified = typeof f.modified === 'number' ? f.modified : Number(f.modified || 0);
                      const dt = modified ? new Date(modified).toLocaleString() : '';
                      const sizeKb = size ? Math.round(size / 102.4) / 10 : 0;
                      return (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>{sizeKb} KB</td>
                          <td>{dt}</td>
                          <td>
                            <button onClick={() => download(`/api/admin/backup/download/${encodeURIComponent(name)}`, name)}>Descargar</button>
                            <button onClick={() => {
                              if (!confirm(`Restaurar desde ${name}? Esto sobreescribir? el estado en memoria.`)) return;
                              fetch(`/api/admin/backup/restore/${encodeURIComponent(name)}`, { method: 'POST', headers: { 'X-Admin-Secret': adminKey } })
                                .then(r => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
                                .then(() => alert('Restaurado'))
                                .catch((e) => alert(e.message));
                            }}>Restaurar</button>
                            <button onClick={() => {
                              if (!confirm(`Eliminar ${name}?`)) return;
                              fetch(`/api/admin/backup/delete/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { 'X-Admin-Secret': adminKey } })
                                .then(r => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
                                .then(() => fetchBackups())
                                .catch((e) => alert(e.message));
                            }}>Eliminar</button>
                          </td>
                        </tr>
                      );
                    })}
                    {(!backups.files || backups.files.length === 0) && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', opacity: 0.7 }}>Sin archivos</td></tr>
                    )}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {tab === 'tables' && (
            <div className="admin-section">
              <div className="admin-grid" style={{ marginBottom: 12, gridTemplateColumns: '1fr' }}>
                <div className="form" style={{ marginTop: 8, gap: 8, display: 'flex', flexWrap: 'wrap' }}>
                  <button onClick={() => download('/api/admin/export/event.xlsx', 'event.xlsx')}>Exportar XLSX (Event)</button>
                  <button onClick={() => download('/api/admin/export/mesas_totales.xlsx', 'mesas_totales.xlsx')}>Exportar XLSX (Totales por contador)</button>
                  <label className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={!!qrFlags.event}
                      onChange={(e) => updateQrFlag(e.target.checked)}
                    />
                    <span>Mostrar QR Evento</span>
                  </label>
                </div>
                <section className="counter-card" style={{ overflowX: 'auto' }}>
                  <h3>Evento M.O.D.O.K.</h3>
                  <table className="data-table stats-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Mesa</th>
                        <th>Nombre</th>
                        <th>Dificultad</th>
                        <th>Jugadores</th>
                        <th>Detalle jugadores</th>
                        <th>Código</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(tables.register || [])
                        .slice()
                        .sort((a, b) => parseTableNumber(a?.tableNumber) - parseTableNumber(b?.tableNumber))
                        .map((t) => {
                          const mesa = t.tableNumber ?? '';
                          const nombre = t.tableName ?? '';
                          const dif = t.difficulty ?? '';
                          const players = t.players ?? '';
                          const playersInfo = Array.isArray(t.playersInfo) ? t.playersInfo : [];
                          return (
                            <tr key={t.id}>
                              <td>{mesa}</td>
                              <td>{nombre}</td>
                              <td>{dif}</td>
                              <td>{players}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {playersInfo.length > 0
                                    ? playersInfo.map((p, idx) => (
                                      <div key={`${t.id}-player-${idx}`}>
                                        {p.character}{p.aspect ? ` (${p.aspect})` : ''}
                                      </div>
                                    ))
                                    : <span style={{ opacity: 0.6 }}>Sin jugadores</span>}
                                </div>
                              </td>
                              <td>{t.code}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </section>
                <section className="counter-card" style={{ overflowX: 'auto' }}>
                  <h3>Mesas - Totales Avatares y Amenaza</h3>
                  <table className="data-table stats-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th rowSpan={2}>Mesa</th>
                        <th colSpan={4} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Avatares Derrotados</th>
                        <th rowSpan={2}>Ruptura Total</th>
                        <th colSpan={2} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Amenaza</th>
                      </tr>
                      <tr>
                        <th>Granuja</th>
                        <th>Bribón</th>
                        <th>Bellaco</th>
                        <th>Canalla</th>
                        <th>Héroes</th>
                        <th>Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(mesaSummary || {}).sort((a, b) => Number(a[0]) - Number(b[0])).map(([mesa, t]) => (
                        <tr key={mesa}>
                          <td><strong>{mesa}</strong></td>
                          <td>{t?.avatar0 ?? 0}</td>
                          <td>{t?.avatar1 ?? 0}</td>
                          <td>{t?.avatar2 ?? 0}</td>
                          <td>{t?.avatar3 ?? 0}</td>
                          <td>{t?.rupturaTotal ?? 0}</td>
                          <td>{t?.threatFromHeroes ?? 0}</td>
                          <td>{t?.threatFromPlan ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            </div>
          )}

          {tab === 'stats' && (
            <div className="admin-section stats-panel">
              <div className="stats-header">
                <div>
                  <h3>Estadisticas</h3>
                  <p className="stats-subtitle">Vista rapida con barras y tarjetas por categoria.</p>
                </div>
              </div>
              <div className="admin-tabs stats-tabs" style={{ marginBottom: 8 }}>
                <button className={statsTab === 'avatares' ? 'active' : ''} onClick={() => setStatsTab('avatares')}>Avatares</button>
                <button className={statsTab === 'heroes' ? 'active' : ''} onClick={() => setStatsTab('heroes')}>Heroes</button>
                <button className={statsTab === 'realidades' ? 'active' : ''} onClick={() => setStatsTab('realidades')}>Realidades</button>
              </div>

              {statsTab === 'avatares' && (
                <div className="stats-grid">
                  <section className="stat-card">
                    <div className="stat-card__title">Veces derrotado cada avatar</div>
                    <div className="aspect-card-grid">
                      {(() => {
                        const avatarTotals = {
                          'Granuja': 0,
                          'Bribon': 0,
                          'Bellaco': 0,
                          'Canalla': 0
                        };
                        const avatarColors = {
                          'Granuja': '#F5B66C',
                          'Bribon': '#8CD6C1',
                          'Bellaco': '#C6A6FF',
                          'Canalla': '#FF8FA3'
                        };
                        Object.values(mesaSummary || {}).forEach((t) => {
                          avatarTotals['Granuja'] += (t?.avatar0 ?? 0);
                          avatarTotals['Bribon'] += (t?.avatar1 ?? 0);
                          avatarTotals['Bellaco'] += (t?.avatar2 ?? 0);
                          avatarTotals['Canalla'] += (t?.avatar3 ?? 0);
                        });
                        const entries = Object.entries(avatarTotals);
                        const totalCount = entries.reduce((sum, [, total]) => sum + total, 0);
                        return entries
                          .sort((a, b) => b[1] - a[1])
                          .map(([avatar, total]) => {
                            const percent = totalCount > 0 ? Math.round((total / totalCount) * 100) : 0;
                            const color = avatarColors[avatar] || '#C8A233';
                            return (
                              <div className="aspect-card" style={{ '--accent-color': color }} key={avatar}>
                                <div className="aspect-card__fill" style={{ height: `${percent}%` }} />
                                <div className="aspect-card__content">
                                  <div className="aspect-card__name">{avatar}</div>
                                  <div className="aspect-card__count">{total}</div>
                                  <div className="aspect-card__percent">{percent}% del total</div>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </section>
                  <section className="stat-card">
                    <div className="stat-card__title">Heroes derrotados por mesa</div>
                    <div className="stat-mesa-grid">
                      {Object.entries(mesaSummary || {})
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([mesaNumber, t]) => {
                          const defeatedHeroes = t?.defeatedHeroes || {};
                          const heroRows = Object.entries(defeatedHeroes)
                            .filter(([, count]) => count > 0)
                            .sort((a, b) => b[1] - a[1]);
                          return (
                            <div className="stat-mesa-card" key={mesaNumber}>
                              <div className="stat-mesa-title">Mesa {mesaNumber}</div>
                              <div className="stat-chip-list">
                                {heroRows.length > 0 ? (
                                  heroRows.map(([hero, count]) => (
                                    <span className="stat-chip" key={`${mesaNumber}-${hero}`}>
                                      <span>{hero}</span>
                                      <span className="stat-badge">{count}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="stat-empty">Sin derrotas</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </section>
                </div>
              )}

              {statsTab === 'heroes' && (
                <div className="stats-grid">
                  <section className="stat-card">
                    <div className="stat-card__title">Heroes mas utilizados</div>
                    <div className="stat-list">
                      {(() => {
                        const aspectColors = {
                          'Agresividad': '#FF4444',
                          'Liderazgo': '#87CEEB',
                          'Justicia': '#FFD700',
                          'Protección': '#90EE90',
                          'Masacrismo': '#FF69B4'
                        };
                        const heroTotals = {};
                        const heroAspects = {};
                        (tables.register || []).forEach((t) => {
                          (t.playersInfo || []).forEach((p) => {
                            if (!p.character) return;
                            heroTotals[p.character] = (heroTotals[p.character] || 0) + 1;
                            if (p.aspect && p.aspect !== 'No aplica') {
                              const aspects = heroAspects[p.character] || {};
                              aspects[p.aspect] = (aspects[p.aspect] || 0) + 1;
                              heroAspects[p.character] = aspects;
                            }
                          });
                        });
                        return Object.entries(heroTotals)
                          .sort((a, b) => b[1] - a[1])
                          .map(([hero, total]) => {
                            const aspectBreakdown = heroAspects[hero] || {};
                            const segments = Object.entries(aspectBreakdown)
                              .sort((a, b) => b[1] - a[1])
                              .map(([aspect, count]) => {
                                const width = total > 0 ? (count / total) * 100 : 0;
                                return {
                                  aspect,
                                  count,
                                  width,
                                  color: aspectColors[aspect] || '#C8A233'
                                };
                              });
                            return (
                              <div className="stat-row" key={hero}>
                                <div className="stat-row__label">{hero}</div>
                                <div className="hero-bar-row">
                                  <span className="hero-total">{total}</span>
                                  <div className="hero-bar">
                                    {segments.length > 0 ? (
                                      segments.map((segment) => (
                                        <span
                                          key={`${hero}-${segment.aspect}`}
                                          className="hero-segment"
                                          style={{
                                            width: `${segment.width}%`,
                                            background: segment.color
                                          }}
                                          title={`${segment.aspect}: ${segment.count}`}
                                        >
                                          {segment.count}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="hero-segment hero-segment--empty">0</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </section>
                  <section className="stat-card">
                    <div className="stat-card__title">Aspectos mas utilizados</div>
                    <div className="aspect-card-grid">
                      {(() => {
                        const aspectCount = {};
                        const aspectColors = {
                          'Agresividad': '#FF4444',
                          'Liderazgo': '#87CEEB',
                          'Justicia': '#FFD700',
                          'Protección': '#90EE90',
                          'Masacrismo': '#FF69B4'
                        };
                        (tables.register || []).forEach((t) => {
                          (t.playersInfo || []).forEach((p) => {
                            if (p.aspect && p.aspect !== 'No aplica') {
                              aspectCount[p.aspect] = (aspectCount[p.aspect] || 0) + 1;
                            }
                          });
                        });
                        const totalCount = Object.values(aspectCount).reduce((sum, count) => sum + count, 0);
                        return Object.entries(aspectCount)
                          .sort((a, b) => b[1] - a[1])
                          .map(([aspect, count]) => {
                            const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                            const color = aspectColors[aspect] || '#C8A233';
                            return (
                              <div className="aspect-card" style={{ '--accent-color': color }} key={aspect}>
                                <div className="aspect-card__fill" style={{ height: `${percent}%` }} />
                                <div className="aspect-card__content">
                                  <div className="aspect-card__name">{aspect}</div>
                                  <div className="aspect-card__count">{count}</div>
                                  <div className="aspect-card__percent">{percent}% del total</div>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </section>
                  <section className="stat-card">
                    <div className="stat-card__title">Combinacion Heroe + Aspecto mas utilizada</div>
                    {(() => {
                      const combos = {};
                      (tables.register || []).forEach((t) => {
                        (t.playersInfo || []).forEach((p) => {
                          if (p.character && p.aspect && p.aspect !== 'No aplica') {
                            const key = `${p.character} | ${p.aspect}`;
                            combos[key] = (combos[key] || 0) + 1;
                          }
                        });
                      });
                      const comboEntries = Object.entries(combos).sort((a, b) => b[1] - a[1]);
                      const top = comboEntries[0];
                      return (
                        <>
                          <div className="stat-highlight">
                            {top ? (
                              <div className="stat-highlight__value" key={`${top[0]}-${top[1]}`}>
                                {top[0]} <span className="stat-badge">{top[1]}</span>
                              </div>
                            ) : (
                              <div className="stat-empty">Sin datos</div>
                            )}
                          </div>
                          {comboEntries.length > 0 && (
                            <div className="combo-list">
                              {comboEntries.slice(0, 6).map(([combo, count]) => (
                                <div className="combo-row" key={combo}>
                                  <span className="combo-name">{combo}</span>
                                  <span className="stat-badge">{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </section>
                </div>
              )}

              {statsTab === 'realidades' && (
                <div className="stats-grid">
                  <section className="stat-card">
                    {(() => {
                      // Create reality number mapping
                      const realityIds = Object.keys(REALITIES_DATA);
                      const realityIdToNumber = {};
                      realityIds.forEach((id, index) => {
                        realityIdToNumber[id] = index + 1;
                      });

                      const realityCount = {};
                      (tables.register || []).forEach((t) => {
                        if (t.realityName && t.realityId) {
                          const key = `${t.realityId}|${t.realityName}`;
                          realityCount[key] = (realityCount[key] || 0) + 1;
                        }
                      });
                      const entries = Object.entries(realityCount).sort((a, b) => b[1] - a[1]);
                      return (
                        <>
                          <div className="stat-card__title">Realidades elegidas</div>
                          <div className="stat-row__meta" style={{ marginBottom: 10 }}>
                            <span>Seleccionadas</span>
                            <span className="stat-badge">{entries.length}</span>
                          </div>
                          <div className="stat-reality-grid">
                            {entries.map(([key, count]) => {
                              const [id, name] = key.split('|');
                              const realityNumber = realityIdToNumber[id] || '?';
                              return (
                                <div className="stat-reality-card" key={key}>
                                  <div className="stat-reality-title">Realidad #{realityNumber}: {name}</div>
                                  <div className="stat-reality-meta">{id}</div>
                                  <span className="stat-badge">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </section>
                  <section className="stat-card">
                    {(() => {
                      // Create reality number mapping
                      const realityIds = Object.keys(REALITIES_DATA);
                      const realityIdToNumber = {};
                      const allRealities = [];
                      realityIds.forEach((id, index) => {
                        const number = index + 1;
                        realityIdToNumber[id] = number;
                        allRealities.push({
                          id: id,
                          number: number,
                          name: REALITIES_DATA[id].name
                        });
                      });

                      const playedRealityIds = new Set();
                      (tables.register || []).forEach((t) => {
                        if (t.realityId) {
                          playedRealityIds.add(t.realityId);
                        }
                      });
                      const notPlayed = allRealities.filter((r) => !playedRealityIds.has(r.id));
                      return (
                        <>
                          <div className="stat-card__title">Realidades no elegidas</div>
                          <div className="stat-reality-missing">
                            <div className="stat-reality-missing__header">
                              <span>Sin elegir</span>
                              <span className="stat-badge">{notPlayed.length}</span>
                            </div>
                            <div className="stat-reality-missing__list">
                              {notPlayed.map((r) => (
                                <span className="stat-reality-chip" key={r.id}>
                                  Realidad #{r.number}: {r.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </section>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}