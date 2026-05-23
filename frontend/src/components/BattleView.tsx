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
}: BattleViewProps) {
  const statusText = {
    waiting: 'Waiting for opponent...',
    matched: 'Opponent found!',
    countdown: '',
    performing: 'Celebrating...',
    judging: 'Judging...',
    results: '',
    landing: '',
  }[phase]

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar: celebration reference + timer */}
      <div className="flex items-center justify-center gap-4 p-3 bg-zinc-900/80 border-b border-zinc-800">
        {celebration && (
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-400">
            {celebration.name}
          </span>
        )}
        {countdownValue !== null && (
          <span className="text-4xl font-black text-white tabular-nums">
            {countdownValue === 0 ? 'GO!' : countdownValue}
          </span>
        )}
        {timerValue !== null && (
          <span className="text-2xl font-bold text-white tabular-nums">
            00:{String(timerValue).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Split screen */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1 p-1">
        {/* Local player */}
        <div className="relative overflow-hidden rounded-lg border border-emerald-400/30 bg-black">
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
          {myScore !== null && (
            <div className="absolute top-2 right-2 rounded bg-zinc-900/90 px-3 py-1">
              <span className="text-lg font-black text-white">{myScore.toFixed(1)}</span>
            </div>
          )}
          {/* Commentary callouts */}
          {commentary.length > 0 && (
            <div className="absolute bottom-2 left-2 right-2 space-y-1">
              {commentary.slice(-2).map((line, i) => (
                <p key={i} className="rounded bg-black/70 px-2 py-1 text-xs text-emerald-300">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Opponent */}
        <div className="relative grid place-items-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
            {statusText}
          </p>
        </div>
      </div>
    </div>
  )
}
