import type { PlayerScore } from '../types/messages'

type ResultsModalProps = {
  myPlayerId: string
  winnerId: string
  scores: Record<string, PlayerScore>
  onRematch: () => void
}

export function ResultsModal({ myPlayerId, winnerId, scores, onRematch }: ResultsModalProps) {
  const opponentId = Object.keys(scores).find((id) => id !== myPlayerId)
  const iWon = winnerId === myPlayerId

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <section className="w-full max-w-lg rounded-xl border border-emerald-400/30 bg-zinc-950 p-8 text-center shadow-2xl">
        <h2 className="text-5xl font-black uppercase tracking-tight text-white">
          {iWon ? 'Celebrated!' : 'Outplayed!'}
        </h2>
        <p className="mt-2 text-sm uppercase tracking-widest text-zinc-400">
          {iWon
            ? `${opponentId ?? 'Opponent'} couldn't compete`
            : 'Better luck next time'}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className={`rounded-lg p-4 ${iWon ? 'bg-emerald-400/10 border border-emerald-400/30' : 'bg-zinc-900'}`}>
            <p className="text-xs uppercase tracking-wider text-zinc-400">You</p>
            <p className="mt-1 text-4xl font-black text-white">
              {scores[myPlayerId]?.final.toFixed(1)}
            </p>
          </div>
          {opponentId && (
            <div className={`rounded-lg p-4 ${!iWon ? 'bg-emerald-400/10 border border-emerald-400/30' : 'bg-zinc-900'}`}>
              <p className="text-xs uppercase tracking-wider text-zinc-400">Opponent</p>
              <p className="mt-1 text-4xl font-black text-white">
                {scores[opponentId]?.final.toFixed(1)}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onRematch}
          className="mt-8 w-full rounded-md bg-emerald-400 px-6 py-3 text-sm font-bold uppercase tracking-wider text-zinc-950 hover:bg-emerald-300 transition-colors"
        >
          Rematch
        </button>
      </section>
    </div>
  )
}
