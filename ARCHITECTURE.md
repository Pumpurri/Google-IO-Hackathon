# WorldMog — Technical Architecture

## What Is It?
Real-time 1v1 web app where players get matched, watch a famous soccer celebration clip, then perform it on camera. An AI commentator roasts them live while dual AI judges score accuracy and style.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI + Uvicorn (Python) |
| Real-time | WebSockets (native, no Socket.IO) |
| Auth & Infra | **Google Cloud Vertex AI** (Application Default Credentials) |
| Live Commentary | **Gemini Live API** (`gemini-live-2.5-flash-native-audio`) — streaming video in, audio + text out |
| Accuracy Scoring | **GMI Cloud** (OpenAI-compatible, `gpt-4o` vision on NVIDIA H100/H200 GPUs) |
| Style Scoring | **RocketRide AIDE Pipeline** → **Gemini 2.5 Flash** (multimodal batch) |
| Tunnel | ngrok |

---

## How a Match Works (Full Flow)

```
Player A connects ──→ WebSocket /ws ──→ Matchmaker queue
Player B connects ──→ WebSocket /ws ──→ Matchmaker queue
                                            │
                                    2 players queued
                                            │
                                    ┌───────▼────────┐
                                    │  Create Room    │
                                    │  Pick random    │
                                    │  celebration    │
                                    └───────┬────────┘
                                            │
                              Both get "matched" message
                              with celebration clip + ref image
                                            │
                                ┌───────────▼───────────┐
                                │   STUDY PHASE (10s)   │
                                │   Full-screen popup   │
                                │   of reference video  │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │   COUNTDOWN (5..1)    │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │   PERFORM (25s)       │
                                │                       │
                                │  Frames captured 4FPS │
                                │  → sent to backend    │
                                │  → relayed to opponent│
                                │  → fed to Gemini Live │
                                │                       │
                                │  Gemini Live outputs: │
                                │  • Audio commentary   │
                                │  • Live scores (UI)   │
                                │  • Text transcription │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │   JUDGING (~4.5s)     │
                                │   3-stage dramatic:   │
                                │   analyzing →         │
                                │   comparing →         │
                                │   deliberating        │
                                │                       │
                                │  GMI (accuracy) ──┐   │
                                │                   ├─→ Aggregate
                                │  RocketRide/      │   │
                                │  Gemini (style) ──┘   │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │   RESULTS             │
                                │   Winner + scores +   │
                                │   AI roast feedback   │
                                │   Rematch / New Match │
                                └───────────────────────┘
```

---

## Gemini Live API (Real-Time Commentary)

We open a **persistent WebSocket session** to `gemini-live-2.5-flash-native-audio` via **Google Cloud Vertex AI**.

**What we send in:**
- Player webcam frames as JPEG blobs (throttled to 2 FPS per player)
- Reference celebration image at session start
- Setup prompt with player names and celebration name

**What we get back:**
- **Audio chunks** — streamed directly to browser via `AudioContext` for live voice commentary
- **Text transcription** — we regex-extract live scores from the commentary text and display them on each player's panel

The system prompt makes it act as an unhinged sports commentator who naturally embeds scores in speech. We parse scores with regex and maintain running totals that update the UI in real-time.

---

## Dual-Judge Scoring System

After the 25s performance, we run **two AI judges in parallel**:

### Judge 1: GMI Cloud — Accuracy (65% weight)
- **Model:** `openai/gpt-4o` via GMI Cloud (`api.gmi-serving.com`) on NVIDIA GPU infrastructure
- **Input:** 3 key frames (start, middle, end) + reference image
- **Evaluates:** Body position, arm placement, stance match
- **Output:** `{"score": 8.2, "feedback": "hilarious roast or praise"}`

### Judge 2: RocketRide AIDE → Gemini — Style & Energy (35% weight)
- **Pipeline:** RocketRide AIDE orchestrates a 3-stage pipeline (`chat → llm_gemini → response_answers`)
- **Model:** `gemini-2.5-flash` via RocketRide's Gemini integration
- **Input:** Same 3 key frames + reference image
- **Evaluates:** Energy, expressiveness, commitment, vibe
- **Output:** Same `{"score", "feedback"}` format

The style scoring is **toggleable** between direct Gemini calls and the RocketRide pipeline via `SCORING_BACKEND=direct|rocketride`. This lets us demonstrate RocketRide's pipeline orchestration while keeping a reliable fallback.

### Aggregation
```python
final = round((0.65 * gmi_score) + (0.35 * gemini_score), 1)
```

---

## RocketRide AIDE Integration

RocketRide AIDE handles model orchestration for our style scoring pipeline.

**Pipeline definition** (`pipeline/scoring.pipe`):
- **chat** (source component) — receives the scoring question with player frames and celebration context
- **llm_gemini** (Gemini 2.5 Flash) — processes the multimodal scoring request
- **response_answers** — returns structured JSON answers

**Why RocketRide:**
- Swap underlying models without touching application code
- Pipeline observability and tracing for debugging scoring issues
- Model-independent architecture — if a better model ships, change one config line
- Python SDK integrates naturally with our FastAPI backend via `RocketRideClient`

**Implementation:** The backend lazily connects to RocketRide, loads the pipeline via `client.use()`, and sends structured `Question` objects with scoring criteria and examples.

---

## Frame Pipeline

```
Browser                          Server                         AI Services
───────                          ──────                         ───────────
canvas.toDataURL()          receive via WebSocket
  320x240 JPEG                    │
  55% quality                     ├──→ Store in room.frames[]
  @ 4 FPS                        ├──→ Relay to opponent (live feed)
                                  └──→ Forward to Gemini Live (2 FPS throttle)

                             After game ends:
                                  pick_key_frames(count=3)
                                  indices: [0, len/2, len-1]
                                        │
                                  ┌─────┴─────┐
                                  ▼           ▼
                              GMI Cloud   RocketRide → Gemini
                              (accuracy)  (style)
```

---

## Environment Variables

```
GOOGLE_CLOUD_PROJECT=   # Vertex AI project ID
GOOGLE_CLOUD_LOCATION=us-central1
GMI_API_KEY=            # GMI Cloud JWT token
GMI_VISION_MODEL=openai/gpt-4o
GEMINI_BATCH_MODEL=gemini-2.5-flash
GEMINI_LIVE_MODEL=gemini-live-2.5-flash-native-audio
SCORING_BACKEND=direct  # or "rocketride"
ROCKETRIDE_URI=http://localhost:5565
ROCKETRIDE_APIKEY=
ROCKETRIDE_GEMINI_KEY=  # Gemini key for RocketRide pipeline
```

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Frame capture rate | 4 FPS |
| Gemini Live input rate | 2 FPS per player (throttled) |
| Frame resolution | 320x240 JPEG @ 55% quality |
| Study time | 10 seconds |
| Performance time | 25 seconds |
| Scoring frames sent | 3 per player (start, mid, end) |
| Score weight (accuracy) | 65% (GMI Cloud) |
| Score weight (style) | 35% (RocketRide/Gemini) |
| Commentary audio | PCM 24kHz, 16-bit, mono |
| Judging stages | analyzing → comparing → deliberating |
