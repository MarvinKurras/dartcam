// ─── viewer.js ───────────────────────────────────────────────
// Runs on the PC. Connects to the camera using the room code
// and displays the live stream.

const ui = {
  connectBtn:  document.getElementById('connect-btn'),
  codeInput:   document.getElementById('code-input'),
  statusDot:   document.getElementById('status-dot'),
  statusText:  document.getElementById('status-text'),
  stream:      document.getElementById('stream'),
  overlay:     document.getElementById('video-overlay'),
};

let peer = null;

// ─── Auto-format input to uppercase ───────────────────────────
ui.codeInput.addEventListener('input', () => {
  const raw = ui.codeInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  ui.codeInput.value = raw;
});

ui.codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') connect();
});

ui.connectBtn.addEventListener('click', connect);

// ─── Connect ──────────────────────────────────────────────────
function connect() {
  const code = ui.codeInput.value.trim().toUpperCase();
  if (!code) return;

  ui.connectBtn.disabled = true;
  ui.codeInput.disabled = true;
  setStatus('connecting', 'Connecting…');

  // Create our own peer with a random ID
  peer = new Peer(PEER_CONFIG);

  peer.on('open', () => {
    setStatus('connecting', 'Calling camera…');

    // Call the camera peer
    const call = peer.call(code, createDummyStream());

    call.on('stream', (remoteStream) => {
      setStatus('connected', 'Stream active');
      ui.stream.srcObject = remoteStream;
      ui.stream.hidden = false;
      ui.overlay.hidden = true;

      // iOS Safari fix: needs explicit play()
      ui.stream.play().catch(() => {});

      // Enable dart detection once stream is live
      initDetection(ui.stream);
    });

    call.on('error', (err) => {
      setStatus('error', 'Call error.');
      console.error(err);
      resetUI();
    });

    call.on('close', () => {
      setStatus('error', 'Stream ended.');
      ui.overlay.hidden = false;
      ui.stream.hidden = true;
      resetUI();
    });
  });

  peer.on('error', (err) => {
    console.error(err);
    if (err.type === 'peer-unavailable') {
      setStatus('error', 'Code not found. Is the camera open?');
    } else {
      setStatus('error', `Error: ${err.type}`);
    }
    resetUI();
  });
}

// ─── PeerJS requires the caller to send a stream too ──────────
// We send a silent/blank stream as a workaround.
function createDummyStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  canvas.getContext('2d').fillRect(0, 0, 1, 1);
  return canvas.captureStream(1); 
}

// ─── UI helpers ───────────────────────────────────────────────
function setStatus(state, text) {
  ui.statusDot.className = `status-dot ${state}`;
  ui.statusText.textContent = text;
}

function resetUI() {
  ui.connectBtn.disabled = false;
  ui.codeInput.disabled = false;
}
