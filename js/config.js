// ─── PeerJS Configuration ────────────────────────────────────
// Uses the free PeerJS cloud server for signaling.
// For production you'd self-host: https://github.com/peers/peerjs-server

const PEER_CONFIG = {
  // Leave empty to use PeerJS free cloud server
  // host: 'your-peerjs-server.com',
  // port: 9000,
  // path: '/myapp',
  debug: 0,
};

// How long a generated room code should be
const CODE_LENGTH = 4;

/**
 * Generates a short, human-readable room code (e.g. "DART-A3K9")
 * This becomes the Peer ID of the camera side.
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = 'DART-';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
