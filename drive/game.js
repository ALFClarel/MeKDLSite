
'use strict';


// ─────────────────────────────────────────────────
//  RENDERER
// ─────────────────────────────────────────────────
const canvas   = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });

// ── Qualité adaptative : mobile / GPU faible ──
// Détecte les appareils avec GPU limité et réduit le rendu automatiquement.
const IS_LOW_PERF = /Mobi|Android/i.test(navigator.userAgent) || (window.devicePixelRatio > 1 && window.innerWidth < 1000);
renderer.setPixelRatio(IS_LOW_PERF ? Math.min(devicePixelRatio, 0.75) : Math.min(devicePixelRatio, 1.0));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.60;
renderer.outputEncoding      = THREE.sRGBEncoding;
renderer.shadowMap.enabled   = false; // ombres désactivées → gros gain GPU

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});


// ─────────────────────────────────────────────────
//  SCÈNE / CAMÉRA / BROUILLARD
// ─────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020309);
scene.fog = new THREE.FogExp2(0x030511, 0.0048);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 300);
camera.position.set(0, 5, -90);


// ─────────────────────────────────────────────────
//  ÉCLAIRAGE
// ─────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x05070f, 2.5));
scene.add(new THREE.HemisphereLight(0x12183a, 0x060210, 0.80));
const moon = new THREE.DirectionalLight(0x2035a0, 0.18);
moon.position.set(60, 140, 40);
scene.add(moon);


// ─────────────────────────────────────────────────
//  CONSTANTES MONDE
// ─────────────────────────────────────────────────
const ROAD_W  = 10;
const WORLD_H = 144;

const NS_X     = [-120, -60, 0, 60, 120];
const EW_Z     = [-120, -60, 0, 60, 120];
const BLOCK_CX = [-90, -30, 30, 90];
const BLOCK_CZ = [-90, -30, 30, 90];

const buildingAABBs = [];
const buildingMap   = [];
const propAABBs     = []; // [COL] obstacles statiques : arbres, voitures garées, lampadaires

// ── Grille spatiale broadphase pour propAABBs ──
// Divise le monde en cellules PGRID_CELL×PGRID_CELL.
// updateCar ne teste que les ~9 cellules autour de la voiture → ~15–40 checks / frame au lieu de ~700.
const PGRID_CELL = 14;               // taille de cellule en mètres
const PGRID_OFF  = WORLD_H;         // décalage pour indexer les coordonnées négatives
const propGrid   = new Map();        // clé numérique → AABB[]
const _nearBuf   = [];               // buffer réutilisé : zéro alloc par frame

function _pgKey(cx, cz) { return (cx + 32) * 64 + (cz + 32); } // clé entière unique

function _buildPropGrid() {
  propGrid.clear();
  for (let i = 0; i < propAABBs.length; i++) {
    const b  = propAABBs[i];
    const x0 = Math.floor((b.mnX + PGRID_OFF) / PGRID_CELL);
    const x1 = Math.floor((b.mxX + PGRID_OFF) / PGRID_CELL);
    const z0 = Math.floor((b.mnZ + PGRID_OFF) / PGRID_CELL);
    const z1 = Math.floor((b.mxZ + PGRID_OFF) / PGRID_CELL);
    for (let cx = x0; cx <= x1; cx++)
      for (let cz = z0; cz <= z1; cz++) {
        const k = _pgKey(cx, cz);
        if (!propGrid.has(k)) propGrid.set(k, []);
        propGrid.get(k).push(b);
      }
  }
}

function _getNearProps(x, z) {
  _nearBuf.length = 0;
  const cx = Math.floor((x + PGRID_OFF) / PGRID_CELL);
  const cz = Math.floor((z + PGRID_OFF) / PGRID_CELL);
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const cell = propGrid.get(_pgKey(cx + dx, cz + dz));
      if (cell) for (let i = 0; i < cell.length; i++) _nearBuf.push(cell[i]);
    }
  return _nearBuf;
}


// ─────────────────────────────────────────────────
//  PSEUDO-RANDOM SEEDED
// ─────────────────────────────────────────────────
let _seed = 0xDEADBEEF;
function rnd()         { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 0xFFFFFFFF; }
function rndRange(a,b) { return a + rnd() * (b - a); }
function rndInt(a,b)   { return a + Math.floor(rnd() * (b - a + 1)); }


// ─────────────────────────────────────────────────
//  SEGMENTS ENTRE INTERSECTIONS (pour bordures et marquages)
// ─────────────────────────────────────────────────
function getAxisSegments(crossPositions, halfRoad, worldLimit) {
  const breaks = [-worldLimit, ...crossPositions, worldLimit];
  const segs   = [];
  for (let i = 0; i < breaks.length - 1; i++) {
    const from = (i === 0)                 ? breaks[i]     : breaks[i]     + halfRoad;
    const to   = (i === breaks.length - 2) ? breaks[i + 1] : breaks[i + 1] - halfRoad;
    if (to > from + 0.5) segs.push([from, to]);
  }
  return segs;
}

// ── Constantes dérivées partagées (remplace const HALF/zSegs/xSegs local dans chaque fonction) ──
const HALF_ROAD = ROAD_W / 2;
const Z_SEGS    = getAxisSegments(EW_Z, HALF_ROAD, WORLD_H);
const X_SEGS    = getAxisSegments(NS_X, HALF_ROAD, WORLD_H);


// ─────────────────────────────────────────────────
//  [VIS-1] TEXTURES FENÊTRES — 3 types architecturaux
//
//  Type 0-1 : Tour verre (rideau de façade bleuté, grille serrée uniforme)
//  Type 2-3 : Béton résidentiel (ambre chaud, étages sombres aléatoires, bandes de dalles)
//  Type 4-5 : Mixte / commercial (contraste, quelques étages très lumineux, façade variée)
// ─────────────────────────────────────────────────
const winTexPool = [];

function buildWindowTextures() {
  const CW = 256, CH = 512;

  // ── Type 0 & 1 : Tour de verre (rideau de façade) ──
  for (let v = 0; v < 2; v++) {
    const cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    const ctx = cv.getContext('2d');

    // Fond aluminium foncé / teinte verre nuit
    const grad = ctx.createLinearGradient(0, 0, CW, CH);
    grad.addColorStop(0, v === 0 ? '#07090f' : '#060810');
    grad.addColorStop(1, v === 0 ? '#050609' : '#040509');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH);

    const cols = 9 + v * 2, rows = 22 + v * 4;
    const cw = CW / cols, ch = CH / rows;
    const px = Math.max(1, cw * 0.10), py = Math.max(1, ch * 0.12);

    // Reflets de mullion
    for (let c = 0; c <= cols; c++) {
      ctx.fillStyle = 'rgba(160,200,255,0.04)';
      ctx.fillRect(Math.floor(c * cw), 0, 1, CH);
    }
    for (let r = 0; r <= rows; r++) {
      ctx.fillStyle = 'rgba(160,200,255,0.06)';
      ctx.fillRect(0, Math.floor(r * ch), CW, 1);
    }

    // Panneaux de verre : majorité allumés, avec zones sombres d'un coup (étage technique)
    const techFloors = new Set();
    while (techFloors.size < Math.floor(rows * 0.06)) techFloors.add(rndInt(0, rows - 1));
    const litColors = v === 0
      ? ['#c8dcff','#d0e4ff','#a8c4f0','#b8d0ff','#ddeeff']
      : ['#a0b8e8','#8aaad8','#b4cce8','#c0d4f0','#98b4e0'];

    for (let r = 0; r < rows; r++) {
      const floorDark = techFloors.has(r);
      for (let c = 0; c < cols; c++) {
        const lit = floorDark ? false : rnd() < 0.70;
        const wx = c * cw + px, wy = r * ch + py;
        const ww = cw - px * 2, wh = ch - py * 2;
        if (!lit) {
          ctx.fillStyle = rnd() > 0.5 ? '#080c18' : '#060810';
          ctx.fillRect(wx, wy, ww, wh);
        } else {
          const col = litColors[Math.floor(rnd() * litColors.length)];
          const gr = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
          gr.addColorStop(0, col); gr.addColorStop(1, shadeColor(col, -0.25));
          ctx.fillStyle = gr; ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(wx, wy, ww, Math.max(1, wh * 0.18));
        }
      }
    }
    winTexPool.push(new THREE.CanvasTexture(cv));
  }

  // ── Type 2 & 3 : Immeuble en béton / résidentiel ──
  for (let v = 0; v < 2; v++) {
    const cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    const ctx = cv.getContext('2d');

    // Béton sombre avec légère texture granulaire
    ctx.fillStyle = v === 0 ? '#080709' : '#07080a';
    ctx.fillRect(0, 0, CW, CH);
    // Bandes de dalles (structure horizontale)
    const rows = 16 + v * 3, cols = 6 + v * 2;
    const cw = CW / cols, ch = CH / rows;

    // Bandes structurelles
    for (let r = 0; r <= rows; r++) {
      const y = Math.floor(r * ch);
      ctx.fillStyle = r % 4 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, y, CW, r % 4 === 0 ? 3 : 1);
    }

    // Colonnes de refends
    for (let c = 0; c <= cols; c++) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(Math.floor(c * cw), 0, 2, CH);
    }

    // Étages complètement sombres (appartements vides / gens endormis)
    const darkFloors = new Set();
    while (darkFloors.size < Math.floor(rows * 0.25)) darkFloors.add(rndInt(0, rows - 1));

    const litWarm = v === 0
      ? ['#ffd860','#ffe890','#ffca50','#fff0a0']
      : ['#ffcc50','#ffdc80','#ffe0a0','#ffd070'];

    const px = Math.max(2, cw * 0.18), py = Math.max(2, ch * 0.22);
    for (let r = 0; r < rows; r++) {
      if (darkFloors.has(r)) continue; // étage complètement éteint
      for (let c = 0; c < cols; c++) {
        // Fenêtres par paires (deux battants)
        const lit = rnd() < 0.50;
        const wx = c * cw + px, wy = r * ch + py;
        const ww = cw - px * 2, wh = ch - py * 2;
        if (!lit) {
          ctx.fillStyle = '#060608';
          ctx.fillRect(wx, wy, ww, wh);
        } else {
          const col = litWarm[Math.floor(rnd() * litWarm.length)];
          const gr = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          gr.addColorStop(0, col); gr.addColorStop(1, shadeColor(col, -0.40));
          ctx.fillStyle = gr; ctx.fillRect(wx, wy, ww, wh);
          // Séparation fenêtre (montant central)
          if (ww > 6) {
            ctx.fillStyle = shadeColor(col, -0.60);
            ctx.fillRect(wx + Math.floor(ww * 0.48), wy, Math.max(1, Math.floor(ww * 0.06)), wh);
          }
          ctx.fillStyle = 'rgba(255,220,140,0.10)';
          ctx.fillRect(wx, wy, ww, Math.max(1, wh * 0.15));
        }
      }
    }
    winTexPool.push(new THREE.CanvasTexture(cv));
  }

  // ── Type 4 & 5 : Mixte / commercial / hôtel ──
  for (let v = 0; v < 2; v++) {
    const cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = v === 0 ? '#070808' : '#08070a';
    ctx.fillRect(0, 0, CW, CH);

    const rows = 18 + v * 2, cols = 8;
    const cw = CW / cols, ch = CH / rows;
    // Dalles
    for (let r = 0; r <= rows; r++) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, Math.floor(r * ch), CW, 2);
    }

    const brightZones = new Set();
    // Zones très lumineuses (étages hôtel allumés, lobby, restaurant)
    while (brightZones.size < Math.floor(rows * 0.10)) brightZones.add(rndInt(0, rows - 1));
    const darkFloors = new Set();
    while (darkFloors.size < Math.floor(rows * 0.15)) {
      const f = rndInt(0, rows - 1);
      if (!brightZones.has(f)) darkFloors.add(f);
    }

    const mixPal = v === 0
      ? [['#ffe8a0','#c8e0ff','#ffd060'], ['#66ffee','#ff66aa']]
      : [['#ffd890','#b8d8ff','#ffe060'], ['#ff8899','#aaccff']];

    const px = Math.max(2, cw * 0.15), py = Math.max(2, ch * 0.20);
    for (let r = 0; r < rows; r++) {
      if (darkFloors.has(r)) continue;
      const isBright = brightZones.has(r);
      for (let c = 0; c < cols; c++) {
        const litChance = isBright ? 0.90 : 0.48;
        const lit = rnd() < litChance;
        const wx = c * cw + px, wy = r * ch + py;
        const ww = cw - px * 2, wh = ch - py * 2;
        if (!lit) {
          ctx.fillStyle = '#050507';
          ctx.fillRect(wx, wy, ww, wh);
        } else {
          const palGroup = rnd() < 0.75 ? mixPal[0] : mixPal[1];
          const col = palGroup[Math.floor(rnd() * palGroup.length)];
          const brightness = isBright ? 1.15 : 1.0;
          ctx.fillStyle = isBright ? shadeColor(col, 0.20) : col;
          const gr = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          gr.addColorStop(0, isBright ? shadeColor(col, 0.15) : col);
          gr.addColorStop(1, shadeColor(col, -0.38));
          ctx.fillStyle = gr; ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = `rgba(255,255,255,${isBright ? 0.18 : 0.08})`;
          ctx.fillRect(wx, wy, ww, Math.max(1, wh * 0.15));
        }
      }
    }
    winTexPool.push(new THREE.CanvasTexture(cv));
  }
}

