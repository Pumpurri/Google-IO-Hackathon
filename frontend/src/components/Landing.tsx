type LandingProps = {
  onEnter: () => void
}

export function Landing({ onEnter }: LandingProps) {
  return (
    <div className="min-h-screen bg-zinc-950 grid place-items-center relative overflow-hidden">
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.08)_0%,_transparent_70%)]" />

      <div className="relative text-center space-y-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
            Live 1v1 Celebration Arena
          </p>
          <h1 className="text-8xl font-black tracking-tighter text-white">
            WORLDMOG
          </h1>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Replicate iconic soccer celebrations. AI judges who nailed it.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-5">
          <p className="text-sm uppercase tracking-widest text-zinc-400 font-semibold">
            Enter the Arena
          </p>
          <button
            onClick={onEnter}
            className="rounded-lg bg-emerald-400 px-10 py-3.5 text-sm font-bold uppercase tracking-wider text-zinc-950 hover:bg-emerald-300 transition-colors shadow-lg shadow-emerald-400/20"
          >
            Start Camera
          </button>
          <p className="text-xs text-zinc-600">Camera required to play</p>
        </div>
      </div>
    </div>
  )
}
