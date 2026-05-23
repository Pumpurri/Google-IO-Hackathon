# WorldMog - Implementation Plan

## Decision Update: Use FastAPI + Vite React + Tailwind

Yes: for this project, **Python FastAPI is the better backend choice** and
**Vite + React + Tailwind is the better frontend choice**.

The original Node + vanilla JS plan was valid for the smallest possible prototype,
but WorldMog is not just a static page. It has real-time game state, matchmaking,
AI scoring, frame buffering, timed rounds, error handling, and a UI that changes
rapidly based on WebSocket events. That makes a typed React frontend and a Python
AI-focused backend a cleaner hackathon architecture.

### Why FastAPI for the Backend

FastAPI is a strong fit because:

- Python is the most natural ecosystem for AI SDKs, image handling, prompt
  orchestration, and RocketRide-style pipeline glue.
- FastAPI has first-class WebSocket support, so we do not lose the real-time
  matchmaking capability from the Node plan.
- Pydantic gives us strict validation for WebSocket messages, scoring responses,
  environment config, and API payloads.
- Async Python lets us run GMI scoring, Gemini scoring, and player workflows in
  parallel without blocking the server.

Trade-off:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| Node + `ws` | Very small server, simple WebSocket examples | AI code becomes split across JS and Python, weaker payload validation unless added manually | Good only for smallest prototype |
| FastAPI | Better AI ecosystem, typed validation, clean async services, easier RocketRide integration | Slightly more structure to create up front | Recommended |

### Why Vite + React + Tailwind for the Frontend

React is worth it because the frontend is state-heavy:

- Landing -> waiting -> matched -> countdown -> performing -> judging -> results.
- Webcam stream, skeleton canvas, score overlays, commentary, timer, and rematch
  controls all need predictable state transitions.
- Components make it easier for two people to work in parallel without editing one
  huge DOM file.

Tailwind is useful here because we need fast visual iteration and consistent
spacing, colors, and responsive layouts.

Trade-off:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| Vanilla JS + CSS | No build step, fastest first file | State machine and UI updates get messy quickly | Acceptable for throwaway demo |
| Vite + React + Tailwind | Clean components, fast dev server, maintainable UI, better teamwork | Requires build tooling and dependencies | Recommended |

**Final stack:** FastAPI backend, Vite React frontend, Tailwind styling,
MediaPipe Pose in the browser, GMI Cloud for vision scoring, Gemini for commentary
and style scoring, RocketRide as the scoring pipeline wrapper if time allows.

---

## Important Discovery: GMI Cloud Has No Pose Estimation Model

GMI Cloud's model catalog is focused on LLMs, vision-language models, image
generation, and video generation. It does **not** provide a dedicated pose
estimation or keypoint extraction model that replaces MediaPipe.

This changes the architecture:

- **Skeleton overlay:** run MediaPipe Pose client-side in the browser.
- **GMI Cloud:** use a vision-language model to compare reference frames against
  player frames and score physical accuracy.
- **Gemini:** use Live where available for real-time commentary, with batch
  multimodal scoring as a fallback.

This is actually better for the demo. MediaPipe gives instant visual feedback with
zero server round trip, while GMI and Gemini do higher-level judging.

---

## Reference Assets

Store the five short celebration clips and extracted reference images in the Vite
public directory so they can be served statically:

```text
frontend/public/celebrations/
  ronaldo-siuu.mp4
  ronaldo-siuu-ref.jpg
  mbappe-arms.mp4
  mbappe-arms-ref.jpg
  messi-wide.mp4
  messi-wide-ref.jpg
  ...
```

The backend should also know the reference image paths for scoring. Keep one
manifest so the frontend and backend do not drift:

```json
[
  {
    "id": "ronaldo-siuu",
    "name": "Ronaldo SIUU",
    "clipUrl": "/celebrations/ronaldo-siuu.mp4",
    "referenceImageUrl": "/celebrations/ronaldo-siuu-ref.jpg",
    "referenceImagePath": "frontend/public/celebrations/ronaldo-siuu-ref.jpg"
  }
]
```

