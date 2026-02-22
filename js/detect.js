// ─── detect.js ─────────────────────────────────────────────────────
// Roboflow Darts Detection: API call + dartboard visualization

const ROBOFLOW_API_KEY = '92FofRNR2Rq0Il8YrJXp';
const ROBOFLOW_MODEL   = 'darts-bjj98/2';
const ROBOFLOW_URL     =
  `https://serverless.roboflow.com/${ROBOFLOW_MODEL}` +
  `?api_key=${ROBOFLOW_API_KEY}&confidence=50&overlap=50`;

// Dartboard numbers clockwise from top (standard layout)
const BOARD_NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// ─── Parse dart class name → { label, score, number } ──────────────
// darts-bjj98/2 returns plain segment numbers as class: "5", "20", …
function parseScore(cls) {
  const n = parseInt(cls, 10);
  if (!isNaN(n) && n >= 1 && n <= 20) {
    return { label: `Segment ${n}`, score: n, number: n };
  }
  return { label: cls, score: 0, number: null };
}

// ─── Capture current frame from a video element ──────────────────────
function captureFrame(video) {
  const c = document.createElement('canvas');
  c.width  = video.videoWidth  || 640;
  c.height = video.videoHeight || 480;
  c.getContext('2d').drawImage(video, 0, 0);
  return c;
}

