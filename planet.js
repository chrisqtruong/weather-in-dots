/* The planet, as one hairline: every year since 1850, coloured by how far the whole Earth's
   temperature sat from its 20th-century average. Data from NOAA's National Centers for
   Environmental Information; a saved copy is used if NOAA can't be reached. */
(() => {
'use strict';
const LIVE = `https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/12/12/1850-${new Date().getFullYear()}/data.json`;
const SAVED = 'media/planet-noaa.json';

async function years() {
  try {
    const r = await fetch(LIVE); if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    return Object.entries(j.data).map(([y, v]) => [+y, +(v.departure ?? v.anomaly ?? v.value)]).filter(([, v]) => v === v);
  } catch {
    const j = await (await fetch(SAVED)).json();
    return Object.entries(j.years).map(([y, v]) => [+y, v]);
  }
}

function mount(el, colorFor) {
  const cv = el.querySelector('canvas'), label = el.querySelector('span'), g = cv.getContext('2d');
  let data = [], hover = -1;
  const paint = () => {
    if (!data.length) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = el.clientWidth, H = el.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const max = Math.max(...data.map(d => Math.abs(d[1])));
    for (let i = 0; i < data.length; i++) {
      const x0 = Math.floor(i / data.length * cv.width), x1 = Math.floor((i + 1) / data.length * cv.width);
      g.fillStyle = colorFor(data[i][1] / max);
      g.fillRect(x0, 0, x1 - x0, cv.height);
    }
  };
  years().then(d => { data = d; paint(); });
  new ResizeObserver(paint).observe(el);
  el.addEventListener('pointermove', e => {
    if (!data.length) return;
    const r = el.getBoundingClientRect(), i = Math.min(data.length - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * data.length)));
    if (i === hover) return;
    hover = i;
    const [y, v] = data[i], f = el.dataset.units === 'us';
    const d = f ? v * 1.8 : v, u = f ? '°F' : '°C';
    label.textContent = `the whole planet, ${y} · ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}${u} vs its 20th-century average`;
    label.style.left = Math.min(r.width - label.offsetWidth - 8, Math.max(8, e.clientX - r.left - label.offsetWidth / 2)) + 'px';
    el.classList.add('show');
  });
  el.addEventListener('pointerleave', () => { hover = -1; el.classList.remove('show'); });
  return { repaint: paint };
}

window.Planet = { mount };
})();
