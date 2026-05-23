import type { PlayerScore } from '../types/messages'

type ResultsModalProps = {
  myPlayerId: string
  winnerId: string
  scores: Record<string, PlayerScore>
  onRematch: () => void
  onNewMatch: () => void
}

const WIN_WORDS = ['CELEBRATED', 'DOMINATED', 'DESTROYED', 'CRUSHED']
const LOSE_WORDS = ['MOGGED', 'BRUTALIZED', 'OUTPLAYED', 'DEMOLISHED']

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function ResultsModal({ myPlayerId, winnerId, scores, onRematch, onNewMatch }: ResultsModalProps) {
  const opponentId = Object.keys(scores).find((id) => id !== myPlayerId)
  const iWon = winnerId === myPlayerId
  const myScores = scores[myPlayerId]
  const oppScores = opponentId ? scores[opponentId] : null

  const verdict = iWon ? pickRandom(WIN_WORDS) : pickRandom(LOSE_WORDS)
  const subtitle = iWon
    ? `${opponentId ?? 'Opponent'} couldn't compete`
    : `by ${opponentId ?? 'Opponent'}`

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl text-center space-y-8">
        {/* Giant verdict text */}
        <div>
          <h2
            className={`text-[5rem] md:text-[7rem] font-black uppercase leading-none tracking-tighter ${
              iWon
                ? 'text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.5)]'
                : 'text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.5)]'
            }`}
          >
            {verdict}
          </h2>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-zinc-400 font-semibold">
            {subtitle}
          </p>
        </div>

        {/* Score comparison — big numbers side by side */}
        <div className="flex items-center justify-center gap-6">
          <ScoreBlock
            label="You"
            score={myScores}
            isWinner={iWon}
            isLoser={!iWon}
          />
          <span className="text-3xl font-black text-zinc-600">vs</span>
          {oppScores && (
            <ScoreBlock
              label="Opponent"
              score={oppScores}
              isWinner={!iWon}
              isLoser={iWon}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={onRematch}
            className="flex-1 rounded-lg bg-emerald-500 px-6 py-4 text-sm font-black uppercase tracking-wider text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30"
          >
            Rematch
          </button>
          <button
            onClick={onNewMatch}
            className="flex-1 rounded-lg border border-zinc-600 px-6 py-4 text-sm font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            New Match
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreBlock({ label, score, isWinner, isLoser }: {
  label: string
  score: PlayerScore
  isWinner: boolean
  isLoser: boolean
}) {
  const bgColor = isLoser
    ? 'bg-red-500/20 border-red-500/40'
    : isWinner
      ? 'bg-emerald-500/20 border-emerald-500/40'
      : 'bg-zinc-900/80 border-zinc-700'

  const scoreColor = isLoser
    ? 'text-red-400'
    : isWinner
      ? 'text-emerald-400'
      : 'text-white'

  return (
    <div className={`rounded-xl p-6 border backdrop-blur-sm space-y-3 min-w-[180px] ${bgColor}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-bold">{label}</p>
      <p className={`text-6xl font-black tabular-nums ${scoreColor}`}>
        {score.final.toFixed(1)}
      </p>
      <div className="space-y-2 pt-3 border-t border-zinc-700/50">
        <JudgeLine label="Accuracy (GMI)" value={score.gmi.score} feedback={score.gmi.feedback} />
        <JudgeLine label="Style (Gemini)" value={score.gemini.score} feedback={score.gemini.feedback} />
      </div>
    </div>
  )
}

function JudgeLine({ label, value, feedback }: { label: string; value: number; feedback: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="text-xs font-bold text-zinc-300 tabular-nums">{value.toFixed(1)}</span>
      </div>
      {feedback && feedback !== 'Mock score' && (
        <p className="text-[11px] leading-snug text-zinc-400 italic">
          &ldquo;{feedback}&rdquo;
        </p>
      )}
    </div>
  )
}
