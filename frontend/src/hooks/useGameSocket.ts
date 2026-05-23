import { useCallback, useEffect, useRef, useState } from 'react'
import type { GamePhase, Celebration, PlayerScore, ServerMessage, ClientMessage } from '../types/messages'

type GameState = {
  phase: GamePhase
  playerId: string | null
  opponentId: string | null
  roomId: string | null
  celebration: Celebration | null
  countdownValue: number | null
  timerValue: number | null
  commentary: string[]
  winnerId: string | null
  scores: Record<string, PlayerScore> | null
}

const INITIAL_STATE: GameState = {
  phase: 'landing',
  playerId: null,
  opponentId: null,
  roomId: null,
  celebration: null,
  countdownValue: null,
  timerValue: null,
  commentary: [],
  winnerId: null,
  scores: null,
}

export function useGameSocket(wsUrl: string, enabled: boolean) {
  const wsRef = useRef<WebSocket | null>(null)
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg: ServerMessage = JSON.parse(e.data)

      switch (msg.type) {
        case 'welcome':
          setState((s) => ({ ...s, playerId: msg.playerId }))
          break

        case 'waiting':
          setState((s) => ({ ...s, phase: 'waiting' }))
          break

        case 'matched':
          setState((s) => ({
            ...s,
            phase: 'matched',
            roomId: msg.roomId,
            opponentId: msg.opponentId,
            celebration: msg.celebration,
            commentary: [],
            winnerId: null,
            scores: null,
          }))
          break

        case 'countdown':
          setState((s) => ({ ...s, phase: 'countdown', countdownValue: msg.seconds }))
          // Client-side countdown display
          let val = msg.seconds
          const cdInterval = setInterval(() => {
            val--
            if (val <= 0) {
              clearInterval(cdInterval)
              setState((s) => ({ ...s, countdownValue: 0 }))
            } else {
              setState((s) => ({ ...s, countdownValue: val }))
            }
          }, 1000)
          break

        case 'perform':
          setState((s) => ({ ...s, phase: 'performing', countdownValue: null, timerValue: msg.durationSeconds }))
          // Client-side timer countdown
          let remaining = msg.durationSeconds
          timerRef.current = setInterval(() => {
            remaining--
            if (remaining <= 0) {
              if (timerRef.current) clearInterval(timerRef.current)
              setState((s) => ({ ...s, timerValue: 0 }))
            } else {
              setState((s) => ({ ...s, timerValue: remaining }))
            }
          }, 1000)
          break

        case 'commentary':
          setState((s) => ({ ...s, commentary: [...s.commentary, msg.text] }))
          break

        case 'judging':
          if (timerRef.current) clearInterval(timerRef.current)
          setState((s) => ({ ...s, phase: 'judging', timerValue: null }))
          break

        case 'results':
          setState((s) => ({
            ...s,
            phase: 'results',
            winnerId: msg.winnerId,
            scores: msg.scores,
          }))
          break

        case 'opponent_disconnected':
          if (timerRef.current) clearInterval(timerRef.current)
          setState((s) => ({
            ...s,
            phase: 'waiting',
            roomId: null,
            opponentId: null,
            celebration: null,
            countdownValue: null,
            timerValue: null,
            commentary: [],
          }))
          break
      }
    }

    ws.onclose = () => {
      setState((s) => ({ ...s, phase: 'landing' }))
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      ws.close()
    }
  }, [wsUrl, enabled])

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { ...state, send }
}
