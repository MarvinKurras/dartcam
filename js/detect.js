// ─── detect.js ─────────────────────────────────────────────────────
// Roboflow Darts Detection via inferencejs (on-device WebGL)
// Uses Publishable Key — safe to commit to GitHub.

const ROBOFLOW_PUBLISHABLE_KEY = 'rf_DrUUV6Voq7PQZeRCjAHUGyskZsF3';
const ROBOFLOW_MODEL           = 'darts-gffwp';
const ROBOFLOW_VERSION         = 1;

const BOARD_NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// ─── Parse class name → score info ───────────────────────────────────
function parseScore(cls) {
  if (cls === 'db') return { label: 'Double Bull', score: 50, type: 'db' };
  if (cls === 'sb') return { label: 'Single Bull', score: 25, type: 'sb' };

  const m = cls.match(/^([tds])(\d+)$/);
  if (!m) return { label: cls, score: 0, type: 'unknown' };

  const [, prefix, num] = m;
  const n = parseInt(num, 10);
  const names = { s: 'Single', d: 'Double', t: 'Triple' };
  const mults = { s: 1,       d: 2,        t: 3 };
  return { label: `${names[prefix]} ${n}`, score: mults[prefix] * n, type: prefix, number: n };
}

// ─── Capture frame from video ─────────────────────────────────────────
function captureFrame(video) {
  const c = document.createElement('canvas');
  c.width  = video.videoWidth  || 640;
  c.height = video.videoHeight || 480;
  c.getContext('2d').drawImage(video, 0, 0);
  return c;
}

// ─── inferencejs model ────────────────────────────────────────────────
let _inferEngine = null;
let _workerId    = null;

async function loadModel() {
  _inferEngine = new inferencejs.InferenceEngine();
  _workerId = await _inferEngine.startWorker(
    ROBOFLOW_MODEL, ROBOFLOW_VERSION, ROBOFLOW_PUBLISHABLE_KEY
  );
}

async function detectDarts(frameCanvas) {
  const bmp = await createImageBitmap(frameCanvas);
  const raw = await _inferEngine.infer(_workerId, bmp);
  return raw.map(p => ({
    class:      p.class,
    confidence: p.confidence,
    x:          p.bbox.x,
    y:          p.bbox.y,
    width:      p.bbox.width,
    height:     p.bbox.height,
  }));
}  // ← diese Klammer fehlte vorher

// ─── Draw bounding boxes ──────────────────────────────────────────────
function drawDetections(outCanvas, predictions, frame) {
  outCanvas.width  = frame.width;
  outCanvas.height = frame.height;
  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(frame, 0, 0);

  const boxColors = { d: '#e74c3c', t: '#3498db', s: '#2ecc71', db: '#f1c40f', sb: '#f39c12' };

  predictions.forEach(p => {
    const sc    = parseScore(p.class);
    const color = boxColors[sc.type] || '#fff';
    const bx = p.x; const by = p.y; const bw = p.width; const bh = p.height;

    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);

    const label = `${sc.label} ${Math.round(p.confidence * 100)}%`;
    ctx.font = 'bold 13px monospace';
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = color;
    ctx.fillRect(bx - bw / 2, by - bh / 2 - 22, tw, 20);
    ctx.fillStyle = '#000';
    ctx.fillText(label, bx - bw / 2 + 5, by - bh / 2 - 6);
  });
}

