import { useEffect, useRef } from 'react'
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision'

type UsePoseOverlayOptions = {
  enabled: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export function usePoseOverlay({ enabled, videoRef, canvasRef }: UsePoseOverlayOptions) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const frameRef = useRef<number | null>(null)

  // Initialize pose landmarker once
  useEffect(() => {
    let cancelled = false

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      )
      if (cancelled) return

      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    }

    init()
    return () => {
      cancelled = true
      landmarkerRef.current?.close()
    }
  }, [])

  // Draw skeleton overlay loop
  useEffect(() => {
    if (!enabled) return

    const draw = () => {
      const landmarker = landmarkerRef.current
      const video = videoRef.current
      const canvas = canvasRef.current

      if (landmarker && video && canvas && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')

        const result = landmarker.detectForVideo(video, performance.now())

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          if (result.landmarks[0]) {
            const drawingUtils = new DrawingUtils(ctx)
            drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
              color: '#34d399',
              lineWidth: 3,
            })
            drawingUtils.drawLandmarks(result.landmarks[0], {
              color: '#f8fafc',
              fillColor: '#34d399',
              radius: 4,
            })
          }
        }
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [enabled, videoRef, canvasRef])
}
