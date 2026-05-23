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
| Live Commentary | **Gemini 3.1 Flash Live Preview** (streaming video + audio out) |
| Accuracy Scoring | **GMI Cloud** (OpenAI-compatible, gpt-4o vision) |
| Style Scoring | **Gemini 3.1 Flash Lite** (multimodal batch) |
| Pose Detection | **MediaPipe PoseLandmarker** (client-side, GPU) |
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
                                │   Watch the clip      │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │   COUNTDOWN (5..1)    │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │   PERFORM (15s)       │
                                │                       │
                                │  Frames captured 4FPS │
                                │  → sent to backend    │
                                │  → relayed to opponent│
                                │  → fed to Gemini Live │
                                │                       │
                                │  Gemini Live outputs: │
                                │  • Audio commentary   │
                                │  • Text transcription │
                                │  • Embedded scores    │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │   JUDGING (~4.5s)     │
                                │                       │
                                │  GMI (accuracy) ──┐   │
                                │                   ├─→ Aggregate
                                │  Gemini (style) ──┘   │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │   RESULTS             │
                                │   Winner + scores +   │
                                │   judge feedback      │
                                │   Rematch / New Match │
                                └───────────────────────┘
```

---

## Gemini Live API (Real-Time Commentary)

This is the core Google tech. We open a **persistent WebSocket session** to `models/gemini-3.1-flash-live-preview`.

**What we send in:**
- Player webcam frames as JPEG blobs (throttled to 2 FPS per player)
- Reference celebration image at session start
- Setup prompt with player names and celebration name

**What we get back:**
- **Audio chunks** — raw PCM at 24kHz, 16-bit mono. Streamed directly to browser via `AudioContext`
- **Text transcription** — we regex-extract live scores from the commentary text

**The system prompt** makes it act as an unhinged sports commentator who naturally embeds scores:
> "Player one is sitting at a TRAGIC 3.5 right now — bro that's not even passing!"

We parse scores with regex patterns like:
```
{player_name}\s*(?:is\s+)?(?:at\s+)(\d+(?:\.\d+)?)
```

This gives us **live score updates during performance** — not just final scores.

**Config:**
```python
LiveConnectConfig(
    response_modalities=[Modality.AUDIO],
    output_audio_transcription=AudioTranscriptionConfig(),
    realtime_input_config=RealtimeInputConfig(
        turn_coverage="TURN_INCLUDES_ONLY_ACTIVITY"
    ),
)
```

---

## Dual-Judge Scoring System

After the 15s performance, we run **two AI judges in parallel**:

### Judge 1: GMI Cloud — Accuracy (65% weight)
- **Model:** `openai/gpt-4o` via GMI Cloud (`api.gmi-serving.com`)
- **Input:** 3 key frames (start, middle, end) + reference image
- **Evaluates:** Body position, arm placement, stance match
- **Output:** `{"score": 8.2, "feedback": "Bro nailed the arm pull..."}`

### Judge 2: Gemini Batch — Style & Energy (35% weight)
- **Model:** `gemini-3.1-flash-lite`
- **Input:** Same 3 key frames + reference image
- **Evaluates:** Energy, expressiveness, commitment, vibe
- **Output:** `{"score": 7.5, "feedback": "The energy was FIRE..."}`

### Aggregation
```python
final = round((0.65 * gmi_score) + (0.35 * gemini_score), 1)
```

**Why 65/35?** Accuracy matters most (did you actually do the celebration?), but style prevents gaming it by just standing in the right pose with zero energy.

---

## Frame Pipeline

```
Browser                          Server                         AI Services
───────                          ──────                         ───────────
canvas.toDataURL()          receive via WebSocket
  320x240 JPEG                    │
  55% quality                     ├──→ Store in room.frames[]
  @ 4 FPS                        ├──→ Relay to opponent (live feed)
         │                        └──→ Forward to Gemini Live (2 FPS throttle)
         │
         │                   After game ends:
         │                        pick_key_frames(count=3)
         │                        indices: [0, len/2, len-1]
         │                              │
         │                        ┌─────┴─────┐
         │                        ▼           ▼
         │                    GMI Cloud   Gemini Batch
         │                    (accuracy)  (style)