// ─── Draw dartboard ───────────────────────────────────────────────────
function drawDartboard(canvas, predictions) {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) / 2 - 18;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const r   = { bi: 0.037, bo: 0.094, ti: 0.582, to: 0.629, di: 0.953, do: 1.0 };
  const SEG = (2 * Math.PI) / 20;
  const OFF = -Math.PI / 2 - SEG / 2;
  const detected = new Set(predictions.map(p => p.class));

  ctx.beginPath();
  ctx.arc(cx, cy, R * r.do + 16, 0, 2 * Math.PI);
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();

  for (let i = 0; i < 20; i++) {
    const num  = BOARD_NUMS[i];
    const a1   = OFF + i * SEG;
    const a2   = OFF + (i + 1) * SEG;
    const even = i % 2 === 0;
    const base = even ? '#1c1c1c' : '#f0e8d0';
    const ring = even ? '#c0392b' : '#27ae60';
    const gold = '#FFD700';

    const slice = (ri, ro, fill) => {
      ctx.beginPath();
      ctx.arc(cx, cy, ro * R, a1, a2);
      ctx.arc(cx, cy, ri * R, a2, a1, true);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    slice(r.bo, r.ti, detected.has(`s${num}`) ? gold : base);
    slice(r.ti, r.to, detected.has(`t${num}`) ? gold : ring);
    slice(r.to, r.di, detected.has(`s${num}`) ? gold : base);
    slice(r.di, r.do, detected.has(`d${num}`) ? gold : ring);

    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a1);
    ctx.beginPath();
    ctx.moveTo(r.bo * R, 0); ctx.lineTo(r.do * R, 0);
    ctx.strokeStyle = 'rgba(110,110,110,0.55)'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();

    const la = a1 + SEG / 2, lr = r.do + 0.08;
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `bold ${Math.max(9, Math.floor(R * 0.088))}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(num, cx + Math.cos(la) * lr * R, cy + Math.sin(la) * lr * R);
  }

  ctx.beginPath(); ctx.arc(cx, cy, r.bo * R, 0, 2 * Math.PI);
  ctx.fillStyle = detected.has('sb') ? '#FFD700' : '#27ae60'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r.bi * R, 0, 2 * Math.PI);
  ctx.fillStyle = detected.has('db') ? '#FFD700' : '#c0392b'; ctx.fill();
}

// ─── Render score list ────────────────────────────────────────────────
function renderScoreList(container, predictions) {
  if (!predictions.length) {
    container.innerHTML = '<p style="color:var(--subtext);font-size:0.8rem;">Keine Darts erkannt</p>';
    return;
  }
  let total = 0;
  const rows = predictions.map(p => {
    const s = parseScore(p.class);
    total += s.score;
    return `<div class="score-row">
      <span class="score-label">${s.label}</span>
      <span class="score-val">${s.score}</span>
    </div>`;
  }).join('');
  container.innerHTML = `${rows}
    <div class="score-total"><span>Gesamt</span><span>${total}</span></div>`;
}

// ─── Setup ────────────────────────────────────────────────────────────
(function setup() {
  const boardCanvas    = document.getElementById('dartboard-canvas');
  const detectBtn      = document.getElementById('detect-btn');
  const detectStatus   = document.getElementById('detect-status');
  const resultsSection = document.getElementById('results-section');
  const frameCanvas    = document.getElementById('frame-canvas');
  const scoreList      = document.getElementById('score-list');
  const video          = document.getElementById('stream');

  if (boardCanvas) drawDartboard(boardCanvas, []);

  detectBtn.addEventListener('click', async () => {
    if (!video.videoWidth) {
      detectStatus.textContent = 'Kein Stream aktiv — zuerst verbinden.';
      return;
    }

    detectBtn.disabled = true;

    if (!_workerId) {
      detectStatus.textContent = 'Modell wird geladen…';
      try {
        await loadModel();
      } catch (err) {
        detectStatus.textContent = `Ladefehler: ${err.message}`;
        detectBtn.disabled = false;
        return;
      }
    }

    detectStatus.textContent = 'Frame wird analysiert…';
    resultsSection.style.display = 'none';

    try {
      const frame = captureFrame(video);
      const preds = await detectDarts(frame);

      drawDetections(frameCanvas, preds, frame);
      drawDartboard(boardCanvas, preds);
      renderScoreList(scoreList, preds);
      resultsSection.style.display = '';

      const n = preds.length;
      detectStatus.textContent = n
        ? `${n} Dart${n !== 1 ? 's' : ''} erkannt`
        : 'Keine Darts erkannt';
    } catch (err) {
      detectStatus.textContent = `Fehler: ${err.message}`;
      console.error('[detect]', err);
    }

    detectBtn.disabled = false;
  });
}());