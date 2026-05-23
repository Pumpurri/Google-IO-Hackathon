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

  const game = useGameSocket(WS_URL, connected)

  const isPerforming = game.phase === 'performing'

  usePoseOverlay({ enabled: isPerforming, videoRef, canvasRef })
  useFrameCapture({ enabled: isPerforming, videoRef, send: game.send })

  async function handleEnter() {
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
        timerValue={game.timerValue}
        celebration={game.celebration}
        commentary={game.commentary}
        myScore={
          game.scores && game.playerId ? game.scores[game.playerId]?.final ?? null : null
        }
      />
      {game.phase === 'results' && game.playerId && game.winnerId && game.scores && (
        <ResultsModal
          myPlayerId={game.playerId}
          winnerId={game.winnerId}
          scores={game.scores}
          onRematch={() => game.send({ type: 'rematch' })}
          onNewMatch={() => game.send({ type: 'leave' })}
        />
      )}
    </>
  )
}
