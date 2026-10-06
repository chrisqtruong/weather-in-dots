(() => {
'use strict';

/* ───────── what we can look at ───────── */

const METRICS = [
  { key: 'temp',     name: 'temperature', hourly: 'temperature_2m',       daily: 'temperature_2m_mean',       unit: 'temp',     ramp: 'thermal', diverge: 'warm', heat: true },
  { key: 'feels',    name: 'feels like',  hourly: 'apparent_temperature', daily: 'apparent_temperature_mean', unit: 'temp',     ramp: 'thermal', diverge: 'warm' },
  { key: 'humidity', name: 'humidity',    hourly: 'relative_humidity_2m', daily: 'relative_humidity_2m_mean', unit: 'pct',      ramp: 'humid', diverge: 'wet' },
  { key: 'dew',      name: 'dew point',   hourly: 'dew_point_2m',         daily: 'dew_point_2m_mean',         unit: 'temp',     ramp: 'dew', diverge: 'warm' },
  { key: 'rain',     name: 'rain',        hourly: 'precipitation',        daily: 'precipitation_sum',         unit: 'precip',   ramp: 'rain', diverge: 'wet', sum: true, sqrt: true, zeroFaint: true },
  { key: 'snow',     name: 'snow',        hourly: 'snowfall',             daily: 'snowfall_sum',              unit: 'snow',     ramp: 'snow', diverge: 'wet', sum: true, sqrt: true, zeroFaint: true },
  { key: 'cloud',    name: 'cloud',       hourly: 'cloud_cover',          daily: 'cloud_cover_mean',          unit: 'pct',      ramp: 'cloud', diverge: 'wet' },
  { key: 'wind',     name: 'wind',        hourly: 'wind_speed_10m',       daily: 'wind_speed_10m_mean',       unit: 'speed',    ramp: 'wind', diverge: 'stir' },
  { key: 'gust',     name: 'gusts',       hourly: 'wind_gusts_10m',       daily: 'wind_gusts_10m_max',        unit: 'speed',    ramp: 'gust', diverge: 'stir' },
  { key: 'pressure', name: 'pressure',    hourly: 'pressure_msl',         daily: 'pressure_msl_mean',         unit: 'pressure', ramp: 'pressure', diverge: 'stir' },
  { key: 'sun',      name: 'sunlight',    hourly: 'shortwave_radiation',  daily: 'shortwave_radiation_sum',   unit: 'rad',      ramp: 'sun', diverge: 'warm', zeroFaint: true },
  { key: 'shine',    name: 'sunshine',    hourly: 'sunshine_duration',    daily: 'sunshine_duration',         unit: 'shine',    ramp: 'shine', diverge: 'warm', zeroFaint: true },
];

const SCALES = ['hours', 'days', 'weeks', 'months', 'years', 'radar'];

// Colour ramps, low to high. 'low' is a whisper just above the page colour.
const RAMPS = {
  thermal:  { light: ['#27406e', '#5f84b4', '#a9c0d3', '#e3d3a8', '#e8b873', '#d2713f', '#a53a34', '#6b2233'],
              dark:  ['#8fbcf0', '#5583c4', '#3b5687', '#4a4a5c', '#a8683f', '#d98a45', '#f0b660', '#f8e3a0'] },
  humid:    { light: ['low', '#b9cfae', '#6fae9f', '#2f7f85', '#1d4f6b'], dark: ['low', '#2f6f78', '#4fa39a', '#8fd0b8', '#d6f0d2'] },
  dew:      { light: ['low', '#c2cf9d', '#7fae7a', '#3f8368', '#1f5750'], dark: ['low', '#3f7a62', '#74ab78', '#b3d39a', '#e8efc0'] },
  rain:     { light: ['low', '#a9c2de', '#6a93cf', '#3b5fc0', '#27348f'], dark: ['low', '#3b55a8', '#5b84d6', '#93b7ee', '#d6e6ff'] },
  snow:     { light: ['low', '#c5c0de', '#9388c6', '#62529f', '#3d2f73'], dark: ['low', '#6f67a8', '#a79fd6', '#d8d3ee', '#ffffff'] },
  cloud:    { light: ['#e9c46a', '#eadfb8', '#c9ccd0', '#8f98a6', '#59616f'], dark: ['#f0cf78', '#b9b08e', '#7f8794', '#525b6d', '#343c4f'] },
  wind:     { light: ['low', '#b5cdb8', '#6aa59b', '#377a86', '#234a6b'], dark: ['low', '#35708a', '#56a3a0', '#97d0b4', '#e0f2cf'] },
  gust:     { light: ['low', '#dcb3ad', '#bf7b93', '#8b4a86', '#532a66'], dark: ['low', '#7a4a8a', '#b56a98', '#e39aa0', '#f8d8c0'] },
  pressure: { light: ['#6f4f93', '#a893bd', '#ddd5c5', '#9fbf9a', '#4a8560'], dark: ['#b08fd6', '#75608f', '#3a4257', '#5f8f6c', '#a4d8a0'] },
  sun:      { light: ['low', '#f0dfa8', '#f0c36a', '#e99a4a', '#d9663a'], dark: ['low', '#6a5a86', '#b8788c', '#eeaa6c', '#f8dc88'] },
  shine:    { light: ['low', '#efe0a0', '#edc55f', '#e79f3c', '#d9772b'], dark: ['low', '#8a6a3a', '#c9973f', '#eec45c', '#fbe9a0'] },
  // the change lens: below normal, normal ('mid', close to the paper), above normal
  warm:     { light: ['#1f3f74', '#5b80b5', '#a9bdd0', 'mid', '#e6b08a', '#c9573c', '#7d1f2c'],
              dark:  ['#bcd8ff', '#6b9ad8', '#3a5288', 'mid', '#9c4a3a', '#e06a4a', '#ffc09a'] },
  wet:      { light: ['#7a4e1f', '#b98a52', '#e0c9a0', 'mid', '#9cc4c0', '#3f8f9a', '#1d5469'],
              dark:  ['#f0bb7a', '#a8743e', '#5a4a3a', 'mid', '#2f6f78', '#4fb0b0', '#c4f4ea'] },
  stir:     { light: ['#3f6b4f', '#8fb39a', '#cfd8c8', 'mid', '#d6b4c8', '#a0688f', '#5a2f5f'],
              dark:  ['#b8e6c4', '#6f9f80', '#3a4e44', 'mid', '#6e4a6a', '#b8789e', '#f2c4dc'] },
};
const THEME = {
  light: { low: '#dcd6c6', mid: '#e6dfd0', faint: '#e7e2d6', ink: '#1b1b1a', muted: '#77726a', line: '#cbc3b3' },
  dark:  { low: '#2c3650', mid: '#2b3349', faint: '#212839', ink: '#ece7db', muted: '#8d93a3', line: '#3b455b' },
};

const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';

const NB = 48;            // colour steps
const FAINT = 255;        // bin for "nothing here"
const TAU = Math.PI * 2;
const DAY = 864e5;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const CUM365 = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const CUM366 = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const BASE = [1951, 1980];   // the normal everything is compared with: NASA's baseline for its global record
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/* ───────── state ───────── */

const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('wd:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('wd:' + k, JSON.stringify(v)); } catch { /* private window */ } },
};
const state = {
  place: store.get('place', { name: 'Baltimore', admin: 'Maryland', country: 'United States', lat: 39.29038, lon: -76.61219 }),
  metric: store.get('metric', 'temp'),
  scale: store.get('scale', 'years'),
  units: store.get('units', 'us'),
  lens: store.get('lens', 'change'),      // 'weather' shows the values; 'change' shows how far each sat from normal
  render: store.get('render', 'field'),   // 'dots' or 'field'
  quiet: store.get('hush', true),         // quiet: just the picture, the place, and one line
};
if (!METRICS.some(m => m.key === state.metric)) state.metric = 'temp';
if (state.scale === 'map') state.scale = 'radar';
if (!SCALES.includes(state.scale)) state.scale = 'hours';
const metric = () => METRICS.find(m => m.key === state.metric);
// hours only cover one year, so there's nothing to compare against
const changing = () => state.lens === 'change' && state.scale !== 'hours' && state.scale !== 'radar';

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const mode = () => (darkQuery.matches ? 'dark' : 'light');
const still = matchMedia('(prefers-reduced-motion: reduce)');

/* ───────── colour ───────── */

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function rampColors(m, lens = changing()) {
  const t = THEME[mode()];
  const stops = RAMPS[lens ? m.diverge : m.ramp][mode()].map(s => hex(s === 'low' ? t.low : s === 'mid' ? t.mid : s));
  const out = [];
  for (let i = 0; i < NB; i++) {
    const p = (i / (NB - 1)) * (stops.length - 1);
    const a = Math.min(stops.length - 2, Math.floor(p)), f = p - a;
    const c = stops[a].map((v, k) => Math.round(v + (stops[a + 1][k] - v) * f));
    out.push(`rgb(${c[0]},${c[1]},${c[2]})`);
    out.rgb = out.rgb || []; out.rgb.push(c);
  }
  return out;
}

// Sorts every value into a colour step, stretching the ramp across this place's own range.
function buildBins(vals, m) {
  const n = vals.length, tf = m.sqrt ? Math.sqrt : x => x;
  let lo, hi;
  if (m.domain) [lo, hi] = m.domain;
  else {
    const step = Math.max(1, Math.floor(n / 20000)), sample = [];
    for (let i = 0; i < n; i += step) {
      const v = vals[i];
      if (v === v && !(m.zeroFaint && v <= 0)) sample.push(tf(v));
    }
    sample.sort((a, b) => a - b);
    const q = p => sample[Math.min(sample.length - 1, Math.floor(p * sample.length))];
    lo = m.zeroFaint ? 0 : q(0.02);
    hi = sample.length ? q(0.98) : 1;
    if (!(hi > lo)) hi = lo + 1;
  }
  const bins = new Uint8Array(n), counts = new Uint32Array(NB + 1);
  for (let i = 0; i < n; i++) {
    const v = vals[i];
    let b = FAINT;
    if (v === v && !(m.zeroFaint && v <= 0)) {
      const t = (tf(v) - lo) / (hi - lo);
      b = Math.round((t < 0 ? 0 : t > 1 ? 1 : t) * (NB - 1));
    }
    bins[i] = b;
    counts[b === FAINT ? NB : b]++;
  }
  const lists = Array.from(counts, c => new Uint32Array(c)), at = new Uint32Array(NB + 1);
  for (let i = 0; i < n; i++) { const b = bins[i] === FAINT ? NB : bins[i]; lists[b][at[b]++] = i; }
  const back = m.sqrt ? x => x * x : x => x;
  return { lists, bins, lo: back(lo), hi: back(hi) };
}

/* ───────── words and numbers ───────── */

function fmt(m, v, scale) {
  if (!(v === v)) return '—';
  const us = state.units === 'us', fine = scale === 'hours';
  switch (m.unit) {
    case 'temp': return Math.round(us ? v * 1.8 + 32 : v) + (us ? '°F' : '°C');
    case 'pct': return Math.round(v) + '%';
    case 'precip': return us ? (v / 25.4).toFixed(2) + ' in' : v.toFixed(1) + ' mm';
    case 'snow': return us ? (v / 2.54).toFixed(1) + ' in' : v.toFixed(1) + ' cm';
    case 'speed': return Math.round(us ? v * 0.621371 : v) + (us ? ' mph' : ' km/h');
    case 'pressure': return us ? (v * 0.02953).toFixed(2) + ' inHg' : Math.round(v) + ' hPa';
    case 'rad': return fine ? Math.round(v) + ' W/m²' : v.toFixed(1) + ' MJ/m²';
    case 'shine': return fine ? Math.round(v / 60) + ' min' : (v / 3600).toFixed(1) + ' hr';
  }
  return String(v);
}
// a difference from normal, with its sign: +1.4°F, −12%, +0.3 in
function fmtDelta(m, d, scale) {
  if (!(d === d)) return '—';
  const us = state.units === 'us', sg = x => (x >= 0 ? '+' : '−') + Math.abs(x);
  const fix = (x, k) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(k);
  switch (m.unit) {
    case 'temp': return fix(us ? d * 1.8 : d, 1) + (us ? '°F' : '°C');
    case 'pct': return sg(Math.round(d)) + ' pts';
    case 'precip': return us ? fix(d / 25.4, 2) + ' in' : fix(d, 1) + ' mm';
    case 'snow': return us ? fix(d / 2.54, 1) + ' in' : fix(d, 1) + ' cm';
    case 'speed': return fix(us ? d * 0.621371 : d, 1) + (us ? ' mph' : ' km/h');
    case 'pressure': return us ? fix(d * 0.02953, 2) + ' inHg' : fix(d, 1) + ' hPa';
    case 'rad': return fix(d, 1) + ' MJ/m²';
    case 'shine': return fix(d / 3600, 1) + ' hr';
  }
  return String(d);
}
const hourName = h => (h % 12 || 12) + (h < 12 ? ' am' : ' pm');
const iso = d => d.toISOString().slice(0, 10);

/* ───────── fetching ───────── */

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) {
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    const p = make();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key);
}
async function getJSON(url, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status });
  return r.json();
}
const END = new Date(Date.now() - 6 * DAY);     // the archive runs about five days behind
const pk = p => p.lat.toFixed(3) + ',' + p.lon.toFixed(3);
const at = p => `latitude=${p.lat.toFixed(4)}&longitude=${p.lon.toFixed(4)}&timezone=auto`;