Best practice: the frontend uses the public URL, while the backend reads the local
file path for scoring.

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Vite + React + TypeScript | Fast dev loop, component state, safer WebSocket payloads |
| Styling | Tailwind CSS | Fast UI iteration with consistent spacing and responsive rules |
| Webcam | Browser `getUserMedia` | Native camera access, no server dependency |
| Skeleton overlay | MediaPipe Pose Landmarker | Client-side keypoints, low latency, Google technology |
| Backend | FastAPI + Uvicorn | Async WebSockets, API routes, Python AI ecosystem |
| Validation | Pydantic | Strict message schemas and structured scoring results |
| GMI Cloud | OpenAI-compatible API | Vision-language scoring for pose accuracy |
| Gemini | Gemini Live plus batch fallback | Commentary and style scoring |
| RocketRide | Python pipeline wrapper | Natural fit with Python backend and scoring services |
| Tunnel | ngrok | Cross-device demo |

---

## Project Structure

```text
worldmog/
|-- backend/
|   |-- app/
|   |   |-- main.py                    # FastAPI app and WebSocket route
|   |   |-- core/
|   |   |   `-- config.py              # Env config via Pydantic settings
|   |   |-- models/
|   |   |   |-- game.py                # Room, player, celebration models
|   |   |   |-- messages.py            # WebSocket message schemas
|   |   |   `-- scoring.py             # AI scoring response schemas
|   |   |-- services/
|   |   |   |-- matchmaker.py          # Queue, rooms, disconnect cleanup
|   |   |   |-- game_loop.py           # Countdown, performance, judging flow
|   |   |   |-- gmi_scoring.py         # GMI Cloud scoring
|   |   |   |-- gemini_scoring.py      # Gemini commentary/scoring
|   |   |   |-- rocketride_scoring.py  # Optional pipeline wrapper
|   |   |   `-- celebrations.py        # Manifest loading and asset helpers
|   |   `-- utils/
|   |       `-- images.py              # Base64, resizing, frame selection
|   |-- tests/
|   |   |-- test_frame_selection.py
|   |   |-- test_score_aggregation.py
|   |   `-- test_message_validation.py
|   |-- pyproject.toml
|   `-- .env.example
|-- frontend/
|   |-- index.html
|   |-- package.json
|   |-- vite.config.ts
|   |-- public/
|   |   `-- celebrations/
|   `-- src/
|       |-- main.tsx
|       |-- App.tsx
|       |-- components/
|       |   |-- Landing.tsx
|       |   |-- BattleView.tsx
|       |   |-- Countdown.tsx
|       |   |-- ScorePanel.tsx
|       |   `-- ResultsModal.tsx
|       |-- hooks/
|       |   |-- useGameSocket.ts
|       |   |-- useWebcam.ts
|       |   `-- usePoseOverlay.ts
|       |-- lib/
|       |   |-- captureFrame.ts
|       |   `-- mediapipe.ts
|       |-- types/
|       |   `-- messages.ts
|       `-- styles/
|           `-- index.css
|-- pipeline/
|   `-- scoring.pipe
|-- .env
`-- README.md
```

Why this structure matters:

- `backend/app/services/` keeps side-effect-heavy integrations isolated.
- `backend/app/models/` makes the message contract explicit and testable.
- `frontend/src/hooks/` keeps webcam, WebSocket, and MediaPipe logic out of UI
  components.
- `frontend/public/` is the correct Vite location for static assets referenced by
  browser URL.

---

## Message Protocol

Define the WebSocket protocol before coding. This prevents frontend/backend drift.

### Client to Server

```ts
type ClientMessage =
  | { type: "ready" }
  | { type: "frame"; frame: string; capturedAtMs: number }
  | { type: "rematch" }
  | { type: "leave" };
```

### Server to Client

```ts
type ServerMessage =
  | { type: "welcome"; playerId: string }
  | { type: "waiting" }
  | { type: "matched"; roomId: string; playerId: string; opponentId: string; celebration: Celebration }
  | { type: "countdown"; seconds: number }
  | { type: "perform"; durationSeconds: number }
  | { type: "commentary"; text: string }
  | { type: "judging" }
  | { type: "results"; winnerId: string; scores: Record<string, PlayerScore> }
  | { type: "opponent_disconnected" }
  | { type: "error"; message: string };
```

Best practice: duplicate these shapes in TypeScript and Pydantic. In a larger
project, generate one from the other, but for a hackathon this small duplication is
acceptable because it keeps both sides explicit.

---

## Stage 0: Project Init

**Goal:** create a working FastAPI backend and Vite React frontend.

### Backend Setup

```bash
mkdir -p backend/app backend/tests
cd backend
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn[standard] pydantic-settings python-dotenv openai google-genai httpx pillow pytest pytest-asyncio
```

Create `backend/pyproject.toml`:

```toml
[project]
name = "worldmog-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi",
  "uvicorn[standard]",
  "pydantic-settings",
  "python-dotenv",
  "openai",
  "google-genai",
  "httpx",
  "pillow",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

