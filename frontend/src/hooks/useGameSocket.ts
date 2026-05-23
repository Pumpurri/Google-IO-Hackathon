import { useCallback, useEffect, useRef, useState } from 'react'
import type { GamePhase, Celebration, PlayerScore, ServerMessage, ClientMessage } from '../types/messages'
import { useCommentaryAudio } from './useCommentaryAudio'

type GameState = {
  phase: GamePhase
  playerId: string | null
  opponentId: string | null
  roomId: string | null
  celebration: Celebration | null
  countdownValue: number | null
  countdownLabel: string | null
  timerValue: number | null
  commentary: string[]
  liveScores: Record<string, number> | null
  opponentFrame: string | null
  judgingStage: string | null
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
  countdownLabel: null,
  timerValue: null,
  commentary: [],
  liveScores: null,
  opponentFrame: null,
  judgingStage: null,
  winnerId: null,
  scores: null,
}

export function useGameSocket(wsUrl: string, enabled: boolean) {
  const wsRef = useRef<WebSocket | null>(null)
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { playChunk } = useCommentaryAudio()

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
            liveScores: null,
            opponentFrame: null,
            winnerId: null,
            scores: null,
          }))
          break

        case 'countdown':
          setState((s) => ({
            ...s,
            phase: 'countdown',
            countdownValue: msg.seconds,
            countdownLabel: msg.label ?? null,
          }))
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

        case 'live_scores':
          setState((s) => ({ ...s, liveScores: msg.scores }))
          break

        case 'commentary_audio':
          playChunk(msg.data)
          break

        case 'opponent_frame':
          setState((s) => ({ ...s, opponentFrame: msg.frame }))
          break

        case 'judging':
          if (timerRef.current) clearInterval(timerRef.current)
          setState((s) => ({ ...s, phase: 'judging', timerValue: null, judgingStage: msg.stage ?? 'analyzing' }))
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
            liveScores: null,
            opponentFrame: null,
          }))
          break

        case 'error':
          console.error('[WS] Server error:', msg.message)
          break
      }
    }

    ws.onerror = () => {
      console.error('[WS] Connection error')
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
