import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [sectorsData, setSectorsData] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [backups, setBackups] = useState({ dir: '', files: [] });
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [uploadingBackup, setUploadingBackup] = useState(false);
  const [purgeMinutes, setPurgeMinutes] = useState('1440');
  const [purgeKeep, setPurgeKeep] = useState('10');
  const backupFileInputRef = useRef(null);

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

  useEffect(() => {
    if (!isAuthed) return;
    const load = () => {
      fetch('/api/sector/indicators/summary')
        .then(r => {
          if (!r.ok) throw new Error('Failed to fetch sector data');
          return r.json();
        })
        .then(data => {
          console.log('Sector data:', data);
          setSectorsData(data);
        })
        .catch(err => {
          console.error('Error fetching sector indicators:', err);
        });
    };
    load();
    const id = setInterval(load, 5000);
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

  const updateQrFlag = useCallback((type, enabled) => {
    if (!isAuthed) return;
    const endpoint = '/api/admin/qr/event';
    fetch(endpoint, {
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
        <>
          {false && (<div className="form">
            <label>
              Cantidad
              <input type="number" value={amount} min={0} onChange={(e) => setAmount(Number(e.target.value))} />
            </label>
          </div>)}
          <div className="admin-tabs">
            <button className={tab === 'mod' ? 'active' : ''} onClick={() => setTab('mod')}>Modificar valores</button>
            <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>Ver mesas</button>
            <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Stats</button>
            <button className={tab === 'backup' ? 'active' : ''} onClick={() => setTab('backup')}>Backups</button>
          </div>

          <div className="admin-grid" style={{ display: tab === 'mod' ? 'grid' : 'none' }}>
            <section className="counter-card">
              <h3>Vida Loki Dios de las Mentiras</h3>
              <div className="counter-value">{state.primary}</div>
              <div className="form">
                <label>
                  Fijar a
                  <input type="number" inputMode="numeric" placeholder="0" value={pVal} min={0} onChange={(e) => setPVal(e.target.value)} />
                </label>
                <button onClick={setExact('primary', pVal)}>Guardar</button>
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
              <div className="form">
                <label>
                  Fijar a
                  <input type="number" inputMode="numeric" placeholder="0" value={maxThreatVal} min={0} onChange={(e) => setMaxThreatVal(e.target.value)} />
                </label>
                <button onClick={setTertiaryMax}>Guardar</button>
              </div>
            </section>

          </div>
          {tab === 'backup' && (
            <div className="admin-grid" style={{ gridTemplateColumns: '1fr' }}>
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

          {tab === 'tables' && (<>
            <h3>Mesas (vivo)</h3>
            <div className="admin-grid" style={{ marginBottom: 12, gridTemplateColumns: '1fr' }}>
              <div className="form" style={{ marginTop: 8, gap: 8, display: 'flex', flexWrap: 'wrap' }}>
                <button onClick={() => download('/api/admin/export/event.csv', 'event.csv')}>Exportar CSV (Event)</button>
                <button onClick={() => download('/api/admin/export/mesas_totales.csv', 'mesas_totales.csv')}>Exportar CSV (Totales por contador)</button>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={!!qrFlags.event}
                    onChange={(e) => updateQrFlag('event', e.target.checked)}
                  />
                  <span>Mostrar QR Evento</span>
                </label>
              </div>
              <section className="counter-card" style={{ overflowX: 'auto' }}>
                <h3>Evento M.O.D.O.K.</h3>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Mesa</th>
                      <th>Nombre</th>
                      <th>Dificultad</th>
                      <th>Jugadores</th>
                      <th>Detalle jugadores</th>
                      <th>Héroes derrotados</th>
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
                        const defeatedHeroes = t.defeatedHeroes && typeof t.defeatedHeroes === 'object'
                          ? t.defeatedHeroes
                          : {};
                        const defeatedList = Object.entries(defeatedHeroes)
                          .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                          .map(([hero, count]) => `${hero} (${count ?? 0})`);
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
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {defeatedList.length > 0
                                  ? defeatedList.map((hero, idx) => (
                                    <div key={`${t.id}-defeated-${idx}`}>{hero}</div>
                                  ))
                                  : <span style={{ opacity: 0.6 }}>Sin datos</span>}
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
                <h3>Mesas - Totales por contador</h3>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th rowSpan={2}>Mesa</th>
                      <th colSpan={4}>Avatares</th>
                      <th rowSpan={2}>Ruptura total</th>
                      <th rowSpan={2}>Amenaza (héroe)</th>
                      <th rowSpan={2}>Amenaza (plan)</th>
                    </tr>
                    <tr>
                      <th>Granuja</th>
                      <th>Bribón</th>
                      <th>Bellaco</th>
                      <th>Canalla</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mesaSummary || {}).sort((a, b) => Number(a[0]) - Number(b[0])).map(([mesa, t]) => (
                      <tr key={mesa}>
                        <td>{mesa}</td>
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
          </>)}

          {tab === 'stats' && (
            <div className="admin-grid" style={{ marginBottom: 12, gridTemplateColumns: '1fr' }}>
              {(() => {
                const summary = mesaSummary || {};
                const mesas = Object.entries(summary);
                
                // Totales
                const totalAvatarDefeats = mesas.reduce((sum, [_, t]) => sum + (t?.avatar0 ?? 0) + (t?.avatar1 ?? 0) + (t?.avatar2 ?? 0) + (t?.avatar3 ?? 0), 0);
                const totalRuptura = mesas.reduce((sum, [_, t]) => sum + (t?.rupturaTotal ?? 0), 0);
                const totalThreatHero = mesas.reduce((sum, [_, t]) => sum + (t?.threatFromHeroes ?? 0), 0);
                const totalThreatPlan = mesas.reduce((sum, [_, t]) => sum + (t?.threatFromPlan ?? 0), 0);
                const totalThreat = totalThreatHero + totalThreatPlan;
                
                // Por avatar
                const avatar0Defeats = mesas.reduce((sum, [_, t]) => sum + (t?.avatar0 ?? 0), 0);
                const avatar1Defeats = mesas.reduce((sum, [_, t]) => sum + (t?.avatar1 ?? 0), 0);
                const avatar2Defeats = mesas.reduce((sum, [_, t]) => sum + (t?.avatar2 ?? 0), 0);
                const avatar3Defeats = mesas.reduce((sum, [_, t]) => sum + (t?.avatar3 ?? 0), 0);
                
                // Promedios
                const avgRuptura = mesas.length > 0 ? (totalRuptura / mesas.length).toFixed(1) : 0;
                const avgThreat = mesas.length > 0 ? (totalThreat / mesas.length).toFixed(1) : 0;
                
                // Mesas top
                const mesasByDefeats = [...mesas].sort((a, b) => {
                  const aTotal = (a[1]?.avatar0 ?? 0) + (a[1]?.avatar1 ?? 0) + (a[1]?.avatar2 ?? 0) + (a[1]?.avatar3 ?? 0);
                  const bTotal = (b[1]?.avatar0 ?? 0) + (b[1]?.avatar1 ?? 0) + (b[1]?.avatar2 ?? 0) + (b[1]?.avatar3 ?? 0);
                  return bTotal - aTotal;
                });
                const topMesaDefeats = mesasByDefeats[0];
                
                const mesasByRuptura = [...mesas].sort((a, b) => (b[1]?.rupturaTotal ?? 0) - (a[1]?.rupturaTotal ?? 0));
                const topMesaRuptura = mesasByRuptura[0];
                
                const mesasByThreat = [...mesas].sort((a, b) => {
                  const aThreat = (a[1]?.threatFromHeroes ?? 0) + (a[1]?.threatFromPlan ?? 0);
                  const bThreat = (b[1]?.threatFromHeroes ?? 0) + (b[1]?.threatFromPlan ?? 0);
                  return bThreat - aThreat;
                });
                const topMesaThreat = mesasByThreat[0];

                // Héroes derrotados desde tables.register
                const allDefeatedHeroes = {};
                (tables?.register || []).forEach(t => {
                  const defeated = t.defeatedHeroes && typeof t.defeatedHeroes === 'object' ? t.defeatedHeroes : {};
                  Object.entries(defeated).forEach(([hero, count]) => {
                    allDefeatedHeroes[hero] = (allDefeatedHeroes[hero] || 0) + (count ?? 0);
                  });
                });
                const heroEntries = Object.entries(allDefeatedHeroes).sort((a, b) => b[1] - a[1]);

                // Héroes (personajes) usados
                const heroCount = {};
                const aspectCount = {};
                const heroCombinations = {};
                (tables?.register || []).forEach(t => {
                  const playersInfo = Array.isArray(t.playersInfo) ? t.playersInfo : [];
                  playersInfo.forEach(p => {
                    const character = p.character || 'Desconocido';
                    const aspect = p.aspect || 'Sin aspecto';
                    const combination = `${character} (${aspect})`;
                    
                    heroCount[character] = (heroCount[character] || 0) + 1;
                    aspectCount[aspect] = (aspectCount[aspect] || 0) + 1;
                    heroCombinations[combination] = (heroCombinations[combination] || 0) + 1;
                  });
                });
                
                const heroEntries2 = Object.entries(heroCount).sort((a, b) => b[1] - a[1]);
                const aspectEntries = Object.entries(aspectCount).sort((a, b) => b[1] - a[1]);
                const combinationEntries = Object.entries(heroCombinations).sort((a, b) => b[1] - a[1]);

                return (
                  <>
                    <section className="counter-card">
                      <h3>Resumen General</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <p><strong>Total Avatares derrotados:</strong> {totalAvatarDefeats}</p>
                          <p><strong>Ruptura total:</strong> {totalRuptura}</p>
                          <p><strong>Amenaza total:</strong> {totalThreat}</p>
                          <p style={{ opacity: 0.8 }}>
                            <small>(Héroe: {totalThreatHero}, Plan: {totalThreatPlan})</small>
                          </p>
                        </div>
                        <div>
                          <p><strong>Promedio Ruptura/mesa:</strong> {avgRuptura}</p>
                          <p><strong>Promedio Amenaza/mesa:</strong> {avgThreat}</p>
                          <p><strong>Total mesas:</strong> {mesas.length}</p>
                        </div>
                      </div>
                    </section>

                    <div className="admin-tabs" style={{ marginBottom: 12 }}>
                      <button className={statsTab === 'avatares' ? 'active' : ''} onClick={() => setStatsTab('avatares')}>Avatares</button>
                      <button className={statsTab === 'heroes' ? 'active' : ''} onClick={() => setStatsTab('heroes')}>Héroes</button>
                      <button className={statsTab === 'sectores' ? 'active' : ''} onClick={() => setStatsTab('sectores')}>Sectores</button>
                    </div>

                    {statsTab === 'avatares' && (
                      <>
                        <section className="counter-card">
                          <h3>Ranking de Avatares</h3>
                          <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Avatar</th>
                                <th>Derrotas</th>
                                <th>% del total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Granuja</td>
                                <td>{avatar0Defeats}</td>
                                <td>{totalAvatarDefeats > 0 ? ((avatar0Defeats / totalAvatarDefeats) * 100).toFixed(1) : 0}%</td>
                              </tr>
                              <tr>
                                <td>Bribón</td>
                                <td>{avatar1Defeats}</td>
                                <td>{totalAvatarDefeats > 0 ? ((avatar1Defeats / totalAvatarDefeats) * 100).toFixed(1) : 0}%</td>
                              </tr>
                              <tr>
                                <td>Bellaco</td>
                                <td>{avatar2Defeats}</td>
                                <td>{totalAvatarDefeats > 0 ? ((avatar2Defeats / totalAvatarDefeats) * 100).toFixed(1) : 0}%</td>
                              </tr>
                              <tr>
                                <td>Canalla</td>
                                <td>{avatar3Defeats}</td>
                                <td>{totalAvatarDefeats > 0 ? ((avatar3Defeats / totalAvatarDefeats) * 100).toFixed(1) : 0}%</td>
                              </tr>
                              <tr style={{ fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                <td>TOTAL</td>
                                <td>{totalAvatarDefeats}</td>
                                <td>100%</td>
                              </tr>
                            </tbody>
                          </table>
                        </section>

                        <section className="counter-card">
                          <h3>Top mesas</h3>
                          <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Métrica</th>
                                <th>Mesa</th>
                                <th>Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Más avatares derrotados</td>
                                <td>{topMesaDefeats ? topMesaDefeats[0] : '-'}</td>
                                <td>{topMesaDefeats ? (topMesaDefeats[1]?.avatar0 ?? 0) + (topMesaDefeats[1]?.avatar1 ?? 0) + (topMesaDefeats[1]?.avatar2 ?? 0) + (topMesaDefeats[1]?.avatar3 ?? 0) : 0}</td>
                              </tr>
                              <tr>
                                <td>Más ruptura</td>
                                <td>{topMesaRuptura ? topMesaRuptura[0] : '-'}</td>
                                <td>{topMesaRuptura ? topMesaRuptura[1]?.rupturaTotal ?? 0 : 0}</td>
                              </tr>
                              <tr>
                                <td>Más amenaza</td>
                                <td>{topMesaThreat ? topMesaThreat[0] : '-'}</td>
                                <td>{topMesaThreat ? (topMesaThreat[1]?.threatFromHeroes ?? 0) + (topMesaThreat[1]?.threatFromPlan ?? 0) : 0}</td>
                              </tr>
                            </tbody>
                          </table>
                        </section>

                        <section className="counter-card">
                          <h3>Héroes derrotados</h3>
                          {heroEntries.length > 0 ? (
                            <table className="data-table" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th>Héroe</th>
                                  <th>Derrotas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {heroEntries.map(([hero, count]) => (
                                  <tr key={hero}>
                                    <td>{hero}</td>
                                    <td>{count}</td>
                                  </tr>
                                ))}
                                <tr style={{ fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                  <td>TOTAL</td>
                                  <td>{heroEntries.reduce((sum, [_, count]) => sum + count, 0)}</td>
                                </tr>
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ opacity: 0.6 }}>Sin héroes derrotados registrados</p>
                          )}
                        </section>
                      </>
                    )}

                    {statsTab === 'heroes' && (
                      <>
                        <section className="counter-card">
                          <h3>Héroes más usados</h3>
                          {heroEntries2.length > 0 ? (
                            <table className="data-table" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th>Héroe</th>
                                  <th>Veces usado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {heroEntries2.map(([hero, count]) => (
                                  <tr key={hero}>
                                    <td>{hero}</td>
                                    <td>{count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ opacity: 0.6 }}>Sin datos de héroes</p>
                          )}
                        </section>

                        <section className="counter-card">
                          <h3>Aspectos más usados</h3>
                          {aspectEntries.length > 0 ? (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 16 }}>
                                {aspectEntries.map(([aspect, count]) => {
                                  const total = aspectEntries.reduce((sum, [_, c]) => sum + c, 0);
                                  const percentage = ((count / total) * 100).toFixed(1);
                                  const aspectColors = {
                                    'Agresividad': '#FF4444',
                                    'Liderazgo': '#87CEEB',
                                    'Justicia': '#FFD700',
                                    'Protección': '#90EE90',
                                    'Masacrismo': '#FF69B4'
                                  };
                                  const hashColor = aspectColors[aspect] || '#999999';
                                  
                                  return (
                                    <div
                                      key={aspect}
                                      style={{
                                        padding: 12,
                                        backgroundColor: hashColor + '20',
                                        borderLeft: `4px solid ${hashColor}`,
                                        borderRadius: 4,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{aspect}</span>
                                        <span style={{ fontSize: 12, opacity: 0.8 }}>{count}</span>
                                      </div>
                                      <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                        height: 8,
                                        borderRadius: 4,
                                        overflow: 'hidden'
                                      }}>
                                        <div
                                          style={{
                                            height: '100%',
                                            backgroundColor: hashColor,
                                            width: `${percentage}%`,
                                            transition: 'width 0.3s ease'
                                          }}
                                        />
                                      </div>
                                      <div style={{ fontSize: 11, opacity: 0.7, textAlign: 'right' }}>
                                        {percentage}%
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                                {aspectEntries.map(([aspect]) => {
                                  const aspectColors = {
                                    'Agresividad': '#FF4444',
                                    'Liderazgo': '#87CEEB',
                                    'Justicia': '#FFD700',
                                    'Protección': '#90EE90',
                                    'Masacrismo': '#FF69B4'
                                  };
                                  const hashColor = aspectColors[aspect] || '#999999';
                                  return (
                                    <div key={`legend-${aspect}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                      <div style={{ width: 12, height: 12, backgroundColor: hashColor, borderRadius: 2 }} />
                                      <span>{aspect}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <p style={{ opacity: 0.6 }}>Sin datos de aspectos</p>
                          )}
                        </section>

                        <section className="counter-card">
                          <h3>Combinaciones más frecuentes (Héroe + Aspecto)</h3>
                          {combinationEntries.length > 0 ? (
                            <table className="data-table" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th>Héroe + Aspecto</th>
                                  <th>Veces usado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {combinationEntries.slice(0, 10).map(([combo, count]) => (
                                  <tr key={combo}>
                                    <td>{combo}</td>
                                    <td>{count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ opacity: 0.6 }}>Sin datos de combinaciones</p>
                          )}
                        </section>
                      </>
                    )}

                    {statsTab === 'sectores' && (
                      <>
                        <section className="counter-card">
                          <h3>Resumen General - Indicadores por Sector</h3>
                          {sectorsData && sectorsData.by_sector ? (
                            Object.entries(sectorsData.by_sector).length > 0 ? (
                              <>
                                <table className="data-table" style={{ width: '100%', marginBottom: 20 }}>
                                  <thead>
                                    <tr>
                                      <th>Sector</th>
                                      <th>Total Mesas</th>
                                      <th>Mangog derrotado</th>
                                      <th>Portal derrotado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(sectorsData.by_sector).map(([sector, data]) => (
                                      <tr key={sector} style={{ cursor: 'pointer' }} onClick={() => setSelectedSector(sector)}>
                                        <td><strong>{sector}</strong></td>
                                        <td>{data.total_mesas ?? 0}</td>
                                        <td>{data.mangog_defeated ?? 0}</td>
                                        <td>{data.gate_defeated ?? 0}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                
                                {selectedSector && sectorsData.by_sector[selectedSector] && (
                                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                                    <h4 style={{ marginBottom: 12 }}>Detalles del Sector: {selectedSector}</h4>
                                    <table className="data-table" style={{ width: '100%' }}>
                                      <thead>
                                        <tr>
                                          <th>Mesa</th>
                                          <th>Mangog derrotado</th>
                                          <th>Portal derrotado</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(sectorsData.by_sector[selectedSector].mesas || {}).map(([mesaId, mesaInfo]) => (
                                          <tr key={mesaId}>
                                            <td><strong>Mesa {mesaId}</strong></td>
                                            <td>{mesaInfo.mangog_defeated ? '✓ Sí' : '-'}</td>
                                            <td>{mesaInfo.gate_defeated ? '✓ Sí' : '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p style={{ opacity: 0.6 }}>Sin datos de sectores</p>
                            )
                          ) : (
                            <p style={{ opacity: 0.6 }}>Cargando datos...</p>
                          )}
                        </section>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}