### Frontend Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @mediapipe/tasks-vision lucide-react
npm install tailwindcss @tailwindcss/vite
```

### Done When

- From the repo root, `uvicorn app.main:app --reload --app-dir backend` starts the backend.
- From `backend/`, `uvicorn app.main:app --reload` starts the backend.
- `npm run dev` starts the frontend.
- Browser opens the React app.

---

## Stage 1: Landing Page + Webcam

**Goal:** user opens the app, clicks enter, grants camera permission, and sees their
webcam feed.

### Tasks

- [ ] Create `Landing`, `BattleView`, and `App` components.
- [ ] Add a `GamePhase` union type: `landing | waiting | matched | countdown |
      performing | judging | results`.
- [ ] Implement `useWebcam()` to request camera access only after a user gesture.
- [ ] Show helpful UI if camera permission is denied.
- [ ] Render a split-screen battle layout with the local player panel on the left
      and opponent panel on the right.

### Key Code

```ts
// frontend/src/hooks/useWebcam.ts
import { useCallback, useRef, useState } from "react";

export type WebcamState = "idle" | "requesting" | "active" | "denied" | "error";

/**
 * Owns browser camera access for the local player.
 *
 * The hook keeps media-stream side effects out of React components. That makes
 * the UI easier to test and prevents duplicate getUserMedia calls during re-renders.
 */
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<WebcamState>("idle");

  const start = useCallback(async () => {
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState("active");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "UnknownError";
      setState(name === "NotAllowedError" ? "denied" : "error");
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState("idle");
  }, []);

  return { videoRef, state, start, stop };
}
```

```tsx
// frontend/src/components/BattleView.tsx
type BattleViewProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  statusText: string;
};

export function BattleView({ videoRef, statusText }: BattleViewProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="grid min-h-screen grid-cols-1 gap-3 p-3 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-lg border border-emerald-400/30 bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <canvas id="local-skeleton" className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>

        <div className="grid place-items-center rounded-lg border border-zinc-800 bg-zinc-900">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
            {statusText}
          </p>
        </div>
      </section>
    </main>
  );
}
```

### Done When

Clicking **Enter the Arena** activates the camera and displays the local feed in the
battle layout.

---

## Stage 2: FastAPI WebSocket Server + Matchmaking

**Goal:** two browser clients connect, enter a queue, and get paired into a room.

### Tasks

- [ ] Create a FastAPI app with `/health` and `/ws`.
- [ ] Create a `ConnectionManager` or `Matchmaker` service.
- [ ] Assign each player a stable random ID.
- [ ] Maintain an in-memory queue for the hackathon demo.
- [ ] Create a room when two players are waiting.
- [ ] Send both clients the same celebration.
- [ ] Clean up rooms on disconnect and notify the opponent.

### Key Code

```py
# backend/app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.matchmaker import Matchmaker

app = FastAPI(title="WorldMog API")
matchmaker = Matchmaker()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    """Return a lightweight health check for local dev and demo monitoring."""
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Handle one player's real-time game connection."""
    player = await matchmaker.connect(websocket)

    try:
        while True:
            message = await websocket.receive_json()
            await matchmaker.handle_message(player.player_id, message)
    except WebSocketDisconnect:
        await matchmaker.disconnect(player.player_id)
```

```py
# backend/app/models/game.py
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from fastapi import WebSocket


class RoomPhase(StrEnum):
    MATCHED = "matched"
    COUNTDOWN = "countdown"
    PERFORMING = "performing"
    JUDGING = "judging"
    RESULTS = "results"


@dataclass(slots=True)
class PlayerConnection:
    """Represents one connected player and their WebSocket."""

    player_id: str
    websocket: WebSocket
    room_id: str | None = None


@dataclass(slots=True)
class Room:
    """In-memory room state for one two-player battle."""

    room_id: str
    players: list[PlayerConnection]
    celebration: dict
    phase: RoomPhase = RoomPhase.MATCHED
    frames: dict[str, list[str]] = field(default_factory=dict)
```

```py
# backend/app/services/matchmaker.py
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import WebSocket

from app.models.game import PlayerConnection, Room


