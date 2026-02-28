const fs = require('fs');
const path = require('path');

function randint(max) { return Math.floor(Math.random() * max); }

const realitiesPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'realitiesData.js');
const outDir = path.join(__dirname, '..', 'backups');
const outFile = path.join(outDir, 'app-test-50-mesas.json');

if (!fs.existsSync(realitiesPath)) {
    console.error('No se encontró realitiesData.js en:', realitiesPath);
    process.exit(1);
}

const content = fs.readFileSync(realitiesPath, 'utf8');
// realitiesData.js is an ES module file starting with 'export'; strip export and evaluate
const sanitized = content.replace(/^\s*export\s+/m, '');
// realitiesData.js defines REALITIES_DATA; execute it and return the object
let REALITIES_DATA;
try {
    const fn = new Function(sanitized + '\nreturn REALITIES_DATA;');
    REALITIES_DATA = fn();
} catch (e) {
    console.error('Error evaluando realitiesData.js:', e);
    process.exit(1);
}

const realityIds = Object.keys(REALITIES_DATA);

// Build a global heroes list for "Cualquiera" realities
const allHeroes = [];
for (const r of realityIds) {
    const sel = REALITIES_DATA[r].selectableHeroes;
    if (Array.isArray(sel)) sel.forEach(h => { if (!allHeroes.includes(h)) allHeroes.push(h); });
}

const aspects = ['Agresividad', 'Protección', 'Justicia', 'Liderazgo', 'Masacrismo'];
// generate unordered unique pairs (10 options) like 'Protección-Justicia'
function pairCombos(arr) {
    const res = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            res.push(arr[i] + '-' + arr[j]);
        }
    }
    return res;
}
const spiderCombos = pairCombos(aspects);
const funnyNames = [
    'Los Capas',
    'Liga de la Siesta',
    'Héroes con Café',
    'Los que Llegan Tarde',
    'Super Despistados',
    'Traje Arrugado',
    'Equipo Anti-Alarmas',
    'Multiverso-máticos',
    'Los Saltarines',
    'Comando Sargento',
    'Los que No Vuelan',
    'Patrulla del Sándwich',
    'Puños Felices',
    'Guardia del Sofá',
    'Escuadrón Calcetín',
    'Rompe-WiFi',
    'Brigada del Chiste Malo',
    'Capa Holgada',
    'Sociedad del Sombrero',
    'Hermanos del Bocadillo'
];

// Build at least 50 unique funny names by combining prefixes and nouns if needed
function buildUniqueFunnyNames(target) {
    const prefixes = ['Super', 'Mega', 'Ultra', 'Súper', 'Hiper', 'Mini', 'Turbo', 'Neo', 'Retro', 'Proto'];
    const nouns = ['Capas', 'Sándwich', 'Siesta', 'Calcetín', 'Café', 'Sombrero', 'Bocadillo', 'Sofá', 'Puños', 'Traje', 'Patrulla', 'Brigada', 'Escuadrón', 'Comando', 'Guardia'];
    const set = new Set(funnyNames);
    let pi = 0, ni = 0;
    while (set.size < target) {
        const name = prefixes[pi % prefixes.length] + ' ' + nouns[ni % nouns.length];
        set.add(name);
        pi++; ni++;
    }
    return Array.from(set);
}
const uniqueFunnyNames = buildUniqueFunnyNames(50);

function pickHeroesForReality(rid, count) {
    let pool = REALITIES_DATA[rid].selectableHeroes;
    if (!Array.isArray(pool) && typeof pool === 'string' && pool.toLowerCase().includes('cualquiera')) {
        pool = allHeroes;
    }
    // ensure pool is array
    pool = Array.isArray(pool) ? pool.slice() : allHeroes.slice();
    const picked = [];
    while (picked.length < count && pool.length) {
        const i = randint(pool.length);
        picked.push(pool.splice(i, 1)[0]);
    }
    // if not enough unique heroes, allow repeats
    while (picked.length < count) picked.push(allHeroes[randint(allHeroes.length)]);
    return picked;
}

function normalizeHeroName(name) {
    if (!name || typeof name !== 'string') return name;
    const n = name.trim();
    // Star-Lord, Star Lord, Starlord -> Starlord
    if (/^star[\s-]?lord$/i.test(n)) return 'Starlord';
    // Spider-Man (Miles Morales) variants -> Spiderman (Miles Morales)
    if (/^spider[\s-]?man\s*\(\s*miles\s*morales\s*\)$/i.test(n) || /^spiderman\s*\(\s*miles\s*morales\s*\)$/i.test(n)) return 'Spiderman (Miles Morales)';
    // Spider-Man (Peter Parker) variants -> Spiderman (Peter Parker)
    if (/^spider[\s-]?man\s*\(\s*peter\s*parker\s*\)$/i.test(n) || /^spiderman\s*\(\s*peter\s*parker\s*\)$/i.test(n)) return 'Spiderman (Peter Parker)';
    // Spiderwoman variants normalize to 'Spiderwoman'
    if (/^spider\s?-?woman$/i.test(n) || /^spiderwoman$/i.test(n)) return 'Spiderwoman';
    // Nebula variants -> Nébula (force accented form)
    if (/^(nébula|nebula)$/i.test(n)) return 'Nébula';
    return n;
}

const registerTables = [];
const baseCreatedAt = 1771500000;

for (let i = 1; i <= 50; i++) {
    const rid = realityIds[randint(realityIds.length)];
    const reality = REALITIES_DATA[rid];
    const heroes = pickHeroesForReality(rid, 4);

    const playersInfo = heroes.map(h => {
        const name = normalizeHeroName(h);
        // Adam Warlock puede quedar sin aspecto
        if (name === 'Adam Warlock') {
            return { character: name, aspect: (Math.random() < 0.3 ? '' : aspects[randint(aspects.length)]) };
        }
        // Spiderwoman tiene combinaciones propias
        if (name === 'Spiderwoman') {
            return { character: 'Spiderwoman', aspect: spiderCombos[randint(spiderCombos.length)] };
        }
        // Resto de héroes deben tener un aspecto no vacío
        return { character: name, aspect: aspects[randint(aspects.length)] };
    });

    const difficulty = (Math.random() < 0.5) ? 'Normal' : 'Experto';

    registerTables.push({
        id: `test-mesa-${String(i).padStart(3, '0')}`,
        tableNumber: i,
        tableName: uniqueFunnyNames[i - 1],
        difficulty,
        players: 4,
        playersInfo,
        code: `TST${String(i).padStart(2, '0')}`,
        createdAt: baseCreatedAt + i * 75,
        avatar: String(randint(4)),
        realityId: rid,
        realityName: reality.name,
        disconnected: false
    });
}

const backup = {
    counter: {
        primary: 5000,
        tertiary: 0,
        tertiaryMax: 0,
        secondaryHeroes: 0,
        secondaryPlan: 0
    },
    registerTables
};

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(backup, null, 2), 'utf8');
console.log('Backup generado en:', outFile);
