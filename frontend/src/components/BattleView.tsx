import type { RefObject } from 'react'
import type { GamePhase, Celebration } from '../types/messages'

type BattleViewProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  phase: GamePhase
  countdownValue: number | null
  countdownLabel: string | null
  timerValue: number | null
  celebration: Celebration | null
  commentary: string[]
  myScore: number | null
  liveScores: Record<string, number> | null
  playerId: string | null
  opponentFrame: string | null
  judgingStage: string | null
}

export function BattleView({
  videoRef,
  canvasRef,
  phase,
  countdownValue,
  countdownLabel,
  timerValue,
  celebration,
  commentary,
  myScore,
  liveScores,
  playerId,
  opponentFrame,
  judgingStage,
}: BattleViewProps) {
  const showCountdownOverlay = phase === 'countdown' && countdownValue !== null
  const isActive = phase === 'matched' || phase === 'countdown' || phase === 'performing'

  const myLiveScore = phase === 'performing' && liveScores && playerId
    ? liveScores[playerId] ?? null
    : null
  const oppId = liveScores && playerId
    ? Object.keys(liveScores).find((id) => id !== playerId) ?? null
    : null
  const oppLiveScore = phase === 'performing' && liveScores && oppId
    ? liveScores[oppId] ?? null
    : null

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {celebration && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Replicate</p>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                {celebration.name}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {timerValue !== null && (
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full animate-pulse ${timerValue <= 3 ? 'bg-red-500' : 'bg-emerald-400'}`} />
              <span className={`text-2xl font-black tabular-nums ${timerValue <= 3 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                00:{String(timerValue).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3-column layout: You | Reference | Opponent */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-1 p-1 relative">
        {/* LEFT — Local player camera */}
        <div className="relative overflow-hidden rounded-lg border border-emerald-400/30 bg-black aspect-video md:aspect-auto">
          <video
            ref={videoRef}
            className="h-full w-full object-cover -scale-x-100"
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

        {/* CENTER — Reference celebration video */}
        <div className="relative hidden md:grid place-items-center overflow-hidden rounded-lg border border-amber-400/30 bg-zinc-900 w-56">
          {celebration && isActive ? (
            <>
              <video
                src={celebration.clipUrl}
                className="h-full w-full object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
              <span className="absolute top-2 left-2 rounded bg-zinc-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Reference
              </span>
            </>
          ) : phase === 'judging' ? (
            <div className="text-center space-y-3">
              <div className="mx-auto h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                AI Judges Scoring
              </p>
            </div>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 text-center px-4">
              {phase === 'waiting' ? 'Waiting for opponent...' : ''}
            </p>
          )}
        </div>

        {/* RIGHT — Opponent live feed */}
        <div className="relative overflow-hidden rounded-lg border border-red-400/30 bg-black aspect-video md:aspect-auto grid place-items-center">
          {opponentFrame ? (
            <img
              src={opponentFrame}
              alt="Opponent"
              className="h-full w-full object-cover"
            />
          ) : isActive ? (
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              Opponent camera loading...
            </p>
          ) : phase === 'judging' ? (
            <div className="text-center space-y-3">
              <div className="mx-auto h-8 w-8 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
              <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                Judging Opponent
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              {phase === 'waiting' ? 'Waiting for opponent...' : ''}
            </p>
          )}
          <span className="absolute top-2 left-2 rounded bg-zinc-900/80 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
            Opponent
          </span>
          {oppLiveScore !== null && (
            <div className="absolute top-2 right-2 rounded-lg bg-zinc-900/90 px-3 py-1.5 border border-red-400/40 animate-pulse">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Live</p>
              <p className="text-2xl font-black text-red-400 tabular-nums transition-all duration-500">
                {oppLiveScore.toFixed(1)}
              </p>
            </div>
          )}
        </div>

        {/* Countdown overlay */}
        {showCountdownOverlay && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 backdrop-blur-sm">
            <div className="text-center">
              {countdownValue < 0 ? (
                <>
                  <p className="text-5xl md:text-7xl font-black uppercase tracking-tight text-amber-400 animate-pulse">
                    {countdownLabel ?? 'Get Ready'}
                  </p>
                  {celebration && (
                    <p className="mt-6 text-2xl font-bold uppercase tracking-wider text-white">
                      {celebration.name}
                    </p>
                  )}
                  <p className="mt-3 text-sm uppercase tracking-widest text-zinc-400">
                    Watch the reference video
                  </p>
                </>
              ) : countdownValue === 0 ? (
                <p className="text-[10rem] font-black text-emerald-400 leading-none animate-ping">
                  GO!
                </p>
              ) : (
                <>
                  <p className="text-[10rem] font-black text-white leading-none tabular-nums" key={countdownValue}>
                    {countdownValue}
                  </p>
                  {celebration && (
                    <p className="mt-4 text-lg font-bold uppercase tracking-wider text-emerald-400">
                      {celebration.name}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Judging overlay */}
        {phase === 'judging' && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="mx-auto h-12 w-12 rounded-full border-3 border-emerald-400 border-t-transparent animate-spin" />
              <div className="space-y-2">
                <p className="text-3xl font-black uppercase tracking-tight text-white">
                  {judgingStage === 'analyzing' && 'Analyzing Performances'}
                  {judgingStage === 'comparing' && 'Comparing to Reference'}
                  {judgingStage === 'deliberating' && 'Judges Deliberating'}
                  {!judgingStage && 'Judging...'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                GMI Cloud + Gemini AI
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