class Matchmaker:
    """Owns matchmaking, rooms, frame buffering, and disconnect cleanup."""

    def __init__(self, start_game: Callable[[str], Awaitable[None]] | None = None) -> None:
        self.start_game = start_game
        self.waiting: list[PlayerConnection] = []
        self.players: dict[str, PlayerConnection] = {}
        self.rooms: dict[str, Room] = {}

    async def connect(self, websocket: WebSocket) -> PlayerConnection:
        await websocket.accept()

        player = PlayerConnection(player_id=f"P{uuid4().hex[:6].upper()}", websocket=websocket)
        self.players[player.player_id] = player

        await self.send(player, {"type": "welcome", "playerId": player.player_id})
        self.waiting.append(player)
        await self.send(player, {"type": "waiting"})

        if len(self.waiting) >= 2:
            await self._create_room()

        return player

    async def send(self, player: PlayerConnection, payload: dict) -> None:
        await player.websocket.send_json(payload)

    async def broadcast(self, room: Room, payload: dict) -> None:
        for player in room.players:
            await self.send(player, payload)

    async def _create_room(self) -> None:
        p1, p2 = self.waiting.pop(0), self.waiting.pop(0)
        room_id = f"R{uuid4().hex[:8].upper()}"
        celebration = self._pick_celebration()
        room = Room(room_id=room_id, players=[p1, p2], celebration=celebration)

        for player in room.players:
            player.room_id = room_id
            room.frames[player.player_id] = []

        self.rooms[room_id] = room

        await self.send(p1, {
            "type": "matched",
            "roomId": room_id,
            "playerId": p1.player_id,
            "opponentId": p2.player_id,
            "celebration": celebration,
        })

        await self.send(p2, {
            "type": "matched",
            "roomId": room_id,
            "playerId": p2.player_id,
            "opponentId": p1.player_id,
            "celebration": celebration,
        })

        if self.start_game:
            # The game loop runs in the background so both WebSocket receive loops
            # stay responsive while the countdown and scoring flow progresses.
            asyncio.create_task(self.start_game(room_id))

    def _pick_celebration(self) -> dict:
        return {
            "id": "ronaldo-siuu",
            "name": "Ronaldo SIUU",
            "clipUrl": "/celebrations/ronaldo-siuu.mp4",
            "referenceImageUrl": "/celebrations/ronaldo-siuu-ref.jpg",
        }
```

### Done When

Opening two tabs connects both clients, pairs them into one room, and sends the
same celebration metadata to both.

---

## Stage 3: Server-Driven Game Flow

**Goal:** countdown, performance window, judging, and results happen in sync for
both players.

### Tasks

- [ ] Start the game loop immediately after a room is created.
- [ ] Send `{ type: "countdown", seconds: 3 }`.
- [ ] Sleep three seconds on the backend.
- [ ] Send `{ type: "perform", durationSeconds: 5 }`.
- [ ] Accept frames only while the room phase is `performing`.
- [ ] Send `{ type: "judging" }`.
- [ ] Run AI scoring.
- [ ] Send `{ type: "results", winnerId, scores }`.

### Why Server-Driven Timing

Client timers are only presentation. The server owns the real phase transitions so
both players compete under the same timing rules. This also prevents a client from
sending late frames after the round ends.

### Key Code

```py
# backend/app/services/game_loop.py
import asyncio
from app.models.game import RoomPhase
from app.models.scoring import BattleResult


async def run_room_game(room_id: str, matchmaker, scoring_service) -> None:
    """Run one full room lifecycle from countdown through results."""
    room = matchmaker.rooms[room_id]

    room.phase = RoomPhase.COUNTDOWN
    await matchmaker.broadcast(room, {"type": "countdown", "seconds": 3})
    await asyncio.sleep(3)

    room.phase = RoomPhase.PERFORMING
    await matchmaker.broadcast(room, {"type": "perform", "durationSeconds": 5})
    await asyncio.sleep(5)

    room.phase = RoomPhase.JUDGING
    await matchmaker.broadcast(room, {"type": "judging"})

    result: BattleResult = await scoring_service.score_room(room)
    room.phase = RoomPhase.RESULTS
    await matchmaker.broadcast(room, result.model_dump(by_alias=True))
