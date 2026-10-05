const { chromium } = require('playwright');
const fs = require('fs');
const P = { name: 'Houston', admin: 'Texas', country: 'United States', lat: 29.7633, lon: -95.3633 };
(async () => {
  const b = await chromium.launch();
  const route = async ctx => ctx.route(/archive-api|rainviewer|arcgisonline/, r => r.fulfill({ path: 'data/houston-temp.json', headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' } }));
  const init = scale => ([p, s]) => { localStorage['wd:place'] = JSON.stringify(p); localStorage['wd:metric'] = '"temp"'; localStorage['wd:scale'] = JSON.stringify(s); localStorage['wd:units'] = '"us"'; };

  // clean stills of the mosaic itself
  for (const scheme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme });
    await route(ctx); await ctx.addInitScript(init(), [P, 'weeks']);
    const pg = await ctx.newPage(); await pg.goto('http://localhost:4322/'); await pg.waitForTimeout(2500);
    await pg.addStyleTag({ content: '.zoom{display:none!important}' }); await pg.waitForTimeout(200);
    await pg.locator('#stage').screenshot({ path: `mosaic-houston-${scheme}.png` });
    await ctx.close();
  }

  // the clip: weeks, months, years, each drawing in
  const ctx = await b.newContext({ viewport: { width: 1120, height: 700 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  await route(ctx); await ctx.addInitScript(init(), [P, 'weeks']);
  const pg = await ctx.newPage();
  await pg.clock.install({ time: new Date('2026-10-04T12:00:00') });
  await pg.goto('http://localhost:4322/');
  await pg.waitForTimeout(1500);
  await pg.clock.pauseAt(new Date('2026-10-04T12:10:00'));           // let the data load with the clock paused
  await pg.evaluate(() => document.fonts.ready);
  let n = 0; const FPS = 15, dt = 1000 / FPS;
  const shoot = async ms => { for (let t = 0; t < ms; t += dt) { await pg.clock.runFor(dt); await pg.screenshot({ path: `frames/${String(n++).padStart(4, '0')}.png` }); } };
  const go = async s => { await pg.click(`#scales [data-k=${s}]`); await pg.waitForTimeout(300); };
  // restart the weeks drawing from blank
  await go('months'); await go('weeks');
  await shoot(1400);
  await pg.mouse.move(870, 330); await shoot(300);
  await pg.mouse.move(905, 335); await shoot(1200);
  await pg.mouse.move(1110, 690); await go('months'); await shoot(1200);
  await go('years'); await shoot(1100);
  await pg.mouse.move(700, 470); await shoot(1400);
  console.log('frames', n);
  await b.close();
})();
