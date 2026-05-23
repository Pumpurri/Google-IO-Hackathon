import type { RefObject } from 'react'
import type { GamePhase, Celebration } from '../types/messages'

type BattleViewProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  phase: GamePhase
  countdownValue: number | null
  timerValue: number | null
  celebration: Celebration | null
  commentary: string[]
  myScore: number | null
  liveScores: Record<string, number> | null
  playerId: string | null
}

export function BattleView({
  videoRef,
  canvasRef,
  phase,
  countdownValue,
  timerValue,
  celebration,
  commentary,
  myScore,
  liveScores,
  playerId,
}: BattleViewProps) {
  const opponentStatus = {
    waiting: 'Waiting for opponent...',
    matched: 'Opponent found! Get ready...',
    countdown: 'Get ready...',
    performing: 'Performing...',
    judging: 'Analyzing performances...',
    results: '',
    landing: '',
  }[phase]

  const showCountdownOverlay = phase === 'countdown' && countdownValue !== null

  const myLiveScore = phase === 'performing' && liveScores && playerId
    ? liveScores[playerId] ?? null
    : null
  const opponentId = liveScores && playerId
    ? Object.keys(liveScores).find((id) => id !== playerId) ?? null
    : null
  const oppLiveScore = phase === 'performing' && liveScores && opponentId
    ? liveScores[opponentId] ?? null
    : null

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar: celebration reference + timer */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {celebration && (
            <>
              <video
                src={celebration.clipUrl}
                className="h-10 w-10 rounded border border-zinc-700 object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Replicate</p>
                <p className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                  {celebration.name}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {timerValue !== null && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-2xl font-black text-white tabular-nums">
                00:{String(timerValue).padStart(2, '0')}
              </span>
            </div>
          )}
          {phase === 'judging' && (
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-400 animate-pulse">
              Judging...
            </span>
          )}
        </div>
      </div>

      {/* Split screen */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1 p-1 relative">
        {/* Local player */}
        <div className="relative overflow-hidden rounded-lg border border-emerald-400/30 bg-black aspect-video md:aspect-auto">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
          <span className="absolute top-2 left-2 rounded bg-zinc-900/80 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            You
          </span>
          {myLiveScore !== null && (
            <div className="absolute top-2 right-2 rounded-lg bg-zinc-900/90 px-3 py-1.5 border border-emerald-400/40 animate-pulse">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</p>
              <p className="text-2xl font-black text-emerald-400 tabular-nums transition-all duration-500">
                {myLiveScore.toFixed(1)}
              </p>
            </div>
          )}
          {myScore !== null && myLiveScore === null && (
            <div className="absolute top-2 right-2 rounded-lg bg-zinc-900/90 px-3 py-1.5 border border-emerald-400/20">
              <p className="text-xs text-zinc-500 uppercase">Score</p>
              <p className="text-xl font-black text-white tabular-nums">{myScore.toFixed(1)}</p>
            </div>
          )}
          {/* Commentary callouts */}
          {commentary.length > 0 && (
            <div className="absolute bottom-2 left-2 right-2 space-y-1">
              {commentary.slice(-2).map((line, i) => (
                <p key={i} className="rounded bg-black/70 px-2 py-1 text-xs text-emerald-300 backdrop-blur-sm">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: reference clip or status */}
        <div className="relative grid place-items-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 aspect-video md:aspect-auto">
          {celebration && (phase === 'matched' || phase === 'countdown' || phase === 'performing') ? (
            <>
              <video
                src={celebration.clipUrl}
                className="h-full w-full object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
              <span className="absolute top-2 left-2 rounded bg-zinc-900/80 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
                Reference
              </span>
              {oppLiveScore !== null && (
                <div className="absolute top-2 right-2 rounded-lg bg-zinc-900/90 px-3 py-1.5 border border-red-400/40 animate-pulse">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Opponent</p>
                  <p className="text-2xl font-black text-red-400 tabular-nums transition-all duration-500">
                    {oppLiveScore.toFixed(1)}
                  </p>
                </div>
              )}
            </>
          ) : phase === 'judging' ? (
            <div className="text-center space-y-3">
              <div className="mx-auto h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                AI Judges Scoring
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              {opponentStatus}
            </p>
          )}
        </div>

        {/* Countdown overlay */}
        {showCountdownOverlay && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-9xl font-black text-white animate-bounce">
                {countdownValue === 0 ? 'GO!' : countdownValue}
              </p>
              {celebration && (
                <p className="mt-4 text-lg font-bold uppercase tracking-wider text-emerald-400">
                  {celebration.name}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