// Everything fetched is kept on this device, so a place you have seen before opens at once
// and the free weather service is asked for each thing only one time.
const shelf = (() => {
  let db;
  const open = () => db || (db = new Promise((res, rej) => {
    const r = indexedDB.open('weather-dots', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  return {
    async get(k) {
      try {
        const d = await open();
        return await new Promise(res => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(); });
      } catch { /* private window */ }
    },
    async set(k, v) { try { (await open()).transaction('kv', 'readwrite').objectStore('kv').put(v, k); } catch { /* fine */ } },
    async sweep(keep) {
      try {
        const st = (await open()).transaction('kv', 'readwrite').objectStore('kv'), q = st.getAllKeys();
        q.onsuccess = () => q.result.forEach(k => { if (!keep(String(k))) st.delete(k); });
      } catch { /* fine */ }
    },
  };
})();
const endDay = iso(END), endMonth = endDay.slice(0, 7);
shelf.sweep(k => k.endsWith('|' + endDay) || k.endsWith('|' + endMonth));
const floats = a => Float32Array.from(a, v => (v == null ? NaN : v));

const loadHourly = p => cached('h' + pk(p), async () => {
  const key = `h|${pk(p)}|${endDay}`, kept = await shelf.get(key);
  if (kept) return kept;
  const start = iso(new Date(END - 364 * DAY));
  const j = await getJSON(`${ARCHIVE}?${at(p)}&start_date=${start}&end_date=${endDay}&hourly=${METRICS.map(m => m.hourly).join(',')}`);
  const out = { start, vals: {} };
  for (const m of METRICS) out.vals[m.key] = floats(j.hourly[m.hourly]);
  shelf.set(key, out);
  return out;
});
const loadDaily = (p, m) => cached('d' + pk(p) + m.key, async () => {
  const key = `d|${pk(p)}|${m.key}|${endMonth}`, kept = await shelf.get(key);
  if (kept) return kept;
  const j = await getJSON(`${ARCHIVE}?${at(p)}&start_date=1940-01-01&end_date=${endDay}&daily=${m.daily}`);
  const out = { start: '1940-01-01', vals: floats(j.daily[m.daily]) };
  shelf.set(key, out);
  return out;
});

// Walks the calendar one day at a time from a starting date.
function eachDay(start, n, fn) {
  let y = +start.slice(0, 4), mo = +start.slice(5, 7) - 1, d = +start.slice(8, 10);
  for (let i = 0; i < n; i++) {
    fn(i, y, mo, d);
    if (++d > DIM[mo] + (mo === 1 && isLeap(y) ? 1 : 0)) { d = 1; if (++mo === 12) { mo = 0; y++; } }
  }
}

function getGrid(p, m, scale) {
  return cached('g' + pk(p) + m.key + scale, async () =>
    scale === 'hours' ? hoursGrid(await loadHourly(p), m) : dailyGrid(await loadDaily(p, m), m, scale));
}

/* ───────── turning data into grids ─────────
   A grid is nx columns by ny rows of numbers, plus how to label and describe each cell.
   The drawing code may lay it on its side if that fits the window better. */

function hoursGrid(json, m) {
  const src = json.vals[m.key], nx = Math.floor(src.length / 24), ny = 24;
  const vals = new Float32Array(nx * ny), days = [];
  eachDay(json.start, nx, (i, y, mo, d) => {
    days.push({ y, m: mo, d });
    for (let h = 0; h < 24; h++) vals[h * nx + i] = src[i * 24 + h];
  });
  const label = d => `${MON[d.m]} ${d.d}, ${d.y}`;
  return {
    nx, ny, vals, cover: true, alignA: 'start',
    ticksA: px => days.map((d, i) => px >= 20 ? { i, label: d.d === 1 ? MON[d.m].toLowerCase() : String(d.d), strong: d.d === 1 }
      : d.d === 1 ? { i, label: MON[d.m].toLowerCase(), strong: true } : null).filter(Boolean),
    ticksB: () => [0, 6, 12, 18].map(h => ({ i: h, label: hourName(h), strong: true })),
    describe: (x, y) => { const d = days[x]; return `${WD[new Date(Date.UTC(d.y, d.m, d.d)).getUTCDay()]}, ${label(d)} · ${hourName(y)}`; },
    caption: `each dot is one hour · ${label(days[0])} to ${label(days[nx - 1])}`,
  };
}

function dailyGrid(json, m, scale) {
  const src = json.vals, n = src.length;
  const Y0 = +json.start.slice(0, 4), Y1 = new Date(Date.parse(json.start) + (n - 1) * DAY).getUTCFullYear(), ny = Y1 - Y0 + 1;
  const yearTicks = px => Array.from({ length: ny }, (_, i) => i).filter(i => px >= 15 || (Y0 + i) % 10 === 0)
    .map(i => ({ i, label: String(Y0 + i), strong: (Y0 + i) % 10 === 0 }));
  const span = `${Y0} to ${Y1}`, kind = m.sum ? 'total' : 'average';

  if (scale === 'days') {
    const nx = 366, vals = new Float32Array(nx * ny).fill(NaN);
    eachDay(json.start, n, (i, y, mo, d) => { vals[(y - Y0) * nx + CUM366[mo] + d - 1] = src[i]; });
    return {
      nx, ny, vals, transposable: true, alignA: 'start',
      ticksA: () => CUM366.map((i, k) => ({ i, label: MON[k].toLowerCase(), strong: true })),
      ticksB: yearTicks,
      kind: 'calendar', Y0, json, m,
      describe: (x, y) => {
        let k = 11; while (CUM366[k] > x) k--;
        const d = x - CUM366[k] + 1;
        return k === 1 && d === 29 && !isLeap(Y0 + y) ? null : `${MON[k]} ${d}, ${Y0 + y}`;
      },
      caption: `each dot is one day · ${span}`,
    };
  }

  const nx = scale === 'weeks' ? 52 : scale === 'months' ? 12 : 1;
  const sum = new Float64Array(nx * ny), cnt = new Uint16Array(nx * ny);
  eachDay(json.start, n, (i, y, mo, d) => {
    const v = src[i]; if (!(v === v)) return;
    const doy = (isLeap(y) ? CUM366 : CUM365)[mo] + d - 1;
    const x = nx === 52 ? Math.min(51, (doy / 7) | 0) : nx === 12 ? mo : 0;
    sum[(y - Y0) * nx + x] += v; cnt[(y - Y0) * nx + x]++;
  });
  // A week, month or year only gets a colour once nearly all of its days are in.
  const vals = new Float32Array(nx * ny).fill(NaN);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const leap = isLeap(Y0 + y), i = y * nx + x;
    const full = nx === 52 ? (x < 51 ? 7 : leap ? 9 : 8) : nx === 12 ? DIM[x] + (x === 1 && leap ? 1 : 0) : leap ? 366 : 365;
    if (cnt[i] / full >= 0.9) vals[i] = m.sum ? sum[i] : sum[i] / cnt[i];
  }

  if (scale === 'weeks') return {
    nx, ny, vals, transposable: true, alignA: 'start', kind: 'calendar', Y0, json, m,
    ticksA: () => CUM365.map((d, k) => ({ i: d / 7, label: MON[k].toLowerCase(), strong: true })),
    ticksB: yearTicks,
    describe: (x, y) => { const d = new Date(Date.UTC(Y0 + y, 0, 1 + x * 7)); return `Week of ${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${Y0 + y}`; },
    caption: `each dot is one week (${kind}) · ${span}`,
  };
  if (scale === 'months') return {
    nx, ny, vals, transposable: true, kind: 'calendar', Y0, json, m,
    ticksA: () => MON.map((s, i) => ({ i, label: s.toLowerCase(), strong: true })),
    ticksB: yearTicks,
    describe: (x, y) => `${MONTHS[x]} ${Y0 + y}`,
    caption: `each dot is one month (${kind}) · ${span}`,
  };
  // years: warming stripes, one column per year, repeated down the page
  const rows = Math.max(8, Math.round(ny * 0.42)), stripes = new Float32Array(ny * rows);
  for (let r = 0; r < rows; r++) for (let y = 0; y < ny; y++) stripes[r * ny + y] = vals[y];
  return {
    nx: ny, ny: rows, vals: stripes, transposable: true, kind: 'years', Y0, json, m,
    ticksA: () => Array.from({ length: ny }, (_, i) => i).filter(i => (Y0 + i) % 10 === 0).map(i => ({ i, label: String(Y0 + i), strong: true })),
    ticksB: () => [],
    describe: x => String(Y0 + x),
    caption: `each stripe is one year (${kind}) · ${span}`,
  };
}

/* ───────── against normal ─────────
   Each cell minus the average of the same day, week or month in 1951–1980 at that place. */

function anomalies(g) {
  if (g.anom) return g.anom;
  const { nx, ny, vals } = g, out = new Float32Array(nx * ny).fill(NaN);
  if (g.kind === 'years') {
    let sum = 0, c = 0;
    for (let x = 0; x < nx; x++) { const y = g.Y0 + x; if (y >= BASE[0] && y <= BASE[1] && vals[x] === vals[x]) { sum += vals[x]; c++; } }
    for (let i = 0; i < vals.length; i++) out[i] = vals[i] - sum / c;
  } else {
    const sum = new Float64Array(nx), cnt = new Uint16Array(nx);
    for (let y = Math.max(0, BASE[0] - g.Y0); y <= Math.min(ny - 1, BASE[1] - g.Y0); y++)
      for (let x = 0; x < nx; x++) { const v = vals[y * nx + x]; if (v === v) { sum[x] += v; cnt[x]++; } }
    let base = Array.from(sum, (v, x) => (cnt[x] ? v / cnt[x] : NaN));
    if (nx === 366) {         // single days are noisy: average each with the two weeks around it
      base = base.map((_, x) => { let a = 0, c = 0; for (let k = -7; k <= 7; k++) { const v = base[(x + k + nx) % nx]; if (v === v) { a += v; c++; } } return a / c; });
    }
    for (let i = 0; i < out.length; i++) out[i] = vals[i] - base[i % nx];
  }
  return (g.anom = out);
}

// The one quiet sentence: how the last ten full years compare with 1951–1980.
function story(g, m) {
  if (g.story !== undefined) return g.story;
  const src = g.json.vals, Y0 = +g.json.start.slice(0, 4), per = new Map();
  eachDay(g.json.start, src.length, (i, y) => {
    const v = src[i]; if (!(v === v)) return;
    let e = per.get(y); if (!e) per.set(y, (e = { sum: 0, n: 0, days: [] }));
    e.sum += v; e.n++; e.days.push(v);
  });
  const full = [...per.entries()].filter(([y, e]) => e.n >= (isLeap(y) ? 366 : 365) * 0.95);
  const recent = full.slice(-10), old = full.filter(([y]) => y >= BASE[0] && y <= BASE[1]);
  if (recent.length < 10 || old.length < 25) return (g.story = '');
  const avg = list => list.reduce((a, [, e]) => a + (m.sum ? e.sum : e.sum / e.n), 0) / list.length;
  const a0 = avg(old), a1 = avg(recent), span = `${recent[0][0]}–${recent[9][0]}`;
  let line = m.sum
    ? `${span}: ${a0 > 0 ? (a1 >= a0 ? '+' : '−') + Math.abs(Math.round((a1 / a0 - 1) * 100)) + '%' : '—'} a year against ${BASE[0]}–${BASE[1]}`
    : `${span}: ${fmtDelta(m, a1 - a0)} against ${BASE[0]}–${BASE[1]}`;
  if (m.heat) {               // days hotter than the hottest tenth of the old normal
    const pool = old.flatMap(([, e]) => e.days).sort((a, b) => a - b), cut = pool[Math.floor(pool.length * 0.9)];
    const count = list => Math.round(list.reduce((a, [, e]) => a + e.days.filter(v => v > cut).length, 0) / list.length);
    line += ` · days averaging over ${fmt(m, cut)}: ${count(old)} → ${count(recent)} a year`;
  }
  return (g.story = line);
}

function binsFor(g, m) {
  if (!changing()) return buildBins(g.vals, m);
  const a = anomalies(g), mags = [];
  for (let i = 0; i < a.length; i++) if (a[i] === a[i]) mags.push(Math.abs(a[i]));
  mags.sort((x, y) => x - y);
  const d = mags[Math.floor(mags.length * 0.97)] || 1;
  return buildBins(a, { domain: [-d, d] });
}

/* ───────── the canvas ───────── */

const stage = $('#stage'), canvas = $('#c'), ctx = canvas.getContext('2d'), glCanvas = $('#gl');
let fieldReady = false;
try { fieldReady = Field.init(glCanvas); } catch (e) { console.warn('field unavailable', e); }
const tip = $('#tip'), statusEl = $('#status');
let W = 0, H = 0, dpr = 1, ML = 48, MT = 26;
const MR = 6, MB = 6;

let grid = null, bins = null, colors = rampColors(metric());
let L = null;                              // layout of the current grid
const view = { k: 1, tx: 0, ty: 0 };       // zoom and pan
let hover = -1, appearAt = 0, raf = 0;

function requestDraw() { if (!raf) raf = requestAnimationFrame(draw); wakeField(); }
function startAppear() { appearAt = still.matches ? -1e9 : performance.now(); requestDraw(); }

// The field runs its own loop so it can keep drifting; it rests when the tab is hidden
// or the visitor prefers less motion.
const fieldOn = () => fieldReady && state.render === 'field' && state.scale !== 'radar' && grid && bins && L;
let fieldRaf = 0, fieldLast = 0;
function wakeField() { if (!fieldRaf) fieldRaf = requestAnimationFrame(fieldTick); }
function fieldTick(now) {
  fieldRaf = 0;
  if (!fieldOn()) { Field.draw(null); return; }
  const appear = Math.min(1, (now - appearAt) / 1300);
  const moving = !still.matches && !document.hidden;
  if (moving && now - fieldLast < 30 && appear >= 1) { fieldRaf = requestAnimationFrame(fieldTick); return; }
  fieldLast = now;
  const s = L.cell * view.k;
  const fading = Field.draw({ dpr, ox: ML + view.tx, oy: MT + view.ty, s, cols: L.cols, rows: L.rows, tr: L.tr,
    clip: [ML, MT, L.aw, L.ah], t: now / 1000, appear, drift: still.matches ? 0 : Math.min(1.1, 9 / s + 0.35), grain: 0.06, blur: Math.max(0.45, Math.min(3.2, 15 / s)) });
  if (moving || fading || appear < 1) fieldRaf = requestAnimationFrame(fieldTick);
}
document.addEventListener('visibilitychange', wakeField);

// hands the current colours to the field, premultiplied; missing cells are see-through
function pushField(crossfade) {
  if (!fieldReady || !grid || !bins) return;
  const n = grid.nx * grid.ny, px = new Uint8Array(n * 4), t = hex(THEME[mode()].faint);
  for (let i = 0; i < n; i++) {
    const b = bins.bins[i], o = i * 4;
    if (b === FAINT) {
      if (grid.vals[i] === grid.vals[i]) { px[o] = t[0] * 0.5; px[o + 1] = t[1] * 0.5; px[o + 2] = t[2] * 0.5; px[o + 3] = 128; }
      continue;
    }
    const c = colors.rgb[b]; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
  }
  Field.setColors(px, grid.nx, grid.ny, crossfade);
  wakeField();
}

function resize() {
  const r = stage.getBoundingClientRect();
  W = Math.max(50, r.width); H = Math.max(50, r.height); dpr = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  glCanvas.width = canvas.width; glCanvas.height = canvas.height; Field.size(canvas.width, canvas.height);
  ML = 48;
  if (grid) resetView();
  if (state.scale === 'radar') Radar.size();
  requestDraw();
}

function resetView() {
  const g = grid, aw = W - ML - MR, ah = H - MT - MB;
  let tr = false;
  if (g.cover) tr = aw < ah;
  else if (g.transposable) tr = Math.min(aw / g.ny, ah / g.nx) > Math.min(aw / g.nx, ah / g.ny) * 1.05;
  const cols = tr ? g.ny : g.nx, rows = tr ? g.nx : g.ny;
  const cell = Math.min(aw / cols, ah / rows, 56);
  L = { aw, ah, tr, cols, rows, cell, kmax: Math.max(1, 72 / cell) };
  view.k = 1; view.tx = view.ty = 0;
  if (g.cover) {            // too long to take in at once: open on the most recent stretch
    view.k = Math.max(1, Math.min(30, (tr ? aw / cols : ah / rows)) / cell);
    view.tx = view.ty = -1e9;
  }
  clampView();
}
function clampView() {
  const s = L.cell * view.k, cw = L.cols * s, ch = L.rows * s;
  view.tx = cw <= L.aw ? (L.aw - cw) / 2 : Math.min(0, Math.max(L.aw - cw, view.tx));
  view.ty = ch <= L.ah ? (L.ah - ch) / 2 : Math.min(0, Math.max(L.ah - ch, view.ty));
}

// A circle drawn by a slightly unsteady hand. The same seed always gives the same wobble.
function blob(x, y, r, seed) {
  const n = 8, px = [], py = [];
  let h = Math.imul(seed + 1, 2654435761) >>> 0;
  const rot = (h % 628) / 100;
  for (let i = 0; i < n; i++) {
    h = (Math.imul(h ^ (h >>> 15), 2246822519) + 374761393) >>> 0;
    const rr = r * (1.04 + ((h & 1023) / 1023 - 0.5) * 0.2), a = rot + (i / n) * TAU;
    px.push(x + Math.cos(a) * rr); py.push(y + Math.sin(a) * rr);
  }
  ctx.moveTo((px[0] + px[n - 1]) / 2, (py[0] + py[n - 1]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.quadraticCurveTo(px[i], py[i], (px[i] + px[j]) / 2, (py[i] + py[j]) / 2);
  }
}
function dot(x, y, r, seed) {
  if (r < 1.3) ctx.rect(x - r, y - r, r * 2, r * 2);
  else if (r < 6) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  else blob(x, y, r, seed);
}

const hushed = () => state.quiet && state.scale !== 'radar';
function draw() {
  raf = 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const p = Math.min(1, (performance.now() - appearAt) / 900);
  if (state.scale !== 'radar' && grid && bins) drawGrid(p);
  if (p < 1) requestDraw();
}

function drawGrid(p) {
  const { cols, rows, tr } = L, s = L.cell * view.k, nx = grid.nx, t = THEME[mode()];
  const r = s < 4 ? s * 0.45 : s * 0.37;
  const c0 = Math.max(0, Math.floor(-view.tx / s)), c1 = Math.min(cols - 1, Math.floor((L.aw - view.tx) / s));
  const r0 = Math.max(0, Math.floor(-view.ty / s)), r1 = Math.min(rows - 1, Math.floor((L.ah - view.ty) / s));
  const ox = ML + view.tx + s / 2, oy = MT + view.ty + s / 2;

  ctx.save();
  ctx.beginPath(); ctx.rect(ML, MT, L.aw, L.ah); ctx.clip();
  for (let b = fieldOn() ? -1 : NB; b >= 0; b--) {
    const list = bins.lists[b]; if (!list.length) continue;
    const small = b === NB ? 0.55 : 1;
    ctx.beginPath();
    for (let n = 0; n < list.length; n++) {
      const idx = list[n], x = idx % nx, y = (idx - x) / nx;
      const col = tr ? y : x, row = tr ? x : y;
      if (col < c0 || col > c1 || row < r0 || row > r1) continue;
      let a = 1;
      if (p < 1) {            // a slow wave, corner to corner
        a = (p - 0.5 * (0.7 * col / cols + 0.3 * row / rows)) / 0.5;
        if (a <= 0) continue;
        a = a >= 1 ? 1 : a * a * (3 - 2 * a);
      }
      dot(ox + col * s, oy + row * s, r * a * small, idx);
    }
    ctx.fillStyle = b === NB ? t.faint : colors[b];
    ctx.fill();
  }
  if (hover >= 0 && grid.kind === 'years') {
    const x = hover % nx, along = tr ? [ML + view.tx, oy - s / 2 + x * s, cols * s, s] : [ox - s / 2 + x * s, MT + view.ty, s, rows * s];
    ctx.strokeStyle = t.ink; ctx.lineWidth = 1.2; ctx.strokeRect(...along);
  } else if (hover >= 0) {
    const x = hover % nx, y = (hover - x) / nx, col = tr ? y : x, row = tr ? x : y;
    ctx.beginPath(); ctx.arc(ox + col * s, oy + row * s, Math.max(r + 3, 5), 0, TAU);
    ctx.strokeStyle = t.ink; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.restore();
  if (hushed()) return;

  // labels along the top and down the side
  ctx.font = '13px Newsreader, Georgia, serif';
  ctx.textBaseline = 'middle';
  const A = grid.ticksA(s), B = grid.ticksB(s);
  const top = tr ? B : A, side = tr ? A : B;
  const topStart = !tr && grid.alignA === 'start';
  let lastX = -1e9;
  ctx.textAlign = topStart ? 'left' : 'center';
  for (const pass of [true, false]) {
    const placed = [];
    for (const k of top) {
      if (k.strong !== pass) continue;
      const x = ML + view.tx + (topStart ? k.i * s + 1 : (k.i + 0.5) * s);
      const w = ctx.measureText(k.label).width, x0 = topStart ? x : x - w / 2;
      if (x0 < ML - 2 || x0 + w > W) continue;
      if (pass) { if (x0 < lastX + 10) continue; lastX = x0 + w; }
      else if (drawnTop.some(q => x0 < q[1] + 6 && x0 + w > q[0] - 6)) continue;
      placed.push([x0, x0 + w]);
      ctx.fillStyle = t.muted; ctx.globalAlpha = pass ? 1 : 0.65;
      ctx.fillText(k.label, x, MT / 2 + Math.max(0, view.ty));
    }
    if (pass) var drawnTop = placed; else drawnTop.push(...placed);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'right';
  let lastY = -1e9;
  const sideStart = tr && grid.alignA === 'start';
  for (const k of side) {
    if (!k.strong && s < 15) continue;
    const y = MT + view.ty + (sideStart ? k.i * s + 7 : (k.i + 0.5) * s);
    if (y < MT + 4 || y > H - 4 || y < lastY + 15) continue;
    lastY = y;
    ctx.fillStyle = t.muted; ctx.globalAlpha = k.strong ? 1 : 0.65;
    ctx.fillText(k.label, ML - 9 + Math.max(0, view.tx), y);
  }
  ctx.globalAlpha = 1;
}

/* ───────── pointer: drag to move, wheel or pinch to zoom, hover to read ───────── */

const ptrs = new Map();
function pan(dx, dy) {
  if (L) { view.tx += dx; view.ty += dy; clampView(); }
  requestDraw();
}
function zoomAt(x, y, f) {
  if (L) {
    const k = Math.max(1, Math.min(L.kmax, view.k * f)), g = k / view.k;
    view.tx = x - ML - (x - ML - view.tx) * g; view.ty = y - MT - (y - MT - view.ty) * g;
    view.k = k; clampView();
  }
  requestDraw();
}
function readAt(x, y) {
  let text = null, value = null;
  if (grid && L) {
    const s = L.cell * view.k, col = Math.floor((x - ML - view.tx) / s), row = Math.floor((y - MT - view.ty) / s);
    hover = -1;
    if (x >= ML && y >= MT && col >= 0 && row >= 0 && col < L.cols && row < L.rows) {
      const gx = L.tr ? row : col, gy = L.tr ? col : row;
      text = grid.describe(gx, gy);
      if (text) {
        hover = gy * grid.nx + gx;
        value = fmt(metric(), grid.vals[hover], state.scale);
        if (metric().sum && state.scale !== 'hours' && state.scale !== 'days' && value !== '—') value += ' in all';
        if (changing() && value !== '—') { text += ' · ' + value; value = fmtDelta(metric(), anomalies(grid)[hover]) + ' from normal'; }
      }
    }
  }
  if (text) {
    tip.innerHTML = '<b></b><span></span>';
    tip.firstChild.textContent = value; tip.lastChild.textContent = text;
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(4, Math.min(W - tw - 4, x + 16 + tw > W ? x - tw - 14 : x + 16)) + 'px';
    tip.style.top = Math.max(4, Math.min(H - th - 4, y - th - 12 < 0 ? y + 18 : y - th - 12)) + 'px';
  } else tip.hidden = true;
  requestDraw();
}
function clearHover() { hover = -1; tip.hidden = true; requestDraw(); }
const xy = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, xy(e));
  if (e.pointerType !== 'mouse' && ptrs.size === 1) readAt(xy(e).x, xy(e).y);
});
canvas.addEventListener('pointermove', e => {
  const now = xy(e), was = ptrs.get(e.pointerId);
  if (!was) { if (e.pointerType === 'mouse') readAt(now.x, now.y); return; }
  if (ptrs.size === 1) {
    const dx = now.x - was.x, dy = now.y - was.y;
    if (!canvas.classList.contains('dragging') && Math.hypot(dx, dy) < 3) return;
    canvas.classList.add('dragging'); clearHover();
    pan(dx, dy);
  } else if (ptrs.size === 2) {
    const other = [...ptrs.entries()].find(([id]) => id !== e.pointerId)[1];
    const d0 = Math.hypot(was.x - other.x, was.y - other.y), d1 = Math.hypot(now.x - other.x, now.y - other.y);
    clearHover();
    if (d0 > 0) zoomAt((now.x + other.x) / 2, (now.y + other.y) / 2, d1 / d0);
    pan((now.x - was.x) / 2, (now.y - was.y) / 2);
  }
  ptrs.set(e.pointerId, now);
});
const release = e => { ptrs.delete(e.pointerId); if (!ptrs.size) canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !ptrs.size) clearHover(); });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const { x, y } = xy(e);
  zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)));
  if (!tip.hidden) readAt(x, y);
}, { passive: false });
canvas.addEventListener('dblclick', e => { const { x, y } = xy(e); zoomAt(x, y, 1.8); });

