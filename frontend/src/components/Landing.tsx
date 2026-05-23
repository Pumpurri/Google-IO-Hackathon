type LandingProps = {
  onEnter: () => void
}

export function Landing({ onEnter }: LandingProps) {
  return (
    <div className="min-h-screen bg-zinc-950 grid place-items-center">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
            Live 1v1 Celebration Arena
          </p>
          <h1 className="text-7xl font-black tracking-tighter text-white">
            WORLDMOG
          </h1>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-4">
          <p className="text-sm uppercase tracking-widest text-zinc-400 font-semibold">
            Enter the Arena
          </p>
          <button
            onClick={onEnter}
            className="rounded-md bg-emerald-400 px-8 py-3 text-sm font-bold uppercase tracking-wider text-zinc-950 hover:bg-emerald-300 transition-colors"
          >
            Start Camera Check
          </button>
        </div>
      </div>
    </div>
  )
}
