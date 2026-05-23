import { useEffect, useRef } from 'react'
import { captureScoringFrame } from '../lib/captureFrame'
import type { ClientMessage } from '../types/messages'

type UseFrameCaptureOptions = {
  enabled: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  send: (msg: ClientMessage) => void
}

/**
 * Captures webcam frames at ~2 FPS during the performance window
 * and sends them to the backend for AI scoring.
 */
export function useFrameCapture({ enabled, videoRef, send }: UseFrameCaptureOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video) return

      const frame = captureScoringFrame(video)
      if (frame) {
        send({ type: 'frame', frame, capturedAtMs: Date.now() })
      }
    }, 500) // 2 FPS

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, videoRef, send])
}
