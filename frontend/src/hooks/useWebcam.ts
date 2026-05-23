import { useCallback, useRef, useState } from 'react'

export type WebcamState = 'idle' | 'requesting' | 'active' | 'denied' | 'error'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<WebcamState>('idle')

  const start = useCallback(async () => {
    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('active')
    } catch (err) {
      const name = err instanceof DOMException ? err.name : 'UnknownError'
      setState(name === 'NotAllowedError' ? 'denied' : 'error')
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setState('idle')
  }, [])

  return { videoRef, state, start, stop }
}
