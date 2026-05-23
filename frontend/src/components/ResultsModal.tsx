import { useMemo } from 'react'
import type { PlayerScore } from '../types/messages'

type ResultsModalProps = {
  myPlayerId: string
  winnerId: string
  scores: Record<string, PlayerScore>
  opponentName?: string | null
  onRematch: () => void
  onNewMatch: () => void
}

const WIN_WORDS = [
  'ABSOLUTELY MOGGED',
  'VIOLATED',
  'SENT TO THE SHADOW REALM',
  'COOKED THEM',
  "RATIO'D",
]
const LOSE_WORDS = [
  'GOT MOGGED',
  'FRAUDED',
  'PACK WATCH',
  'DOWN BAD',
  'CAUGHT IN 4K',
]

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function ResultsModal({
  myPlayerId,
  winnerId,
  scores,
  opponentName,
  onRematch,
  onNewMatch,
}: ResultsModalProps) {
  const opponentId = Object.keys(scores).find((id) => id !== myPlayerId)
  const iWon = winnerId === myPlayerId
  const myScores = scores[myPlayerId]
  const oppScores = opponentId ? scores[opponentId] : null

  const oppDisplay = opponentName || 'Opponent'

  const verdict = useMemo(() => pickRandom(iWon ? WIN_WORDS : LOSE_WORDS), [iWon])

  const subtitle = iWon
    ? `${oppDisplay} didn't stand a chance`
    : `${oppDisplay} just ended your whole career`

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-3xl text-center space-y-10 py-8">

        {/* --- VERDICT --- */}
        <div className="space-y-3">
          <div
            className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] ${
              iWon ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {iWon ? 'VICTORY' : 'DEFEAT'}
          </div>
          <h2
            className={`text-[3.5rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] font-black uppercase leading-[0.85] tracking-tighter ${
              iWon
                ? 'text-emerald-400 drop-shadow-[0_0_60px_rgba(52,211,153,0.6)]'
                : 'text-red-500 drop-shadow-[0_0_60px_rgba(239,68,68,0.6)]'
            }`}
            style={{
              textShadow: iWon
                ? '0 0 80px rgba(52,211,153,0.4), 0 0 160px rgba(52,211,153,0.2)'
                : '0 0 80px rgba(239,68,68,0.4), 0 0 160px rgba(239,68,68,0.2)',
            }}
          >
            {verdict}
          </h2>
          <p className="text-sm sm:text-base uppercase tracking-[0.25em] text-zinc-400 font-semibold mt-4">
            {subtitle}
          </p>
        </div>

        {/* --- SCORE CARDS --- */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6 px-2">
          <ScoreCard
            label="You"
            score={myScores}
            highlight={iWon ? 'win' : 'lose'}
          />
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl sm:text-5xl font-black text-zinc-600">vs</span>
          </div>
          {oppScores ? (
            <ScoreCard
              label={oppDisplay}
              score={oppScores}
              highlight={iWon ? 'lose' : 'win'}
            />
          ) : (
            <div />
          )}
        </div>

        {/* --- JUDGE FEEDBACK --- */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">
            Judge Verdicts
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <FeedbackCard
              judge="Accuracy (GMI)"
              myFeedback={myScores.gmi.feedback}
              myScore={myScores.gmi.score}
              oppFeedback={oppScores?.gmi.feedback}
              oppScore={oppScores?.gmi.score}
            />
            <FeedbackCard
              judge="Style (Gemini)"
              myFeedback={myScores.gemini.feedback}
              myScore={myScores.gemini.score}
              oppFeedback={oppScores?.gemini.feedback}
              oppScore={oppScores?.gemini.score}
            />
          </div>
        </div>

        {/* --- ACTIONS --- */}
        <div className="flex gap-3 max-w-md mx-auto pt-2">
          <button
            onClick={onRematch}
            className="flex-1 rounded-xl bg-emerald-500 px-6 py-4 text-sm font-black uppercase tracking-wider text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30 cursor-pointer"
          >
            Rematch
          </button>
          <button
            onClick={onNewMatch}
            className="flex-1 rounded-xl border border-zinc-600 px-6 py-4 text-sm font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            New Match
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreCard({
  label,
  score,
  highlight,
}: {
  label: string
  score: PlayerScore
  highlight: 'win' | 'lose'
}) {
  const isWin = highlight === 'win'

  const border = isWin ? 'border-emerald-500/50' : 'border-red-500/40'
  const bg = isWin ? 'bg-emerald-500/10' : 'bg-red-500/10'
  const scoreColor = isWin ? 'text-emerald-400' : 'text-red-400'
  const glowColor = isWin
    ? 'drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]'
    : 'drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]'

  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} backdrop-blur-sm p-5 sm:p-8 space-y-3`}>
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-400 font-black">
        {label}
      </p>
      <p className={`text-6xl sm:text-7xl md:text-8xl font-black tabular-nums ${scoreColor} ${glowColor}`}>
        {score.final.toFixed(1)}
      </p>
      <div className="flex gap-4 pt-3 border-t border-zinc-700/50">
        <MiniStat label="Accuracy" value={score.gmi.score} />
        <MiniStat label="Style" value={score.gemini.score} />
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{label}</p>
      <p className="text-lg sm:text-xl font-black text-zinc-300 tabular-nums">{value.toFixed(1)}</p>
    </div>
  )
}

function FeedbackCard({
  judge,
  myFeedback,
  myScore,
  oppFeedback,
  oppScore,
}: {
  judge: string
  myFeedback: string
  myScore: number
  oppFeedback?: string
  oppScore?: number
}) {
  const hasFeedback =
    (myFeedback && myFeedback !== 'Mock score') ||
    (oppFeedback && oppFeedback !== 'Mock score')

  if (!hasFeedback) return null

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-left space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
          {judge}
        </span>
      </div>
      {myFeedback && myFeedback !== 'Mock score' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">You</span>
            <span className="text-sm font-black text-zinc-300 tabular-nums">{myScore.toFixed(1)}</span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">
            &ldquo;{myFeedback}&rdquo;
          </p>
        </div>
      )}
      {oppFeedback && oppFeedback !== 'Mock score' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Opponent</span>
            {oppScore !== undefined && (
              <span className="text-sm font-black text-zinc-300 tabular-nums">{oppScore.toFixed(1)}</span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">
            &ldquo;{oppFeedback}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