```

### Done When

Both tabs see the same countdown, performance timer, judging state, and results
without manual refresh.

---

## Stage 4: Frame Capture + MediaPipe Skeleton Overlay

**Goal:** during the performance window, render the skeleton locally and send
compressed frames to the backend for scoring.

### Tasks

- [ ] Install `@mediapipe/tasks-vision`.
- [ ] Initialize Pose Landmarker once when the battle screen mounts.
- [ ] Draw landmarks and connectors onto a canvas over the webcam.
- [ ] Capture scoring frames every 500 ms at 320x240 JPEG quality around `0.55`.
- [ ] Send frames only while phase is `performing`.
- [ ] Strip or normalize base64 prefixes on the backend.

### Why MediaPipe Stays Client-Side

Pose detection is visual feedback, not authoritative scoring. Running it in the
browser avoids server GPU needs, avoids extra latency, and gives the player instant
feedback. The AI judges can still evaluate the captured JPEGs.

### Key Code

```ts
// frontend/src/lib/captureFrame.ts
/**
 * Capture a compressed JPEG frame for AI scoring.
 *
 * The displayed webcam can stay high quality. The scoring frame should be small
 * because it moves over WebSocket and is sent to vision models.
 */
export function captureScoringFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 240;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.55);
}
```

```ts
// frontend/src/hooks/usePoseOverlay.ts
import { useEffect, useRef } from "react";
import { DrawingUtils, FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

type UsePoseOverlayOptions = {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

/**
 * Runs MediaPipe Pose on animation frames and draws the skeleton overlay.
 */
export function usePoseOverlay({ enabled, videoRef, canvasRef }: UsePoseOverlayOptions) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );

      if (cancelled) {
        return;
      }

      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    }

    init();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const draw = () => {
      const landmarker = landmarkerRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (landmarker && video && canvas && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const result = landmarker.detectForVideo(video, performance.now());
        const context = canvas.getContext("2d");

        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);

          if (result.landmarks[0]) {
            const drawingUtils = new DrawingUtils(context);
            drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
              color: "#34d399",
              lineWidth: 3,
            });
            drawingUtils.drawLandmarks(result.landmarks[0], {
              color: "#f8fafc",
              fillColor: "#34d399",
              radius: 4,
            });
          }
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enabled, videoRef, canvasRef]);
}
```

### Done When

During the performance window, the player sees a skeleton overlay and the backend
logs about 10 frames per player for a 5-second round.

---

## Stage 5: GMI Cloud Vision Scoring

**Goal:** compare each player's captured frames with the reference image and produce
an accuracy score.

### Tasks

- [ ] Use the Python `openai` SDK with GMI's OpenAI-compatible base URL.
- [ ] Pick 3 key frames: first, middle, last.
- [ ] Send the reference image plus player frames to the vision-language model.
- [ ] Ask for strict JSON.
- [ ] Validate the model response with Pydantic.
- [ ] Return a safe fallback score if the API fails during demo.

### Key Code

```py
# backend/app/models/scoring.py
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class JudgeScore(BaseModel):
    """Normalized score returned by one AI judge."""

    score: float = Field(ge=0, le=10)
    feedback: str = Field(min_length=1, max_length=240)


class PlayerScore(BaseModel):
    """All scoring signals for one player."""

    final: float = Field(ge=0, le=10)
    gmi: JudgeScore
    gemini: JudgeScore


class BattleResult(BaseModel):
    """Final result message sent to both clients."""

    model_config = ConfigDict(populate_by_name=True)

    message_type: Literal["results"] = Field(default="results", alias="type")
    winner_id: str = Field(alias="winnerId")
    scores: dict[str, PlayerScore]
```

```py
# backend/app/services/gmi_scoring.py
import json

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.models.scoring import JudgeScore
from app.utils.images import pick_key_frames


client = AsyncOpenAI(
    api_key=settings.gmi_api_key,
    base_url="https://api.gmi-serving.com/v1",
)


async def score_with_gmi(
    player_frames: list[str],
    reference_image_data_url: str,
    celebration_name: str,
) -> JudgeScore:
    """Score physical accuracy with a GMI vision-language model."""
    frames = pick_key_frames(player_frames, count=3)

    response = await client.chat.completions.create(
        model=settings.gmi_vision_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a strict soccer celebration accuracy judge. "
                    "Compare body position, timing, arm shape, leg stance, and energy. "
                    "Return JSON only: {\"score\": number, \"feedback\": string}."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Reference celebration: {celebration_name}"},
                    {"type": "image_url", "image_url": {"url": reference_image_data_url}},
                    {"type": "text", "text": "Player performance frames:"},
                    *[
                        {"type": "image_url", "image_url": {"url": frame}}
                        for frame in frames
                    ],
                ],
            },
        ],
        temperature=0.2,
        max_tokens=200,
    )

    raw_content = response.choices[0].message.content or "{}"

    try:
        return JudgeScore.model_validate(json.loads(raw_content))
    except (json.JSONDecodeError, ValidationError):
        return JudgeScore(score=5.0, feedback="Scoring response was invalid; used neutral fallback.")
