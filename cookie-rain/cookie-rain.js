/* =========================================================================
   LLUVIA DE GALLETAS — motor de galleta que cae y explota en trozos reales.
   - Cae una galleta entera cada X ms (aleatorio).
   - Al tocarla (ratón o dedo) explota en sus trozos, cada uno con física
     propia y ANCLAJE ESPACIAL: sale desde donde estaba en la galleta.
   - Si existen assets/cookie.png + assets/manifest.json usa TUS imágenes.
   - Si no, dibuja galletas/trozos de prueba para que pruebes la sensación.
   ========================================================================= */

const CONFIG = {
  spawnMinMs: 6000,        // mínimo entre apariciones (casi easter egg)
  spawnMaxMs: 60000,       // máximo: nunca esperes mas de 60s
  maxCookies: 3,           // tope de galletas cayendo a la vez (con esperas largas basta 1-2)
  cookieSizeMin: 150,      // ANCHO px de la galleta al caer (mantiene su forma)
  cookieSizeMax: 260,
  fallDurationMin: 6500,   // ms en cruzar la pantalla
  fallDurationMax: 11000,
  pieceSpread: 260,        // px de dispersión de los trozos
  pieceGravity: 70,        // sesgo extra hacia abajo (caen después de explotar)
  pieceDurationMin: 700,
  pieceDurationMax: 1150,
  jitterDirX: 0.25,        // aleatoriedad del ángulo de salida
  jitterDirY: 0.18,
  forceRain: true,         // SIEMPRE caen solas (igual que en las pruebas).
  assets: {
    cookie: 'assets/cookie.png',
    // Lista de trozos INCRUSTADA (no hace falta manifest.json ni servidor).
    pieces: [
      'assets/pieces/01.png','assets/pieces/02.png','assets/pieces/03.png',
      'assets/pieces/04.png','assets/pieces/05.png','assets/pieces/06.png',
      'assets/pieces/07.png','assets/pieces/08.png','assets/pieces/09.png',
      'assets/pieces/10.png','assets/pieces/11.png','assets/pieces/12.png',
      'assets/pieces/13.png'
    ]
  }
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const layer = document.getElementById('cookie-layer');

/* Utilidades -------------------------------------------------------------- */
const rand = (a, b) => a + Math.random() * (b - a);
const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('no carga: ' + src));
    i.src = src;
  });
}

// Calcula el centro (ancla) de los píxeles opacos de un dibujo.
// Devuelve {cx, cy, w, h} en píxeles del dibujo original.
function analyzeDrawable(drawable, w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.drawImage(drawable, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) { sx += x; sy += y; n++; }
    }
  }
  if (!n) return { cx: w / 2, cy: h / 2, w, h };
  return { cx: sx / n, cy: sy / n, w, h };
}

const analyzeImage = (img) => ({ ...analyzeDrawable(img, img.naturalWidth, img.naturalHeight), img });