// ─── POST base64 image to Roboflow hosted API ────────────────────────
async function detectDartsAPI(frameCanvas) {
  const b64 = frameCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  const res  = await fetch(ROBOFLOW_URL, {
    method:  'POST',
    body:    b64,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }
  return res.json();
}

// ─── Draw captured frame with bounding boxes ─────────────────────────
// outCanvas   = DOM canvas element to draw into
// predictions = array from Roboflow response
// frame       = canvas from captureFrame()
// imageInfo   = result.image { width, height } from API response
function drawDetections(outCanvas, predictions, frame, imageInfo) {
  outCanvas.width  = frame.width;
  outCanvas.height = frame.height;

  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(frame, 0, 0);

  // Scale predictions from API image space → canvas space
  const sx = frame.width  / (imageInfo?.width  || frame.width);
  const sy = frame.height / (imageInfo?.height || frame.height);

  predictions.forEach(p => {
    const sc    = parseScore(p.class);
    const color = '#FFD700'; // gold for all darts

    // Roboflow: x/y are center coords, width/height are box dims
    const bx = p.x * sx;
    const by = p.y * sy;
    const bw = p.width  * sx;
    const bh = p.height * sy;

    // Bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);

    // Label background
    const label = `${sc.label} ${Math.round(p.confidence * 100)}%`;
    ctx.font = 'bold 13px monospace';
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = color;
    ctx.fillRect(bx - bw / 2, by - bh / 2 - 22, tw, 20);

    // Label text
    ctx.fillStyle = '#000';
    ctx.fillText(label, bx - bw / 2 + 5, by - bh / 2 - 6);
  });
}

// ─── Draw dartboard with detected zones highlighted in gold ──────────
// Standard dartboard ring proportions (radius relative to outer double ring)
//   Inner bull (DB):  6.35 mm → 3.7%
//   Outer bull (SB): 15.9  mm → 9.4%
//   Triple inner:    99    mm → 58.2%
//   Triple outer:   107    mm → 62.9%
//   Double inner:   162    mm → 95.3%
//   Double outer:   170    mm → 100%
function drawDartboard(canvas, predictions) {
  const W  = canvas.width;
  const H  = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R  = Math.min(W, H) / 2 - 18; // outer edge of double ring

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const r = { bi: 0.037, bo: 0.094, ti: 0.582, to: 0.629, di: 0.953, do: 1.0 };

  const SEG = (2 * Math.PI) / 20;
  const OFF = -Math.PI / 2 - SEG / 2; // offset so 20 sits at top

  // Set of hit segment numbers (integers)
  const detected = new Set(predictions.map(p => parseInt(p.class, 10)).filter(n => !isNaN(n)));

  // Black surround behind the board
  ctx.beginPath();
  ctx.arc(cx, cy, R * r.do + 16, 0, 2 * Math.PI);
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();

  // ── 20 numbered segments ──────────────────────────────────────────
  for (let i = 0; i < 20; i++) {
    const num  = BOARD_NUMS[i];
    const a1   = OFF + i * SEG;
    const a2   = OFF + (i + 1) * SEG;
    const even = i % 2 === 0;

    const base = even ? '#1c1c1c' : '#f0e8d0';
    const ring = even ? '#c0392b' : '#27ae60';
    const gold = '#FFD700';

    // Helper: filled arc slice from inner to outer radius
    const slice = (ri, ro, fill) => {
      ctx.beginPath();
      ctx.arc(cx, cy, ro * R, a1, a2);
      ctx.arc(cx, cy, ri * R, a2, a1, true);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    // New model: class is plain segment number — highlight entire segment
    const hit = detected.has(num);

    slice(r.bo, r.ti, hit ? gold : base);  // single (inner half)
    slice(r.ti, r.to, hit ? gold : ring);  // triple ring
    slice(r.to, r.di, hit ? gold : base);  // single (outer half)
    slice(r.di, r.do, hit ? gold : ring);  // double ring

    // Thin wire line at segment boundary
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a1);
    ctx.beginPath();
    ctx.moveTo(r.bo * R, 0);
    ctx.lineTo(r.do * R, 0);
    ctx.strokeStyle = 'rgba(110,110,110,0.55)';
    ctx.lineWidth   = 0.9;
    ctx.stroke();
    ctx.restore();

    // Segment number label (outside double ring)
    const la = a1 + SEG / 2;
    const lr = r.do + 0.08;
    ctx.fillStyle    = '#e8e8e8';
    ctx.font         = `bold ${Math.max(9, Math.floor(R * 0.088))}px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, cx + Math.cos(la) * lr * R, cy + Math.sin(la) * lr * R);
  }

  // Outer ring of double ring (thin arc line)
  ctx.beginPath();
  ctx.arc(cx, cy, r.do * R, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(110,110,110,0.55)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // ── Bull rings ────────────────────────────────────────────────────
  // Single bull (green)
  ctx.beginPath();
  ctx.arc(cx, cy, r.bo * R, 0, 2 * Math.PI);
  ctx.fillStyle = '#27ae60';
  ctx.fill();

  // Double bull / bullseye (red)
  ctx.beginPath();
  ctx.arc(cx, cy, r.bi * R, 0, 2 * Math.PI);
  ctx.fillStyle = '#c0392b';
  ctx.fill();
}

// ─── Render score list into a container element ──────────────────────
function renderScoreList(container, predictions) {
  if (!predictions.length) {
    container.innerHTML = '<p class="detect-empty">Keine Darts erkannt</p>';
    return;
  }

  let total = 0;
  const rows = predictions.map(p => {
    const s = parseScore(p.class);
    total += s.score;
    return `
      <div class="score-row">
        <span class="score-label">${s.label}</span>
        <span class="score-val">${s.score}</span>
      </div>`;
  }).join('');

  container.innerHTML = `
    ${rows}
    <div class="score-total">
      <span>Gesamt</span>
      <span>${total}</span>
    </div>`;
}

// ─── Setup — runs immediately when the script loads ──────────────────
(function setup() {
  // Draw empty board immediately (before any detection)
  drawDartboard(document.getElementById('dartboard-canvas'), []);

  const detectBtn      = document.getElementById('detect-btn');
  const detectStatus   = document.getElementById('detect-status');
  const resultsSection = document.getElementById('results-section');
  const frameCanvas    = document.getElementById('frame-canvas');
  const boardCanvas    = document.getElementById('dartboard-canvas');
  const scoreList      = document.getElementById('score-list');
  const video          = document.getElementById('stream');

  detectBtn.addEventListener('click', async () => {
    // If no video stream is active, bail out early
    if (!video.videoWidth) {
      detectStatus.textContent = 'Kein Stream aktiv — zuerst verbinden.';
      return;
    }

    detectBtn.disabled       = true;
    detectStatus.textContent = 'Frame wird gesendet...';
    resultsSection.style.display = 'none';

    try {
      const frame  = captureFrame(video);
      const result = await detectDartsAPI(frame);
      const preds  = result.predictions || [];

      drawDetections(frameCanvas, preds, frame, result.image);
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
