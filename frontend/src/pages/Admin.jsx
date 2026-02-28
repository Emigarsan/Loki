import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REALITIES_DATA } from '../data/realitiesData.js';
import * as XLSX from 'xlsx';

const API_BASE = '/api/counter';

const ASPECT_COLORS = {
  'Agresividad': '#FF4444',
  'Liderazgo': '#87CEEB',
  'Justicia': '#FFD700',
  'Protección': '#90EE90',
  'Masacrismo': '#FF69B4'
};

const CELESTIAL_NAMES = [
  'Arishem el Juez',
  'Ashema la que escucha',
  'Devron el Experimentador',
  'Eson el Buscador',
  'Exitar el Exterminador',
  'Gamiel el Manipulador',
  'Gammenon el Recolector',
  'Groffon el Regurgitador',
  'Hargen el Medidor',
  'Jemiah el Analizador',
  'Nezarr el Calculador',
  'Oneg el Sondeador',
  'Scathan el Aprobador',
  'Tefral el Supervisor',
  'Zgreb el Aspirante',
  'Ziran el Probador'
];

const getSectorName = (sectorId) => {
  if (!sectorId || sectorId < 1) return 'Desconocido';
  const index = (sectorId - 1) % CELESTIAL_NAMES.length;
  return CELESTIAL_NAMES[index];
};

const getSectorLabel = (sectorId) => `${getSectorName(sectorId)} (#${sectorId})`;

const renderSectorLabelStack = (sectorId) => {
  const label = getSectorLabel(sectorId);
  const openParenIdx = label.lastIndexOf(' (#');
  const withoutNumber = openParenIdx > 0 ? label.slice(0, openParenIdx) : label;
  const numberTag = openParenIdx > 0 ? label.slice(openParenIdx + 2, -1) : `#${sectorId}`;
  const [firstWord, ...rest] = withoutNumber.split(' ');
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.1 }}>
      <span>{firstWord}</span>
      <span style={{ fontSize: '0.85em' }}>{rest.join(' ')}</span>
      <span style={{ color: '#C8A233', fontWeight: 'bold', fontSize: '0.85em' }}>{numberTag}</span>
    </span>
  );
};

const SPECIAL_AVATAR_SPECS = [
  {
    id: 'mangog',
    display: 'Mangog',
    matches: (normalized) => normalized.includes('mangog')
  },
  {
    id: 'portal',
    display: 'Portal entre dos mundos',
    matches: (normalized) => normalized.includes('portal entre dos mundos')
  }
];

const getSectorIdFromMesa = (mesaNumber) => {
  const parsedMesa = Number(mesaNumber);
  const safeMesaId = Number.isFinite(parsedMesa) && parsedMesa > 0 ? parsedMesa : 1;
  if (safeMesaId <= 4) return 1;
  if (safeMesaId <= 8) return 2;
  const offset = safeMesaId - 9;
  const group = Math.max(0, Math.floor(offset / 3));
  return 3 + group;
};

const getAspectVisual = (aspect) => {
  if (!aspect || typeof aspect !== 'string') {
    return { color: '#C8A233', background: '#C8A233' };
  }

  const parts = aspect.split('-').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2) {
    const colorA = ASPECT_COLORS[parts[0]] || '#C8A233';
    const colorB = ASPECT_COLORS[parts[1]] || colorA;
    return {
      color: colorA,
      background: `linear-gradient(90deg, ${colorA} 0%, ${colorB} 100%)`
    };
  }

  const color = ASPECT_COLORS[aspect] || '#C8A233';
  return { color, background: color };
};

