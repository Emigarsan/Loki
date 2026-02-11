import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = '/api/counter';

export default function AdminPage() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [amountPrimary, setAmountPrimary] = useState(1);
  const [amountSecondary, setAmountSecondary] = useState(1);
  const [amountTertiary, setAmountTertiary] = useState(1);
  const [pVal, setPVal] = useState('');
  const [tVal, setTVal] = useState('');
  const [maxThreatVal, setMaxThreatVal] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [tables, setTables] = useState({ register: [], freegame: [] });
  const [qrFlags, setQrFlags] = useState({ event: false, freegame: false });
  const [mesaSummary, setMesaSummary] = useState({});
  const [tab, setTab] = useState('mod');
  const [tablesTab, setTablesTab] = useState('event');
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
          setTables({ register: [], freegame: [] });
          return;
        }
        const register = Array.isArray(data.register) ? data.register : [];
        const freegame = Array.isArray(data.freegame) ? data.freegame : [];
        setTables({ register, freegame });
        const flags = data.qrFlags;
        if (flags && typeof flags === 'object') {
          setQrFlags({
            event: Boolean(flags.event),
            freegame: Boolean(flags.freegame)
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

  const updateQrFlag = useCallback((type, enabled) => {
    if (!isAuthed) return;
    const endpoint = type === 'freegame' ? '/api/admin/qr/freegame' : '/api/admin/qr/event';
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
            event: Boolean(data.event),
            freegame: Boolean(data.freegame)
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

  const update = (segment, sign) => () => {
    const endpoint = sign > 0 ? 'increment' : 'decrement';
    const amt = (() => {
      if (segment === 'primary') return Math.max(0, Number(amountPrimary) || 1);
      if (segment === 'secondary') return Math.max(0, Number(amountSecondary) || 1);
      return Math.max(0, Number(amountTertiary) || 1);
    })();
    fetch(`${API_BASE}/${segment}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt })
    }).then(fetchState);
  };

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
    setTables({ register: [], freegame: [] });
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
            <button className={tab === 'backup' ? 'active' : ''} onClick={() => setTab('backup')}>Backups</button>
          </div>

          <div className="admin-grid" style={{ display: tab === 'mod' ? 'grid' : 'none' }}>
            <section className="counter-card">
              <h3>Vida M.O.D.O.K.</h3>
              <div className="counter-value">{state.primary}</div>
              <div className="form">
                <label>
                  Fijar a
                  <input type="number" inputMode="numeric" placeholder="0" value={pVal} min={0} onChange={(e) => setPVal(e.target.value)} />
                </label>
                <button onClick={setExact('primary', pVal)}>Guardar</button>
              </div>
              <div className="form">
                <label>
                  Cantidad
                  <input type="number" min={0} value={amountPrimary} onChange={(e) => setAmountPrimary(Number(e.target.value))} />
                </label>
              </div>
              <div className="button-grid">
                <button onClick={update('primary', +1)}>+</button>
                <button onClick={update('primary', -1)}>-</button>
              </div>
            </section>

            <section className="counter-card">
              <h3>Entrenamiento especializado</h3>
              <div className="counter-value">{state.tertiary}</div>
              <div className="form">
                <label>
                  Fijar a
                  <input type="number" inputMode="numeric" placeholder="0" value={tVal} min={0} onChange={(e) => setTVal(e.target.value)} />
                </label>
                <button onClick={setExact('tertiary', tVal)}>Guardar</button>
              </div><div className="form">
                <label>
                  Cantidad
                  <input type="number" min={0} value={amountTertiary} onChange={(e) => setAmountTertiary(Number(e.target.value))} />
                </label>
              </div>
              <div className="button-grid">
                <button onClick={update('tertiary', +1)}>+</button>
                <button onClick={update('tertiary', -1)}>-</button>
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
            <div className="admin-tabs" style={{ marginBottom: 8 }}>
              <button className={tablesTab === 'event' ? 'active' : ''} onClick={() => setTablesTab('event')}>Event</button>
              <button className={tablesTab === 'freegame' ? 'active' : ''} onClick={() => setTablesTab('freegame')}>Freegame</button>
            </div>
            <div className="admin-grid" style={{ marginBottom: 12, gridTemplateColumns: '1fr' }}>
              <div className="form" style={{ marginTop: 8, gap: 8, display: tablesTab === 'event' ? 'flex' : 'none', flexWrap: 'wrap' }}>
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
              <section className="counter-card" style={{ overflowX: 'auto', display: tablesTab === 'event' ? 'block' : 'none' }}>
                <h3>Evento M.O.D.O.K.</h3>
                <table className="data-table" style={{ width: '100%' }}>
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
              <div className="form" style={{ marginTop: 8, gap: 8, display: tablesTab === 'freegame' ? 'flex' : 'none', flexWrap: 'wrap' }}>
                <button onClick={() => download('/api/admin/export/freegame.csv', 'freegame.csv')}>Exportar CSV (Freegame)</button>
                <button onClick={() => download('/api/admin/export/freegame_scores.csv', 'freegame_scores.csv')}>Exportar CSV (Puntuación Freegame)</button>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={!!qrFlags.freegame}
                    onChange={(e) => updateQrFlag('freegame', e.target.checked)}
                  />
                  <span>Mostrar QR Freegame</span>
                </label>
              </div>
              <section className="counter-card" style={{ overflowX: 'auto', display: tablesTab === 'event' ? 'block' : 'none' }}>
                <h3>Mesas - Totales por contador</h3>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Mesa</th>
                      <th>Contador 1</th>
                      <th>Contador 2</th>
                      <th>Contador 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mesaSummary || {}).sort((a, b) => Number(a[0]) - Number(b[0])).map(([mesa, t]) => (
                      <tr key={mesa}>
                        <td>{mesa}</td>
                        <td>{t?.c1 ?? 0}</td>
                        <td>{t?.c2 ?? 0}</td>
                        <td>{t?.c3 ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="counter-card" style={{ overflowX: 'auto', display: tablesTab === 'freegame' ? 'block' : 'none' }}>
                <h3>Retos Inevitables</h3>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Mesa</th><th>Nombre</th><th>Reto inevitable</th><th>Jugadores</th><th>Detalle jugadores</th><th>Código</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tables.freegame || [])
                      .slice()
                      .sort((a, b) => parseTableNumber(a?.tableNumber) - parseTableNumber(b?.tableNumber))
                      .map((t) => {
                        const playersInfo = Array.isArray(t.playersInfo) ? t.playersInfo : [];
                        return (
                          <tr key={t.id}>
                            <td>{t.tableNumber}</td>
                            <td>{t.name}</td>
                            <td>{t.inevitableChallenge || '(Ninguno)'}</td>
                            <td>{t.players}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {playersInfo.length > 0
                                  ? playersInfo.map((p, idx) => (
                                    <div key={`${t.id}-free-${idx}`}>
                                      {p.character}
                                      {p.aspect ? ` (${p.aspect})` : ''}
                                      {p.legacy ? ` [${p.legacy}]` : ''}
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
              <section className="counter-card" style={{ overflowX: 'auto', display: tablesTab === 'freegame' ? 'block' : 'none' }}>
                <h3>Puntuación por mesa (desglose)</h3>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Mesa</th>
                      <th>Dificultad</th>
                      <th>Reto inevitable</th>
                      <th>Puntos base</th>
                      <th>Legados</th>
                      <th>Puntos de Victoria</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                  {(tables.freegame || [])
                    .slice()
                    .sort((a, b) => parseTableNumber(a?.tableNumber) - parseTableNumber(b?.tableNumber))
                    .map((t) => {
                      const noCh = !t?.inevitableChallenge || t.inevitableChallenge === '(Ninguno)'; const base = noCh ? 0 : (t?.difficulty === 'Experto' ? 5 : 3);
                      const legacyCount = noCh ? 0 : (Array.isArray(t?.playersInfo) ? t.playersInfo.filter(p => p.legacy && String(p.legacy) !== 'Ninguno').length : 0);
                      const vp = noCh ? 0 : (typeof t?.victoryPoints === 'number' ? t.victoryPoints : 0);
                      const total = noCh ? 0 : (base + legacyCount + vp);
                      return (
                        <tr key={t.id + '-score'}>
                          <td>{t.tableNumber}</td>
                          <td>{t.difficulty || 'Normal'}</td>
                          <td>{t.inevitableChallenge || '(Ninguno)'}</td>
                          <td>{base}</td>
                          <td>{legacyCount}</td>
                          <td>{vp}</td>
                          <td>{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </div>
          </>)}
        </>
      )}
    </div>
  );
}






