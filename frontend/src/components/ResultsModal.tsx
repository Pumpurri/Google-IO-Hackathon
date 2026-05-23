import type { PlayerScore } from '../types/messages'

type ResultsModalProps = {
  myPlayerId: string
  winnerId: string
  scores: Record<string, PlayerScore>
  onRematch: () => void
  onNewMatch: () => void
}

export function ResultsModal({ myPlayerId, winnerId, scores, onRematch, onNewMatch }: ResultsModalProps) {
  const opponentId = Object.keys(scores).find((id) => id !== myPlayerId)
  const iWon = winnerId === myPlayerId
  const myScores = scores[myPlayerId]
  const oppScores = opponentId ? scores[opponentId] : null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
      <section className="w-full max-w-lg rounded-xl border border-emerald-400/30 bg-zinc-950 p-8 text-center shadow-2xl shadow-emerald-400/10">
        {/* Verdict */}
        <h2 className={`text-5xl font-black uppercase tracking-tight ${iWon ? 'text-emerald-400' : 'text-white'}`}>
          {iWon ? 'Celebrated!' : 'Outplayed!'}
        </h2>
        <p className="mt-2 text-sm uppercase tracking-widest text-zinc-400">
          {iWon
            ? `${opponentId ?? 'Opponent'} couldn't compete`
            : 'Better luck next time'}
        </p>

        {/* Score comparison */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <ScoreCard
            label="You"
            score={myScores}
            highlight={iWon}
          />
          {oppScores && (
            <ScoreCard
              label="Opponent"
              score={oppScores}
              highlight={!iWon}
            />
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={onRematch}
            className="flex-1 rounded-lg bg-emerald-400 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-zinc-950 hover:bg-emerald-300 transition-colors shadow-lg shadow-emerald-400/20"
          >
            Rematch
          </button>
          <button
            onClick={onNewMatch}
            className="flex-1 rounded-lg border border-zinc-700 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            New Match
          </button>
        </div>
      </section>
    </div>
  )
}

function ScoreCard({ label, score, highlight }: { label: string; score: PlayerScore; highlight: boolean }) {
  return (
    <div className={`rounded-lg p-4 space-y-3 ${highlight ? 'bg-emerald-400/10 border border-emerald-400/30' : 'bg-zinc-900 border border-zinc-800'}`}>
      <p className="text-xs uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-4xl font-black text-white tabular-nums">
        {score.final.toFixed(1)}
      </p>

      {/* Judge breakdown */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-800">
        <JudgeLine label="Accuracy" score={score.gmi.score} feedback={score.gmi.feedback} />
        <JudgeLine label="Style" score={score.gemini.score} feedback={score.gemini.feedback} />
      </div>
    </div>
  )
}

function JudgeLine({ label, score, feedback }: { label: string; score: number; feedback: string }) {
  return (
    <div className="text-left">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="text-xs font-bold text-zinc-300 tabular-nums">{score.toFixed(1)}</span>
      </div>
      <p className="text-[10px] text-zinc-500 leading-tight truncate" title={feedback}>
        {feedback}
      </p>
    </div>
  )
}