$('#zin').onclick = () => (state.scale === 'radar' ? Radar.zoomIn() : zoomAt(W / 2, H / 2, 1.6));
$('#zout').onclick = () => (state.scale === 'radar' ? Radar.zoomOut() : zoomAt(W / 2, H / 2, 1 / 1.6));
$('#zfit').onclick = () => {
  if (state.scale === 'radar') Radar.home(state.place);
  else if (grid) { resetView(); if (grid.cover) { view.k = 1; view.tx = view.ty = 0; clampView(); } }
  requestDraw();
};

/* ───────── the page around the canvas ───────── */

function setStatus(text) { statusEl.hidden = !text; statusEl.textContent = text; }
function fail(err, retry) {
  console.error(err);
  stage.classList.add('loading');
  statusEl.hidden = false;
  const why = err && err.status === 429 ? 'The free archive only hands out so much history an hour, and we have had our share. Places you have already opened are kept on this device.' : 'The weather archive did not answer.';
  statusEl.innerHTML = '<span></span>';
  statusEl.firstChild.textContent = why + ' ';
  statusEl.firstChild.append(Object.assign(document.createElement('button'), { textContent: 'Try again' }));
  statusEl.querySelector('button').onclick = retry;
}

function updateLegend() {
  const radar = state.scale === 'radar', m = radar ? METRICS.find(x => x.key === 'rain') : metric(), b = radar ? null : bins;
  colors = rampColors(m, !radar && changing());
  $('#story').textContent = $('#quietStory').textContent = changing() && grid && grid.json ? story(grid, m) : '';
  if (grid && !radar) {
    const each = grid.caption.split(' · ')[0].replace(/ \((average|total)\)/, '')
      .replace(/^each (dot|stripe) is one (\w+)/, (_, what, unit) => `one ${what} ${unit === 'hour' ? 'an' : 'a'} ${unit}`);
    $('#gist').textContent = `${m.name} · ${each}` + (changing() ? `, against ${BASE[0]}–${BASE[1]}` : '');
  }
  if (radar) {
    $('#lo').textContent = 'drizzle'; $('#hi').textContent = 'downpour';
    $('#ramp').innerHTML = Array.from({ length: 11 }, (_, i) => `<i style="background:${colors[Math.round(i / 10 * (NB - 1))]}"></i>`).join('');
    $('#mark').style.background = colors[Math.round(NB * 0.72)];
    Radar.theme(mode(), colors.slice(Math.round(NB * 0.15)), THEME[mode()].faint);
    return;
  }
  $('#ramp').innerHTML = Array.from({ length: 11 }, (_, i) => `<i style="background:${colors[Math.round(i / 10 * (NB - 1))]}"></i>`).join('');
  $('#mark').style.background = colors[Math.round(NB * (changing() ? 0.9 : 0.72))];
  if (!b) { $('#lo').textContent = $('#hi').textContent = ''; return; }
  if (changing()) {
    $('#lo').textContent = fmtDelta(m, b.lo); $('#hi').textContent = fmtDelta(m, b.hi);
    if (grid) $('#caption').textContent = grid.caption.replace(/ \((average|total)\)/, '') + ` · against ${BASE[0]}–${BASE[1]}`;
  } else {
    $('#lo').textContent = fmt(m, b.lo, state.scale);
    $('#hi').textContent = fmt(m, b.hi, state.scale);
    if (grid) $('#caption').textContent = grid.caption;
  }
}

