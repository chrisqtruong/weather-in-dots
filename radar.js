/* The radar view: a quiet, labelled map with the last two hours of rain drawn as dots.
   Radar from RainViewer, map tiles from CARTO and OpenStreetMap. Loaded by app.js as window.Radar. */
(() => {
'use strict';

const TAU = Math.PI * 2;
const GAP = 9;              // pixels between dots
const MAXZ = 7;             // the free radar stops at zoom 7; closer in, we stretch it
// RainViewer's "Universal Blue" colours, reflectivity in dBZ for each one
const DBZ = new Map(Object.entries({'-10':'63615914','-9':'66635a19','-8':'69665c1e','-7':'6c685d24','-6':'6f6b5f29','-5':'726e612e','-4':'75706234','-3':'78736439','-2':'7c75653e','-1':'7f786744','0':'827b6949','1':'857d6a4e','2':'88806c54','3':'8b826d59','4':'8e856f5e','5':'92887164','6':'9e93756e','7':'aa9e7978','8':'b6a97e82','9':'c2b4828c','10':'cec08796','11':'d2c48ba0','12':'d6c88faa','13':'dacc93b4','14':'ded097be','15':'88ddeeff','16':'6cd1ebff','17':'51c5e8ff','18':'36bae5ff','19':'1baee2ff','20':'00a3e0ff','21':'009ad5ff','22':'0091caff','23':'0088bfff','24':'007fb4ff','25':'0077aaff','26':'0070a3ff','27':'00699cff','28':'006295ff','29':'005b8eff','30':'005588ff','31':'005180ff','32':'004e78ff','33':'004a70ff','34':'004768ff','35':'ffee00ff','36':'ffe000ff','37':'ffd200ff','38':'ffc500ff','39':'ffb700ff','40':'ffaa00ff','41':'ff9f00ff','42':'ff9500ff','43':'ff8b00ff','44':'ff8100ff','45':'ff4400ff','46':'f23600ff','47':'e62800ff','48':'d91b00ff','49':'cd0d00ff','50':'c10000ff','51':'a80000ff','52':'8f0000ff','53':'760000ff','54':'5d0000ff','55':'ffaaffff','56':'ff9fffff','57':'ff95ffff','58':'ff8bffff','59':'ff81ffff','60':'ff77ffff','61':'ff6cffff','62':'ff62ffff','63':'ff58ffff','64':'ff4effff'}).map(([d, h]) => [parseInt(h, 16) >>> 0, +d]));

let L, map, root, base, labels, over, ctx, frames = [], host = '', cur = 0, timer = 0, token = 0;
let W = 0, H = 0, dpr = 1, colors = [], faint = '', hoverAt = null, onInfo = () => {};

function decode(r, g, b, a) {
  if (!a) return -99;
  const k = (((r << 24) | (g << 16) | (b << 8) | a) >>> 0);
  if (DBZ.has(k)) return DBZ.get(k);
  let best = -99, bd = 1e9;                           // nearest colour, for edges the tiles blend
  for (const [c, d] of DBZ) {
    const q = ((c >>> 24) - r) ** 2 + ((c >>> 16 & 255) - g) ** 2 + ((c >>> 8 & 255) - b) ** 2 + ((c & 255) - a) ** 2;
    if (q < bd) { bd = q; best = d; }
  }
  return best;
}
// light drizzle starts around 15 dBZ; 50 and up is a downpour
const level = d => (d < 12 ? -1 : Math.min(1, (d - 12) / 40));
const words = d => d < 12 ? null : d < 20 ? 'light rain' : d < 30 ? 'steady rain' : d < 40 ? 'heavy rain' : d < 50 ? 'downpour' : 'storm cell';

function init(stage, leaflet) {
  L = leaflet;
  root = document.createElement('div'); root.id = 'radar'; root.hidden = true;
  stage.prepend(root);
  map = L.map(root, { zoomControl: false, attributionControl: true, minZoom: 3, maxZoom: 10, zoomSnap: 0.5, worldCopyJump: true });
  map.attributionControl.setPrefix(false);
  // Esri's grey canvas: a plain base under the dots, place names in their own layer above them
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  base = L.tileLayer(ESRI + 'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16,
    attribution: 'Radar <a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a> · Map <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
  map.createPane('labels').style.zIndex = 500;
  map.getPane('labels').style.pointerEvents = 'none';
  labels = L.tileLayer(ESRI + 'World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, pane: 'labels' }).addTo(map);
  over = document.createElement('canvas'); over.className = 'radar-dots';
  root.append(over);
  ctx = over.getContext('2d');
  map.on('movestart zoomstart', () => { token++; clearTimeout(timer); ctx.clearRect(0, 0, W, H); hoverAt = null; });
  map.on('moveend', () => sample());
  root.addEventListener('pointermove', e => { const r = root.getBoundingClientRect(); hoverAt = [e.clientX - r.left, e.clientY - r.top]; info(); });
  root.addEventListener('pointerleave', () => { hoverAt = null; onInfo(null); });
}

function theme(mode, ramp, faintColor) {
  colors = ramp; faint = faintColor;
  const tone = mode === 'dark' ? 'Dark' : 'Light', ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  base.setUrl(`${ESRI}World_${tone}_Gray_Base/MapServer/tile/{z}/{y}/{x}`);
  labels.setUrl(`${ESRI}World_${tone}_Gray_Reference/MapServer/tile/{z}/{y}/{x}`);
  root.dataset.mode = mode;
  paint();
}

function size() {
  const r = root.getBoundingClientRect();
  W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1);
  over.width = Math.round(W * dpr); over.height = Math.round(H * dpr);
  map.invalidateSize();
}

async function show(place, info) {
  onInfo = info;
  root.hidden = false; size();
  map.setView([place.lat, place.lon], 7, { animate: false });
  L.circleMarker([place.lat, place.lon], { radius: 5, weight: 1.5, fill: false, className: 'here' }).addTo(map);
  sample();
}
function hide() { root.hidden = true; token++; clearTimeout(timer); }

const load = src => new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

// For each radar frame: lay its tiles under the window, then read one value per dot.
async function sample() {
  if (root.hidden) return;
  const my = ++token;
  clearTimeout(timer);
  try {
    const j = await (await fetch('https://api.rainviewer.com/public/weather-maps.json', { cache: 'no-store' })).json();
    host = j.host; frames = j.radar.past.map(f => ({ time: f.time, path: f.path, vals: null }));
  } catch { onInfo({ error: true }); return; }
  if (my !== token) return;
  const z = map.getZoom(), zt = Math.min(MAXZ, Math.floor(z)), s = 2 ** (z - zt) * 256;
  const min = map.getPixelBounds().min, n = 2 ** zt;
  const x0 = Math.floor(min.x / s), x1 = Math.floor((min.x + W) / s), y0 = Math.max(0, Math.floor(min.y / s)), y1 = Math.min(n - 1, Math.floor((min.y + H) / s));
  // dots sit on a lattice fixed to the earth, so they don't swim as you pan
  const gx = Math.ceil(min.x / GAP) * GAP - min.x, gy = Math.ceil(min.y / GAP) * GAP - min.y;
  const cols = Math.ceil((W - gx) / GAP), rows = Math.ceil((H - gy) / GAP);
  const off = new OffscreenCanvas(Math.ceil(W), Math.ceil(H)), oc = off.getContext('2d', { willReadFrequently: true });
  oc.imageSmoothingEnabled = false;
  const grid = { gx, gy, cols, rows };
  // newest first, so the present shows up soonest
  for (let k = frames.length - 1; k >= 0; k--) {
    const f = frames[k], jobs = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const tx = ((x % n) + n) % n;
      jobs.push(load(`${host}${f.path}/256/${zt}/${tx}/${y}/2/0_0.png`).then(img => img && oc.drawImage(img, x * s - min.x, y * s - min.y, s, s)));
    }
    oc.clearRect(0, 0, off.width, off.height);
    await Promise.all(jobs);
    if (my !== token) return;
    const data = oc.getImageData(0, 0, off.width, off.height).data, vals = new Float32Array(cols * rows), w = off.width;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = Math.round(gx + c * GAP), y = Math.round(gy + r * GAP), i = (y * w + x) * 4;
      vals[r * cols + c] = x < w && y < off.height ? decode(data[i], data[i + 1], data[i + 2], data[i + 3]) : -99;
    }
    f.vals = vals; f.grid = grid;
    if (k === frames.length - 1) { cur = k; paint(); info(); }
  }
  if (my === token) play(my);
}

// Loops through the last two hours, resting on the newest frame.
function play(my) {
  const next = () => {
    if (my !== token || root.hidden) return;
    cur = (cur + 1) % frames.length;
    paint(); info();
    timer = setTimeout(next, cur === frames.length - 1 ? 1600 : 260);
  };
  timer = setTimeout(next, 1600);
}

function paint() {
  const f = frames[cur];
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!f || !f.vals) return;
  const { gx, gy, cols, rows } = f.grid, NB = colors.length;
  const buckets = Array.from({ length: NB }, () => []);
  for (let i = 0; i < f.vals.length; i++) { const t = level(f.vals[i]); if (t >= 0) buckets[Math.round(t * (NB - 1))].push(i); }
  for (let b = 0; b < NB; b++) {
    if (!buckets[b].length) continue;
    const r = 1.6 + (b / (NB - 1)) * 2.4;
    ctx.beginPath();
    for (const i of buckets[b]) { const x = gx + (i % cols) * GAP, y = gy + Math.floor(i / cols) * GAP; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
    ctx.fillStyle = colors[b]; ctx.globalAlpha = 0.9; ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function info() {
  const f = frames[cur];
  if (!f) return;
  let here = null;
  if (hoverAt && f.vals) {
    const { gx, gy, cols, rows } = f.grid, c = Math.round((hoverAt[0] - gx) / GAP), r = Math.round((hoverAt[1] - gy) / GAP);
    if (c >= 0 && r >= 0 && c < cols && r < rows) here = { x: hoverAt[0], y: hoverAt[1], words: words(f.vals[r * cols + c]) || 'dry' };
  }
  onInfo({ time: f.time, newest: cur === frames.length - 1, index: cur, count: frames.length, here });
}

window.Radar = { init, theme, show, hide, size, zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut(), home: p => map.setView([p.lat, p.lon], 7) };
})();