```

### Why Validate the AI Response

LLM JSON is not guaranteed. Pydantic prevents malformed model output from crashing
the game at the results screen. The fallback score keeps the demo moving while still
making the failure visible in logs.

### Done When

After the performance window, GMI returns one validated `JudgeScore` per player.

---

## Stage 6: Gemini Commentary + Style Scoring

**Goal:** use Gemini for live commentary and a second scoring signal.

### Recommended MVP Approach

Use two paths:

1. **Primary reliable path:** batch Gemini multimodal scoring after the round.
2. **Stretch path:** Gemini Live for real-time commentary during the round.

This is the pragmatic approach because Gemini Live is preview/fast-moving API
surface. The demo should not depend on Live being perfect for final results.

### Tasks

- [ ] Implement `score_with_gemini_batch()` first.
- [ ] Return the same `JudgeScore` shape as GMI.
- [ ] Add Gemini Live commentary after batch scoring works.
- [ ] Relay commentary to only the relevant player or to both players, depending on
      the desired demo feel.
- [ ] If Live fails, continue the game and show results from GMI + batch Gemini.

### Batch Scoring Shape

```py
# backend/app/services/gemini_scoring.py
from app.models.scoring import JudgeScore
from app.utils.images import pick_key_frames


async def score_with_gemini_batch(
    player_frames: list[str],
    reference_image_data_url: str,
    celebration_name: str,
) -> JudgeScore:
    """Score style and energy with Gemini using captured frame snapshots."""
    frames = pick_key_frames(player_frames, count=3)

    # Implementation detail:
    # Use google-genai or direct Gemini REST here. Keep the public function stable
    # so the rest of the backend does not care which Gemini transport is used.
    #
    # Return JudgeScore(score=<0-10>, feedback=<one sentence>).
    raise NotImplementedError
```

### Live Commentary Shape

```py
# backend/app/services/gemini_scoring.py
async def stream_gemini_commentary(
    player_id: str,
    frames: list[str],
    celebration_name: str,
    send_commentary,
) -> None:
    """Optionally stream frames to Gemini Live and relay short commentary lines."""
    # Keep this optional. Failures should be logged, not allowed to break scoring.
    # The selected model and response modalities should be stored in settings
    # because Gemini Live model names change more often than app code should.
    return None
```

### Done When

Gemini provides one validated style score per player. Live commentary is a bonus if
it works reliably before the demo.

---

## Stage 7: Score Aggregation + Results

**Goal:** combine GMI accuracy and Gemini style into one final score.

### Tasks

- [ ] Score both players concurrently with `asyncio.gather`.
- [ ] Use GMI for physical accuracy.
- [ ] Use Gemini for style/energy.
- [ ] Compute `final = 0.65 * gmi.score + 0.35 * gemini.score`.
- [ ] Pick the winner by highest final score.
- [ ] Send a complete results message to both players.

### Why Weighted Scores

Accuracy should matter more than style because the game is about copying a specific
celebration. Style still matters because sports celebrations are expressive. A
65/35 split is easy to explain in a demo and prevents a high-energy but incorrect
pose from winning too often.

### Key Code

```py
# backend/app/services/scoring_service.py
import asyncio

from app.models.scoring import BattleResult, PlayerScore
from app.services.gemini_scoring import score_with_gemini_batch
from app.services.gmi_scoring import score_with_gmi


def aggregate_score(gmi_score: float, gemini_score: float) -> float:
    """Combine judge scores into one final score rounded to one decimal place."""
    return round((0.65 * gmi_score) + (0.35 * gemini_score), 1)


async def score_room(room, reference_image_data_url: str) -> BattleResult:
    """Score both players in a room concurrently and return the result payload."""
    async def score_player(player_id: str) -> tuple[str, PlayerScore]:
        frames = room.frames[player_id]
        gmi, gemini = await asyncio.gather(
            score_with_gmi(frames, reference_image_data_url, room.celebration["name"]),
            score_with_gemini_batch(frames, reference_image_data_url, room.celebration["name"]),
        )

        return player_id, PlayerScore(
            final=aggregate_score(gmi.score, gemini.score),
            gmi=gmi,
            gemini=gemini,
        )

    scored_players = await asyncio.gather(
        *[score_player(player.player_id) for player in room.players]
    )

    scores = dict(scored_players)
    winner_id = max(scores, key=lambda player_id: scores[player_id].final)

    return BattleResult(winner_id=winner_id, scores=scores)
