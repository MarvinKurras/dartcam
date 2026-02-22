// ─── camera.js ───────────────────────────────────────────────
// Runs on the iPhone. Gets the camera stream and broadcasts it
// to anyone who connects using the room code.

const ui = {
  startBtn:    document.getElementById('start-btn'),
  statusDot:   document.getElementById('status-dot'),
  statusText:  document.getElementById('status-text'),
  peerIdBox:   document.getElementById('peer-id-box'),
  peerIdValue: document.getElementById('peer-id-value'),
  preview:     document.getElementById('preview'),
};

let peer = null;
let localStream = null;

// ─── Start ────────────────────────────────────────────────────
ui.startBtn.addEventListener('click', async () => {
  ui.startBtn.disabled = true;
  setStatus('connecting', 'Requesting camera…');

  try {
    localStream = await getCameraStream();
  } catch (err) {
    setStatus('error', 'Camera access denied.');
    console.error(err);
    ui.startBtn.disabled = false;
    return;
  }

  // Show local preview (muted so no echo)
  ui.preview.srcObject = localStream;

  setStatus('connecting', 'Connecting to network…');
  initPeer();
});

// ─── Camera stream (iPhone-optimised) ─────────────────────────
async function getCameraStream() {
  // iOS Safari needs exact constraints to avoid issues.
  // 'environment' = back camera, 'user' = front camera.
  const constraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width:  { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    // Fallback: just ask for any video
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

// ─── PeerJS setup ─────────────────────────────────────────────
function initPeer() {
  const roomCode = generateRoomCode();

  peer = new Peer(roomCode, PEER_CONFIG);

  peer.on('open', (id) => {
    setStatus('connected', 'Ready — share the code below');
    ui.peerIdBox.hidden = false;
    ui.peerIdValue.textContent = id;
  });

  // When a viewer connects, answer with our stream
  peer.on('call', (call) => {
    setStatus('connected', 'Viewer connected!');
    call.answer(localStream);

    call.on('error', (err) => {
      setStatus('error', 'Stream error.');
      console.error(err);
    });

    call.on('close', () => {
      setStatus('connected', 'Viewer disconnected. Waiting…');
    });
  });

  peer.on('disconnected', () => {
    setStatus('connecting', 'Reconnecting…');
    peer.reconnect();
  });

  peer.on('error', (err) => {
    console.error(err);
    setStatus('error', `Error: ${err.type}`);
  });
}

// ─── UI helpers ───────────────────────────────────────────────
function setStatus(state, text) {
  ui.statusDot.className = `status-dot ${state}`;
  ui.statusText.textContent = text;
}