function shadeColor(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) * (1 + factor)));
  const g = Math.max(0, Math.min(255, ((n >>  8) & 0xff) * (1 + factor)));
  const b = Math.max(0, Math.min(255, ((n >>  0) & 0xff) * (1 + factor)));
  return '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}


// ─────────────────────────────────────────────────
//  MATÉRIAUX FAÇADE PARTAGÉS (1 par texture de fenêtres)
// ─────────────────────────────────────────────────
const facadeMaterials = [];
const glassMatIndices = [0, 1];       // indices des tours verre (emissive plus forte)
const concreteMat     = [2, 3, 4, 5]; // indices des résidentiels / mixtes

function buildFacadeMaterials() {
  winTexPool.forEach((tex, i) => {
    const isGlass = i < 2;
    facadeMaterials.push(new THREE.MeshStandardMaterial({
      color:             isGlass ? 0x0e1018 : 0x141418,
      roughness:         isGlass ? 0.60 : 0.88,
      metalness:         isGlass ? 0.18 : 0.04,
      emissiveMap:       tex,
      emissive:          isGlass
        ? new THREE.Color(0.80, 0.90, 1.00)  // teinte bleue pour verre
        : new THREE.Color(0.95, 0.88, 0.72), // teinte ambre pour béton
      emissiveIntensity: isGlass ? 0.72 : 0.82,
    }));
  });
}


// ─────────────────────────────────────────────────
//  ÉTOILES
// ─────────────────────────────────────────────────
function buildStars() {
  const verts = [];
  for (let i = 0; i < 2400; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 230 + Math.random() * 50;
    const y     = Math.abs(Math.cos(phi)) * r * 0.55 + 18;
    verts.push(Math.sin(phi)*Math.cos(theta)*r, y, Math.sin(phi)*Math.sin(theta)*r);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.40, sizeAttenuation: true, transparent: true, opacity: 0.72,
  })));
}


// ─────────────────────────────────────────────────
//  PASSAGES PIÉTONS
// ─────────────────────────────────────────────────
function buildCrosswalks() {
  const mat  = new THREE.MeshStandardMaterial({ color: 0x6a6a66, roughness: 0.78, metalness: 0.01 });
  const SW   = 0.68, NSTRIPES = 5, GAP = 1.52, SL = ROAD_W * 0.84;
  const _d   = new THREE.Object3D();
  const pts  = [];
  for (const rx of NS_X) for (const rz of EW_Z) {
    for (let si = 0; si < NSTRIPES; si++) {
      const off = (si - (NSTRIPES - 1) / 2) * GAP;
      pts.push({ x: rx + off, z: rz + HALF_ROAD + SL/2 + 0.9, ry: 0 });
      pts.push({ x: rx + off, z: rz - HALF_ROAD - SL/2 - 0.9, ry: 0 });
      pts.push({ x: rx + HALF_ROAD + SL/2 + 0.9, z: rz + off, ry: Math.PI/2 });
      pts.push({ x: rx - HALF_ROAD - SL/2 - 0.9, z: rz + off, ry: Math.PI/2 });
    }
  }
  const geo = new THREE.PlaneGeometry(SW, SL); geo.rotateX(-Math.PI / 2);
  const im  = new THREE.InstancedMesh(geo, mat, pts.length);
  pts.forEach(({ x, z, ry }, i) => {
    _d.position.set(x, 0.018, z); _d.rotation.y = ry; _d.updateMatrix();
    im.setMatrixAt(i, _d.matrix);
  });
  im.instanceMatrix.needsUpdate = true; scene.add(im);
}


// ─────────────────────────────────────────────────
//  ARBRES URBAINS
// ─────────────────────────────────────────────────
function buildTrees() {
  const tMat  = new THREE.MeshStandardMaterial({ color: 0x241206, roughness: 0.96 });
  // [VIS] Légère teinte émissive humide sur le feuillage (ambiance nocturne urbaine)
  const lMats = [0x0d2206, 0x0f2a08, 0x0b1c05].map(c =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.88,
      emissive: new THREE.Color(0x020904), emissiveIntensity: 0.30 }));
  function placeTree(x, z) {
    const h = 3.8 + rnd()*2.5, r = 1.1 + rnd()*0.9;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, h*0.50, 5), tMat);
    trunk.position.set(x, h*0.25, z); scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), lMats[rndInt(0,2)]);
    leaves.position.set(x, h*0.70, z); leaves.scale.y = 0.80+rnd()*0.30; scene.add(leaves);
    // [COL-FIX] Hitbox tronc resserrée sur le mesh réel.
    // Tronc maxR=0.18 → AABB ±0.22 (était ±0.40, bloquait ~40cm dans le vide).
    // Le feuillage n'est PAS collidable (sphère haute → jamais touchée à hauteur voiture).
    propAABBs.push({ mnX: x - 0.22, mxX: x + 0.22, mnZ: z - 0.22, mxZ: z + 0.22 });
  }
  for (const rx of NS_X) {
    for (let z = -WORLD_H+10; z < WORLD_H-10; z += 15+rnd()*12) {
      if (EW_Z.some(rz => Math.abs(z - rz) < HALF_ROAD + 5)) continue;
      placeTree(rx + (HALF_ROAD + 3.4), z + rnd()*4 - 2);
      placeTree(rx - (HALF_ROAD + 3.4), z + rnd()*4 - 2);
    }
  }
  for (const rz of EW_Z) {
    for (let x = -WORLD_H+10; x < WORLD_H-10; x += 15+rnd()*12) {
      if (NS_X.some(rx => Math.abs(x - rx) < HALF_ROAD + 5)) continue;
      placeTree(x + rnd()*4 - 2, rz + (HALF_ROAD + 3.4));
      placeTree(x + rnd()*4 - 2, rz - (HALF_ROAD + 3.4));
    }
  }
}


// ─────────────────────────────────────────────────
//  SON MOTEUR — Web Audio API
// ─────────────────────────────────────────────────
function initSound() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const SR = audioCtx.sampleRate, BL = SR * 2;
    const buf = audioCtx.createBuffer(1, BL, SR);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < BL; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.loop = true; src.start();
    engFilter = audioCtx.createBiquadFilter();
    engFilter.type = 'bandpass'; engFilter.frequency.value = 100; engFilter.Q.value = 1.1;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 440;
    engGain = audioCtx.createGain(); engGain.gain.value = 0;
    src.connect(engFilter); engFilter.connect(lp); lp.connect(engGain);
    engGain.connect(audioCtx.destination);
  } catch(e) { console.warn('Audio unavailable:', e); }
}

function updateSound() {
  if (!audioCtx || !engFilter || !engGain) return;
  const spd = Math.abs(car.speed) / car.MAX_SPD;
  const acc  = key('KeyW','ArrowUp') || touchKeys.up;
  engFilter.frequency.setTargetAtTime(acc ? 90+spd*380 : 65+spd*190, audioCtx.currentTime, 0.09);
  engGain.gain.setTargetAtTime(gameRunning ? Math.min(0.22, 0.03+spd*0.19) : 0, audioCtx.currentTime, 0.14);
}


// ─────────────────────────────────────────────────
//  VOITURES GARÉES — matériaux partagés (1 alloc / mat au lieu de 1 / voiture)
// ─────────────────────────────────────────────────
const _pcD  = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.88 });
const _pcGl = new THREE.MeshStandardMaterial({ color: 0x060e18, roughness: 0.22, metalness: 0.04 });
const _pcTl = new THREE.MeshStandardMaterial({ color: 0xcc0a00, emissive: new THREE.Color(0x880000), emissiveIntensity: 1.0, roughness: 0.14 });
const _pcTr = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.95 });

function placeParkedCar(x, z, angleY, color) {
  const G = new THREE.Group();
  // [VIS] Carrosserie plus métallique (laquée nuit urbaine)
  const mB = new THREE.MeshStandardMaterial({ color, roughness: 0.26, metalness: 0.38 });
  const mD = _pcD;
  const mGl= _pcGl;
  const mTl= _pcTl;
  const mTr= _pcTr;

  function pb(mat, sx, sy, sz, px, py, pz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(px, py, pz); G.add(m);
  }
  pb(mB,  1.70, 0.44, 4.10,  0, 0.42, 0.00);  // caisse
  pb(mB,  1.56, 0.34, 1.86,  0, 0.78,-0.10);  // toit cabine
  pb(mGl, 1.42, 0.28, 0.06,  0, 0.77, 0.70);  // pare-brise
  pb(mGl, 1.42, 0.24, 0.06,  0, 0.76,-0.94);  // lunette
  pb(mGl, 0.04, 0.24, 1.60,  0.78, 0.76,-0.10); // vitre G
  pb(mGl, 0.04, 0.24, 1.60, -0.78, 0.76,-0.10); // vitre D
  pb(mTl, 0.28, 0.12, 0.06,  0.60, 0.50,-2.06); // feu AR G
  pb(mTl, 0.28, 0.12, 0.06, -0.60, 0.50,-2.06); // feu AR D
  pb(mD,  0.32, 0.14, 0.06,  0.58, 0.48, 2.08); // phare AV G
  pb(mD,  0.32, 0.14, 0.06, -0.58, 0.48, 2.08); // phare AV D
  pb(mD,  1.60, 0.10, 0.22,  0, 0.11,  2.14);   // pare-choc AV
  pb(mD,  1.58, 0.10, 0.22,  0, 0.11, -2.14);   // pare-choc AR

  const tirGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.21, 13);
  for (const [wx, wz] of [[0.88, 1.42],[0.88,-1.42],[-0.88, 1.42],[-0.88,-1.42]]) {
    const wh = new THREE.Mesh(tirGeo, mTr);
    wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.24, wz); G.add(wh);
  }

  G.position.set(x, 0, z); G.rotation.y = angleY; scene.add(G);
  // [COL-FIX] Hitbox voiture garée recalée sur le mesh :
  // Caisse : half-width=0.87 (1.74/2), half-length=2.05 (4.10/2)
  // Était _hbX=0.90, _hbZ=2.08 → légèrement réduit pour coller au visuel.
  // L'AABB projetée est correcte pour les voitures à 0° et 90°.
  const _hbX = 0.87, _hbZ = 2.05;
  const _ca = Math.abs(Math.cos(angleY)), _sa = Math.abs(Math.sin(angleY));
  propAABBs.push({
    mnX: x - (_ca * _hbX + _sa * _hbZ), mxX: x + (_ca * _hbX + _sa * _hbZ),
    mnZ: z - (_sa * _hbX + _ca * _hbZ), mxZ: z + (_sa * _hbX + _ca * _hbZ),
  });
}

function buildParkedCars() {
  const colors = [
    // Neutres urbains classiques
    0x1a2236, 0x252520, 0x2a1515, 0x161528, 0x1b2214,
    0x1e1e18, 0x181818, 0x0f1a10, 0x201520,
    // Teintes sobres mais variées
    0x0e2840, // bleu ardoise profond
    0x1c3220, // vert forêt nocturne
    0x2e1010, // bordeaux sang de bœuf
    0x0a1c2e, // bleu marine
    0x241e0c, // kaki doré
    0x16082a, // violet nuit
    0x281808, // brun rouille urbain
    0x0e1e16, // vert sauge sombre
    0x1e2428, // gris acier bleuté
    0x2c1a0c, // orange brûlé nuit
    0x0c1808, // vert olive profond
    0x282030, // lilas fumé
  ];
  const zSegs = Z_SEGS, xSegs = X_SEGS;

  for (const rx of NS_X) {
    for (const [z0, z1] of zSegs) {
      for (let z = z0 + 5; z + 5.5 < z1; z += 5.6 + rnd() * 3.4) {
        if (rnd() > 0.62) continue;
        const side = rnd() > 0.5 ? 1 : -1;
        placeParkedCar(rx + side * (HALF_ROAD + 2.2), z + rnd() * 1.5, Math.PI / 2, colors[rndInt(0, colors.length-1)]);
      }
    }
  }
  for (const rz of EW_Z) {
    for (const [x0, x1] of xSegs) {
      for (let x = x0 + 5; x + 5.5 < x1; x += 5.6 + rnd() * 3.4) {
        if (rnd() > 0.62) continue;
        const side = rnd() > 0.5 ? 1 : -1;
        placeParkedCar(x + rnd() * 1.5, rz + side * (HALF_ROAD + 2.2), 0, colors[rndInt(0, colors.length-1)]);
      }
    }
  }
}