```

```tsx
// frontend/src/components/ResultsModal.tsx
type ResultsModalProps = {
  myPlayerId: string;
  winnerId: string;
  scores: Record<string, PlayerScore>;
  onRematch: () => void;
};

export function ResultsModal({ myPlayerId, winnerId, scores, onRematch }: ResultsModalProps) {
  const opponentId = Object.keys(scores).find((id) => id !== myPlayerId);
  const iWon = winnerId === myPlayerId;

  return (
    <div className="fixed inset-0 grid place-items-center bg-black/75 p-4">
      <section className="w-full max-w-xl rounded-lg border border-emerald-400/30 bg-zinc-950 p-6 text-white shadow-2xl">
        <h2 className="text-4xl font-black uppercase">
          {iWon ? "Celebrated" : "Outplayed"}
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <ScoreCard label="You" score={scores[myPlayerId].final} />
          {opponentId ? <ScoreCard label="Opponent" score={scores[opponentId].final} /> : null}
        </div>

        <button
          type="button"
          onClick={onRematch}
          className="mt-6 w-full rounded-md bg-emerald-400 px-4 py-3 font-bold text-zinc-950"
        >
          Rematch
        </button>
      </section>
    </div>
  );
}
```

### Done When

The full game loop works: match, countdown, perform, judge, show winner, rematch.

---

## Stage 8: RocketRide Integration

**Goal:** wrap scoring in a RocketRide pipeline without making the demo fragile.

### Recommended Integration

Keep direct Python scoring functions as the stable implementation:

```py
score_room(room) -> BattleResult
```

Then add RocketRide as an adapter:

```py
score_room_via_rocketride(room) -> BattleResult
```

This is a clean dependency inversion: the game loop depends on a scoring interface,
not a specific vendor runtime. If RocketRide works, use it. If the engine fails,
fall back to direct scoring without changing the game flow.

### Tasks

- [ ] Create `pipeline/scoring.pipe`.
- [ ] Add a Python RocketRide service wrapper.
- [ ] Keep the input/output schema identical to direct scoring.
- [ ] Add `SCORING_BACKEND=direct|rocketride`.
- [ ] Show the pipeline in the demo even if direct scoring is used.

### Backend Shape

```py
# backend/app/services/score_router.py
from app.core.config import settings
from app.services.scoring_service import score_room
from app.services.rocketride_scoring import score_room_via_rocketride


async def score_room_with_configured_backend(room, reference_image_data_url: str):
    """Route scoring through direct services or RocketRide based on config."""
    if settings.scoring_backend == "rocketride":
        try:
            return await score_room_via_rocketride(room, reference_image_data_url)
        except Exception:
            # Log the exception in the real implementation.
            return await score_room(room, reference_image_data_url)

    return await score_room(room, reference_image_data_url)
```

### Done When

The app can run direct scoring by default and optionally switch to RocketRide with
an environment variable.

---

## Stage 9: Styling + Demo Polish

**Goal:** make the app feel like a polished battle experience without slowing the
team down.

### UI Direction

- Dark stadium-like background, but keep the actual webcam panels readable.
- Emerald accent for skeleton, active state, and winner state.
- Large timer at the top center.
- Compact commentary callouts near the player panel.
- Results modal with clear winner, scores, and one-line feedback.

### Tailwind Guidelines

- Use reusable components for repeated surfaces: `PlayerPanel`, `ScoreCard`,
  `StatusBadge`.
- Avoid deeply nested cards. The split battle view should feel direct and spacious.
- Keep button text short.
- Ensure mobile falls back to a vertical layout.
- Set fixed aspect ratios for webcam panels to prevent layout shift.

### Done When

The app is usable on one laptop with two browser windows and on two devices through
ngrok.

---

## Environment Variables

Use `.env` for backend secrets. Do **not** expose these through Vite.

```bash
# backend
GEMINI_API_KEY=your_gemini_key
GMI_API_KEY=your_gmi_key
GMI_VISION_MODEL=Qwen/Qwen3-VL-8B-Instruct
GEMINI_BATCH_MODEL=gemini-2.5-flash
GEMINI_LIVE_MODEL=replace-with-current-live-model
SCORING_BACKEND=direct
ALLOWED_ORIGINS=http://localhost:5173