/* Placeholders (mientras no pongas tus imágenes) -------------------------- */
function drawCookieBody(ctx) {
  ctx.fillStyle = '#caa472';
  ctx.beginPath(); ctx.arc(100, 100, 90, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9c7541';
  for (const [x, y] of [[60,70],[120,60],[90,120],[140,110],[70,140],[130,150]]) {
    ctx.beginPath(); ctx.arc(x, y, 5 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
  }
}

async function buildPlaceholders() {
  const S = 200;
  const cc = makeCanvas(S, S); drawCookieBody(cc.getContext('2d'));
  const cookie = await loadImage(cc.toDataURL());

  const pieces = [];
  const n = 11; // 6 grandes + 5 pequeñas (en placeholder se reparte en gajos)
  for (let i = 0; i < n; i++) {
    const c = makeCanvas(S, S); const ctx = c.getContext('2d');
    const base = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
    const angW = (Math.PI * 2 / n) * rand(0.5, 1.1);
    const r = 90;
    ctx.fillStyle = '#caa472';
    ctx.beginPath(); ctx.moveTo(100, 100);
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const a = base - angW / 2 + angW * (s / steps);
      const rr = r * rand(0.85, 1.0);
      ctx.lineTo(100 + Math.cos(a) * rr, 100 + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9c7541';
    for (let k = 0; k < 2; k++) {
      const a = base + rand(-angW / 4, angW / 4);
      const rr = r * rand(0.6, 0.9);
      ctx.beginPath(); ctx.arc(100 + Math.cos(a) * rr, 100 + Math.sin(a) * rr, 3 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    }
    const img = await loadImage(c.toDataURL());
    pieces.push(analyzeImage(img));
  }
  SPRITES.cookie = cookie;
  SPRITES.pieces = pieces;
}

/* Carga de tus imágenes reales (embebidas en base64 en cookie-rain.assets.js).
   Usar data-URI evita el fallo de canvas "tainted" por CORS en file://, asi
   el anclaje espacial funciona abriendo index.html con doble clic. */
async function loadRealAssets() {
  const A = window.COOKIE_ASSETS;
  if (!A || !A.cookie || !Array.isArray(A.pieces) || !A.pieces.length) {
    throw new Error('no hay assets embebidos');
  }
  const cookie = await loadImage(A.cookie);
  const imgs = await Promise.all(A.pieces.map(p => loadImage(p)));
  SPRITES.cookie = cookie;
  SPRITES.pieces = imgs.map(analyzeImage);
}

const SPRITES = { cookie: null, pieces: [] };

/* Motor ------------------------------------------------------------------- */
function spawnCookie() {
  if (document.querySelectorAll('.falling').length >= CONFIG.maxCookies) return;
  // Mantiene el aspect ratio real de la galleta (no la escaba a un cuadrado).
  const cw = SPRITES.cookie.naturalWidth || 1174;
  const ch = SPRITES.cookie.naturalHeight || 936;
  const w = rand(CONFIG.cookieSizeMin, CONFIG.cookieSizeMax);
  const h = w * (ch / cw);
  const img = SPRITES.cookie.cloneNode();
  img.className = 'falling';
  img.style.width = w + 'px';
  img.style.height = h + 'px';
  img.style.left = rand(0, Math.max(0, window.innerWidth - w)) + 'px';
  img.style.top = (-h) + 'px';
  layer.appendChild(img);

  const dur = rand(CONFIG.fallDurationMin, CONFIG.fallDurationMax);
  const rot = rand(-30, 30);
  const anim = img.animate(
    [{ transform: 'translateY(0) rotate(0deg)' },
     { transform: `translateY(${window.innerHeight + h * 2}px) rotate(${rot}deg)` }],
    { duration: dur, easing: 'linear' }
  );
  img._fall = anim;
  anim.onfinish = () => img.remove();
  img.addEventListener('pointerdown', (e) => { e.preventDefault(); popCookie(img); }, { passive: false });
}

function popCookie(img) {
  const rect = img.getBoundingClientRect();
  const size = rect.width;
  const cx = rect.left + size / 2;
  const cy = rect.top + size / 2;
  if (img._fall) img._fall.cancel();
  img.remove();
  playCrunch();

  for (const p of SPRITES.pieces) spawnPiece(p, cx, cy, size);
}

function spawnPiece(p, cx, cy, cookieW) {
  // Mantiene el aspect ratio de la galleta: cookieW es el ANCHO; la altura
  // se deduce de la proporción real (cada trozo es un recorte 1174x936).
  const cookieH = cookieW * (p.h / p.w);
  // Ancla normalizada respecto al centro de la galleta (-0.5 .. 0.5)
  const nx = (p.cx - p.w / 2) / p.w;
  const ny = (p.cy - p.h / 2) / p.h;

  const img = p.img.cloneNode();
  img.className = 'piece';
  img.style.width = cookieW + 'px';
  img.style.height = cookieH + 'px';
  // Coloca el trozo para que su centro (ancla) caiga justo en (cx,cy)
  img.style.left = (cx - (p.cx / p.w) * cookieW) + 'px';
  img.style.top  = (cy - (p.cy / p.h) * cookieH) + 'px';
  layer.appendChild(img);

  // Dirección de salida = desde el centro hacia el ancla + jitter.
  // Así la cabeza vuela arriba, las patas abajo, la cola a un lado...
  let dx0 = nx + rand(-CONFIG.jitterDirX, CONFIG.jitterDirX);
  let dy0 = ny + rand(-CONFIG.jitterDirY, CONFIG.jitterDirY) + 0.12;
  const len = Math.hypot(dx0, dy0);
  if (len < 0.05) { const a = rand(0, Math.PI * 2); dx0 = Math.cos(a); dy0 = Math.sin(a); }
  else { dx0 /= len; dy0 /= len; }

  const spread = CONFIG.pieceSpread * rand(0.6, 1.2);
  const dx = dx0 * spread;
  const dy = dy0 * spread + CONFIG.pieceGravity;
  const rot0 = rand(-20, 20);
  const rot1 = rot0 + rand(-220, 220);
  const dur = rand(CONFIG.pieceDurationMin, CONFIG.pieceDurationMax);

  const anim = img.animate(
    [{ transform: `translate(0,0) rotate(${rot0}deg)`, opacity: 1 },
     { transform: `translate(${dx}px,${dy}px) rotate(${rot1}deg)`, opacity: 0 }],
    { duration: dur, easing: 'cubic-bezier(.2,.6,.3,1)' }
  );
  anim.onfinish = () => img.remove();
}

function playCrunch() {
  // Opcional: pon assets/crunch.mp3 y suena al reventar. Silencioso si no existe.
  try {
    const a = new Audio('assets/crunch.mp3');
    a.volume = 0.5;
    a.play().catch(() => {});
  } catch (_) {}
}

function startRain() {
  // forceRain=true => llueven siempre (modo prueba). En tu web pon false para
  // respetar 'prefers-reduced-motion' del usuario (accesibilidad).
  if (reducedMotion && !CONFIG.forceRain) {
    // Respeta 'reduce motion' del SO: no llueven solas, pero deja jugar manualmente.
    const btn = document.createElement('button');
    btn.textContent = '🍪 Soltar galleta';
    btn.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:10000;padding:10px 14px;border:0;border-radius:10px;background:#caa472;color:#3a2a14;font:600 14px system-ui;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4)';
    btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); spawnCookie(); });
    document.body.appendChild(btn);
    return;
  }
  const tick = () => {
    spawnCookie();
    setTimeout(tick, rand(CONFIG.spawnMinMs, CONFIG.spawnMaxMs));
  };
  setTimeout(tick, 600);
}

/* Arranque ---------------------------------------------------------------- */
(async function init() {
  let ok = false;
  let errMsg = '';
  try { await loadRealAssets(); ok = true; }
  catch (e) { errMsg = (e && e.message) ? e.message : String(e); await buildPlaceholders(); }
  console.log(ok ? 'Usando galletas reales.' : 'Usando placeholders. Motivo: ' + errMsg);
  window.__initInfo = { ok: ok, err: errMsg, pieces: SPRITES.pieces.length };
  startRain();
})();
