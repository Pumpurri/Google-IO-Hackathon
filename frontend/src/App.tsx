import { useRef, useState } from 'react'
import { Landing } from './components/Landing'
import { BattleView } from './components/BattleView'
import { ResultsModal } from './components/ResultsModal'
import { useWebcam } from './hooks/useWebcam'
import { useGameSocket } from './hooks/useGameSocket'
import { usePoseOverlay } from './hooks/usePoseOverlay'
import { useFrameCapture } from './hooks/useFrameCapture'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`

export default function App() {
  const { videoRef, state: camState, start: startCam } = useWebcam()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [connected, setConnected] = useState(false)
  const [playerName, setPlayerName] = useState<string | null>(null)

  const game = useGameSocket(WS_URL, connected, playerName)

  const isPerforming = game.phase === 'performing'

  usePoseOverlay({ enabled: false, videoRef, canvasRef })
  useFrameCapture({ enabled: isPerforming, videoRef, send: game.send })

  async function handleEnter(name: string) {
    setPlayerName(name)
    await startCam()
    setConnected(true)
  }

  if (!connected || camState !== 'active') {
    return <Landing onEnter={handleEnter} />
  }

  return (
    <>
      <BattleView
        videoRef={videoRef}
        canvasRef={canvasRef}
        phase={game.phase}
        countdownValue={game.countdownValue}
        countdownLabel={game.countdownLabel}
        timerValue={game.timerValue}
        celebration={game.celebration}
        commentary={game.commentary}
        myScore={
          game.scores && game.playerId ? game.scores[game.playerId]?.final ?? null : null
        }
        liveScores={game.liveScores}
        playerId={game.playerId}
        playerName={game.playerName}
        opponentName={game.opponentName}
        opponentFrame={game.opponentFrame}
        judgingStage={game.judgingStage}
      />
      {game.phase === 'results' && game.playerId && game.winnerId && game.scores && (
        <ResultsModal
          myPlayerId={game.playerId}
          winnerId={game.winnerId}
          scores={game.scores}
          opponentName={game.opponentName}
          onRematch={() => game.send({ type: 'rematch' })}
          onNewMatch={() => game.send({ type: 'leave' })}
        />
      )}
    </>
  )
}