# frontend
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

Security best practices:

- API keys stay only in the FastAPI process.
- Vite variables are public by design, so use them only for URLs and non-secrets.
- Restrict CORS to local dev and ngrok demo origins.
- Enforce max frame size on the backend before buffering.

---

## Testing Plan

### Backend Unit Tests

- `pick_key_frames` returns first/middle/last correctly.
- `aggregate_score` applies the 65/35 weighting.
- Pydantic rejects invalid WebSocket messages.
- Frame buffering ignores frames outside the `performing` phase.

### Backend Integration Tests

- Two WebSocket clients receive `matched`.
- Disconnecting one player notifies the opponent.
- Scoring fallback returns a valid `BattleResult`.

### Frontend Manual Tests

- Camera permission accepted.
- Camera permission denied.
- Two tabs match.
- Skeleton overlay renders.
- Results modal fits mobile and desktop.

Why this matters: AI integrations are the riskiest part, so the deterministic game
logic should be tested separately. That makes failures easier to diagnose during
the hackathon.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Gemini Live changes or fails | Use batch Gemini scoring as the reliable path; keep Live as commentary-only stretch |
| GMI scoring returns invalid JSON | Validate with Pydantic and use neutral fallback |
| Frames are too large | Capture 320x240 JPEG at quality 0.55 |
| MediaPipe is slow on low-end device | Use `pose_landmarker_lite`, reduce detection frequency, keep capture at 2 FPS |
| WebSocket disconnects mid-round | Notify opponent and return to waiting state |
| RocketRide engine does not start | Use `SCORING_BACKEND=direct` and show pipeline artifact |
| ngrok tunnel drops | Demo with two local browser windows |
| Frontend/backend message mismatch | Keep `types/messages.ts` and `models/messages.py` small and reviewed together |

---

## Reference Docs to Recheck Before Demo

These APIs move quickly, so confirm exact model names and SDK syntax before the
final demo build:

- FastAPI WebSockets: `https://fastapi.tiangolo.com/advanced/websockets/`
- GMI Cloud LLM API reference: `https://docs.gmicloud.ai/inference-engine/api-reference/llm-api-reference`
- Gemini Live API capabilities: `https://ai.google.dev/gemini-api/docs/live-api/capabilities`

---

## Build Order

Minimum viable demo:

1. FastAPI health route and WebSocket skeleton - 25 min
2. Vite React landing page and webcam - 30 min
3. Matchmaking with two tabs - 35 min
4. Server-driven countdown and performance window - 25 min
5. Frame capture and backend buffering - 25 min
6. GMI scoring - 45 min
7. Gemini batch scoring or mocked Gemini score - 35 min
8. Results screen - 25 min
9. MediaPipe skeleton overlay - 35 min
10. RocketRide wrapper - 30 min
11. Polish and ngrok demo test - remaining time

Core demo estimate: about 4.5 to 5 hours.
Full demo estimate with MediaPipe, Gemini, RocketRide, and polish: about 6 to 7
hours.

---

## Work Split

### Person A - Frontend + MediaPipe

- Stage 1: Vite React shell, landing page, webcam hook.
- Stage 3: Countdown UI, timer, battle layout.
- Stage 4: MediaPipe overlay and frame capture.
- Stage 7: Results modal.
- Stage 9: Tailwind polish and responsive testing.

### Person B - Backend + AI Integrations

- Stage 0: FastAPI project setup.
- Stage 2: WebSocket matchmaking.
- Stage 3: server-driven game loop.
- Stage 5: GMI scoring.
- Stage 6: Gemini batch scoring and optional Live commentary.
- Stage 7: score aggregation.
- Stage 8: RocketRide wrapper.

Integration contract: Person A can build against mocked WebSocket messages while
Person B builds the backend. The shared contract is the `Message Protocol` section.

---

## Final Recommendation

Use **FastAPI + Vite React + Tailwind**.

The core reason is separation of concerns:

- Browser: camera, MediaPipe, skeleton overlay, UI state.
- FastAPI: matchmaking, timing authority, frame buffering, AI orchestration.
- GMI/Gemini/RocketRide: judging and commentary.

That architecture is still small enough for a hackathon, but it is much cleaner
than forcing all AI orchestration through a Node server or letting vanilla DOM code
manage a complex real-time game UI.
