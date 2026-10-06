// Records the demo clip and stills from saved data, with a fake clock so every frame is exact.
// Needs: npm i playwright, the page served on localhost:4322, and data/houston-temp.json
// (an Open-Meteo archive response for Houston, daily temperature_2m_mean, 1940 on).
const { chromium } = require('playwright');
const fs = require('fs');
const P = { name: 'Houston', admin: 'Texas', country: 'United States', lat: 29.7633, lon: -95.3633 };
const json = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };

(async () => {
  const b = await chromium.launch();
  const open = async (opts, prefs) => {
    const ctx = await b.newContext(opts);
    await ctx.route(/archive-api/, r => r.fulfill({ path: 'data/houston-temp.json', headers: json }));
    await ctx.route(/ncei\.noaa\.gov/, r => r.fulfill({ path: 'media/planet-noaa.json', headers: json, status: 404 }));
    await ctx.route(/rainviewer|arcgisonline/, r => r.abort());
    await ctx.addInitScript(([p, prefs]) => {
      localStorage['wd:place'] = JSON.stringify(p);
      for (const [k, v] of Object.entries({ metric: 'temp', units: 'us', hush: false, ...prefs })) localStorage['wd:' + k] = JSON.stringify(v);
    }, [P, prefs]);
    return ctx;
  };

  // stills
  for (const [name, prefs, scheme] of [
    ['stripes-houston-dark', { scale: 'years', lens: 'change', render: 'field' }, 'dark'],
    ['stripes-houston-light', { scale: 'years', lens: 'change', render: 'field' }, 'light'],
    ['weeks-houston-dark', { scale: 'weeks', lens: 'weather', render: 'dots' }, 'dark'],
  ]) {
    const ctx = await open({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme }, prefs);
    const pg = await ctx.newPage(); await pg.goto('http://localhost:4322/'); await pg.waitForTimeout(3000);
    await pg.addStyleTag({ content: '.zoom{display:none!important}' }); await pg.waitForTimeout(300);
    await pg.locator('#stage').screenshot({ path: `media/${name}.png` });
    await ctx.close();
  }

  // the clip
  fs.rmSync('frames', { recursive: true, force: true }); fs.mkdirSync('frames');
  const ctx = await open({ viewport: { width: 1120, height: 700 }, deviceScaleFactor: 1, colorScheme: 'dark' }, { scale: 'weeks', lens: 'weather', render: 'field' });
  const pg = await ctx.newPage();
  await pg.clock.install({ time: new Date('2026-10-05T12:00:00') });
  await pg.goto('http://localhost:4322/');
  await pg.waitForTimeout(2000);
  await pg.clock.pauseAt(new Date('2026-10-05T12:10:00'));
  await pg.evaluate(() => document.fonts.ready);
  let n = 0; const dt = 1000 / 15;
  const shoot = async ms => { for (let t = 0; t < ms; t += dt) { await pg.clock.runFor(dt); await pg.screenshot({ path: `frames/${String(n++).padStart(4, '0')}.png` }); } };
  const click = async sel => { await pg.click(sel); await pg.waitForTimeout(300); };
  await click('#scales [data-k=months]'); await click('#scales [data-k=weeks]');
  await shoot(1500);                                         // the weather, drawing in
  await click('#lens [data-k=change]'); await shoot(1700);   // melts into change from normal
  await click('#scales [data-k=years]'); await shoot(1700);  // warming stripes
  await pg.mouse.move(1010, 330); await shoot(1100);
  await pg.mouse.move(1110, 690);
  await click('#quietBtn'); await shoot(1800);               // quiet: just the picture
  console.log('frames', n);
  await b.close();
})();
