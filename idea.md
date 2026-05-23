# WorldMog — 1v1 Soccer Celebration Showdown

## Elevator Pitch

Two players. One famous soccer celebration. Webcam on. AI judges who nailed it.

WorldMog is a real-time 1v1 web app where players are matched and challenged to
replicate iconic soccer celebrations (Ronaldo's "SIUU", Mbappe's arms crossed,
Messi's arms wide). A multimodal AI pipeline analyzes each player's performance
and crowns a winner — perfectly timed for the World Cup kicking off in 3 weeks.

---

## UX Flow (Modeled After Ommogle)

### Screen 1: Landing Page

- Big title logo (WorldMog), dark theme, stadium aesthetic
- "ENTER THE ARENA" CTA → requests camera permission → webcam preview
- Simple camera check: see yourself, confirm it works, proceed

### Screen 2: Battle Screen (Matchmaking)

- Split-screen layout: YOUR webcam (left) | OPPONENT side (right)
- "WAITING FOR OPPONENT..." on right side until matched
- "CONNECTING..." status indicator
- Bottom bar: "NEW MATCH" + "MENU"

### Screen 3: Battle Screen (In-Progress)

- Split-screen with both webcams live
- **Top center**: Countdown timer (e.g., "00:05") — time left to perform
- **Reference celebration** shown at top (image + name of the celebration to replicate)
- **Left panel ("YOUR SCAN")**:
  - Player name label
  - Body keypoint dots overlaid on webcam feed (green skeleton points)
  - "OVERALL SCORE" box updating live (e.g., 6.0)
  - Real-time AI callouts ("Great arm height", "Needs more jump")
- **Right panel ("OPPONENT SCAN")**:
  - Opponent name label
  - Their keypoint overlay + live score
- **Bottom**: "CELEBRATING..." status bar
- After time expires → transition to results

### Screen 4: Results Screen

- Both webcam feeds dimmed in background
- **Big verdict text**: "CELEBRATED!" with subtext: "{loser} COULDN'T COMPETE"
- **Score comparison**: Large side-by-side scores (e.g., YOU: 5.6 vs OPPONENT: 4.3)
- **Action buttons**:
  - "REMATCH" (green) — same opponent, new celebration
  - "NEW MATCH" — find new opponent

---

## Core Workflow

```
1. Player opens web app → allows camera → sees webcam preview
2. Clicks "FIND MATCH" → enters matchmaking queue via WebSocket
3. Matched with opponent → both see the reference celebration (image + name)
4. Countdown: 3... 2... 1... GO
5. Both perform the celebration (5 seconds)
   - Webcam frames stream to server continuously
   - GMI Cloud pose model extracts keypoints per frame → skeleton overlay rendered live
   - Gemini Live API receives video stream, provides real-time commentary
6. Celebration window ends
   - GMI pose model computes geometric similarity score (keypoints vs reference)
   - Gemini delivers final style/energy verdict
   - Server averages both scores → winner decided
7. Winner + scores displayed to both players
8. Rematch or new match
```

---

## Tech Stack & How Each Piece Fits

### Gemini Live API (Google AI) — The Commentator & Style Judge

- **Role**: Real-time video commentary + subjective scoring (style, energy, vibe)
- **How**: Persistent WebSocket session to Gemini Live API with video input.
  Stream camera frames (~1 FPS) during the celebration window. Gemini Live provides:
  1. **Live commentary** — reacts as it happens ("great arm extension!", "too stiff!")
  2. **Final style verdict** — structured score: energy + expressiveness + style (0-100)
- **Why Gemini Live**: Real-time multimodal streaming (fresh I/O release), creates a
  live sports-commentator feel vs batch "send frames and wait"

### MediaPipe Pose (Google) — The Skeleton Overlay
- **Role**: Real-time body keypoint detection + skeleton rendering on webcam feed
- **How**: Runs entirely client-side in the browser (WASM + TFLite model). Detects
  33 body landmarks per frame, draws green keypoint dots + skeleton lines on canvas.
- **Why**: Zero latency (no API call), Google technology, visually impressive

### GMI Cloud — The Accuracy Judge
- **Role**: Vision-language model scoring of celebration accuracy
- **How**: After performance window, send player's key frames + reference image to
  GMI Cloud's Qwen3-VL model (OpenAI-compatible API at `api.gmi-serving.com/v1`).
  Prompt it to compare the player's pose to the reference and score accuracy (0-10).
- **Why GMI**: GPU-powered vision model inference, free credits at hackathon.
  Provides the objective "did they match the celebration" score that complements
  Gemini's subjective style score.

### RocketRide (AIDE) — The Glue (Keep It Simple)

- **Role**: Wrap the AI scoring logic into a deployable pipeline endpoint
- **How**: Minimal AIDE pipeline: frames in → scoring logic → results out.
  Calls GMI and Gemini under the hood. One pipeline, one endpoint.
- **Reality**: Most real-time magic happens via direct WebSocket (Gemini Live) and
  API calls (GMI Cloud). RocketRide wraps + deploys it. In the demo slide we talk
  up the orchestration story even if implementation is straightforward.

### Frontend + Server

- **Web app**: React or vanilla JS, getUserMedia for webcam
- **WebSocket server**: Node.js or Python — matchmaking, game state, frame relay, results
- **Tunnel**: ngrok or Tailscale for cross-device demo

---

## Scoring (Keep It Simple)

Two scores, averaged:

- **Pose accuracy** (GMI Cloud) — geometric keypoint match vs reference (0-10)
- **Style/energy** (Gemini) — subjective assessment of performance quality (0-10)
- **Final score** = average of both → higher score wins

---

## Reference Celebrations

1. Cristiano Ronaldo — "SIUUUU" (jump + arm pull down)
2. Kylian Mbappe — Arms crossed, chin up
3. Lionel Messi — Arms wide, look to the sky

Each has a reference image stored in the app.

---

## Architecture Diagram

```
Browser A (webcam)                    Browser B (webcam)
     |                                     |
     +-------- WebSocket Server -----------+
               (matchmaking + game state)
                        |
              frames from both players
                        |
          +-------------+-------------+
          |                           |
          v                           v
   GMI Cloud (H100)           Gemini Live API
   +-----------------+       +-----------------+
   | Pose estimation |       | Live WebSocket  |
   | → keypoints     |       | → commentary    |
   | → skeleton      |       | → style/energy  |
   | → pose score    |       |   score         |
   +-----------------+       +-----------------+
          |                           |
          +-------------+-------------+
                        |
                  Average scores
                  → Winner decided
                        |
                        v
               Results via WebSocket
               → Scores + winner
               → Skeleton overlay
               → Gemini commentary

   RocketRide: wraps scoring logic as a
   deployable pipeline endpoint
```

---

## MVP Scope (Hackathon Day)

### Must Have

- [ ] Webcam capture in browser (getUserMedia)
- [ ] WebSocket server for 1v1 matchmaking + game state
- [ ] Reference celebration display (at least 1, target 3)
- [ ] Live frame streaming to backend
- [ ] GMI Cloud pose estimation → skeleton overlay rendered on video
- [ ] GMI Cloud pose similarity scoring (keypoints vs reference)
- [ ] Gemini Live API session → real-time commentary during performance
- [ ] Gemini Live → style/energy score after celebration window
- [ ] RocketRide pipeline wrapping scoring endpoint
- [ ] Score display + winner announcement to both players
- [ ] Playable end-to-end with 2 clients via ngrok/Tailscale

### Nice to Have

- [ ] Gemini Live audio commentary played back (sports commentator feel)
- [ ] Multiple rounds / best of 3
- [ ] Sound effects / crowd roar on win

---

## Demo Script (3 minutes)

1. **(0:00-0:30)** — Hook: "The World Cup starts in 3 weeks. Everyone's going to be
   doing celebrations. But who actually does them best? We built AI to find out."
2. **(0:30-1:00)** — Show the app: two laptops side by side, both connect, get matched
3. **(1:00-2:15)** — Live demo: Ronaldo's SIUUU challenge
   - Show skeleton overlays tracking both players in real-time
   - Gemini Live commentating as they perform
   - Scores appear, winner crowned
4. **(2:15-2:45)** — Architecture slide: "Gemini Live = the commentator, GMI Cloud =
   the pose analyst, RocketRide = the orchestrator. Each does what it's best at."
5. **(2:45-3:00)** — Vision: "Imagine this at watch parties during the World Cup.
   Every goal, the whole room competes." Thank sponsors.
