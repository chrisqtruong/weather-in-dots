/* The field: the same grid of numbers, melted into one soft surface.
   Each cell's colour sits in a tiny texture; the GPU blends neighbours, lets the surface drift
   a little like ink in water, and adds a fine grain so it reads as a print, not a screen.
   Plain WebGL2, no libraries. Loaded by app.js as window.Field. */
(() => {
'use strict';

const VS = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D tNew, tOld;
uniform vec2 uRes, uOrigin, uN, uCR;
uniform vec4 uClip;
uniform float uDpr, uS, uTr, uT, uAppear, uMix, uDrift, uGrain, uBlur;
out vec4 o;

float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 q) {
  vec2 i = floor(q), f = fract(q); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
vec4 tap(vec2 g) { vec2 uv = clamp(g / uN, .5 / uN, 1. - .5 / uN); return mix(texture(tOld, uv), texture(tNew, uv), uMix); }
float fbm(vec2 q) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(q); q = q * 2.03 + 17.1; a *= .5; } return s; }

void main() {
  vec2 css = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  if (css.x < uClip.x || css.y < uClip.y || css.x > uClip.x + uClip.z || css.y > uClip.y + uClip.w) discard;
  vec2 c = (css - uOrigin) / uS;                       // position in cells, as shown on screen
  float edge = min(min(c.x, uCR.x - c.x), min(c.y, uCR.y - c.y));
  if (edge < 0.) discard;
  vec2 g = uTr > .5 ? c.yx : c.xy;                     // position in the data grid
  // drift: the surface moves a fraction of a cell, slowly, like pigment settling
  vec2 q = g * .16;
  float n1 = fbm(q + vec2(uT * .035, -uT * .021)), n2 = fbm(q + 5.2 - vec2(uT * .027, uT * .03));
  g += (vec2(n1, n2) - .5) * uDrift;
  // a soft brush: twelve samples on a golden-angle spiral, weighted toward the centre (premultiplied)
  vec4 col = tap(g); float wsum = 1.;
  for (int i = 0; i < 12; i++) {
    float r = sqrt((float(i) + .5) / 12.) * uBlur, a = float(i) * 2.39996;
    float w = exp(-1.6 * r * r / (uBlur * uBlur));
    col += tap(g + vec2(cos(a), sin(a)) * r) * w; wsum += w;
  }
  col /= wsum;
  // pigment density varies a touch, like watercolour
  col.rgb *= 1. + (fbm(g * .9 + 3.3) - .5) * .09;
  // a slow wave draws the field in, corner to corner
  float sweep = uAppear * 1.7 - (.7 * c.x / uCR.x + .3 * c.y / uCR.y);
  float a = smoothstep(0., .45, sweep) * smoothstep(0., .6, edge);
  // fine grain, fixed to the paper, so it doesn't crawl
  float gr = hash(floor(gl_FragCoord.xy / max(1., uDpr * .75))) - .5;
  col.rgb += gr * uGrain * col.a;
  o = col * a;
}`;

let gl, prog, U = {}, tex = [], w = 0, h = 0, n = [1, 1], mixAt = 0, ok = false;

function init(canvas) {
  gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return false;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  for (const k of ['tNew', 'tOld', 'uRes', 'uOrigin', 'uN', 'uCR', 'uClip', 'uDpr', 'uS', 'uTr', 'uT', 'uAppear', 'uMix', 'uDrift', 'uGrain', 'uBlur']) U[k] = gl.getUniformLocation(prog, k);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  tex = [0, 1].map(i => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return t;
  });
  gl.uniform1i(U.tNew, 0); gl.uniform1i(U.tOld, 1);
  ok = true;
  return true;
}

function size(cw, ch) { w = cw; h = ch; if (ok) gl.viewport(0, 0, w, h); }

// rgba: nx*ny*4 bytes, premultiplied. With crossfade, the old picture melts into the new one.
function setColors(rgba, nx, ny, crossfade) {
  if (!ok) return;
  const same = crossfade && nx === n[0] && ny === n[1];
  if (same) { tex.reverse(); }                      // what was new becomes old
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[0]);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, nx, ny, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[1]);
  if (!same) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, nx, ny, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  n = [nx, ny];
  mixAt = same ? performance.now() : -1e9;
}

function draw(v) {
  if (!ok) return;
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (!v) return;
  const mix = Math.min(1, (performance.now() - mixAt) / 900);
  gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uDpr, v.dpr);
  gl.uniform2f(U.uOrigin, v.ox, v.oy); gl.uniform1f(U.uS, v.s);
  gl.uniform2f(U.uCR, v.cols, v.rows); gl.uniform1f(U.uTr, v.tr ? 1 : 0);
  gl.uniform2f(U.uN, n[0], n[1]); gl.uniform4f(U.uClip, v.clip[0], v.clip[1], v.clip[2], v.clip[3]);
  gl.uniform1f(U.uT, v.t); gl.uniform1f(U.uAppear, v.appear); gl.uniform1f(U.uMix, mix * mix * (3 - 2 * mix));
  gl.uniform1f(U.uDrift, v.drift); gl.uniform1f(U.uGrain, v.grain); gl.uniform1f(U.uBlur, v.blur);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return mix < 1;
}

window.Field = { init, size, setColors, draw, get ok() { return ok; } };
})();
