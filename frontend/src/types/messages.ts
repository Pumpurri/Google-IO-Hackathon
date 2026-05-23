export type Celebration = {
  id: string
  name: string
  clipUrl: string
  referenceImageUrl: string
}

export type JudgeScore = {
  score: number
  feedback: string
}

export type PlayerScore = {
  final: number
  gmi: JudgeScore
  gemini: JudgeScore
}

export type GamePhase =
  | 'landing'
  | 'waiting'
  | 'matched'
  | 'countdown'
  | 'performing'
  | 'judging'
  | 'results'

export type ServerMessage =
  | { type: 'welcome'; playerId: string }
  | { type: 'waiting' }
  | { type: 'matched'; roomId: string; playerId: string; opponentId: string; celebration: Celebration }
  | { type: 'countdown'; seconds: number; label?: string }
  | { type: 'perform'; durationSeconds: number }
  | { type: 'commentary'; text: string }
  | { type: 'commentary_audio'; data: string }
  | { type: 'live_scores'; scores: Record<string, number> }
  | { type: 'opponent_frame'; frame: string }
  | { type: 'judging'; stage?: string }
  | { type: 'results'; winnerId: string; scores: Record<string, PlayerScore> }
  | { type: 'opponent_disconnected' }
  | { type: 'error'; message: string }

export type ClientMessage =
  | { type: 'ready' }
  | { type: 'frame'; frame: string; capturedAtMs: number }
  | { type: 'rematch' }
  | { type: 'leave' }