function paintChrome() {
  const p = state.place;
  $('#place').innerHTML = '<span></span><small></small>';
  $('#place').firstChild.textContent = p.name;
  $('#place').lastChild.textContent = [p.admin, p.country].filter(Boolean).join(', ');
  $('#units').textContent = state.units === 'us' ? '°F · mph · in' : '°C · km/h · mm';
  document.querySelectorAll('#metrics button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === state.metric));
  document.querySelectorAll('#scales button').forEach(b => b.setAttribute('aria-selected', b.dataset.k === state.scale));
  document.querySelectorAll('#lens button').forEach(b => { b.setAttribute('aria-pressed', b.dataset.k === state.lens); b.disabled = state.scale === 'hours' && b.dataset.k === 'change'; });
  document.querySelectorAll('#render button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === state.render));
  $('#quietBtn').setAttribute('aria-checked', hushed());
  document.body.classList.toggle('is-quiet', hushed());
  planet.el.dataset.units = state.units;
  document.querySelectorAll('#metrics button').forEach(b => {
    const c = rampColors(METRICS.find(m => m.key === b.dataset.k), false);
    b.firstChild.style.setProperty('--sw', c[Math.round(NB * 0.72)]);
  });
}

// what the radar is showing, and what is under the pointer
function radarInfo(i) {
  if (!i) { tip.hidden = true; return; }
  if (i.error) { fail(new Error('radar'), () => refresh(true)); return; }
  const t = new Date(i.time * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  $('#caption').textContent = `rain on radar · ${t}${i.newest ? ', the latest' : ''}`;
  if (i.here) {
    tip.innerHTML = '<b></b><span></span>';
    tip.firstChild.textContent = i.here.words; tip.lastChild.textContent = t;
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(4, Math.min(W - tw - 4, i.here.x + 16)) + 'px';
    tip.style.top = Math.max(4, i.here.y - th - 12) + 'px';
  } else tip.hidden = true;
}

let token = 0;
async function refresh(reset) {
  const my = ++token, m = metric();
  clearHover(); paintChrome();
  const radar = state.scale === 'radar';
  document.body.classList.toggle('on-radar', radar);
  if (radar) {
    setStatus(''); stage.classList.remove('loading');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); Field.draw(null);
    updateLegend();
    $('#caption').textContent = 'rain on radar, the last two hours';
    Radar.show(state.place, radarInfo);
    return;
  }
  Radar.hide();
  stage.classList.add('loading');
  const slow = setTimeout(() => { if (my === token) setStatus(state.scale === 'hours' ? 'gathering a year of hours…' : 'gathering every day since 1940…'); }, 250);
  try {
    const g = await getGrid(state.place, m, state.scale);
    if (my !== token) return;
    const sameShape = grid && L && grid.nx === g.nx && grid.ny === g.ny && !reset;
    grid = g; bins = binsFor(g, m);
    if (!sameShape) resetView();
    setStatus(''); stage.classList.remove('loading');
    updateLegend(); pushField(false); startAppear();
  } catch (e) {
    if (my === token) fail(e, () => refresh(reset));
  } finally { clearTimeout(slow); }
}

// the whole planet, as a hairline along the top
const planet = (() => {
  const el = $('#planet');
  const ramp = () => rampColors(METRICS[0], true);
  const api = Planet.mount(el, t => { const c = ramp(); return c[Math.round((t * 0.5 + 0.5) * (NB - 1))]; });
  return { el, repaint: api.repaint };
})();

// metric list and dot-size tabs
$('#metrics').innerHTML = METRICS.map(m => `<button data-k="${m.key}"><i></i>${m.name}</button>`).join('');
$('#metrics').onclick = e => {
  const b = e.target.closest('button'); if (!b || b.dataset.k === state.metric) return;
  state.metric = b.dataset.k; store.set('metric', state.metric);
  if (state.scale === 'radar') { state.scale = 'hours'; store.set('scale', 'hours'); refresh(true); } else refresh(false);
};
$('#scales').innerHTML = SCALES.map(s => (s === 'radar' ? '<span class="sep"></span>' : '') + `<button role="tab" data-k="${s}">${s}</button>`).join('');
$('#scales').onclick = e => {
  const b = e.target.closest('button'); if (!b || b.dataset.k === state.scale) return;
  state.scale = b.dataset.k; store.set('scale', state.scale); refresh(true);
};
// weather or change: the same cells, recoloured, melting from one into the other
$('#lens').onclick = e => {
  const b = e.target.closest('button'); if (!b || b.disabled || b.dataset.k === state.lens) return;
  state.lens = b.dataset.k; store.set('lens', state.lens);
  if (!grid || state.scale === 'radar') { paintChrome(); return; }
  bins = binsFor(grid, metric()); paintChrome(); updateLegend(); clearHover();
  if (fieldOn()) pushField(true); else startAppear();
};
$('#render').onclick = e => {
  const b = e.target.closest('button'); if (!b || b.dataset.k === state.render) return;
  state.render = b.dataset.k; store.set('render', state.render);
  paintChrome(); pushField(false); startAppear();
};
// quiet: a switch, not a timer. On, the controls step away and the picture fills the page;
// you can still hover to read it. The place name brings everything back.
function setQuiet(on) {
  if (on && state.scale === 'radar') { state.scale = 'years'; store.set('scale', 'years'); refresh(true); }
  state.quiet = on; store.set('hush', on);
  stage.classList.add('settling');
  paintChrome(); updateLegend(); clearHover(); requestDraw();
  setTimeout(() => stage.classList.remove('settling'), 60);
}
$('#quietBtn').onclick = () => setQuiet(!hushed());
$('#place').onclick = () => { if (hushed()) { setQuiet(false); setTimeout(() => q.focus(), 80); } };
addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'q' && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea/i.test(document.activeElement.tagName)) setQuiet(!hushed());
});

