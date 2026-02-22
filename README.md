# DartCam 🎯

Live camera streaming from iPhone to PC via WebRTC (PeerJS) — foundation for a dart scoring app.

## Project Structure

```
dartcam/
├── index.html        ← Landing page
├── camera.html       ← Open on iPhone
├── viewer.html       ← Open on PC
├── css/
│   └── style.css     ← All shared styles
└── js/
    ├── config.js     ← PeerJS config + shared helpers
    ├── camera.js     ← Camera stream logic
    └── viewer.js     ← Viewer / receive logic
```

## How It Works

1. iPhone opens `camera.html` → gets camera access → connects to PeerJS cloud → receives a room code
2. PC opens `viewer.html` → enters the room code → WebRTC peer-to-peer connection is established
3. Video streams directly from iPhone to PC over WebRTC (peer-to-peer, not via a server)

No backend required. PeerJS cloud is only used for the initial handshake (signaling), after that it's direct.

---

## Deployment: GitHub Pages (Step-by-Step)

### Prerequisites
- A GitHub account
- Git installed on your Mac/PC

### Steps

**1. Create a new GitHub repository**
- Go to https://github.com/new
- Name it `dartcam` (or anything you like)
- Set it to **Public**
- Don't add a README (we have one)
- Click **Create repository**

**2. Push the code**
```bash
cd dartcam
git init
git add .
git commit -m "Initial commit — DartCam stream"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dartcam.git
git push -u origin main
```
Replace `YOUR_USERNAME` with your GitHub username.

**3. Enable GitHub Pages**
- Go to your repo on GitHub
- Click **Settings** → **Pages** (left sidebar)
- Under "Source" select: **Deploy from a branch**
- Branch: `main`, folder: `/ (root)`
- Click **Save**

**4. Wait ~60 seconds, then visit:**
```
https://YOUR_USERNAME.github.io/dartcam/
```

---

## Usage

1. Open the site on your **iPhone** in Safari → tap **CAMERA**
2. Tap **Start Camera** → allow camera access → a room code appears (e.g. `DART-A3K9`)
3. Open the site on your **PC** → click **VIEWER**
4. Type the room code → click **Connect**
5. 🎯 Live stream is running

> **Tip:** Both devices should be on the same WiFi for lowest latency.
> The stream still works over the internet via the PeerJS relay if needed.

---

## Roadmap

- [ ] Step 1: ✅ Live camera stream
- [ ] Step 2: Dartboard detection (OpenCV / homography)
- [ ] Step 3: Dart tip detection (YOLOv8 or contour detection)
- [ ] Step 4: Score calculation
- [ ] Step 5: Scoreboard UI / game modes (301, 501, Cricket)

## Tech Stack

| Layer | Tech |
|-------|------|
| Hosting | GitHub Pages (static) |
| Streaming | WebRTC via PeerJS |
| Signaling | PeerJS Cloud (free) |
| Camera | `getUserMedia()` API |
| Future: CV | Python + OpenCV or YOLOv8 |
