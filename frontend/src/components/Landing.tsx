import { useState } from 'react'

type LandingProps = {
  onEnter: (name: string) => void
}

export function Landing({ onEnter }: LandingProps) {
  const [name, setName] = useState('')

  return (
    <div className="min-h-screen bg-zinc-950 grid place-items-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.12)_0%,_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.08)_0%,_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(251,191,36,0.06)_0%,_transparent_50%)]" />

      <div className="relative text-center space-y-12 px-6">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.5em] text-emerald-400 animate-pulse">
            Live 1v1 Celebration Arena
          </p>
          <h1 className="text-[6rem] md:text-[10rem] font-black tracking-tighter text-white leading-none drop-shadow-[0_0_60px_rgba(52,211,153,0.3)]">
            WORLDMOG
          </h1>
          <p className="text-lg text-zinc-400 max-w-md mx-auto font-medium">
            Replicate iconic soccer celebrations. AI judges who nailed it.
            <span className="text-emerald-400"> Get mogged or mog others.</span>
          </p>
        </div>

        <div className="space-y-4 max-w-xs mx-auto">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onEnter(name.trim()) }}
            placeholder="Enter your name..."
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-6 py-4 text-center text-xl font-black text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            autoFocus
          />
          <button
            onClick={() => name.trim() && onEnter(name.trim())}
            disabled={!name.trim()}
            className="group relative w-full rounded-xl bg-emerald-500 px-14 py-5 text-lg font-black uppercase tracking-widest text-black hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_40px_rgba(52,211,153,0.4)] hover:shadow-[0_0_60px_rgba(52,211,153,0.6)] hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-emerald-500"
          >
            Enter Arena
            <span className="absolute -inset-1 rounded-xl bg-emerald-400/20 blur-lg group-hover:bg-emerald-400/30 transition-colors" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-8 text-[10px] uppercase tracking-widest text-zinc-600">
          <span>Gemini AI</span>
          <span className="h-3 w-px bg-zinc-800" />
          <span>GMI Cloud</span>
          <span className="h-3 w-px bg-zinc-800" />
          <span>RocketRide</span>
        </div>
      </div>
    </div>
  )
}