```

**Key decisions:**
- 320x240 @ 55% JPEG = ~15-25KB per frame (bandwidth friendly)
- 4 FPS capture, 2 FPS to Gemini Live (rate limited server-side)
- Only 3 frames sent to batch judges (cost optimization)

---

## MediaPipe Pose Detection (Client-Side)

Runs entirely in the browser using `@mediapipe/tasks-vision`:

- **Model:** `pose_landmarker_full` (float16, GPU-accelerated)
- **Output:** 33 body landmarks per frame
- **Smoothing:** Exponential moving average (factor 0.65) to reduce jitter
- **Rendering:** Green skeleton overlay (`#34d399`) drawn on a canvas over the video
- **Why client-side?** Zero latency, no API cost, works offline

This is purely visual — scoring uses the raw frames, not landmark data.

---

## WebSocket Protocol

### Server → Client

| Type | When | Key Fields |
|------|------|------------|
| `welcome` | Connect | `playerId` |
| `waiting` | Queued | — |
| `matched` | Match found | `roomId, opponentId, opponentName, celebration` |
| `countdown` | Study/countdown | `seconds, label` |
| `perform` | Go time | `durationSeconds: 15` |
| `commentary` | During performance | `text` (from Gemini Live transcription) |
| `commentary_audio` | During performance | `data` (base64 PCM 24kHz) |
| `live_scores` | During performance | `scores: {playerId: number}` |
| `opponent_frame` | During performance | `frame` (base64 JPEG) |
| `judging` | Post-performance | `stage: analyzing/comparing/deliberating` |
| `results` | Final | `winnerId, scores` |

### Client → Server

| Type | When | Key Fields |
|------|------|------------|
| `set_name` | After welcome | `name` |
| `frame` | During performance | `frame` (base64 JPEG), `capturedAtMs` |
| `rematch` | Results screen | — |
| `leave` | Results screen | — |

---

## Room State Machine

```
MATCHED → COUNTDOWN → PERFORMING → JUDGING → RESULTS
                                                  │
                                          rematch ↓
                                              MATCHED (new celebration)
```

Each phase is server-authoritative. The client just reacts to phase messages.

---

## Alternative: RocketRide Pipeline

Set `SCORING_BACKEND=rocketride` to route style scoring through a RocketRide AIDE pipeline instead of direct Gemini calls. Same input/output, but adds orchestration and observability.

---

## Data Models

```python
# Player
PlayerConnection(player_id="PABC123", websocket=..., room_id="R1234ABCD", name="Jake")

# Room
Room(
    room_id="R1234ABCD",
    players=[p1, p2],
    celebration={"id": "ronaldo-siuu", "name": "SIUUUU! Hit the Ronaldo Jump", ...},
    phase=RoomPhase.PERFORMING,
    frames={"PABC123": ["data:image/jpeg;base64,...", ...], ...}
)

# Scoring
JudgeScore(score=8.2, feedback="Absolutely nailed it")
PlayerScore(final=7.8, gmi=JudgeScore(...), gemini=JudgeScore(...))
BattleResult(winner_id="PABC123", scores={"PABC123": PlayerScore(...), ...})
```

---

## Environment Variables

```
GEMINI_API_KEY=         # Google Gemini API key
GMI_API_KEY=            # GMI Cloud token
GMI_VISION_MODEL=openai/gpt-4o
GEMINI_BATCH_MODEL=gemini-3.1-flash-lite
GEMINI_LIVE_MODEL=models/gemini-3.1-flash-live-preview
SCORING_BACKEND=direct  # or "rocketride"
```

---

## Key Numbers to Know

| Metric | Value |
|--------|-------|
| Frame capture rate | 4 FPS |
| Gemini Live input rate | 2 FPS per player (throttled) |
| Frame resolution | 320x240 JPEG @ 55% quality |
| Study time | 10 seconds |
| Performance time | 15 seconds |
| Scoring frames sent | 3 per player (start, mid, end) |
| Score weight (accuracy) | 65% |
| Score weight (style) | 35% |
| Commentary audio | PCM 24kHz, 16-bit, mono |
| Pose landmarks | 33 per frame (MediaPipe) |
| Smoothing factor | 0.65 (exponential moving average) |