const getAdamGradient = () => {
  const colors = Object.values(ASPECT_COLORS);
  if (!colors || colors.length === 0) return '#C8A233';
  const stops = colors.map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`).join(', ');
  return `linear-gradient(90deg, ${stops})`;
};

const normalizeHeroName = (heroName) => {
  const value = (heroName || '').trim();
  if (!value) return '';
  const lower = value.toLowerCase();
  if (lower === 'spider-woman' || lower === 'spiderwoman' || lower === 'spider woman') {
    return 'Spiderwoman';
  }
  return value;
};

export default function AdminPage() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [pVal, setPVal] = useState('');
  const [primaryMaxVal, setPrimaryMaxVal] = useState('');
  const [tVal, setTVal] = useState('');
  const [maxThreatVal, setMaxThreatVal] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [tables, setTables] = useState({ register: [] });
  const [backendHeroes, setBackendHeroes] = useState([]);
  const [qrFlags, setQrFlags] = useState({ event: false });
  const [mesaSummary, setMesaSummary] = useState({});
  const [avatarDefeats, setAvatarDefeats] = useState([]);
  const [specialAvatarDefeats, setSpecialAvatarDefeats] = useState([]);
  const [tab, setTab] = useState('mod');
  const [statsTab, setStatsTab] = useState('avatares');
  const [backups, setBackups] = useState({ dir: '', writable: true, files: [] });
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [uploadingBackup, setUploadingBackup] = useState(false);
  const [purgeMinutes, setPurgeMinutes] = useState('1440');
  const [purgeKeep, setPurgeKeep] = useState('10');
  const [editingTable, setEditingTable] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [heroesStatsModalVisible, setHeroesStatsModalVisible] = useState(false);
  const [heroCombosModalVisible, setHeroCombosModalVisible] = useState(false);
  const [avatarDefeatsModalVisible, setAvatarDefeatsModalVisible] = useState(false);
  const [specialAvatarDefeatsModalVisible, setSpecialAvatarDefeatsModalVisible] = useState(false);
  const [avatarDefeatMesaFilter, setAvatarDefeatMesaFilter] = useState('');
  const [avatarDefeatNameFilter, setAvatarDefeatNameFilter] = useState('');
  const backupFileInputRef = useRef(null);
  const allTables = Array.isArray(tables.register) ? tables.register : [];
  const totalTables = allTables.length;
  const totalPlayers = allTables.reduce((sum, table) => {
    const players = Number(table?.players);
    return sum + (Number.isFinite(players) ? Math.max(0, players) : 0);
  }, 0);
  const mesaSummaryRows = useMemo(() => (
    Object.entries(mesaSummary || {}).sort((a, b) => Number(a[0]) - Number(b[0]))
  ), [mesaSummary]);
  const mesaSummaryTotals = useMemo(() => (
    mesaSummaryRows.reduce((acc, [, row]) => ({
      avatar0: acc.avatar0 + (row?.avatar0 ?? 0),
      avatar1: acc.avatar1 + (row?.avatar1 ?? 0),
      avatar2: acc.avatar2 + (row?.avatar2 ?? 0),
      avatar3: acc.avatar3 + (row?.avatar3 ?? 0),
      rupturaTotal: acc.rupturaTotal + (row?.rupturaTotal ?? 0),
      threatFromHeroes: acc.threatFromHeroes + (row?.threatFromHeroes ?? 0),
      threatFromPlan: acc.threatFromPlan + (row?.threatFromPlan ?? 0)
    }), {
      avatar0: 0,
      avatar1: 0,
      avatar2: 0,
      avatar3: 0,
      rupturaTotal: 0,
      threatFromHeroes: 0,
      threatFromPlan: 0
    })
  ), [mesaSummaryRows]);
  const topAvatarDefeats = useMemo(() => (
    (avatarDefeats || []).slice(0, 10)
  ), [avatarDefeats]);
  const avatarDefeatNameOptions = useMemo(() => (
    Array.from(new Set((avatarDefeats || []).map((item) => item?.avatarName).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [avatarDefeats]);
  const filteredAvatarDefeats = useMemo(() => {
    const mesaFilter = avatarDefeatMesaFilter.trim();
    const avatarFilter = avatarDefeatNameFilter.trim();
    return (avatarDefeats || []).filter((defeat) => {
      const mesaMatches = mesaFilter === '' || String(defeat?.mesaId ?? '').includes(mesaFilter);
      const avatarMatches = avatarFilter === '' || (defeat?.avatarName || '') === avatarFilter;
      return mesaMatches && avatarMatches;
    });
  }, [avatarDefeats, avatarDefeatMesaFilter, avatarDefeatNameFilter]);

  const trackedSpecialAvatarDefeats = useMemo(() => {
    const source = (specialAvatarDefeats && specialAvatarDefeats.length > 0)
      ? specialAvatarDefeats
      : (avatarDefeats || []);
    return source
      .map((defeat) => {
        const name = (defeat?.avatarName || '').trim();
        if (!name) return null;
        const normalized = name.toLowerCase();
        const matchedSpec = SPECIAL_AVATAR_SPECS.find((spec) => spec.matches(normalized));
        if (!matchedSpec) return null;
        return {
          ...defeat,
          specialAvatarLabel: matchedSpec.display,
          sectorId: getSectorIdFromMesa(defeat?.mesaId)
        };
      })
      .filter(Boolean);
  }, [avatarDefeats, specialAvatarDefeats]);

  const sectorSummaryRows = useMemo(() => {
    const sectorData = {};

    Object.entries(mesaSummary || {}).forEach(([mesaNumber, row]) => {
      const sectorId = row?.sectorId ?? getSectorIdFromMesa(parseInt(mesaNumber, 10));
      if (!sectorData[sectorId]) {
        sectorData[sectorId] = {
          sectorId,
          mesas: [],
          rupturaTotal: 0,
          threatFromHeroes: 0,
          threatFromPlan: 0,
          avatar0: 0,
          avatar1: 0,
          avatar2: 0,
          avatar3: 0,
          mangogDefeats: 0,
          portalDefeats: 0
        };
      }

      sectorData[sectorId].mesas.push(row?.tableName || `Mesa ${mesaNumber}`);
      sectorData[sectorId].rupturaTotal += row?.rupturaTotal ?? 0;
      sectorData[sectorId].threatFromHeroes += row?.threatFromHeroes ?? 0;
      sectorData[sectorId].threatFromPlan += row?.threatFromPlan ?? 0;
      sectorData[sectorId].avatar0 += row?.avatar0 ?? 0;
      sectorData[sectorId].avatar1 += row?.avatar1 ?? 0;
      sectorData[sectorId].avatar2 += row?.avatar2 ?? 0;
      sectorData[sectorId].avatar3 += row?.avatar3 ?? 0;
    });

    (trackedSpecialAvatarDefeats || []).forEach((defeat) => {
      const sectorId = defeat?.sectorId ?? getSectorIdFromMesa(defeat?.mesaId);
      if (!sectorData[sectorId]) {
        sectorData[sectorId] = {
          sectorId,
          mesas: [],
          rupturaTotal: 0,
          threatFromHeroes: 0,
          threatFromPlan: 0,
          avatar0: 0,
          avatar1: 0,
          avatar2: 0,
          avatar3: 0,
          mangogDefeats: 0,
          portalDefeats: 0
        };
      }

      const specialName = (defeat?.specialAvatarLabel || defeat?.avatarName || '').toLowerCase();
      if (specialName.includes('mangog')) {
        sectorData[sectorId].mangogDefeats += 1;
      } else if (specialName.includes('portal entre dos mundos')) {
        sectorData[sectorId].portalDefeats += 1;
      }
    });

    return Object.values(sectorData).sort((a, b) => a.sectorId - b.sectorId);
  }, [mesaSummary, trackedSpecialAvatarDefeats]);

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

  useEffect(() => {
    if (!isAuthed) {
      setBackendHeroes([]);
      return;
    }
    fetch('/api/tables/register/characters')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setBackendHeroes(Array.isArray(data) ? data : []))
      .catch(() => setBackendHeroes([]));
  }, [isAuthed]);

  useEffect(() => { if (isAuthed) { fetchTables(); const id = setInterval(fetchTables, 3000); return () => clearInterval(id); } }, [isAuthed, fetchTables]);

  useEffect(() => {
    if (!isAuthed) return;
    const load = () => {
      fetch('/api/mesas/summary').then(r => r.ok ? r.json() : {}).then(setMesaSummary).catch(() => { });
      fetch('/api/mesas/avatar-defeats').then(r => r.ok ? r.json() : []).then(setAvatarDefeats).catch(() => { });
      fetch('/api/mesas/special-defeats').then(r => r.ok ? r.json() : []).then(setSpecialAvatarDefeats).catch(() => setSpecialAvatarDefeats([]));
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
      .then((data) => setBackups({
        dir: data.dir || '',
        writable: data.writable !== false,
        files: Array.isArray(data.files) ? data.files : []
      }))
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
      .then((uploadData) => {
        const name = uploadData?.name;
        if (!name) throw new Error('No se pudo obtener el nombre del backup importado');
        return fetch(`/api/admin/backup/restore/${encodeURIComponent(name)}`, {
          method: 'POST',
          headers: { 'X-Admin-Secret': adminKey }
        }).then((restoreResponse) => (
          restoreResponse.ok
            ? restoreResponse.json()
            : restoreResponse.json().then((d) => Promise.reject(new Error(d?.error || 'No se pudo restaurar el backup')))
        ));
      })
      .then(() => {
        alert('Backup importado y restaurado correctamente');
        fetchBackups();
        fetchTables();
        fetchState();
      })
      .catch((e) => alert(e.message))
      .finally(() => {
        setUploadingBackup(false);
        if (event.target) event.target.value = '';
      });
  }, [adminKey, fetchBackups, fetchState, fetchTables, isAuthed]);

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

  const setPrimaryMax = (syncCurrent = true) => {
    const n = Math.max(0, parseInt(primaryMaxVal, 10) || 0);
    fetch(`${API_BASE}/primary/max/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': adminKey },
      body: JSON.stringify({ value: n, syncCurrent })
    }).then(fetchState);
  };

  const applyRecommendedPrimaryMax = () => {
    setPrimaryMaxVal(String(recommendedPrimaryMax));
    fetch(`${API_BASE}/primary/max/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': adminKey },
      body: JSON.stringify({ value: recommendedPrimaryMax, syncCurrent: true })
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

  useEffect(() => {
    if (!isAuthed) return;
    if (tab !== 'max') return;
    if (primaryMaxVal.trim() !== '') return;
    setPrimaryMaxVal(String(recommendedPrimaryMax));
  }, [isAuthed, tab, primaryMaxVal, recommendedPrimaryMax]);

  const handleEditTable = (table) => {
    setEditingTable({
      id: table.id,
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      code: table.code || '',
      difficulty: table.difficulty,
      players: table.players,
      playersInfo: table.playersInfo || [],
      realityId: table.realityId || '',
      realityName: table.realityName || '',
      disconnected: Boolean(table.disconnected)
    });
    setEditModalVisible(true);
  };

  const handleDeleteTable = (table) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la mesa ${table.tableNumber}?`)) {
      return;
    }

    fetch(`/api/admin/tables/${table.id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Secret': adminKey }
    })
      .then((r) => {
        if (r.ok) {
          alert('Mesa eliminada correctamente');
          fetchTables();
        } else {
          return r.json().then(data => {
            throw new Error(data.error || 'Error al eliminar mesa');
          });
        }
      })
      .catch((e) => alert(e.message));
  };

  const toggleDisconnect = useCallback((table) => {
    if (!isAuthed || !table?.id) return;
    const nextDisconnected = !Boolean(table.disconnected);
    const numericTableNumber = Number(table.tableNumber);
    const tableNumber = Number.isFinite(numericTableNumber) ? numericTableNumber : 0;
    const numericPlayers = Number(table.players);
    const players = Number.isFinite(numericPlayers) ? numericPlayers : 0;
    const body = {
      tableNumber,
      tableName: table.tableName || '',
      difficulty: table.difficulty || '',
      players: Math.max(0, players),
      playersInfo: Array.isArray(table.playersInfo) ? table.playersInfo : [],
      realityId: table.realityId || '',
      realityName: table.realityName || '',
      disconnected: nextDisconnected
    };

    setTables((prev) => ({
      ...prev,
      register: Array.isArray(prev.register)
        ? prev.register.map((row) => (row.id === table.id ? { ...row, disconnected: nextDisconnected } : row))
        : prev.register
    }));

    fetch(`/api/admin/tables/${table.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': adminKey
      },
      body: JSON.stringify(body)
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => Promise.reject(new Error(data?.error || 'Error al actualizar la mesa')));
        }
        return response.json();
      })
      .catch((e) => {
        alert(e.message || 'Error al cambiar el estado de desconexión');
      })
      .finally(() => {
        fetchTables();
      });
  }, [adminKey, fetchTables, isAuthed]);

  const handleSaveEditTable = () => {
    if (!editingTable) return;

    fetch(`/api/admin/tables/${editingTable.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': adminKey
      },
      body: JSON.stringify(editingTable)
    })
      .then((r) => {
        if (r.ok) {
          alert('Mesa actualizada correctamente');
          setEditModalVisible(false);
          setEditingTable(null);
          fetchTables();
        } else {
          return r.json().then(data => {
            throw new Error(data.error || 'Error al actualizar mesa');
          });
        }
      })
      .catch((e) => alert(e.message));
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setEditingTable(null);
  };

  const updateEditField = (field, value) => {
    setEditingTable(prev => ({ ...prev, [field]: value }));
  };

  const updatePlayerInfo = (index, field, value) => {
    setEditingTable(prev => {
      const newPlayersInfo = [...prev.playersInfo];
      newPlayersInfo[index] = { ...newPlayersInfo[index], [field]: value };
      return { ...prev, playersInfo: newPlayersInfo };
    });
  };

  const addPlayerSlot = () => {
    setEditingTable(prev => ({
      ...prev,
      playersInfo: [...prev.playersInfo, { character: '', aspect: '' }]
    }));
  };

  const removePlayerSlot = (index) => {
    setEditingTable(prev => ({
      ...prev,
      playersInfo: prev.playersInfo.filter((_, i) => i !== index)
    }));
  };

  const heroesStatsData = useMemo(() => {
    const heroTotals = {};
    const heroAspects = {};
    const heroMesas = {};
    const aspectCount = {};
    const combos = {};
    const comboMesas = {};

    (tables.register || []).forEach((table) => {
      const mesaNumber = Number(table?.tableNumber);
      const hasMesaNumber = Number.isFinite(mesaNumber);
      (table.playersInfo || []).forEach((player) => {
        const normalizedHero = normalizeHeroName(player?.character);
        if (!normalizedHero) return;

        heroTotals[normalizedHero] = (heroTotals[normalizedHero] || 0) + 1;
        if (hasMesaNumber) {
          if (!heroMesas[normalizedHero]) heroMesas[normalizedHero] = new Set();
          heroMesas[normalizedHero].add(mesaNumber);
        }

        if (player.aspect && player.aspect !== 'No aplica') {
          const aspects = heroAspects[normalizedHero] || {};
          aspects[player.aspect] = (aspects[player.aspect] || 0) + 1;
          heroAspects[normalizedHero] = aspects;

          aspectCount[player.aspect] = (aspectCount[player.aspect] || 0) + 1;

          const comboKey = `${normalizedHero} | ${player.aspect}`;
          combos[comboKey] = (combos[comboKey] || 0) + 1;
          if (hasMesaNumber) {
            if (!comboMesas[comboKey]) comboMesas[comboKey] = new Set();
            comboMesas[comboKey].add(mesaNumber);
          }
        }
      });
    });

    const heroRows = Object.entries(heroTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([hero, total]) => {
        const aspectBreakdown = heroAspects[hero] || {};
        const mesas = Array.from(heroMesas[hero] || []).sort((a, b) => a - b);
        const mesasTooltip = mesas.length > 0
          ? `Mesas (${mesas.length}): ${mesas.join(', ')}`
          : 'Sin mesas registradas';
        const segments = Object.entries(aspectBreakdown)
          .sort((a, b) => b[1] - a[1])
          .map(([aspect, count]) => {
            const width = total > 0 ? (count / total) * 100 : 0;
            const visual = getAspectVisual(aspect);
            return {
              aspect,
              count,
              width,
              color: visual.background
            };
          });

        return { hero, total, segments, aspectBreakdown, mesas, mesasTooltip };
      });

    const totalAspectCount = Object.values(aspectCount).reduce((sum, count) => sum + count, 0);
    const aspectRows = Object.entries(aspectCount)
      .sort((a, b) => b[1] - a[1])
      .map(([aspect, count]) => {
        const percent = totalAspectCount > 0 ? Math.round((count / totalAspectCount) * 100) : 0;
        const visual = getAspectVisual(aspect);
        return { aspect, count, percent, visual };
      });

    const comboEntries = Object.entries(combos).sort((a, b) => b[1] - a[1]);
    const comboMesaTooltipMap = Object.fromEntries(
      comboEntries.map(([combo]) => {
        const mesas = Array.from(comboMesas[combo] || []).sort((a, b) => a - b);
        const tooltip = mesas.length > 0
          ? `Mesas (${mesas.length}): ${mesas.join(', ')}`
          : 'Sin mesas registradas';
        return [combo, tooltip];
      })
    );

    return {
      heroRows,
      topHeroRows: heroRows.slice(0, 10),
      aspectRows,
      comboEntries,
      comboMesaTooltipMap,
      topComboRows: comboEntries.slice(0, 10),
      modalComboRows: comboEntries.slice(0, 15),
      topCombo: comboEntries[0] || null
    };
  }, [tables.register]);

  const allSelectableHeroes = useMemo(() => {
    const backendCatalog = Array.isArray(backendHeroes)
      ? backendHeroes.map(normalizeHeroName).filter(Boolean)
      : [];

    const fallbackCatalog = Object.values(REALITIES_DATA || {})
      .flatMap((reality) => Array.isArray(reality?.selectableHeroes) ? reality.selectableHeroes : [])
      .map(normalizeHeroName)
      .filter(Boolean);

    const sourceCatalog = backendCatalog.length > 0 ? backendCatalog : fallbackCatalog;
    return Array.from(new Set(sourceCatalog)).sort((a, b) => a.localeCompare(b));
  }, [backendHeroes]);

  const unusedHeroes = useMemo(() => {
    const usedHeroes = new Set((heroesStatsData.heroRows || []).map((row) => row.hero));
    return allSelectableHeroes.filter((hero) => !usedHeroes.has(hero));
  }, [allSelectableHeroes, heroesStatsData.heroRows]);

  const usedHeroNames = useMemo(() => (
    (heroesStatsData.heroRows || []).map((row) => row.hero)
  ), [heroesStatsData.heroRows]);

  const orderByBackend = useCallback((names) => {
    if (!Array.isArray(backendHeroes) || backendHeroes.length === 0) {
      return Array.isArray(names) ? names.slice() : [];
    }
    const nameSet = new Set(names || []);
    const ordered = [];
    // preserve backend order
    backendHeroes.forEach((h) => {
      if (nameSet.has(h)) ordered.push(h);
    });
    // append any names not present in backend at the end (preserve original order)
    (Array.isArray(names) ? names : []).forEach((n) => {
      if (!backendHeroes.includes(n)) ordered.push(n);
    });
    return ordered;
  }, [backendHeroes]);

  const usedHeroesTooltip = useMemo(() => {
    const ordered = orderByBackend(usedHeroNames || []);
    return ordered.length > 0 ? ordered.join('\n') : 'Sin héroes seleccionados';
  }, [orderByBackend, usedHeroNames]);

  const unusedHeroesTooltip = useMemo(() => {
    const ordered = orderByBackend(unusedHeroes || []);
    return ordered.length > 0 ? ordered.join('\n') : 'No hay héroes pendientes';
  }, [orderByBackend, unusedHeroes]);


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

  const formatAvatarDefeatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportAvatarDefeatsToExcel = (rowsToExport = avatarDefeats) => {
    if (!rowsToExport || rowsToExport.length === 0) {
      alert('No hay derrotas de avatar para exportar.');
      return;
    }

    const rows = rowsToExport.map((defeat, index) => ({
      '#': index + 1,
      Avatar: defeat.avatarName || '-',
      Mesa: `Mesa ${defeat.mesaId ?? '-'}`,
      Ruptura: defeat.rupturaAmount ?? 0,
      Timestamp: formatAvatarDefeatTimestamp(defeat.timestamp)
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Avatares Derrotados');
    XLSX.writeFile(workbook, `avatares-derrotados-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`);
  };

  const exportSpecialAvatarDefeatsToExcel = (rowsToExport = trackedSpecialAvatarDefeats) => {
    if (!rowsToExport || rowsToExport.length === 0) {
      alert('No hay derrotas especiales para exportar.');
      return;
    }

    const rows = rowsToExport.map((defeat, index) => ({
      '#': index + 1,
      Sector: getSectorLabel(defeat.sectorId),
      Mesa: `Mesa ${defeat.mesaId ?? '-'}`,
      Avatar: defeat.specialAvatarLabel || defeat.avatarName || '-',
      Timestamp: formatAvatarDefeatTimestamp(defeat.timestamp)
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mangog y Portal');
    XLSX.writeFile(workbook, `mangog-portal-derrotas-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`);
  };

  const exportHeroTotalsToExcel = (rowsToExport = heroesStatsData.heroRows) => {
    if (!rowsToExport || rowsToExport.length === 0) {
      alert('No hay datos de héroes para exportar.');
      return;
    }

    const orderedAspects = [
      ...new Set([
        ...Object.keys(ASPECT_COLORS),
        ...((heroesStatsData.aspectRows || []).map((row) => row.aspect))
      ])
    ];

    const rows = rowsToExport.map((row, index) => {
      const result = {
        '#': index + 1,
        Heroe: row.hero,
        Total: row.total
      };
      orderedAspects.forEach((aspect) => {
        result[aspect] = row.aspectBreakdown?.[aspect] ?? 0;
      });
      return result;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Heroes por Aspecto');

    const unusedRows = unusedHeroes.map((hero, index) => ({
      '#': index + 1,
      Heroe: hero
    }));
    const unusedWorksheet = XLSX.utils.json_to_sheet(unusedRows.length > 0 ? unusedRows : [{ Heroe: 'Sin datos' }]);
    XLSX.utils.book_append_sheet(workbook, unusedWorksheet, 'Heroes no seleccionados');

    XLSX.writeFile(workbook, `heroes-totales-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`);
  };

  const exportHeroCombosToExcel = (rowsToExport = heroesStatsData.comboEntries) => {
    if (!rowsToExport || rowsToExport.length === 0) {
      alert('No hay combinaciones para exportar.');
      return;
    }

    const rows = rowsToExport.map(([combo, count], index) => {
      const [hero, aspect] = combo.split(' | ');
      return {
        '#': index + 1,
        Heroe: hero || '-',
        Aspecto: aspect || '-',
        Veces: count
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Combinaciones');
    XLSX.writeFile(workbook, `heroes-aspectos-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`);
  };

  const exportSectorSummaryToExcel = (rowsToExport = sectorSummaryRows) => {
    if (!rowsToExport || rowsToExport.length === 0) {
      alert('No hay datos de sectores para exportar.');
      return;
    }

    const rows = rowsToExport.map((row) => ({
      Sector: getSectorLabel(row.sectorId),
      Mesas: row.mesas.length,
      Ruptura: row.rupturaTotal,
      Amenaza_Heroes: row.threatFromHeroes,
      Amenaza_Plan: row.threatFromPlan,
      Granuja: row.avatar0,
      Bribon: row.avatar1,
      Bellaco: row.avatar2,
      Canalla: row.avatar3,
      Mangog: row.mangogDefeats,
      Portal: row.portalDefeats
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sectores');
    XLSX.writeFile(workbook, `sectores-resumen-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`);
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
      <div className="container admin-container">
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
    <div className="container admin-container">
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
        <div className="admin-content admin-content--desktop">
          {false && (<div className="form">
            <label>
              Cantidad
              <input type="number" value={amount} min={0} onChange={(e) => setAmount(Number(e.target.value))} />
            </label>
          </div>)}
          <div className="admin-tabs stats-tabs admin-tabs--main">
            <button className={tab === 'mod' ? 'active' : ''} onClick={() => setTab('mod')}>Modificar valores</button>
            <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>Mesas</button>
            <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Estadisticas</button>
            <button className={tab === 'backup' ? 'active' : ''} onClick={() => setTab('backup')}>Backups</button>
          </div>

          <div className="admin-grid stats-panel admin-grid--mod" style={{ display: tab === 'mod' ? 'grid' : 'none' }}>
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
              <h3>Vida Loki máxima</h3>
              <div className="counter-value">{state.primaryMax ?? state.primary ?? 0}</div>
              <p className="field-hint">
                Recomendado (20 × jugadores: {totalPlayers}): {recommendedPrimaryMax}
              </p>
              <div className="form">
                <label>
                  Fijar a
                  <input type="number" inputMode="numeric" placeholder={String(recommendedPrimaryMax)} value={primaryMaxVal} min={0} onChange={(e) => setPrimaryMaxVal(e.target.value)} />
                </label>
                <button onClick={() => setPrimaryMax(true)}>Guardar y aplicar al valor actual</button>
                <button onClick={applyRecommendedPrimaryMax}>Usar recomendado</button>
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
              <h3>Amenaza máxima</h3>
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
            <div className="admin-grid stats-grid stats-panel" style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
              <section className="counter-card">
                <h3>Snapshots</h3>
                <div className="admin-actions-row">
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
                  <span className="admin-note">Dir: {backups.dir || '(desconocido)'}</span>
                  {!backups.writable && (
                    <span className="admin-note admin-note--warning">
                      Ruta de backups sin permisos de escritura
                    </span>
                  )}
                  {backupsLoading && <span className="admin-note admin-note--loading">Cargando...</span>}
                </div>
                <div className="form admin-backup-tools">
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
                <table className="data-table admin-backup-table">
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
                                .then(() => {
                                  alert('Restaurado');
                                  fetchBackups();
                                  fetchTables();
                                  fetchState();
                                  fetch('/api/mesas/summary').then(r => r.ok ? r.json() : {}).then(setMesaSummary).catch(() => { });
                                })
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
            <div className="admin-section admin-section--tables">
              <div className="admin-tables-layout">
                <div className="admin-tables-header">
                  <button onClick={() => download('/api/admin/export/event.xlsx', 'event.xlsx')}>Exportar XLSX (Event)</button>
                  <button onClick={() => download('/api/admin/export/mesas_totales.xlsx', 'mesas_totales.xlsx')}>Exportar XLSX (Totales por mesa)</button>
                  <label className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={!!qrFlags.event}
                      onChange={(e) => updateQrFlag(e.target.checked)}
                    />
                    <span>Mostrar QR Evento</span>
                  </label>
                </div>
                <div className="admin-tables-stack">
                  <section className="counter-card table-card">
                    <h3>Evento Loki Interocio 2026</h3>
                    <div className="table-scroll table-scroll--admin">
                      <table className="data-table stats-table data-table--admin-main" style={{ width: 'auto', maxWidth: '1200px' }}>
                        <thead>
                          <tr>
                            <th>Sector</th>
                            <th>Mesa</th>
                            <th>Realidad</th>
                            <th>Dificultad</th>
                            <th>Jugadores</th>
                            <th>Detalle jugadores</th>
                            <th>Desconectar</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            // Calculate sector ID based on table number
                            const calculateSector = (mesaId) => {
                              const safeMesaId = Math.max(1, mesaId);
                              if (safeMesaId <= 4) return 1;
                              if (safeMesaId <= 8) return 2;
                              const offset = safeMesaId - 9;
                              const group = Math.max(0, Math.floor(offset / 3));
                              return 3 + group;
                            };

                            // Sort and add sector information
                            const sortedTables = (tables.register || [])
                              .slice()
                              .sort((a, b) => parseTableNumber(a?.tableNumber) - parseTableNumber(b?.tableNumber))
                              .map(t => ({
                                ...t,
                                sectorId: calculateSector(t.tableNumber ?? 0)
                              }));

                            // Group by sector for rowspan calculation
                            const sectorGroups = {};
                            sortedTables.forEach(t => {
                              if (!sectorGroups[t.sectorId]) {
                                sectorGroups[t.sectorId] = [];
                              }
                              sectorGroups[t.sectorId].push(t);
                            });

                            // Render rows with rowspan
                            return sortedTables.map((t, index) => {
                              const mesa = t.tableNumber ?? '';
                              const nombre = t.tableName ?? '';
                              const dif = t.difficulty ?? '';
                              const players = t.players ?? '';
                              const playersInfo = Array.isArray(t.playersInfo) ? t.playersInfo : [];

                              // Check if this is the first row of the sector
                              const isFirstInSector = index === 0 || sortedTables[index - 1].sectorId !== t.sectorId;
                              const rowspan = isFirstInSector ? sectorGroups[t.sectorId].length : 0;

                              return (
                                <tr key={t.id}>
                                  {isFirstInSector && (
                                    <td rowSpan={rowspan} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                      <div className="mesa-main-cell">
                                        <strong>{renderSectorLabelStack(t.sectorId)}</strong>
                                      </div>
                                    </td>
                                  )}
                                  <td>
                                    <div className="mesa-main-cell">
                                      <strong>{nombre}</strong>
                                      <span style={{ color: '#C8A233', fontWeight: 'bold' }}>#{mesa}</span>
                                    </div>
                                  </td>
                                  <td>{t.realityName || 'Sin realidad'}</td>
                                  <td>{dif}</td>
                                  <td>{players}</td>
                                  <td>
                                    <div className="mesa-players-compact">
                                      {playersInfo.length > 0
                                        ? playersInfo.map((p, idx) => {
                                          let chipStyle = {};

                                          // Adam Warlock always shows all 5 colors
                                          if (p.character && p.character.toLowerCase().includes('adam warlock')) {
                                            const allColors = Object.values(ASPECT_COLORS);
                                            const gradientStops = allColors.map((color, i) => {
                                              const position = (i / (allColors.length - 1)) * 100;
                                              return `${color}70 ${position}%`;
                                            }).join(', ');
                                            chipStyle = {
                                              background: `linear-gradient(135deg, ${gradientStops})`,
                                              borderLeft: `3px solid ${allColors[0]}`
                                            };
                                          } else if (p.aspect) {
                                            // Split aspect by dash to handle multi-aspect characters
                                            const aspects = p.aspect.split('-').map(a => a.trim());
                                            const colors = aspects.map(a => ASPECT_COLORS[a]).filter(Boolean);

                                            if (colors.length > 1) {
                                              // Multi-aspect: create gradient with all colors
                                              const gradientStops = colors.map((color, i) => {
                                                const position = (i / (colors.length - 1)) * 100;
                                                return `${color}70 ${position}%`;
                                              }).join(', ');
                                              chipStyle = {
                                                background: `linear-gradient(135deg, ${gradientStops})`,
                                                borderLeft: `3px solid ${colors[0]}`
                                              };
                                            } else if (colors.length === 1) {
                                              // Single aspect
                                              chipStyle = {
                                                background: `linear-gradient(135deg, ${colors[0]}70, ${colors[0]}40)`,
                                                borderLeft: `3px solid ${colors[0]}`
                                              };
                                            }
                                          }
                                          return (
                                            <div key={`${t.id}-player-${idx}`} className="mesa-player-chip" style={chipStyle}>
                                              {p.character}
                                            </div>
                                          );
                                        })
                                        : <span className="mesa-player-empty">Sin jugadores</span>}
                                    </div>
                                  </td>
                                  <td>
                                    <label className="admin-toggle">
                                      <input
                                        type="checkbox"
                                        checked={!!t.disconnected}
                                        onChange={() => toggleDisconnect(t)}
                                      />
                                      <span>Desconectar</span>
                                    </label>
                                  </td>
                                  <td>
                                    <div className="table-actions">
                                      <button
                                        onClick={() => handleEditTable(t)}
                                        className="button-compact"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTable(t)}
                                        className="button-compact button-danger"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="counter-card table-card">
                    <h3>Mesas - Totales Avatares y Amenaza</h3>
                    <div className="table-scroll table-scroll--admin">
                      <table className="data-table stats-table data-table--admin-summary" style={{ width: 'auto', maxWidth: '1200px' }}>
                        <thead>
                          <tr>
                            <th>Sector</th>
                            <th>Mesa</th>
                            <th>Avatares derrotados</th>
                            <th>Ruptura Total</th>
                            <th>Amenaza</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            // Calculate sector ID based on table number
                            const calculateSector = (mesaId) => {
                              const safeMesaId = Math.max(1, mesaId);
                              if (safeMesaId <= 4) return 1;
                              if (safeMesaId <= 8) return 2;
                              const offset = safeMesaId - 9;
                              const group = Math.max(0, Math.floor(offset / 3));
                              return 3 + group;
                            };

                            // Group by sector for rowspan calculation
                            const sectorGroups = {};
                            mesaSummaryRows.forEach(([mesa, t]) => {
                              const sectorId = t?.sectorId ?? calculateSector(parseInt(mesa));
                              if (!sectorGroups[sectorId]) {
                                sectorGroups[sectorId] = [];
                              }
                              sectorGroups[sectorId].push([mesa, t]);
                            });

                            // Render rows with rowspan
                            return mesaSummaryRows.map(([mesa, t], index) => {
                              const sectorId = t?.sectorId ?? calculateSector(parseInt(mesa));
                              const prevSectorId = index > 0 ? (mesaSummaryRows[index - 1][1]?.sectorId ?? calculateSector(parseInt(mesaSummaryRows[index - 1][0]))) : null;
                              const isFirstInSector = index === 0 || prevSectorId !== sectorId;
                              const rowspan = isFirstInSector ? sectorGroups[sectorId].length : 0;

                              return (
                                <tr key={mesa}>
                                  {isFirstInSector && (
                                    <td rowSpan={rowspan} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                      <div className="mesa-main-cell">
                                        <strong>{renderSectorLabelStack(sectorId)}</strong>
                                      </div>
                                    </td>
                                  )}
                                  <td>
                                    <div className="mesa-main-cell">
                                      <strong>{t?.tableName || `Mesa ${mesa}`}</strong>
                                      <span style={{ color: '#C8A233', fontWeight: 'bold' }}>#{mesa}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="summary-chip-group">
                                      <span className="summary-chip">Granuja: {t?.avatar0 ?? 0}</span>
                                      <span className="summary-chip">Bribón: {t?.avatar1 ?? 0}</span>
                                      <span className="summary-chip">Bellaco: {t?.avatar2 ?? 0}</span>
                                      <span className="summary-chip">Canalla: {t?.avatar3 ?? 0}</span>
                                    </div>
                                  </td>
                                  <td>{t?.rupturaTotal ?? 0}</td>
                                  <td>
                                    <div className="summary-chip-group">
                                      <span className="summary-chip">Héroes: {t?.threatFromHeroes ?? 0}</span>
                                      <span className="summary-chip">Plan: {t?.threatFromPlan ?? 0}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                        <tfoot>
                          <tr className="summary-total-row">
                            <td colSpan="2"><strong>Total</strong></td>
                            <td>
                              <div className="summary-chip-group">
                                <span className="summary-chip">Granuja: {mesaSummaryTotals.avatar0}</span>
                                <span className="summary-chip">Bribón: {mesaSummaryTotals.avatar1}</span>
                                <span className="summary-chip">Bellaco: {mesaSummaryTotals.avatar2}</span>
                                <span className="summary-chip">Canalla: {mesaSummaryTotals.avatar3}</span>
                              </div>
                            </td>
                            <td><strong>{mesaSummaryTotals.rupturaTotal}</strong></td>
                            <td>
                              <div className="summary-chip-group">
                                <span className="summary-chip">Héroes: {mesaSummaryTotals.threatFromHeroes}</span>
                                <span className="summary-chip">Plan: {mesaSummaryTotals.threatFromPlan}</span>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {tab === 'stats' && (
            <div className="admin-section stats-panel">
              <div className="stats-header">
                <div>
                  <h3>Estadisticas</h3>
                </div>
              </div>
              <div className="admin-tabs stats-tabs" style={{ marginBottom: 8 }}>
                <button className={statsTab === 'avatares' ? 'active' : ''} onClick={() => setStatsTab('avatares')}>Avatares</button>
                <button className={statsTab === 'heroes' ? 'active' : ''} onClick={() => setStatsTab('heroes')}>Heroes</button>
                <button className={statsTab === 'realidades' ? 'active' : ''} onClick={() => setStatsTab('realidades')}>Realidades</button>
                <button className={statsTab === 'sectores' ? 'active' : ''} onClick={() => setStatsTab('sectores')}>Sectores</button>
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
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(200, 162, 51, 0.2)', paddingTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05rem' }}>Top 10 últimos avatares derrotados</h4>
                      {topAvatarDefeats && topAvatarDefeats.length > 0 ? (
                        <div className="stat-table-wrapper">
                          <table className="stat-table">
                            <thead>
                              <tr>
                                <th>Avatar</th>
                                <th>Mesa</th>
                                <th>Ruptura</th>
                                <th>Timestamp</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topAvatarDefeats.map((defeat, idx) => (
                                <tr key={idx}>
                                  <td>{defeat.avatarName}</td>
                                  <td>Mesa {defeat.mesaId}</td>
                                  <td>{defeat.rupturaAmount}</td>
                                  <td>{formatAvatarDefeatTimestamp(defeat.timestamp)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <span className="stat-empty">No hay avatares derrotados registrados.</span>
                      )}
                      <div style={{ marginTop: '1rem' }}>
                        <h4 style={{ marginBottom: '0.6rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05rem' }}>
                          Mangog / Portal entre dos mundos
                        </h4>
                        {trackedSpecialAvatarDefeats && trackedSpecialAvatarDefeats.length > 0 ? (
                          <div className="stat-table-wrapper">
                            <table className="stat-table">
                              <thead>
                                <tr>
                                  <th>Sector</th>
                                  <th>Mesa</th>
                                  <th>Derrotado</th>
                                  <th>Timestamp</th>
                                </tr>
                              </thead>
                              <tbody>
                                {trackedSpecialAvatarDefeats.map((defeat, idx) => (
                                  <tr key={`special-${idx}`}>
                                    <td>{renderSectorLabelStack(defeat.sectorId)}</td>
                                    <td>Mesa {defeat.mesaId}</td>
                                    <td>{defeat.specialAvatarLabel || defeat.avatarName}</td>
                                    <td>{formatAvatarDefeatTimestamp(defeat.timestamp)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <span className="stat-empty">Todavía no se ha derrotado a Mangog ni a Portal entre dos mundos.</span>
                        )}
                      </div>
                      <div className="form-actions" style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarDefeatMesaFilter('');
                            setAvatarDefeatNameFilter('');
                            setAvatarDefeatsModalVisible(true);
                          }}
                          disabled={!avatarDefeats || avatarDefeats.length === 0}
                        >
                          Ver lista completa
                        </button>
                        <button type="button" onClick={exportAvatarDefeatsToExcel} disabled={!avatarDefeats || avatarDefeats.length === 0}>
                          Exportar Excel
                        </button>
                      </div>
                      <div className="form-actions" style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => setSpecialAvatarDefeatsModalVisible(true)}
                          disabled={!trackedSpecialAvatarDefeats || trackedSpecialAvatarDefeats.length === 0}
                        >
                          Ver derrotas Mangog / Portal
                        </button>
                        <button
                          type="button"
                          onClick={exportSpecialAvatarDefeatsToExcel}
                          disabled={!trackedSpecialAvatarDefeats || trackedSpecialAvatarDefeats.length === 0}
                        >
                          Exportar Excel (Mangog / Portal)
                        </button>
                      </div>
                    </div>
                  </section>
                  <section className="stat-card">
                    <div className="stat-card__title">Heroes derrotados por mesa</div>
                    {(() => {
                      const mesasWithDefeats = Object.entries(mesaSummary || {})
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([mesaNumber, t]) => {
                          const defeatedHeroes = t?.defeatedHeroes || {};
                          const heroRows = Object.entries(defeatedHeroes)
                            .filter(([, count]) => count > 0)
                            .sort((a, b) => b[1] - a[1]);
                          return { mesaNumber, heroRows };
                        })
                        .filter(({ heroRows }) => heroRows.length > 0);

                      if (mesasWithDefeats.length === 0) {
                        return <span className="stat-empty">No hay héroes derrotados registrados.</span>;
                      }

                      return (
                        <div className="stat-mesa-grid stat-mesa-grid--compact">
                          {mesasWithDefeats.map(({ mesaNumber, heroRows }) => (
                            <div className="stat-mesa-card stat-mesa-card--compact" key={mesaNumber}>
                              <div className="stat-mesa-title">Mesa {mesaNumber}</div>
                              <div className="stat-chip-list">
                                {heroRows.map(([hero, count]) => (
                                  <span className="stat-chip" key={`${mesaNumber}-${hero}`}>
                                    <span>{hero}</span>
                                    <span className="stat-badge">{count}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </section>
                </div>
              )}

              {statsTab === 'heroes' && (
                <div className="stats-grid">
                  <section className="stat-card">
                    <div className="stat-card__title">Heroes mas utilizados (Top 10)</div>
                    <div className="stat-row__meta" style={{ marginBottom: 10 }}>
                      <span>Total heroes distintos</span>
                      <span className="stat-badge" title={usedHeroesTooltip}>{heroesStatsData.heroRows.length}</span>
                    </div>
                    <div className="stat-row__meta" style={{ marginBottom: 10 }}>
                      <span>Héroes no seleccionados</span>
                      <span className="stat-badge" title={unusedHeroesTooltip}>{unusedHeroes.length}</span>
                    </div>
                    <div className="stat-list">
                      {heroesStatsData.topHeroRows.map(({ hero, total, segments, mesasTooltip }) => (
                        <div className="stat-row" key={hero}>
                          <div className="stat-row__label">{hero}</div>
                          <div className="hero-bar-row">
                            <span className="hero-total" title={mesasTooltip}>{total}</span>
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
                                hero && hero.toLowerCase().includes('adam warlock') ? (
                                  <span
                                    className="hero-segment"
                                    style={{
                                      width: '100%',
                                      background: getAdamGradient()
                                    }}
                                    title={"Adam Warlock: mezcla de aspectos"}
                                  >
                                    {total}
                                  </span>
                                ) : (
                                  <span className="hero-segment hero-segment--empty">0</span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="form-actions" style={{ marginTop: 16 }}>
                      <button type="button" onClick={() => setHeroesStatsModalVisible(true)}>
                        Ver total completo de héroes
                      </button>
                    </div>
                  </section>

                  <section className="stat-card">
                    <div className="stat-card__title">Aspectos mas utilizados</div>
                    <div className="aspect-card-grid">
                      {heroesStatsData.aspectRows.map(({ aspect, count, percent, visual }) => (
                        <div className="aspect-card" style={{ '--accent-color': visual.color }} key={aspect}>
                          <div className="aspect-card__fill" style={{ height: `${percent}%`, background: visual.background }} />
                          <div className="aspect-card__content">
                            <div className="aspect-card__name">{aspect}</div>
                            <div className="aspect-card__count">{count}</div>
                            <div className="aspect-card__percent">{percent}% del total</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="stat-card">
                    <div className="stat-card__title">Combinaciones Heroe + Aspecto (Top 10)</div>
                    {heroesStatsData.topComboRows.length > 0 && (
                      <div className="combo-list">
                        {heroesStatsData.topComboRows.map(([combo, count]) => (
                          <div className="combo-row" key={combo}>
                            {(() => {
                              const [hero, aspect] = combo.split(' | ');
                              const visual = getAspectVisual(aspect);
                              const comboTooltip = heroesStatsData.comboMesaTooltipMap?.[combo] || 'Sin mesas registradas';
                              return (
                                <>
                                  <span className="combo-name" title={comboTooltip}>{hero || '-'}</span>
                                  <span
                                    className="hero-segment"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: 120,
                                      textAlign: 'center',
                                      background: visual.background,
                                      borderRadius: 999,
                                      padding: '2px 10px'
                                    }}
                                    title={comboTooltip}
                                  >
                                    {aspect || '-'}
                                  </span>
                                </>
                              );
                            })()}
                            <span className="stat-badge" style={{ borderRadius: 999 }} title={heroesStatsData.comboMesaTooltipMap?.[combo] || 'Sin mesas registradas'}>{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="form-actions" style={{ marginTop: 16 }}>
                      <button type="button" onClick={() => setHeroCombosModalVisible(true)}>
                        Ver lista completa de combinaciones
                      </button>
                    </div>
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

                      const realityMap = {};
                      (tables.register || []).forEach((t) => {
                        if (t.realityName && t.realityId) {
                          const key = `${t.realityId}|${t.realityName}`;
                          if (!realityMap[key]) {
                            realityMap[key] = { id: t.realityId, name: t.realityName, count: 0, mesas: [] };
                          }
                          realityMap[key].count += 1;
                          // Prefer a friendly table label: use tableName if present, otherwise Mesa <number>
                          const mesaLabel = (t.tableName && String(t.tableName).trim()) ? t.tableName : `Mesa ${t.tableNumber ?? ''}`;
                          realityMap[key].mesas.push({ mesaNumber: t.tableNumber, mesaLabel });
                        }
                      });
                      const entries = Object.entries(realityMap).sort((a, b) => (b[1].count || 0) - (a[1].count || 0));
                      return (
                        <>
                          <div className="stat-card__title">Realidades elegidas</div>
                          <div className="stat-row__meta" style={{ marginBottom: 10 }}>
                            <span>Seleccionadas</span>
                            <span className="stat-badge">{entries.length}</span>
                          </div>
                          <div className="stat-reality-grid">
                            {entries.map(([key, data]) => {
                              const id = data.id;
                              const name = data.name;
                              const count = data.count || 0;
                              const mesas = Array.isArray(data.mesas) ? data.mesas : [];
                              const realityNumber = realityIdToNumber[id] || '?';
                              return (
                                <div className="stat-reality-card" key={key}>
                                  <div className="stat-reality-title">Realidad #{realityNumber}: {name}</div>
                                  <div className="stat-reality-meta">{id}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <span className="stat-badge">{count}</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {mesas.map((m, idx) => (
                                        <span
                                          key={`${key}-mesa-${idx}`}
                                          className="stat-reality-chip"
                                          title={m.mesaLabel}
                                          style={{ fontSize: '0.65rem', padding: '1px 4px', lineHeight: 1.1 }}
                                        >
                                          {m.mesaLabel}{(m.mesaNumber || m.mesaNumber === 0) ? ` (#${m.mesaNumber})` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
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

              {statsTab === 'sectores' && (
                <div className="stats-grid">
                  <section className="stat-card">
                    <div className="stat-card__title">Resumen por sectores</div>
                    <div className="form-actions" style={{ marginBottom: 12 }}>
                      <button type="button" onClick={() => exportSectorSummaryToExcel(sectorSummaryRows)} disabled={!sectorSummaryRows.length}>
                        Exportar Excel
                      </button>
                    </div>

                    {sectorSummaryRows.length > 0 ? (
                      <div className="stat-mesa-grid stat-mesa-grid--compact">
                        {sectorSummaryRows.map((sector) => (
                          <div className="stat-mesa-card stat-mesa-card--compact" key={`sector-${sector.sectorId}`}>
                            <div className="stat-mesa-title">{renderSectorLabelStack(sector.sectorId)}</div>
                            <div className="stat-row__meta" style={{ marginBottom: 8 }}>
                              <span>Mesas</span>
                              <span className="stat-badge">{sector.mesas.length}</span>
                            </div>
                            <div className="summary-chip-group" style={{ marginBottom: 8 }}>
                              <span className="summary-chip">Ruptura: {sector.rupturaTotal}</span>
                              <span className="summary-chip">Amenaza H/P: {sector.threatFromHeroes}/{sector.threatFromPlan}</span>
                            </div>
                            <div className="summary-chip-group" style={{ marginBottom: 8 }}>
                              <span className="summary-chip">G: {sector.avatar0}</span>
                              <span className="summary-chip">B: {sector.avatar1}</span>
                              <span className="summary-chip">Be: {sector.avatar2}</span>
                              <span className="summary-chip">C: {sector.avatar3}</span>
                            </div>
                            <div className="summary-chip-group">
                              <span className="summary-chip">Mangog: {sector.mangogDefeats}</span>
                              <span className="summary-chip">Portal: {sector.portalDefeats}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="stat-empty">No hay datos de sectores disponibles.</span>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Modal de edición de mesa */}
      {avatarDefeatsModalVisible && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--stats" style={{ maxWidth: '1100px' }}>
            <h2>Todas las derrotas de avatares</h2>

            <div className="form" style={{ marginBottom: 12 }}>
              <label>
                Filtrar por mesa
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 12"
                  value={avatarDefeatMesaFilter}
                  onChange={(e) => setAvatarDefeatMesaFilter(e.target.value)}
                />
              </label>
              <label>
                Filtrar por avatar
                <select
                  value={avatarDefeatNameFilter}
                  onChange={(e) => setAvatarDefeatNameFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  {avatarDefeatNameOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="stat-row__meta" style={{ marginBottom: 10 }}>
              <span>Resultados</span>
              <span className="stat-badge">{filteredAvatarDefeats.length}</span>
            </div>

            {filteredAvatarDefeats && filteredAvatarDefeats.length > 0 ? (
              <div className="stat-table-wrapper">
                <table className="stat-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Avatar</th>
                      <th>Mesa</th>
                      <th>Ruptura</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAvatarDefeats.map((defeat, idx) => (
                      <tr key={`${defeat.timestamp}-${defeat.mesaId}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{defeat.avatarName}</td>
                        <td>Mesa {defeat.mesaId}</td>
                        <td>{defeat.rupturaAmount}</td>
                        <td>{formatAvatarDefeatTimestamp(defeat.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="stat-empty">No hay avatares derrotados registrados.</div>
            )}

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" onClick={() => exportAvatarDefeatsToExcel(filteredAvatarDefeats)} disabled={!filteredAvatarDefeats || filteredAvatarDefeats.length === 0}>
                Exportar Excel
              </button>
              <button type="button" onClick={() => setAvatarDefeatsModalVisible(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {specialAvatarDefeatsModalVisible && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--stats" style={{ maxWidth: '950px' }}>
            <h2>Derrotas de Mangog y Portal entre dos mundos</h2>

            <div className="stat-row__meta" style={{ marginBottom: 10 }}>
              <span>Resultados</span>
              <span className="stat-badge">{trackedSpecialAvatarDefeats.length}</span>
            </div>

            {trackedSpecialAvatarDefeats.length > 0 ? (
              <div className="stat-table-wrapper">
                <table className="stat-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Sector</th>
                      <th>Mesa</th>
                      <th>Derrotado</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedSpecialAvatarDefeats.map((defeat, idx) => (
                      <tr key={`${defeat.timestamp}-${defeat.mesaId}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{renderSectorLabelStack(defeat.sectorId)}</td>
                        <td>Mesa {defeat.mesaId}</td>
                        <td>{defeat.specialAvatarLabel || defeat.avatarName}</td>
                        <td>{formatAvatarDefeatTimestamp(defeat.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="stat-empty">Todavía no se ha derrotado a Mangog ni a Portal entre dos mundos.</div>
            )}

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" onClick={() => exportSpecialAvatarDefeatsToExcel(trackedSpecialAvatarDefeats)} disabled={!trackedSpecialAvatarDefeats.length}>
                Exportar Excel
              </button>
              <button type="button" onClick={() => setSpecialAvatarDefeatsModalVisible(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {heroesStatsModalVisible && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--stats" style={{ maxWidth: '900px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setHeroesStatsModalVisible(false)}
              style={{ position: 'absolute', top: 10, right: 12, minWidth: 32, padding: '4px 8px' }}
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2>Total completo de héroes</h2>

            <div className="stat-row__meta" style={{ marginBottom: 10 }}>
              <span>Total héroes distintos</span>
              <span className="stat-badge" title={usedHeroesTooltip}>{heroesStatsData.heroRows.length}</span>
            </div>

            <div className="stat-row__meta" style={{ marginBottom: 10 }}>
              <span>Héroes no seleccionados</span>
              <span className="stat-badge" title={unusedHeroesTooltip}>{unusedHeroes.length}</span>
            </div>

            {heroesStatsData.heroRows.length > 0 ? (
              <div className="stat-list">
                {heroesStatsData.heroRows.map(({ hero, total, segments, mesasTooltip }) => (
                  <div className="stat-row" key={hero}>
                    <div className="stat-row__label">{hero}</div>
                    <div className="hero-bar-row">
                      <span className="hero-total" title={mesasTooltip}>{total}</span>
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
                          hero && hero.toLowerCase().includes('adam warlock') ? (
                            <span
                              className="hero-segment"
                              style={{
                                width: '100%',
                                background: getAdamGradient()
                              }}
                              title={"Adam Warlock: mezcla de aspectos"}
                            >
                              {total}
                            </span>
                          ) : (
                            <span className="hero-segment hero-segment--empty">0</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="stat-empty">No hay datos de héroes.</div>
            )}

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" onClick={() => exportHeroTotalsToExcel(heroesStatsData.heroRows)} disabled={!heroesStatsData.heroRows.length}>
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {heroCombosModalVisible && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--stats" style={{ maxWidth: '980px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setHeroCombosModalVisible(false)}
              style={{ position: 'absolute', top: 10, right: 12, minWidth: 32, padding: '4px 8px' }}
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2>Combinaciones Héroe + Aspecto</h2>

            <div className="stat-row__meta" style={{ marginBottom: 10 }}>
              <span>Total combinaciones</span>
              <span className="stat-badge">{heroesStatsData.comboEntries.length}</span>
            </div>

            {heroesStatsData.comboEntries.length > 0 ? (
              <div className="stat-table-wrapper">
                <table className="stat-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Aspecto</th>
                      <th>Veces</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heroesStatsData.comboEntries.map(([combo, count], idx) => {
                      const [hero, aspect] = combo.split(' | ');
                      const visual = getAspectVisual(aspect);
                      const comboTooltip = heroesStatsData.comboMesaTooltipMap?.[combo] || 'Sin mesas registradas';
                      return (
                        <tr key={`${combo}-${idx}`} title={comboTooltip}>
                          <td>{idx + 1}</td>
                          <td>{hero || '-'}</td>
                          <td>
                            <span
                              className="hero-segment"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 90,
                                textAlign: 'center',
                                background: (!aspect || aspect === '') && hero && hero.toLowerCase().includes('adam warlock') ? getAdamGradient() : visual.background,
                                borderRadius: 999,
                                padding: '2px 8px'
                              }}
                              title={comboTooltip}
                            >
                              {aspect || '-'}
                            </span>
                          </td>
                          <td title={comboTooltip}>{count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="stat-empty">No hay combinaciones registradas.</div>
            )}

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" onClick={() => exportHeroCombosToExcel(heroesStatsData.comboEntries)} disabled={!heroesStatsData.comboEntries.length}>
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalVisible && editingTable && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--stats" style={{ maxWidth: '800px' }}>
            <h2>Editar Mesa {editingTable.tableNumber}</h2>

            <form className="form" onSubmit={(e) => e.preventDefault()}>
              <div className="admin-edit-grid">
                <label className="field-label">
                  <span className="field-label-title">Número de Mesa</span>
                  <input
                    type="number"
                    min="0"
                    value={editingTable.tableNumber}
                    onChange={(e) => updateEditField('tableNumber', parseInt(e.target.value, 10))}
                    required
                  />
                </label>

                <label className="field-label">
                  <span className="field-label-title">Nombre de Mesa</span>
                  <input
                    type="text"
                    value={editingTable.tableName}
                    onChange={(e) => updateEditField('tableName', e.target.value)}
                    required
                  />
                </label>

                <label className="field-label">
                  <span className="field-label-title">Código de Mesa</span>
                  <input
                    type="text"
                    value={editingTable.code || ''}
                    readOnly
                  />
                </label>

                <label className="field-label">
                  <span className="field-label-title">Dificultad</span>
                  <select
                    value={editingTable.difficulty}
                    onChange={(e) => updateEditField('difficulty', e.target.value)}
                    required
                  >
                    <option value="">Selecciona...</option>
                    <option value="Normal">Normal</option>
                    <option value="Experto">Experto</option>
                    <option value="Heroico">Heroico</option>
                  </select>
                </label>

                <label className="field-label">
                  <span className="field-label-title">Número de Jugadores</span>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={editingTable.players}
                    onChange={(e) => updateEditField('players', parseInt(e.target.value, 10))}
                    required
                  />
                </label>

                <label className="field-label">
                  <span className="field-label-title">ID de Realidad</span>
                  <select
                    value={editingTable.realityId}
                    onChange={(e) => {
                      const realityId = e.target.value;
                      const reality = REALITIES_DATA[realityId];
                      updateEditField('realityId', realityId);
                      updateEditField('realityName', reality ? reality.name : '');
                    }}
                  >
                    <option value="">Selecciona realidad...</option>
                    {Object.values(REALITIES_DATA).map((reality) => (
                      <option key={reality.id} value={reality.id}>
                        {reality.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-edit-players">
                <div className="admin-edit-players-header">
                  <h3 className="admin-edit-subtitle">Información de Jugadores</h3>
                  <button
                    type="button"
                    onClick={addPlayerSlot}
                    className="button-compact"
                  >
                    + Añadir Jugador
                  </button>
                </div>

                {editingTable.playersInfo.map((player, idx) => (
                  <div key={idx} className="admin-player-row">
                    <input
                      type="text"
                      placeholder="Héroe"
                      value={player.character || ''}
                      onChange={(e) => updatePlayerInfo(idx, 'character', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Aspecto"
                      value={player.aspect || ''}
                      onChange={(e) => updatePlayerInfo(idx, 'aspect', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removePlayerSlot(idx)}
                      className="button-compact button-danger"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" onClick={handleCancelEdit}>
                  Cancelar
                </button>
                <button type="button" onClick={handleSaveEditTable}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}