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
  playerName: string | null
  opponentName: string | null
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
  playerName,
  opponentName,
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

  // Determine who's winning for color coding
  const winning = myLiveScore !== null && oppLiveScore !== null
    ? myLiveScore > oppLiveScore ? 'me' : myLiveScore < oppLiveScore ? 'opp' : 'tie'
    : null

  // Mogging bar percentage — 50% = tied, >50% = you winning, <50% = getting mogged
  const mogPct = myLiveScore !== null && oppLiveScore !== null
    ? Math.max(10, Math.min(90, 50 + (myLiveScore - oppLiveScore) * 5))
    : 50

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Top HUD bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20">
        {/* Left — my score */}
        <div className="flex items-center gap-3 min-w-[120px]">
          {phase === 'performing' && myLiveScore !== null ? (
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-400">{playerName ?? 'You'}</p>
                <p className={`text-4xl font-black tabular-nums leading-none transition-all duration-500 ${
                  winning === 'me' ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]' : winning === 'opp' ? 'text-red-400' : 'text-white'
                }`}>
                  {myLiveScore.toFixed(1)}
                </p>
              </div>
            </div>
          ) : celebration ? (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">Replicate</p>
              <p className="text-sm font-black uppercase tracking-wider text-emerald-400">
                {celebration.name}
              </p>
            </div>
          ) : null}
        </div>

        {/* Center — Timer */}
        {timerValue !== null && (
          <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 ${
            timerValue <= 3 ? 'bg-red-500/20 border border-red-500/50' : 'bg-zinc-900/80 border border-zinc-700'
          }`}>
            <div className={`h-2 w-2 rounded-full animate-pulse ${timerValue <= 3 ? 'bg-red-500' : 'bg-emerald-400'}`} />
            <span className={`text-3xl font-black tabular-nums ${timerValue <= 3 ? 'text-red-400' : 'text-white'}`}>
              {timerValue}
            </span>
          </div>
        )}

        {phase === 'waiting' && (
          <div className="rounded-full px-4 py-1.5 bg-zinc-900/80 border border-zinc-700">
            <span className="text-sm font-bold uppercase tracking-wider text-zinc-400 animate-pulse">
              Searching...
            </span>
          </div>
        )}

        {/* Right — opponent score */}
        <div className="flex items-center justify-end gap-3 min-w-[120px]">
          {phase === 'performing' && oppLiveScore !== null ? (
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-red-400 text-right">{opponentName ?? 'Opponent'}</p>
                <p className={`text-4xl font-black tabular-nums leading-none text-right transition-all duration-500 ${
                  winning === 'opp' ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : winning === 'me' ? 'text-zinc-500' : 'text-white'
                }`}>
                  {oppLiveScore.toFixed(1)}
                </p>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Main battle area — full screen 2-column */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0.5 relative">
        {/* LEFT — You */}
        <div className="relative overflow-hidden bg-black">
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
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Your label */}
          <div className="absolute top-14 left-3 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 drop-shadow-lg">{playerName ?? 'You'}</span>
          </div>

          {myScore !== null && myLiveScore === null && (
            <div className="absolute top-12 right-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Final</p>
              <p className="text-4xl font-black text-white tabular-nums">{myScore.toFixed(1)}</p>
            </div>
          )}

          {/* Commentary — spans full width at bottom */}
          {commentary.length > 0 && phase === 'performing' && (
            <div className="absolute bottom-3 left-3 right-3 space-y-1.5">
              {commentary.slice(-2).map((line, i) => (
                <p key={i} className="rounded-lg bg-black/80 backdrop-blur-md px-3 py-2 text-sm font-bold text-emerald-300 border border-emerald-400/20 shadow-lg">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Opponent */}
        <div className="relative overflow-hidden bg-black grid place-items-center">
          {opponentFrame ? (
            <img
              src={opponentFrame}
              alt="Opponent"
              className="h-full w-full object-cover"
            />
          ) : isActive ? (
            <div className="text-center space-y-3">
              <div className="mx-auto h-6 w-6 rounded-full border-2 border-red-400/50 border-t-transparent animate-spin" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                Connecting...
              </p>
            </div>
          ) : phase === 'judging' ? (
            <div className="text-center space-y-3">
              <div className="mx-auto h-8 w-8 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Judging</p>
            </div>
          ) : (
            <div className="text-center">
              {phase === 'waiting' && (
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600 animate-pulse">
                  Waiting...
                </p>
              )}
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Opponent label */}
          <div className="absolute top-14 left-3 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-red-400 drop-shadow-lg">{opponentName ?? 'Opponent'}</span>
          </div>

        </div>

        {/* Small floating reference during performance */}
        {phase === 'performing' && celebration && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 w-64 md:w-80 lg:w-96 rounded-xl overflow-hidden border-2 border-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.3)] bg-black">
            <video
              src={celebration.clipUrl}
              className="w-full aspect-video object-contain"
              autoPlay
              muted
              playsInline
              loop
            />
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400 text-center py-1 bg-black/80">
              Reference
            </p>
          </div>
        )}

        {/* Study phase — full-screen popup with reference video */}
        {showCountdownOverlay && countdownValue !== null && countdownValue < 0 && celebration && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/90 backdrop-blur-lg">
            <div className="flex flex-col items-center gap-6 max-w-2xl w-full px-4">
              <p className="text-4xl md:text-6xl font-black uppercase tracking-tight text-amber-400 animate-pulse drop-shadow-[0_0_40px_rgba(251,191,36,0.4)]">
                {countdownLabel ?? 'Get Ready'}
              </p>
              <p className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
                {celebration.name}
              </p>
              <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-[0_0_60px_rgba(251,191,36,0.3)]">
                <video
                  src={celebration.clipUrl}
                  className="h-full w-full object-contain bg-black"
                  autoPlay
                  muted
                  playsInline
                  loop
                />
              </div>
              <p className="text-sm uppercase tracking-[0.4em] text-amber-300 font-bold animate-pulse">
                Study this move
              </p>
            </div>
          </div>
        )}

        {/* Countdown overlay — numbers + GO: full screen */}
        {showCountdownOverlay && countdownValue !== null && countdownValue >= 0 && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/80 backdrop-blur-md">
            <div className="text-center">
              {countdownValue === 0 ? (
                <p className="text-[12rem] font-black text-emerald-400 leading-none drop-shadow-[0_0_80px_rgba(52,211,153,0.6)]" style={{ animation: 'ping 0.5s ease-out' }}>
                  GO!
                </p>
              ) : (
                <>
                  <p className="text-[12rem] font-black text-white leading-none tabular-nums drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]" key={countdownValue}>
                    {countdownValue}
                  </p>
                  {celebration && (
                    <p className="mt-6 text-xl font-black uppercase tracking-wider text-emerald-400">
                      {celebration.name}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Mogging indicator bar */}
        {phase === 'performing' && myLiveScore !== null && oppLiveScore !== null && (
          <div className="absolute bottom-0 inset-x-0 z-20 px-0">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-sm">
              <span className={`text-xs font-black uppercase tracking-wider ${winning === 'me' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                You
              </span>
              <div className="flex-1 h-3 rounded-full bg-zinc-800 overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${mogPct}%`,
                    background: mogPct > 50
                      ? `linear-gradient(90deg, #065f46, #10b981)`
                      : mogPct < 50
                        ? `linear-gradient(90deg, #ef4444, #fca5a5)`
                        : `linear-gradient(90deg, #52525b, #a1a1aa)`,
                    boxShadow: mogPct > 55
                      ? '0 0 12px rgba(16,185,129,0.6)'
                      : mogPct < 45
                        ? '0 0 12px rgba(239,68,68,0.6)'
                        : 'none',
                  }}
                />
              </div>
              <span className={`text-xs font-black uppercase tracking-wider ${winning === 'opp' ? 'text-red-400' : 'text-zinc-500'}`}>
                Opp
              </span>
            </div>
            <div className="text-center pb-1 bg-black/80">
              <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${
                winning === 'me' ? 'text-emerald-400' : winning === 'opp' ? 'text-red-400' : 'text-zinc-500'
              }`}>
                {winning === 'me' ? 'MOGGING →' : winning === 'opp' ? '← GETTING MOGGED' : 'EVEN'}
              </span>
            </div>
          </div>
        )}

        {/* Judging overlay */}
        {phase === 'judging' && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 backdrop-blur-md">
            <div className="text-center space-y-8">
              <div className="mx-auto h-16 w-16 rounded-full border-[3px] border-emerald-400 border-t-transparent animate-spin" />
              <div className="space-y-3">
                <p className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg">
                  {judgingStage === 'analyzing' && 'Analyzing'}
                  {judgingStage === 'comparing' && 'Comparing'}
                  {judgingStage === 'deliberating' && 'Deliberating'}
                  {!judgingStage && 'Judging'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 font-bold">
                GMI Cloud + Gemini AI
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