// ─────────────────────────────────────────────────
//  FEUX TRICOLORES
// ─────────────────────────────────────────────────
function buildTrafficLights() {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x191920, roughness: 0.55, metalness: 0.60 });
  const housMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.88 });
  for (const rx of NS_X) for (const rz of EW_Z) {
    for (const [ox, oz] of [[1,1],[-1,-1]]) {
      const px = rx + ox * (HALF_ROAD + 1.2);
      const pz = rz + oz * (HALF_ROAD + 1.2);
      const G  = new THREE.Group();

      // Poteau
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.10, 5.8, 6), poleMat);
      pole.position.set(0, 2.9, 0); G.add(pole);
      // Boîtier
      const hou = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.92, 0.32), housMat);
      hou.position.set(0, 5.74, 0); G.add(hou);

      // Lentilles
      const makeLight = (col, emCol, y) => {
        const mat = new THREE.MeshStandardMaterial({
          color: col, emissive: new THREE.Color(emCol), emissiveIntensity: 0.22, roughness: 0.18,
        });
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.092, 8, 8), mat);
        m.position.set(0, y, 0.15); G.add(m);
        return mat;
      };
      const mR = makeLight(0x440000, 0x220000, 6.02);
      const mY = makeLight(0x442200, 0x221100, 5.74);
      const mG = makeLight(0x004400, 0x002200, 5.46);
      G.position.set(px, 0, pz); scene.add(G);

      // Phase décalée par intersection pour variété
      const phaseOff = (Math.abs(rx) + Math.abs(rz)) * 0.07 + (ox > 0 ? 0 : 4.5);
      trafficLights.push({ mR, mY, mG, phase: 'red', timer: phaseOff % 10, prevPhase: null });
    }
  }
}

function updateTrafficLights(dt) {
  for (const tl of trafficLights) {
    tl.timer -= dt;
    if (tl.timer <= 0) {
      if      (tl.phase === 'red')    { tl.phase = 'green';  tl.timer = 5.5 + Math.random() * 2; }
      else if (tl.phase === 'green')  { tl.phase = 'yellow'; tl.timer = 1.1; }
      else                            { tl.phase = 'red';    tl.timer = 5.0 + Math.random() * 2; }
    }
    if (tl.phase === tl.prevPhase) continue; // matériaux déjà à jour
    tl.prevPhase = tl.phase;
    const R = tl.phase === 'red', Y = tl.phase === 'yellow', G = tl.phase === 'green';
    tl.mR.color.setHex(R ? 0xff2200 : 0x1a0000); tl.mR.emissive.setHex(R ? 0xff0000 : 0x110000); tl.mR.emissiveIntensity = R ? 4.2 : 0.10;
    tl.mY.color.setHex(Y ? 0xffaa00 : 0x1a0800); tl.mY.emissive.setHex(Y ? 0xffa500 : 0x110500); tl.mY.emissiveIntensity = Y ? 3.8 : 0.10;
    tl.mG.color.setHex(G ? 0x00ee44 : 0x001a0a); tl.mG.emissive.setHex(G ? 0x00ff44 : 0x001108); tl.mG.emissiveIntensity = G ? 4.0 : 0.10;
  }
}


// ─────────────────────────────────────────────────
//  PARTICULES ÉCHAPPEMENT
// ─────────────────────────────────────────────────
function initExhaust() {
  for (let i = 0; i < EXHAUST_N; i++) {
    exhaustData.push({ pos: new THREE.Vector3(9999,9999,9999), vel: new THREE.Vector3(), life: 0, maxLife: 1 });
    exhaustPos[i*3] = 9999; exhaustPos[i*3+1] = 9999; exhaustPos[i*3+2] = 9999;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(exhaustPos, 3));
  exhaustMesh = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xaaaaaa, size: 0.26, sizeAttenuation: true, transparent: true, opacity: 0.36, depthWrite: false,
  }));
  scene.add(exhaustMesh);
}

let exhaustEmitIdx = 0;
function spawnExhaustParticle() {
  const p = exhaustData[exhaustEmitIdx % EXHAUST_N];
  exhaustEmitIdx++;
  const ex = -Math.sin(car.angle) * 0.33;
  const ez = -Math.cos(car.angle) * 0.33;
  p.pos.set(car.pos.x + ex - Math.sin(car.angle)*2.27, 0.13, car.pos.z + ez - Math.cos(car.angle)*2.27);
  const bx2 = -Math.sin(car.angle), bz2 = -Math.cos(car.angle);
  const spd = Math.abs(car.speed) * 0.35;
  p.vel.set(bx2*spd+(Math.random()-.5)*0.14, 0.28+Math.random()*0.26, bz2*spd+(Math.random()-.5)*0.14);
  p.maxLife = 0.55 + Math.random() * 0.65;
  p.life = p.maxLife;
}

function updateExhaust(dt) {
  if (!exhaustMesh) return;
  const accel = key('KeyW','ArrowUp') || touchKeys.up;
  if (accel && car.speed > 1.0 && Math.random() < 0.55) spawnExhaustParticle();
  if (Math.random() < 0.06 && car.speed > 0.2) spawnExhaustParticle(); // idle wisp

  for (let i = 0; i < EXHAUST_N; i++) {
    const p = exhaustData[i];
    if (p.life > 0) {
      p.life -= dt;
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y += 0.10 * dt;
      exhaustPos[i*3]   = p.pos.x;
      exhaustPos[i*3+1] = p.pos.y;
      exhaustPos[i*3+2] = p.pos.z;
    } else {
      exhaustPos[i*3] = exhaustPos[i*3+1] = exhaustPos[i*3+2] = 9999;
    }
  }
  exhaustMesh.geometry.attributes.position.needsUpdate = true;
}


// ─────────────────────────────────────────────────
//  MARQUES DE DÉRAPAGE
// ─────────────────────────────────────────────────
function initSkidPool() {
  const geo = new THREE.PlaneGeometry(0.96, 0.18); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x040406, roughness: 0.98, transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < SKID_MAX; i++) {
    const m = new THREE.Mesh(geo, mat.clone());
    m.position.y = 0.022; m.visible = false;
    scene.add(m); skidPool.push({ mesh: m, life: 0, mat: m.material });
  }
}

let skidEmitAcc = 0;
function updateSkids(dt) {
  const handbrake = key('Space');
  // Emit marks when handbraking or hard cornering fast
  if ((handbrake || (Math.abs(car.steer) > 0.35 && Math.abs(car.speed) > 8)) && Math.abs(car.speed) > 2) {
    skidEmitAcc += dt;
    if (skidEmitAcc > 0.06) {
      skidEmitAcc = 0;
      const s = skidPool[skidIdx % SKID_MAX]; skidIdx++;
      s.mesh.position.set(car.pos.x, 0.022, car.pos.z);
      s.mesh.rotation.y = car.angle; s.mesh.visible = true;
      s.life = 18; s.mat.opacity = 0.52;
    }
  } else { skidEmitAcc = 0; }

  for (const s of skidPool) {
    if (!s.mesh.visible) continue;
    s.life -= dt;
    if (s.life < 3) s.mat.opacity = Math.max(0, s.life / 3 * 0.52);
    if (s.life <= 0) { s.mesh.visible = false; s.mat.opacity = 0.52; }
  }
}


// ─────────────────────────────────────────────────
//  JAUGE VITESSE CANVAS
// ─────────────────────────────────────────────────
const gaugeCanvas = document.getElementById('speed-gauge');
const gaugeCtx    = gaugeCanvas.getContext('2d');
let _lastKmh = -1, _lastGear = '';

function drawSpeedGauge() {
  const kmh  = Math.round(Math.abs(car.speed) * 3.6);
  const gear = car.speed >= -0.05 ? 'D' : 'R';
  if (kmh === _lastKmh && gear === _lastGear) return;
  _lastKmh = kmh; _lastGear = gear;
  const W = 172, H = 172, cx = W / 2, cy = H / 2 - 2;
  const R = 74;
  const ANG0 = Math.PI * 0.78, ANG1 = Math.PI * 2.22;
  const frac = Math.min(kmh / 200, 1);

  gaugeCtx.clearRect(0, 0, W, H);

  // Fond circular
  gaugeCtx.beginPath(); gaugeCtx.arc(cx, cy, R, 0, Math.PI * 2);
  gaugeCtx.fillStyle = 'rgba(6,7,10,0.90)'; gaugeCtx.fill();
  gaugeCtx.strokeStyle = 'rgba(183,201,168,0.09)'; gaugeCtx.lineWidth = 1.4; gaugeCtx.stroke();

  // Track gris
  gaugeCtx.beginPath(); gaugeCtx.arc(cx, cy, R - 9, ANG0, ANG1);
  gaugeCtx.strokeStyle = 'rgba(50,55,42,0.72)'; gaugeCtx.lineWidth = 6; gaugeCtx.lineCap = 'round'; gaugeCtx.stroke();

  // Arc couleur (gradient vert→orange→rouge)
  if (frac > 0.003) {
    const arcEnd = ANG0 + (ANG1 - ANG0) * frac;
    const grad = gaugeCtx.createLinearGradient(cx - R, cy, cx + R, cy);
    grad.addColorStop(0.0,  '#b7c9a8');
    grad.addColorStop(0.55, '#e89a00');
    grad.addColorStop(1.0,  '#CC0018');
    gaugeCtx.beginPath(); gaugeCtx.arc(cx, cy, R - 9, ANG0, arcEnd);
    gaugeCtx.strokeStyle = grad; gaugeCtx.lineWidth = 6; gaugeCtx.lineCap = 'round'; gaugeCtx.stroke();
  }

  // Ticks & labels
  const STEPS = 8;
  for (let i = 0; i <= STEPS; i++) {
    const a = ANG0 + (ANG1 - ANG0) * i / STEPS;
    const major = i % 2 === 0;
    const r0 = R - 15, r1 = major ? R - 24 : R - 19;
    gaugeCtx.beginPath();
    gaugeCtx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    gaugeCtx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    gaugeCtx.strokeStyle = major ? 'rgba(183,201,168,0.52)' : 'rgba(183,201,168,0.24)';
    gaugeCtx.lineWidth = major ? 1.6 : 1.0; gaugeCtx.lineCap = 'butt'; gaugeCtx.stroke();
    if (major) {
      const lr = R - 30;
      gaugeCtx.fillStyle = 'rgba(183,201,168,0.38)';
      gaugeCtx.font = '600 8.5px Figtree, system-ui'; gaugeCtx.textAlign = 'center'; gaugeCtx.textBaseline = 'middle';
      gaugeCtx.fillText((i * 25).toString(), cx + Math.cos(a) * lr, cy + Math.sin(a) * lr);
    }
  }

  // Aiguille
  const needleA = ANG0 + (ANG1 - ANG0) * frac;
  gaugeCtx.save(); gaugeCtx.translate(cx, cy); gaugeCtx.rotate(needleA);
  // Ombre aiguille
  gaugeCtx.beginPath(); gaugeCtx.moveTo(-4, 0); gaugeCtx.lineTo(R - 18, 0);
  gaugeCtx.strokeStyle = 'rgba(0,0,0,0.5)'; gaugeCtx.lineWidth = 3.5; gaugeCtx.lineCap = 'round';
  gaugeCtx.shadowColor = 'rgba(0,0,0,0.8)'; gaugeCtx.shadowBlur = 4; gaugeCtx.stroke();
  gaugeCtx.shadowBlur = 0;
  // Aiguille rouge
  gaugeCtx.beginPath(); gaugeCtx.moveTo(-5, 0); gaugeCtx.lineTo(R - 18, 0);
  gaugeCtx.strokeStyle = '#CC0018'; gaugeCtx.lineWidth = 2.2; gaugeCtx.stroke();
  gaugeCtx.restore();

  // Centre pivot
  gaugeCtx.beginPath(); gaugeCtx.arc(cx, cy, 5.5, 0, Math.PI * 2);
  gaugeCtx.fillStyle = '#CC0018'; gaugeCtx.fill();
  gaugeCtx.beginPath(); gaugeCtx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  gaugeCtx.fillStyle = '#f4f1eb'; gaugeCtx.fill();

  // Vitesse (km/h)
  gaugeCtx.fillStyle = '#f4f1eb';
  gaugeCtx.font = '300 36px Fraunces, Georgia, serif';
  gaugeCtx.textAlign = 'center'; gaugeCtx.textBaseline = 'middle';
  gaugeCtx.fillText(kmh.toString(), cx, cy + 20);

  // KM/H
  gaugeCtx.fillStyle = 'rgba(183,201,168,0.50)';
  gaugeCtx.font = '600 8px Figtree, system-ui';
  gaugeCtx.fillText('KM/H', cx, cy + 36);

  // Gear
  gaugeCtx.fillStyle = gear === 'R' ? '#CC0018' : 'rgba(183,201,168,0.32)';
  gaugeCtx.font = '300 15px Fraunces, Georgia, serif';
  gaugeCtx.fillText(gear, cx, cy - 22);
}