$('#units').onclick = () => {
  state.units = state.units === 'us' ? 'si' : 'us'; store.set('units', state.units);
  paintChrome(); updateLegend(); clearHover();
};

// search
const q = $('#q'), results = $('#results');
let found = [], picked = -1, searchTimer = 0, searchAbort = null;
function showResults() {
  results.hidden = false;
  results.innerHTML = '';
  if (!found.length) { results.innerHTML = '<li class="none">Nowhere by that name yet. Keep typing.</li>'; return; }
  found.forEach((r, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option'); li.setAttribute('aria-selected', i === picked);
    li.textContent = r.name;
    const sm = document.createElement('small'); sm.textContent = [r.admin1, r.country].filter(Boolean).join(', ');
    li.append(sm);
    li.onpointerdown = e => { e.preventDefault(); choose(i); };
    results.append(li);
  });
}
function choose(i) {
  const r = found[i]; if (!r) return;
  state.place = { name: r.name, admin: r.admin1 || '', country: r.country || '', lat: r.latitude, lon: r.longitude };
  store.set('place', state.place);
  q.value = ''; results.hidden = true; q.blur();
  refresh(true);
}
q.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const term = q.value.trim();
  if (term.length < 2) { results.hidden = true; return; }
  searchTimer = setTimeout(async () => {
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    try {
      const res = await getJSON(`${GEOCODE}?name=${encodeURIComponent(term)}&count=6&language=en`, searchAbort.signal);
      found = res.results || []; picked = found.length ? 0 : -1; showResults();
    } catch { /* superseded by the next keystroke, or offline */ }
  }, 160);
});
q.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!found.length) return;
    e.preventDefault(); picked = (picked + (e.key === 'ArrowDown' ? 1 : found.length - 1)) % found.length; showResults();
  } else if (e.key === 'Enter') choose(picked);
  else if (e.key === 'Escape') { results.hidden = true; q.blur(); }
});
q.addEventListener('blur', () => { results.hidden = true; });
q.addEventListener('focus', () => { if (q.value.trim().length >= 2 && found.length) showResults(); });

// about the data: opens as a sheet; closes with ×, Escape, or a click outside it
const about = $('#about');
$('#aboutOpen').onclick = () => about.showModal();
$('#aboutClose').onclick = () => about.close();
about.addEventListener('click', e => { if (e.target === about) about.close(); });

darkQuery.addEventListener('change', () => { paintChrome(); updateLegend(); pushField(false); requestDraw(); planet.repaint(); });
Radar.init(stage, window.L);
new ResizeObserver(resize).observe(stage);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestDraw);

resize();
refresh(true);
})();
