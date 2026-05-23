from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.matchmaker import Matchmaker
from app.services.game_loop import run_room_game
from app.services.scoring_service import score_room

app = FastAPI(title="WorldMog API")
matchmaker = Matchmaker()


async def start_game(room_id: str) -> None:
    await run_room_game(room_id, matchmaker, score_fn=score_room)


matchmaker.set_start_game_callback(start_game)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    player = await matchmaker.connect(websocket)
    try:
        while True:
            message = await websocket.receive_json()
            await matchmaker.handle_message(player.player_id, message)
    except WebSocketDisconnect:
        await matchmaker.disconnect(player.player_id)