// ─────────────────────────────────────────────────
//  [VIS] TEXTURE ASPHALTE PROCÉDURALE — grain bitume + micro-rugosité
// ─────────────────────────────────────────────────
function makeAsphaltTex() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  // Fond goudron sombre — brun-anthracite (couleur tar humide réaliste)
  ctx.fillStyle = '#0a0b0e';
  ctx.fillRect(0, 0, 256, 256);
  // Granulat agrégat : petits cailloux beige/brun caractéristiques du bitume
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const r = Math.random();
    // Quelques agrégats clairs (quartzite), majorité sombre
    const alpha = r < 0.06 ? 0.18 : r < 0.22 ? 0.08 : 0.03;
    const warm  = r < 0.15; // petite proportion d'agrégats chauds (sable/brun)
    ctx.fillStyle = warm ? `rgba(160,130,90,${alpha})` : `rgba(180,185,200,${alpha})`;
    ctx.fillRect(x | 0, y | 0, 1 + (r < 0.12 ? 1 : 0), 1);
  }
  // Macrotexture : légères stries de compactage (rouleaux)
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * 256;
    ctx.fillStyle = 'rgba(255,245,220,0.012)';
    ctx.fillRect(x | 0, 0, 1, 256);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}


// ─────────────────────────────────────────────────
//  [VIS] TEXTURE DALLE BÉTON TROTTOIR
// ─────────────────────────────────────────────────
function makeSidewalkTex() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#151620';
  ctx.fillRect(0, 0, 128, 128);
  // Joints de dalles 32×32
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(128, i * 32); ctx.stroke();
  }
  // Grain béton fin
  for (let i = 0; i < 1800; i++) {
    const v = Math.random() * 0.028;
    ctx.fillStyle = `rgba(200,210,240,${v})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  return tex;
}


// ─────────────────────────────────────────────────
//  TROTTOIRS — Plans béton entre bordures et bâtiments
// ─────────────────────────────────────────────────
function buildSidewalks() {
  const swTex = makeSidewalkTex();
  const mat   = new THREE.MeshStandardMaterial({
    color: 0x111218, roughness: 0.86, metalness: 0.04,
    map: swTex,
    emissive: new THREE.Color(0x030306), emissiveIntensity: 0.18,
  });
  const SW_W   = 4.8; // largeur trottoir (m)
  const SW_OFF = HALF_ROAD + 0.38 + SW_W * 0.5;
  const zSegs  = Z_SEGS, xSegs = X_SEGS;

  // Pré-compter pour InstancedMesh
  const entries = [];
  for (const rx of NS_X)
    for (const [z0, z1] of zSegs)
      for (const s of [-1, 1])
        entries.push({ x: rx + s * SW_OFF, z: (z0 + z1) * 0.5, sx: SW_W, sz: z1 - z0, ry: 0 });
  for (const rz of EW_Z)
    for (const [x0, x1] of xSegs)
      for (const s of [-1, 1])
        entries.push({ x: (x0 + x1) * 0.5, z: rz + s * SW_OFF, sx: x1 - x0, sz: SW_W, ry: 0 });

  // [PERF] InstancedMesh : 1 draw call pour tous les trottoirs
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const im  = new THREE.InstancedMesh(geo, mat, entries.length);
  const _d  = new THREE.Object3D();
  entries.forEach(({ x, z, sx, sz }, i) => {
    _d.position.set(x, 0.004, z);
    _d.scale.set(sx, 1, sz);
    _d.rotation.set(0, 0, 0);
    _d.updateMatrix();
    im.setMatrixAt(i, _d.matrix);
  });
  im.instanceMatrix.needsUpdate = true;
  scene.add(im);
}


// ─────────────────────────────────────────────────
//  LAMPADAIRES MID-BLOC — Émissif + lumières éparses
//  Routes entre intersections : un poteau côté alterné / 24 m
// ─────────────────────────────────────────────────
function buildMidBlockLamps() {
  const poleMat = _lampPoleMat, lampMat = _lampBulbMat, capMat = _lampCapMat;
  const SPACING = 24; // m entre lampadaires mid-bloc
  const ARM_LEN = 2.8;
  const _d      = new THREE.Object3D();

  const pts = []; // { px, pz, ox } — ox = côté bras (+1/-1 axe X ou Z selon route)

  const zSegs = Z_SEGS, xSegs = X_SEGS;

  // Rues N-S : poteau à rx±(HALF+2), alternance de côté à chaque intervalle
  for (const rx of NS_X) {
    for (const [z0, z1] of zSegs) {
      let flip = 0;
      for (let z = z0 + SPACING * 0.5; z + 4 < z1; z += SPACING) {
        const side = (flip++ % 2 === 0) ? 1 : -1;
        pts.push({ px: rx + side * (HALF_ROAD + 2.0), pz: z, ox: side, NS: true });
      }
    }
  }
  // Rues E-O : poteau à rz±(HALF+2), alternance
  for (const rz of EW_Z) {
    for (const [x0, x1] of xSegs) {
      let flip = 0;
      for (let x = x0 + SPACING * 0.5; x + 4 < x1; x += SPACING) {
        const side = (flip++ % 2 === 0) ? 1 : -1;
        pts.push({ px: x, pz: rz + side * (HALF_ROAD + 2.0), ox: side, NS: false });
      }
    }
  }

  if (!pts.length) return;
  const N = pts.length;

  const poleIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 8.5, 7), poleMat, N);
  const capIM  = new THREE.InstancedMesh(new THREE.BoxGeometry(0.58, 0.18, 0.58), capMat, N);
  const bulbIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.10, 0.46), lampMat, N);

  pts.forEach(({ px, pz, ox, NS }, i) => {
    // Poteau
    _d.position.set(px, 4.25, pz); _d.rotation.set(0, 0, 0); _d.scale.setScalar(1); _d.updateMatrix();
    poleIM.setMatrixAt(i, _d.matrix);
    // Bras + capot : déporté dans la direction du côté de la route
    const lx = NS ? px + ox * ARM_LEN : px;
    const lz = NS ? pz               : pz + ox * ARM_LEN;
    _d.position.set(lx, 8.55, lz); _d.updateMatrix();
    capIM.setMatrixAt(i, _d.matrix);
    _d.position.set(lx, 8.42, lz); _d.updateMatrix();
    bulbIM.setMatrixAt(i, _d.matrix);
  });

  [poleIM, capIM, bulbIM].forEach(im => { im.instanceMatrix.needsUpdate = true; scene.add(im); });

  // [OPT-LUMIÈRES] Collecte de positions au lieu de ~20 PointLights fixes.
  // Ces positions seront gérées par le même pool dynamique que les carrefours.
  pts.filter((_, i) => i % 2 === 0).forEach(({ px, pz, ox, NS }) => {
    const lx = NS ? px + ox * ARM_LEN : px;
    const lz = NS ? pz               : pz + ox * ARM_LEN;
    lampPositions.push({ x: lx, y: 8.0, z: lz, color: 0xffbb70, intensity: 4.5 });
  });

  // [COL] Collision poteaux mid-bloc — ±0.18 (cohérent avec poteaux carrefour)
  pts.forEach(({ px, pz }) => {
    propAABBs.push({ mnX: px - 0.18, mxX: px + 0.18, mnZ: pz - 0.18, mxZ: pz + 0.18 });
  });
}


// ─────────────────────────────────────────────────
//  FLAQUES D'EAU — Réflexions sur bitume mouillé
// ─────────────────────────────────────────────────
function buildPuddles() {
  // Matériaux : très basse roughness pour capturer les reflets des PointLights
  const mat = new THREE.MeshStandardMaterial({
    color: 0x080b12, roughness: 0.02, metalness: 0.94,
    transparent: true, opacity: 0.78, depthWrite: false,
  });
  function spawnPuddle(x, z) {
    const w = 0.5 + rnd() * 2.0, d = 0.3 + rnd() * 1.2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rnd() * Math.PI;
    m.position.set(x, 0.013, z);
    scene.add(m);
  }

  const zSegs = Z_SEGS, xSegs = X_SEGS;

  // Flaques au bord des rues N-S (zone trottoir / bord de chaussée)
  // [OPT] rnd() > 0.68 au lieu de 0.45 : ~60% de flaques en moins
  // Chaque flaque = 1 draw call transparent + depth-sort GPU → impact réel sur les perfs.
  for (const rx of NS_X) {
    for (const [z0, z1] of zSegs) {
      for (let z = z0 + 6; z + 6 < z1; z += 10 + rnd() * 14) {
        if (rnd() > 0.68) continue;
        for (const s of [-1, 1]) {
          spawnPuddle(rx + s * (HALF_ROAD - 1.0 - rnd() * 2.5), z + rnd() * 6 - 3);
        }
      }
    }
  }
  // Flaques au bord des rues E-O
  for (const rz of EW_Z) {
    for (const [x0, x1] of xSegs) {
      for (let x = x0 + 6; x + 6 < x1; x += 10 + rnd() * 14) {
        if (rnd() > 0.68) continue;
        for (const s of [-1, 1]) {
          spawnPuddle(x + rnd() * 6 - 3, rz + s * (HALF_ROAD - 1.0 - rnd() * 2.5));
        }
      }
    }
  }
}


// ─────────────────────────────────────────────────
//  GÉNÉRATION DE LA VILLE
// ─────────────────────────────────────────────────
function buildCity() {
  buildWindowTextures();
  buildFacadeMaterials();

  // Sol asphalte mouillé (nuit) — goudron sombre, reflet maîtrisé
  const _asphTex = makeAsphaltTex();
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(620, 620),
    new THREE.MeshStandardMaterial({ color: 0x080a0e, roughness: 0.34, metalness: 0.48,
      roughnessMap: _asphTex })
  );
  gnd.rotation.x = -Math.PI / 2; scene.add(gnd);

  // Chaussée N-S — légèrement plus réfléchissante (asphalte lissé) mais pas miroir
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x0b0d14, roughness: 0.26, metalness: 0.56, roughnessMap: _asphTex });
  for (const rx of NS_X) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 500), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(rx, 0.006, 0); scene.add(r);
  }
  // Chaussée E-O
  for (const rz of EW_Z) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(500, ROAD_W), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.006, rz); scene.add(r);
  }
  // Dalles d'intersection — même spec que la route (PointLights visibles en reflet)
  const isecMat = new THREE.MeshStandardMaterial({ color: 0x0c0d16, roughness: 0.28, metalness: 0.54, roughnessMap: _asphTex });
  for (const rx of NS_X) for (const rz of EW_Z) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, ROAD_W), isecMat);
    s.rotation.x = -Math.PI / 2; s.position.set(rx, 0.007, rz); scene.add(s);
  }

  buildMarkings();
  buildCurbs();
  buildSidewalks();           // [NEW] dalles béton trottoir
  for (const bx of BLOCK_CX) for (const bz of BLOCK_CZ) genBlock(bx, bz);
  buildStreetLights();
  buildMidBlockLamps();       // [NEW] lampadaires entre intersections
  buildNeons();
  buildCrosswalks();
  buildTrees();
  buildParkedCars();
  buildPuddles();             // [NEW] flaques reflet nuit
  buildTrafficLights();
  buildStars();
  _buildPropGrid(); // [PERF] index spatial — doit être appelé après toutes les insertions dans propAABBs

  // Murs de limite monde
  const wMat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.97 });
  for (const s of [-1, 1]) {
    const fw = new THREE.Mesh(new THREE.BoxGeometry(380, 6, 2), wMat);
    fw.position.set(0, 3, s * (WORLD_H + 1)); scene.add(fw);
    const fh = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 380), wMat);
    fh.position.set(s * (WORLD_H + 1), 3, 0); scene.add(fh);
  }
}


// ─────────────────────────────────────────────────
//  MARQUAGES AU SOL — InstancedMesh segmentés
// ─────────────────────────────────────────────────
function buildMarkings() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x828278, roughness: 0.70, metalness: 0.02,
    emissive: new THREE.Color(0x242420), emissiveIntensity: 0.30,
  });
  const zSegs = Z_SEGS, xSegs = X_SEGS;
  const _d = new THREE.Object3D();

  function makeIM(geoFn, positions) {
    if (!positions.length) return;
    const geo = geoFn(); geo.rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(geo, mat, positions.length);
    positions.forEach(([x, y, z], i) => {
      _d.position.set(x, y, z); _d.rotation.set(0,0,0); _d.updateMatrix();
      im.setMatrixAt(i, _d.matrix);
    });
    im.instanceMatrix.needsUpdate = true; scene.add(im);
  }

  // Tirets centraux N-S
  const nsC = [];
  NS_X.forEach(rx => zSegs.forEach(([z0, z1]) => {
    for (let z = z0 + 6; z + 3 < z1; z += 12) nsC.push([rx, 0.018, z]);
  }));
  makeIM(() => new THREE.PlaneGeometry(0.22, 6), nsC);

  // Tirets centraux E-O
  const ewC = [];
  EW_Z.forEach(rz => xSegs.forEach(([x0, x1]) => {
    for (let x = x0 + 6; x + 3 < x1; x += 12) ewC.push([x, 0.018, rz]);
  }));
  makeIM(() => new THREE.PlaneGeometry(6, 0.22), ewC);

  // Bandes de voie N-S
  const nsL = [];
  NS_X.forEach(rx => [-1, 1].forEach(s => zSegs.forEach(([z0, z1]) => {
    for (let z = z0 + 11; z + 5.5 < z1; z += 22) nsL.push([rx + s * 3.2, 0.015, z]);
  })));
  makeIM(() => new THREE.PlaneGeometry(0.10, 9), nsL);
}


// ─────────────────────────────────────────────────
//  BORDURES TROTTOIR — Segmentées entre intersections
// ─────────────────────────────────────────────────
function buildCurbs() {
  // [VIS] Bordures : légère spécularité pour capter la lumière des lampadaires
  const mat   = new THREE.MeshStandardMaterial({
    color: 0x1a1a22, roughness: 0.78, metalness: 0.10,
    emissive: new THREE.Color(0x05050a), emissiveIntensity: 0.22,
  });
  const zSegs = Z_SEGS, xSegs = X_SEGS;

  for (const rx of NS_X) for (const s of [-1, 1])
    for (const [z0, z1] of zSegs) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, z1 - z0), mat);
      c.position.set(rx + s * (HALF_ROAD + 0.19), 0.09, (z0 + z1) * 0.5); scene.add(c);
    }

  for (const rz of EW_Z) for (const s of [-1, 1])
    for (const [x0, x1] of xSegs) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.18, 0.38), mat);
      c.position.set((x0 + x1) * 0.5, 0.09, rz + s * (HALF_ROAD + 0.19)); scene.add(c);
    }
}


// ─────────────────────────────────────────────────
//  [VIS-1] GÉNÉRATION DE BLOC D'IMMEUBLES
//  Bâtiments avec soubassement, couronnement, détails architecturaux
// ─────────────────────────────────────────────────
function genBlock(bx, bz) {
  const HALF    = 21;
  const n       = rndInt(2, 5);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.98 });

  for (let i = 0; i < n; i++) {
    const bw = rndRange(10, 28);
    const bd = rndRange(10, 24);
    const bh = rndRange(9, 46);
    const cx = bx + rndRange(-(HALF - bw/2), HALF - bw/2) * 0.80;
    const cz = bz + rndRange(-(HALF - bd/2), HALF - bd/2) * 0.80;

    let tooClose = false;
    for (const rx of NS_X) if (Math.abs(cx - rx) < bw/2 + 4.5) tooClose = true;
    for (const rz of EW_Z) if (Math.abs(cz - rz) < bd/2 + 4.5) tooClose = true;
    if (tooClose) continue;

    // Choix architectural : tour verre si haut, béton sinon
    const isGlass = bh > 25 && rnd() > 0.35;
    const facadePool = isGlass ? [0, 1] : [2, 3, 4, 5];
    const facadeMat  = facadeMaterials[facadePool[Math.floor(rnd() * facadePool.length)]];

    // ── Corps principal ──
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), facadeMat);
    body.position.set(cx, bh / 2, cz);
    scene.add(body);

    // ── Soubassement / podium (immeuble sur base) ──
    if (bh > 16) {
      const podH = rndRange(2.8, 5.0);
      const podMat = new THREE.MeshStandardMaterial({
        color: isGlass ? 0x0e1218 : 0x111115, roughness: isGlass ? 0.50 : 0.88,
      });
      const pod = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.8, podH, bd + 0.8), podMat);
      pod.position.set(cx, podH / 2, cz); scene.add(pod);
    }

    // ── Bande mécanique sombre à mi-hauteur (pour tours hautes) ──
    if (bh > 28 && rnd() > 0.40) {
      const mh = rndRange(1.0, 1.8);
      const mBandMat = new THREE.MeshStandardMaterial({ color: 0x080810, roughness: 0.95 });
      const mBand = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.1, mh, bd + 0.1), mBandMat);
      mBand.position.set(cx, bh * rndRange(0.45, 0.60), cz); scene.add(mBand);
    }

    // ── Couronnement / acrotère ──
    const crown = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.8, 0.80, bd + 0.8), roofMat);
    crown.position.set(cx, bh + 0.40, cz); scene.add(crown);

    // ── Niveau technique (tours hautes) ──
    if (bh > 20 && rnd() > 0.40) {
      const ph  = rndRange(3, 6);
      const pw  = bw * rndRange(0.28, 0.58);
      const pdd = bd * rndRange(0.28, 0.58);
      const pm = new THREE.MeshStandardMaterial({ color: isGlass ? 0x0c101a : 0x0c0c12, roughness: 0.96 });
      const pent = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pdd), pm);
      pent.position.set(cx + rndRange(-pw/3, pw/3), bh + ph/2 + 0.80, cz + rndRange(-pdd/3, pdd/3));
      scene.add(pent);
    }

    // ── Balcons / loggias (résidentiel) ──
    if (!isGlass && bh < 30 && rnd() > 0.55) {
      const balMat = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.92 });
      const nBal = rndInt(2, 5);
      const stepH = bh / (nBal + 1);
      for (let b = 0; b < nBal; b++) {
        const bal = new THREE.Mesh(new THREE.BoxGeometry(bw * rndRange(0.3, 0.6), 0.12, 0.70), balMat);
        const side = rnd() > 0.5 ? 1 : -1;
        bal.position.set(cx + rnd() * bw * 0.2, (b + 1) * stepH, cz + side * (bd / 2 + 0.32));
        scene.add(bal);
      }
    }

    // ── Vitrine RDC (bâtiments bas) ──
    if (bh < 22 && rnd() > 0.45) {
      const vitMat = new THREE.MeshStandardMaterial({
        color: 0x0c0c18, roughness: 0.50,
        emissive: new THREE.Color(rnd() > 0.5 ? 0x180520 : 0x041018),
        emissiveIntensity: 0.85,
      });
      const vit = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.70, 1.6, 0.12), vitMat);
      vit.position.set(cx, 2.8, cz + bd/2 + 0.07); scene.add(vit);
    }

    buildingAABBs.push({ mnX: cx-bw/2-0.5, mxX: cx+bw/2+0.5, mnZ: cz-bd/2-0.5, mxZ: cz+bd/2+0.5 });
    buildingMap.push({ x: cx, z: cz, w: bw, d: bd });
  }

  // Parking / zone ouverte
  if (rnd() > 0.55) {
    const lotMat = new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.94 });
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 1.3, HALF * 1.3), lotMat);
    lot.rotation.x = -Math.PI / 2; lot.position.set(bx, 0.003, bz); scene.add(lot);
    const lMat = new THREE.MeshStandardMaterial({ color: 0x3a3a36, emissive: new THREE.Color(0x181810), emissiveIntensity: 0.35 });
    for (let j = -2; j <= 2; j++) {
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.13, HALF * 1.1), lMat);
      ln.rotation.x = -Math.PI / 2; ln.position.set(bx + j * 5, 0.004, bz); scene.add(ln);
    }
  }
}


// ─────────────────────────────────────────────────
//  MATÉRIAUX LAMPADAIRES PARTAGÉS (buildStreetLights + buildMidBlockLamps)
// ─────────────────────────────────────────────────
const _lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x22222c, roughness: 0.50, metalness: 0.55 });
// [VIS] Ampoule sodium plus lumineuse + teinte chaude renforcée
const _lampBulbMat = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: new THREE.Color(0xffd890), emissiveIntensity: 3.5, roughness: 0.18 });
const _lampCapMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.80 });

// ─────────────────────────────────────────────────
//  LAMPADAIRES — InstancedMesh (4 draw calls)
// ─────────────────────────────────────────────────
function buildStreetLights() {
  const armLen  = 2.8;
  const _d      = new THREE.Object3D();
  const poleMat = _lampPoleMat, lampMat = _lampBulbMat, capMat = _lampCapMat;

  const lamps = [];
  for (const rx of NS_X) for (const rz of EW_Z)
    for (const [ox, oz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const px = rx + ox * (HALF_ROAD + 2.0);
      const pz = rz + oz * (HALF_ROAD + 2.0);
      lamps.push({ px, pz, ox, oz, lx: px + ox * armLen, lz: pz });
    }

  const N = lamps.length;

  const poleIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 8.5, 7), poleMat, N);
  const armIM  = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.055, armLen, 6), poleMat, N);
  const capIM  = new THREE.InstancedMesh(new THREE.BoxGeometry(0.58, 0.18, 0.58), capMat, N);
  const bulbIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.10, 0.46), lampMat, N);

  lamps.forEach(({ px, pz, ox, oz, lx, lz }, i) => {
    _d.position.set(px, 4.25, pz); _d.rotation.set(0,0,0); _d.scale.setScalar(1); _d.updateMatrix();
    poleIM.setMatrixAt(i, _d.matrix);

    _d.position.set(px + ox * armLen/2, 8.6, pz + oz * 0.1); _d.rotation.set(0, 0, Math.PI/2); _d.updateMatrix();
    armIM.setMatrixAt(i, _d.matrix);

    _d.position.set(lx, 8.55, lz); _d.rotation.set(0,0,0); _d.updateMatrix();
    capIM.setMatrixAt(i, _d.matrix);
    _d.position.set(lx, 8.42, lz); _d.updateMatrix();
    bulbIM.setMatrixAt(i, _d.matrix);
  });

  [poleIM, armIM, capIM, bulbIM].forEach(im => { im.instanceMatrix.needsUpdate = true; scene.add(im); });

  // [OPT-LUMIÈRES] Au lieu de créer 1 PointLight fixe par groupe de 4 lampes (~25 lights),
  // on collecte les positions dans lampPositions[].
  // Les lumières seront portées par le pool dynamique créé dans createLampPool().
  lamps.filter((_, i) => i % 4 === 0).forEach(({ lx, lz }) => {
    lampPositions.push({ x: lx, y: 8.0, z: lz, color: 0xffcc80, intensity: 7.0 });
  });
  // [COL-3] Hitbox poteaux intersections — rayon visuel ≈0.13, marge +0.05 = ±0.18
  lamps.forEach(({ px, pz }) => {
    propAABBs.push({ mnX: px - 0.18, mxX: px + 0.18, mnZ: pz - 0.18, mxZ: pz + 0.18 });
  });
}


// ─────────────────────────────────────────────────
//  NÉONS — références pour animation pulse
// ─────────────────────────────────────────────────
const neonMats = [];
let   _neonTime = 0;


function buildNeons() {
  const neons = [
    { pos: [-84, 3, -84], color: 0x00ffdd, sc: 0x00eecc },
    { pos: [ 84, 3, -84], color: 0xff0088, sc: 0xee0077 },
    { pos: [-84, 3,  84], color: 0x0088ff, sc: 0x0077ee },
    { pos: [ 84, 3,  84], color: 0xcc00ff, sc: 0xbb00ee },
    { pos: [ -3, 4, -30], color: 0x00ffcc, sc: 0x00eebb },
    { pos: [  3, 4,  30], color: 0xff3399, sc: 0xee2288 },
    { pos: [-30, 4,   3], color: 0xff7700, sc: 0xee6600 },
    { pos: [ 30, 4,  -3], color: 0x44ff88, sc: 0x33ee77 },
  ];
  neons.forEach((n, idx) => {
    // PointLight uniquement pour les 4 premiers (4 lumières au lieu de 8)
    if (idx < 4) {
      const pl = new THREE.PointLight(n.color, 4.0, 26, 2);
      pl.position.set(...n.pos); scene.add(pl);
    }
    const sMat = new THREE.MeshStandardMaterial({ color: n.sc, emissive: new THREE.Color(n.sc), emissiveIntensity: 2.2, roughness: 0.30 });
    neonMats.push(sMat); // [ANIM] référencé pour pulse
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.0 + rnd(), 0.50, 0.14), sMat);
    sign.position.set(n.pos[0], n.pos[1] + 5 + rnd() * 5, n.pos[2] + 5); scene.add(sign);
  });
}


// ─────────────────────────────────────────────────
//  ANIMATION NÉONS — pulse battement tube fluorescent
// ─────────────────────────────────────────────────
function updateNeons(dt) {
  _neonTime += dt;
  neonMats.forEach((m, i) => {
    // Battement principal lent + harmonique rapide = irrégularité réaliste
    const t  = _neonTime * 1.2 + i * 0.94;
    const f  = 1.0 + Math.sin(t) * 0.14 + Math.sin(t * 2.9 + 0.5) * 0.06;
    m.emissiveIntensity = 2.2 * f;
  });
}


// ─────────────────────────────────────────────────
//  [VIS-2] VOITURE — Honda Civic EK6
//  Carrosserie plus définie, arches de roue, meilleur nez
//  La voiture avance vers +Z.
//  bx(mat, sX, sY, sZ, posX, posY, posZ)
// ─────────────────────────────────────────────────
let carGroup, steerFL, steerFR;
const allWheelGroups = [];
// ── Références dynamiques ──
let tlBrakeMat = null, tlGlowLight = null, tlReverseMat = null, tlReverseLight = null;
const headlightSpots = [];
let headlightsOn = true;
let camMode = 0;           // 0=chase · 1=sport low · 2=hood cam
let audioCtx = null, engFilter = null, engGain = null;

// ── Pool de PointLights dynamiques ──────────────────────────────────
// Au lieu de ~50 PointLights statiques (1 shader loop/fragment × 50 = lent),
// on utilise N lights qui se déplacent vers les lampadaires les plus proches
// de la voiture chaque frame. Le shader ne compote que N lumières.
// IS_LOW_PERF → 4 lumières, desktop → 8 lumières.
const LAMP_POOL_SIZE = IS_LOW_PERF ? 4 : 8;
const lampPool       = [];   // THREE.PointLight[] — pool réutilisable
const lampPositions  = [];   // {x, y, z, color, intensity} — toutes positions de lampadaires

// ── Feux tricolores ──
const trafficLights = [];

// ── Particules échappement ──
const EXHAUST_N = 50;
const exhaustPos = new Float32Array(EXHAUST_N * 3);
const exhaustData = [];
let   exhaustMesh = null;

// ── Marques de dérapage ──
const SKID_MAX = 80;
const skidPool  = [];
let   skidIdx   = 0;

function createCar() {
  carGroup = new THREE.Group();
  const GC = 0.10, W = 1.72, WR = 0.27;
  const G  = carGroup;

  function bx(mat, sX, sY, sZ, posX, posY, posZ) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sX, sY, sZ), mat);
    m.position.set(posX, posY, posZ); G.add(m); return m;
  }
  function cy(mat, rT, rB, h, seg, posX, posY, posZ, rx=0, ry=0, rz=0) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat);
    m.rotation.set(rx, ry, rz); m.position.set(posX, posY, posZ); G.add(m); return m;
  }

  // ── MATÉRIAUX — Honda Civic EK Coupe 1997 / Milano Red ──
  // [OPT] MeshStandardMaterial au lieu de MeshPhysicalMaterial :
  //   - supprime le clearcoat (double-pass shader très coûteux en GPU)
  //   - rendu visuellement très proche, gain de ~20-35% GPU sur la voiture
  const mBody = new THREE.MeshStandardMaterial({ color: 0xCC0018, metalness: 0.18, roughness: 0.12 });
  const mKit  = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.45, metalness: 0.12 });
  const mDark = new THREE.MeshStandardMaterial({ color: 0x09090c, roughness: 0.88 });
  const mGlass= new THREE.MeshStandardMaterial({ color: 0x0c1825, transparent: true, opacity: 0.62, roughness: 0.05 });
  const mHL   = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xfff6e0), emissiveIntensity: 3.5, roughness: 0.02 });
  const mHLens= new THREE.MeshStandardMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.92, roughness: 0.02 });
  const mAmb  = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: new THREE.Color(0xff5500), emissiveIntensity: 2.4, roughness: 0.14 });
  const mTL   = new THREE.MeshStandardMaterial({ color: 0xff0a00, emissive: new THREE.Color(0xff0000), emissiveIntensity: 1.2, roughness: 0.10 });
  const mTLMid= new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xdddddd), emissiveIntensity: 0.45, roughness: 0.18 });
  const mPla  = new THREE.MeshStandardMaterial({ color: 0xe8e8d8, emissive: new THREE.Color(0x777766), emissiveIntensity: 0.50, roughness: 0.42 });
  const mRim  = new THREE.MeshStandardMaterial({ color: 0x16160e, metalness: 0.94, roughness: 0.11 }); // Gunmetal TE37
  const mTire = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.94 });
  const mCal  = new THREE.MeshStandardMaterial({ color: 0xcc2200, emissive: new THREE.Color(0x550000), roughness: 0.42, metalness: 0.44 });
  const mDisc = new THREE.MeshStandardMaterial({ color: 0x363636, roughness: 0.50, metalness: 0.80 });
  const mExh  = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.16, metalness: 0.92 });
  const mInt  = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.82, emissive: new THREE.Color(0x080806), emissiveIntensity: 0.18 });
  const mBadge= new THREE.MeshStandardMaterial({ color: 0xd0d0cc, metalness: 0.94, roughness: 0.08, emissive: new THREE.Color(0x888880), emissiveIntensity: 0.28 });
  tlBrakeMat  = mTL;   // référence dynamique — intensité pilotée dans updateCar
  tlReverseMat = mTLMid; // feux de marche arrière

  // ═══ CARROSSERIE (EK6 : L≈4.39 · l=1.72 · h≈1.34) ═══
  // Convention : Z+ = avant (phares), Z- = arrière (feux), X+ = droite

  // --- Corps bas (sill) ---
  bx(mBody, W,      0.50, 4.24,  0, GC+0.25,  0.00);

  // --- Panneaux de caisse hauts (portes / bas de custode) ---
  bx(mBody, W-0.03, 0.48, 1.88,  0, GC+0.74, -0.14);

  // --- Flancs supérieurs (renforts au-dessus des baies vitrées) ---
  bx(mBody, W-0.06, 0.12, 1.86,  0, GC+0.98, -0.14);

  // --- Toit ---
  bx(mBody, W-0.14, 0.20, 1.26,  0, GC+1.10, -0.18);

  // --- Capot (3 plans) ---
  bx(mBody, W-0.05, 0.09, 1.38,  0, GC+0.52,  1.35);
  bx(mBody, W-0.05, 0.13, 0.38,  0, GC+0.55,  0.76);
  bx(mBody, W-0.04, 0.08, 0.28,  0, GC+0.48,  2.00); // nez avant capot

  // --- Coffre ---
  bx(mBody, W-0.05, 0.09, 1.04,  0, GC+0.52, -1.44);
  bx(mBody, W-0.03, 0.12, 0.24,  0, GC+0.52, -2.07);

  // --- Ailes avant (débords latéraux, plus larges que la base de caisse) ---
  // Aile avant gauche (+X)
  bx(mBody, 0.12, 0.54, 1.20,  W/2+0.04, GC+0.27,  1.20);
  // Aile avant droite (-X)
  bx(mBody, 0.12, 0.54, 1.20, -W/2-0.04, GC+0.27,  1.20);
  // Aile arrière gauche (+X)
  bx(mBody, 0.12, 0.50, 1.10,  W/2+0.04, GC+0.27, -1.18);
  // Aile arrière droite (-X)
  bx(mBody, 0.12, 0.50, 1.10, -W/2-0.04, GC+0.27, -1.18);

  // --- Partie haute des ailes (passage de roue) ---
  // Avant +X
  bx(mBody, 0.10, 0.26, 0.80,  W/2+0.04, GC+0.66,  1.22);
  bx(mBody, 0.10, 0.26, 0.80, -W/2-0.04, GC+0.66,  1.22);
  // Arrière
  bx(mBody, 0.10, 0.22, 0.72,  W/2+0.04, GC+0.62, -1.20);
  bx(mBody, 0.10, 0.22, 0.72, -W/2-0.04, GC+0.62, -1.20);

  // --- Arches de roues simulées (demi-cylindre aplati sur X au-dessus des roues) ---
  // On utilise un BoxGeometry mince courbé par approximation de 4 segments angulaires
  const ARCH_SEGS = 4;
  const ARCH_R    = WR + 0.12;
  function addWheelArch(axleX, axleZ) {
    for (let s = 0; s < ARCH_SEGS; s++) {
      const a0 = Math.PI + s       * Math.PI / ARCH_SEGS;
      const a1 = Math.PI + (s + 1) * Math.PI / ARCH_SEGS;
      const am = (a0 + a1) / 2;
      const ey = Math.sin(am) * ARCH_R; // y local (toujours négatif pour arche du dessus → on prend abs)
      const ez = Math.cos(am) * ARCH_R;
      const arcH = ARCH_R * (a1 - a0) + 0.05;
      // Orientation : box allongée dans la direction tangentielle
      const tangY = Math.cos(am); // dérivée de sin
      const tangZ = -Math.sin(am);
      const ang   = Math.atan2(tangY, tangZ) + Math.PI / 2;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.16, arcH * 0.85, arcH), mBody);
      seg.rotation.x = ang;
      seg.position.set(axleX, WR + ey, axleZ + ez);
      G.add(seg);
    }
  }
  addWheelArch( 0.88,  1.30); // avant +X
  addWheelArch(-0.88,  1.30); // avant -X
  addWheelArch( 0.88, -1.32); // arrière +X
  addWheelArch(-0.88, -1.32); // arrière -X

  // ── KIT CARROSSERIE ──
  bx(mKit, W+0.06, 0.46, 0.24,  0, GC+0.23,  2.20); // pare-choc AV
  bx(mKit, W*0.54, 0.11, 0.22,  0, GC+0.055, 2.23); // splitter
  bx(mKit, W+0.04, 0.44, 0.22,  0, GC+0.22, -2.18); // pare-choc AR
  bx(mKit, W*0.58, 0.11, 0.18,  0, GC+0.055,-2.22); // diffuseur
  bx(mKit, 0.08, 0.14, 3.05,  W/2+0.02, GC+0.07,  0.00); // jupe G
  bx(mKit, 0.08, 0.14, 3.05, -W/2-0.02, GC+0.07,  0.00); // jupe D

  // ── BECQUET COFFRE — trunk lip spoiler (LS stock) ──
  bx(mBody, W-0.18, 0.07, 0.12,  0, GC+0.57, -2.06);
  bx(mKit,  W-0.20, 0.03, 0.05,  0, GC+0.61, -2.02);

  // ── VITRES ──
  bx(mGlass, W-0.22, 0.52, 0.07,  0, GC+1.01,  0.86); // pare-brise
  bx(mGlass, W-0.30, 0.46, 0.07,  0, GC+0.99, -1.09); // lunette AR
  bx(mGlass, 0.04, 0.44, 1.86,  W/2-0.04, GC+0.97,  0.00); // vitre porte G
  bx(mGlass, 0.04, 0.44, 1.86, -W/2+0.04, GC+0.97,  0.00); // vitre porte D
  bx(mGlass, 0.04, 0.34, 0.50,  W/2-0.04, GC+0.92, -1.30); // 1/4 AR G
  bx(mGlass, 0.04, 0.34, 0.50, -W/2+0.04, GC+0.92, -1.30); // 1/4 AR D

  // ── MONTANTS (A-pilier apparent) ──
  bx(mDark, 0.06, 0.54, 0.08,  W/2-0.08, GC+0.97, 0.66);
  bx(mDark, 0.06, 0.54, 0.08, -W/2+0.08, GC+0.97, 0.66);

  // ── INTÉRIEUR ──
  bx(mInt, W-0.30, 0.26, 1.40,  0, GC+0.76, -0.05);
  // Tableau de bord
  bx(mInt, W-0.30, 0.17, 0.54,  0, GC+0.91, 0.56);
  // Volant (EK Civic — 3 branches)
  const mSteer = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.52, metalness: 0.22 });
  const volant = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.022, 7, 22), mSteer);
  volant.position.set(0, GC+0.86, 0.45); volant.rotation.x = Math.PI/2 - 0.36; G.add(volant);
  bx(mSteer, 0.08, 0.05, 0.07, 0, GC+0.88, 0.44); // moyeu
  // Levier de vitesse
  const mShift = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.36, metalness: 0.55 });
  bx(mDark, 0.044, 0.18, 0.044, 0.18, GC+0.79, -0.09);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), mShift);
  knob.position.set(0.18, GC+0.88, -0.09); G.add(knob);

  // ── RÉTROVISEURS ──
  bx(mBody, 0.14, 0.13, 0.36,  W/2+0.04, GC+1.00, 0.68);
  bx(mBody, 0.14, 0.13, 0.36, -W/2-0.04, GC+1.00, 0.68);
  bx(mDark, 0.04, 0.11, 0.30,  W/2+0.08, GC+1.00, 0.68);
  bx(mDark, 0.04, 0.11, 0.30, -W/2-0.08, GC+1.00, 0.68);

  // ── PHARES AVANT — EK Civic (grands boîtiers angulaires clear-lens) ──
  // Boîtier externe (fond chromé/noir)
  bx(mDark,  0.62, 0.34, 0.12,  W/2-0.14, GC+0.65, 2.21);
  bx(mDark,  0.62, 0.34, 0.12, -W/2+0.14, GC+0.65, 2.21);
  // Lentille polycarbonate clear
  bx(mHLens, 0.56, 0.28, 0.08,  W/2-0.14, GC+0.66, 2.24);
  bx(mHLens, 0.56, 0.28, 0.08, -W/2+0.14, GC+0.66, 2.24);
  // Ampoule H4 (inner reflector glow)
  bx(mHL,    0.24, 0.15, 0.05,  W/2-0.14, GC+0.67, 2.26);
  bx(mHL,    0.24, 0.15, 0.05, -W/2+0.14, GC+0.67, 2.26);
  // Clignotant avant ambre (intégré au boîtier EK)
  bx(mAmb,   0.16, 0.10, 0.08,  W/2+0.01, GC+0.52, 2.22);
  bx(mAmb,   0.16, 0.10, 0.08, -W/2-0.01, GC+0.52, 2.22);
  // Calandre centrale EK (simple barre)
  bx(mKit,   0.64, 0.18, 0.08,  0, GC+0.42, 2.24);
  bx(mKit,   0.38, 0.09, 0.06,  0, GC+0.26, 2.25);
  // Emblème Honda H — avant
  bx(mBadge, 0.14, 0.10, 0.03,  0, GC+0.44, 2.28);

  // ── FEUX ARRIÈRE — EK Coupe (boîtiers larges rouge/clear) ──
  bx(mTL,    0.64, 0.30, 0.08,  0.52, GC+0.63, -2.18);  // feu principal G
  bx(mTL,    0.64, 0.30, 0.08, -0.52, GC+0.63, -2.18);  // feu principal D
  bx(mTLMid, 0.26, 0.15, 0.07,  0.52, GC+0.65, -2.21);  // insert réflecteur G
  bx(mTLMid, 0.26, 0.15, 0.07, -0.52, GC+0.65, -2.21);  // insert réflecteur D
  bx(mTLMid, 0.26, 0.20, 0.07,  0.00, GC+0.61, -2.20);  // feux de recul centre
  bx(mDark,  0.30, 0.28, 0.06,  0.00, GC+0.55, -2.19);  // insert central noir
  bx(mPla,   0.34, 0.12, 0.05,  0,    GC+0.42, -2.21);  // plaque d'immatriculation
  bx(mBadge, 0.10, 0.08, 0.03,  0,    GC+0.65, -2.22);  // emblème Honda H AR

  tlGlowLight = new THREE.PointLight(0xff1800, 1.5, 6.5, 2);
  tlGlowLight.position.set(0, GC+0.62, -2.40); G.add(tlGlowLight);

  // ── Feux de marche arrière (PointLight blanc, intensité 0 au repos) ──
  tlReverseLight = new THREE.PointLight(0xffffff, 0, 9, 2);
  tlReverseLight.position.set(0, GC+0.55, -2.60); G.add(tlReverseLight);

  // ── ÉCHAPPEMENT — Sortie N1 double (JDM) ──
  const mTip = new THREE.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.10, metalness: 0.96 });
  const exh1 = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.080, 0.34, 10), mTip);
  exh1.rotation.x = Math.PI/2; exh1.position.set(-0.25, GC+0.13, -2.27); G.add(exh1);
  const exh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.072, 0.30, 10), mTip);
  exh2.rotation.x = Math.PI/2; exh2.position.set(-0.41, GC+0.13, -2.27); G.add(exh2);
  // Bride de sortie
  const exhFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 7), mExh);
  exhFlange.rotation.x = Math.PI/2; exhFlange.position.set(-0.33, GC+0.13, -2.14); G.add(exhFlange);

  // ── SPOTLIGHTS PHARES ──
  function addSpot(x, y, z) {
    const sl = new THREE.SpotLight(0xfff8e8, 8.5, 74, Math.PI * 0.12, 0.26, 1.4);
    sl.position.set(x, y, z);
    const tgt = new THREE.Object3D();
    tgt.position.set(x * 0.44, y - 0.52, 48);
    G.add(tgt); sl.target = tgt; G.add(sl);
    headlightSpots.push(sl);
  }
  addSpot( W/2-0.14, GC+0.67, 2.26);
  addSpot(-W/2+0.14, GC+0.67, 2.26);

  // ═══ ROUES ═══
  // AXLE_F = Z+1.30 (avant)  AXLE_R = Z-1.32 (arrière)  AXLE_S = X±0.88 (voie)
  const AXLE_F = 1.30, AXLE_R = -1.32, AXLE_S = 0.88;

  function makeWheel() {
    const wg = new THREE.Group();

    // [VIS-3] Pneu visible : largeur 0.30 > largeur jante 0.22
    // Flancs caoutchouc dépassent clairement de chaque côté
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, 0.30, 24), mTire);
    tire.rotation.z = Math.PI / 2; wg.add(tire);

    // Flanc extérieur proéminent (visible depuis le côté)
    const swOuter = new THREE.Mesh(new THREE.TorusGeometry(WR * 0.80, 0.040, 8, 24), mTire);
    swOuter.rotation.y = Math.PI / 2; swOuter.position.x = 0.14; wg.add(swOuter);
    const swInner = new THREE.Mesh(new THREE.TorusGeometry(WR * 0.80, 0.040, 8, 24), mTire);
    swInner.rotation.y = Math.PI / 2; swInner.position.x = -0.14; wg.add(swInner);

    // Bourrelet de talon (caoutchouc au bord jante)
    const bead = new THREE.Mesh(new THREE.TorusGeometry(WR - 0.025, 0.028, 7, 24), mTire);
    bead.rotation.y = Math.PI / 2; bead.position.x = 0.13; wg.add(bead);
    const beadI = new THREE.Mesh(new THREE.TorusGeometry(WR - 0.025, 0.028, 7, 24), mTire);
    beadI.rotation.y = Math.PI / 2; beadI.position.x = -0.13; wg.add(beadI);

    // Jante hexagonale blanche TE37
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(WR-0.055, WR-0.055, 0.22, 6), mRim);
    rim.rotation.z = Math.PI / 2; wg.add(rim);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(WR-0.055, WR-0.055, 0.012, 24), mRim);
    face.rotation.z = Math.PI / 2; face.position.x = 0.112; wg.add(face);

    // 6 branches TE37
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.055, WR * 0.86), mRim);
      spoke.position.set(0.008, Math.cos(a) * WR * 0.44, Math.sin(a) * WR * 0.44);
      spoke.rotation.x = a - Math.PI / 2; wg.add(spoke);
    }

    // Moyeu + disque + étrier
    const hub  = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.24, 10), mRim);
    hub.rotation.z = Math.PI / 2; wg.add(hub);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(WR*0.70, WR*0.70, 0.044, 22), mDisc);
    disc.rotation.z = Math.PI / 2; disc.position.x = -0.022; wg.add(disc);
    const cal  = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.18), mCal);
    cal.position.set(-0.05, -WR * 0.60, 0); wg.add(cal);

    return wg;
  }

  function addWheelMount(parent, posX, posY, posZ) {
    const mount = new THREE.Group();
    mount.position.set(posX, posY, posZ);
    const wg = makeWheel();
    mount.add(wg); parent.add(mount);
    allWheelGroups.push(wg);
    return mount;
  }

  steerFL = addWheelMount(G,  AXLE_S, WR, AXLE_F);
  steerFR = addWheelMount(G, -AXLE_S, WR, AXLE_F);
  addWheelMount(G,  AXLE_S, WR, AXLE_R);
  addWheelMount(G, -AXLE_S, WR, AXLE_R);

  carGroup.position.set(0, 0, -75);
  scene.add(carGroup);
}


// ─────────────────────────────────────────────────
//  PHYSIQUE DE CONDUITE
// ─────────────────────────────────────────────────
const car = {
  pos:   new THREE.Vector3(0, 0, -75),
  angle: 0,
  speed: 0,
  steer: 0,
  wheelRot: 0,
  roll:  0,          // roulis carrosserie
  bounce: 0,         // rebond suspension
  prevAngle: 0,      // pour calcul lacet
  WB:         2.62,
  MAX_SPD:    28,
  MAX_REV:    7,
  ACCEL:      20,
  BRAKE:      28,
  DRAG:       0.87,
  STEER_MAX:  0.54,
  STEER_RATE: 2.3,
};

const keys      = {};
const touchKeys = { up: false, down: false, left: false, right: false };
// Binding tactile via data-key (remplace les handlers ontouchstart/ontouchend inline)
document.querySelectorAll('.touch-btn[data-key]').forEach(btn => {
  const k = btn.dataset.key;
  btn.addEventListener('touchstart', () => { touchKeys[k] = true;  }, { passive: true });
  btn.addEventListener('touchend',   () => { touchKeys[k] = false; });
});
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyC') camMode = (camMode + 1) % 3;
  if (e.code === 'KeyH') {
    headlightsOn = !headlightsOn;
    headlightSpots.forEach(s => { s.intensity = headlightsOn ? 8.5 : 0; });
  }
});
window.addEventListener('keyup',   e => { keys[e.code] = false; });
function key(...codes) { return codes.some(c => keys[c]); }

const camPos  = new THREE.Vector3(0, 5, -85);
const camLook = new THREE.Vector3(0, 1, -75);
const CAM_DIST = 9.5, CAM_H = 4.2, CAM_S = 0.09, LOOK_S = 0.12;


// ─────────────────────────────────────────────────
//  MISE À JOUR PHYSIQUE
// ─────────────────────────────────────────────────
function updateCar(dt) {
  const accel     = key('KeyW', 'ArrowUp');
  const brake     = key('KeyS', 'ArrowDown');
  const turnLeft  = key('KeyA', 'ArrowLeft')  || touchKeys.left;
  const turnRight = key('KeyD', 'ArrowRight') || touchKeys.right;
  const handbrake = key('Space');

  // Accélération / freinage
  if (accel || touchKeys.up) {
    car.speed += car.ACCEL * dt;
  } else if (brake || touchKeys.down) {
    car.speed > 0.3 ? car.speed -= car.BRAKE * dt : car.speed -= car.ACCEL * 0.55 * dt;
  } else {
    car.speed *= Math.pow(handbrake ? 0.60 : car.DRAG, dt * 60);
    if (Math.abs(car.speed) < 0.04) car.speed = 0;
  }
  car.speed = Math.max(-car.MAX_REV, Math.min(car.MAX_SPD, car.speed));

  // [FIX-1] steerTarget : left=+1, right=-1 (PHYSIQUE CORRECTE — identique à l'original)
  // La physique (angle -=) est correcte : left→steer+→turnRadius+→angle-=+ → angle décroit → LEFT ✓
  // right→steer-→turnRadius-→angle-=- → angle croît → RIGHT ✓
  const steerTarget = (turnRight ? 1 : turnLeft ? -1 : 0)
    * car.STEER_MAX
    * Math.max(0.18, 1 - Math.abs(car.speed) / car.MAX_SPD * 0.65);
  car.steer += (steerTarget - car.steer) * car.STEER_RATE * dt;

  if (Math.abs(car.speed) > 0.05) {
    const turnRadius = car.WB / Math.tan(car.steer + 1e-9);
    car.angle -= (car.speed / turnRadius) * dt; // original, correct
  }

  const nx = car.pos.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.pos.z + Math.cos(car.angle) * car.speed * dt;

  const HR = 1.05;  // [COL-FIX] Demi-largeur de collision : était 1.4 (2.8m total pour une voiture de 1.72m!)
  // Réduit à 1.05 : mi-largeur carrosserie 0.86 + marge réaliste 0.19 = ressenti fidèle au mesh visible.
  let colX = false, colZ = false;
  // Bâtiments
  for (const b of buildingAABBs) {
    if (nz + HR > b.mnZ && nz - HR < b.mxZ && car.pos.x + HR > b.mnX && car.pos.x - HR < b.mxX) colZ = true;
    if (nx + HR > b.mnX && nx - HR < b.mxX && car.pos.z + HR > b.mnZ && car.pos.z - HR < b.mxZ) colX = true;
  }
  // [PERF] Grille spatiale : seules les ~9 cellules proches sont testées (~15–40 AABB au lieu de ~700)
  const _near = _getNearProps(car.pos.x, car.pos.z);
  for (let _pi = 0; _pi < _near.length; _pi++) {
    const b = _near[_pi];
    if (nz + HR > b.mnZ && nz - HR < b.mxZ && car.pos.x + HR > b.mnX && car.pos.x - HR < b.mxX) colZ = true;
    if (nx + HR > b.mnX && nx - HR < b.mxX && car.pos.z + HR > b.mnZ && car.pos.z - HR < b.mxZ) colX = true;
  }
  if (!colX) car.pos.x = nx; else car.speed *= -0.25;
  if (!colZ) car.pos.z = nz; else car.speed *= -0.25;
  car.pos.x = Math.max(-WORLD_H, Math.min(WORLD_H, car.pos.x));
  car.pos.z = Math.max(-WORLD_H, Math.min(WORLD_H, car.pos.z));

  carGroup.position.set(car.pos.x, 0, car.pos.z);
  carGroup.rotation.y = car.angle;

  // ── Feux arrière dynamiques (freinage + marche arrière) ──
  const isBraking  = (brake || touchKeys.down) && car.speed > 0.15;
  const isReversing = car.speed < -0.10;
  if (tlBrakeMat) tlBrakeMat.emissiveIntensity = isBraking ? 5.2 : 1.2;
  if (tlGlowLight) {
    tlGlowLight.color.setHex(isReversing ? 0xffffff : 0xff1800);
    tlGlowLight.intensity = isBraking ? 5.8 : isReversing ? 3.5 : 1.5;
  }
  if (tlReverseMat) {
    tlReverseMat.emissive.setHex(isReversing ? 0xffffff : 0xdddddd);
    tlReverseMat.emissiveIntensity = isReversing ? 4.5 : 0.45;
  }
  if (tlReverseLight) tlReverseLight.intensity = isReversing ? 2.8 : 0;

  // [FIX-1] Visuel roues directrices : signe négligé → -car.steer
  steerFL.rotation.y = -car.steer;
  steerFR.rotation.y = -car.steer;

  // [FIX-2] Rotation des roues
  car.wheelRot += car.speed * dt / 0.27;
  for (const wg of allWheelGroups) wg.rotation.x = car.wheelRot;

  // ── Roulis carrosserie ──
  const yawRate     = (car.angle - car.prevAngle) / (dt + 1e-9);
  car.prevAngle     = car.angle;
  const targetRoll  = -yawRate * Math.abs(car.speed) * 0.028;
  car.roll += (targetRoll - car.roll) * 5.5 * dt;
  carGroup.rotation.z = Math.max(-0.065, Math.min(0.065, car.roll));

  // ── Rebond suspension (petite vibration liée à la vitesse) ──
  const spd = Math.abs(car.speed);
  car.bounce += dt * 14.0;
  const bounceMag = Math.min(spd * 0.0018, 0.018);
  carGroup.position.y = Math.sin(car.bounce) * bounceMag;

  // ── FOV dynamique (sensation de vitesse) ──
  const targetFov = 58 + spd / car.MAX_SPD * 18;
  camera.fov += (targetFov - camera.fov) * 3.0 * dt;
  camera.updateProjectionMatrix();
}


// ─────────────────────────────────────────────────
//  CAMÉRA FOLLOW — 3 modes (C)
// ─────────────────────────────────────────────────
function updateCamera(dt) {
  const f = CAM_S * 60 * dt, lf = LOOK_S * 60 * dt;

  if (camMode === 2) {
    // Vue capot (hood cam)
    const hx = car.pos.x + Math.sin(car.angle) * 1.9;
    const hz = car.pos.z + Math.cos(car.angle) * 1.9;
    camera.position.set(hx, 1.28, hz);
    camLook.x += (car.pos.x + Math.sin(car.angle) * 15 - camLook.x) * lf * 3.5;
    camLook.y += (1.05 - camLook.y) * lf * 3.5;
    camLook.z += (car.pos.z + Math.cos(car.angle) * 15 - camLook.z) * lf * 3.5;
    camera.lookAt(camLook); return;
  }

  const dist   = camMode === 1 ? 6.5 : CAM_DIST;
  const height = camMode === 1 ? 2.3 : CAM_H;

  camPos.x  += (car.pos.x - Math.sin(car.angle) * dist - camPos.x) * f;
  camPos.y  += (height - camPos.y) * f;
  camPos.z  += (car.pos.z - Math.cos(car.angle) * dist - camPos.z) * f;
  camLook.x += (car.pos.x + Math.sin(car.angle) * 3.5 - camLook.x) * lf;
  camLook.y += (1.1 - camLook.y) * lf;
  camLook.z += (car.pos.z + Math.cos(car.angle) * 3.5 - camLook.z) * lf;
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}


// ─────────────────────────────────────────────────
//  MINIMAP — Fond statique précalculé
// ─────────────────────────────────────────────────
const mmCanvas = document.getElementById('minimap-canvas');
const mmCtx    = mmCanvas.getContext('2d');
const MM_SIZE  = 180;
const MM_SCALE = MM_SIZE / (WORLD_H * 2);
const mmBg     = document.createElement('canvas');
mmBg.width = mmBg.height = MM_SIZE;
const mmBgCtx = mmBg.getContext('2d');

function worldToMM(wx, wz) { return [(wx + WORLD_H) * MM_SCALE, (wz + WORLD_H) * MM_SCALE]; }

function precomputeMinimapBg() {
  mmBgCtx.strokeStyle = 'rgba(44,54,38,0.95)';
  mmBgCtx.lineWidth   = ROAD_W * MM_SCALE;
  for (const rx of NS_X) {
    const [mx] = worldToMM(rx, 0);
    mmBgCtx.beginPath(); mmBgCtx.moveTo(mx, 0); mmBgCtx.lineTo(mx, MM_SIZE); mmBgCtx.stroke();
  }
  for (const rz of EW_Z) {
    const [, mz] = worldToMM(0, rz);
    mmBgCtx.beginPath(); mmBgCtx.moveTo(0, mz); mmBgCtx.lineTo(MM_SIZE, mz); mmBgCtx.stroke();
  }
  mmBgCtx.fillStyle = 'rgba(30,40,24,0.82)';
  for (const b of buildingMap) {
    const [mx, mz] = worldToMM(b.x - b.w/2, b.z - b.d/2);
    mmBgCtx.fillRect(mx, mz, b.w * MM_SCALE, b.d * MM_SCALE);
  }
}

function drawMinimap() {
  mmCtx.clearRect(0, 0, MM_SIZE, MM_SIZE);
  mmCtx.drawImage(mmBg, 0, 0);
  const [px, pz] = worldToMM(car.pos.x, car.pos.z);
  mmCtx.save(); mmCtx.translate(px, pz); mmCtx.rotate(-car.angle);
  mmCtx.fillStyle = '#CC0018';
  mmCtx.beginPath(); mmCtx.moveTo(0, 5); mmCtx.lineTo(3.5, -3); mmCtx.lineTo(1.5, -2); mmCtx.lineTo(-1.5, -2); mmCtx.lineTo(-3.5, -3);
  mmCtx.closePath(); mmCtx.fill();
  mmCtx.strokeStyle = '#ff6666'; mmCtx.lineWidth = 0.8; mmCtx.stroke();
  mmCtx.restore();
  mmCtx.fillStyle = '#ffffff';
  mmCtx.beginPath(); mmCtx.arc(px, pz, 2, 0, Math.PI * 2); mmCtx.fill();
}


// ─────────────────────────────────────────────────
//  HUD
// ─────────────────────────────────────────────────
function updateHUD() { drawSpeedGauge(); }


// ─────────────────────────────────────────────────
//  POOL DE POINTLIGHTS DYNAMIQUES
// ─────────────────────────────────────────────────
// Principe : au lieu de garder ~50 PointLights statiques actives en permanence
// (le shader Three.js boucle sur TOUTES les lumières pour chaque fragment),
// on crée un petit pool de N lumières qu'on repositionne chaque frame
// vers les lampadaires les plus proches de la voiture.
// Résultat : le shader ne voit que N lumières → gain GPU massif.
function createLampPool() {
  const dist = IS_LOW_PERF ? 26 : 30;
  for (let i = 0; i < LAMP_POOL_SIZE; i++) {
    const pl = new THREE.PointLight(0xffcc80, 0, dist, 2);
    pl.position.set(0, 8, 9999); // hors scène au départ
    scene.add(pl);
    lampPool.push(pl);
  }
}

// Tampon réutilisable pour éviter les allocations en boucle
const _lpCandBuf = [];
let   _lpTick = 0;

function updateLightPool() {
  // Mise à jour toutes les 4 frames (~15 fois/s à 60fps) — suffisant pour les lamps statiques
  if (++_lpTick % 4 !== 0) return;
  const cx = car.pos.x, cz = car.pos.z;
  const total = lampPositions.length;

  // Remplir le tampon avec distances au carré (pas de sqrt nécessaire pour trier)
  _lpCandBuf.length = 0;
  for (let i = 0; i < total; i++) {
    const lp = lampPositions[i];
    const d2 = (lp.x - cx) * (lp.x - cx) + (lp.z - cz) * (lp.z - cz);
    _lpCandBuf.push({ lp, d2 });
  }
  // Tri par distance croissante
  _lpCandBuf.sort((a, b) => a.d2 - b.d2);

  // Assigner les N lumières les plus proches au pool
  for (let i = 0; i < lampPool.length; i++) {
    const pl = lampPool[i];
    if (i < _lpCandBuf.length) {
      const { lp } = _lpCandBuf[i];
      pl.position.set(lp.x, lp.y, lp.z);
      pl.color.setHex(lp.color);
      pl.intensity = lp.intensity;
    } else {
      pl.intensity = 0; // pool inutilisée → éteindre
    }
  }
}


// ─────────────────────────────────────────────────
//  BOUCLE DE JEU
// ─────────────────────────────────────────────────
let lastTime = 0, gameRunning = false;

function gameLoop(ts) {
  if (!gameRunning) return;
  requestAnimationFrame(gameLoop);
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  updateCar(dt);
  updateCamera(dt);
  updateHUD();
  updateSound();
  updateTrafficLights(dt);
  updateNeons(dt);            // [NEW] pulse néons
  updateExhaust(dt);
  updateSkids(dt);
  updateLightPool();          // [OPT] déplace le pool de PointLights vers les lampes proches
  drawMinimap();
  renderer.render(scene, camera);
}


// ─────────────────────────────────────────────────
//  INIT & DÉMARRAGE
// ─────────────────────────────────────────────────
const loadBar  = document.getElementById('load-bar-fill');
const startBtn = document.getElementById('start-btn');
function setProgress(p) { loadBar.style.width = p + '%'; }

function init() {
  setProgress(10); buildCity();
  setProgress(55); createCar();
  setProgress(80); initExhaust(); initSkidPool();
  setProgress(90); precomputeMinimapBg(); createLampPool(); // [OPT] pool après buildCity (lampPositions remplis)
  setProgress(100);
  renderer.render(scene, camera);
  startBtn.disabled    = false;
  startBtn.textContent = 'Démarrer';
}

function startGame() {
  const ss = document.getElementById('start-screen');
  ss.classList.add('hidden');
  ss.addEventListener('transitionend', () => ss.remove(), { once: true });
  gameRunning = true; lastTime = performance.now();
  initSound();
  requestAnimationFrame(gameLoop);
  setTimeout(() => document.getElementById('controls-hint').classList.add('fade'), 6000);
}

window.addEventListener('load', () => setTimeout(init, 200));
