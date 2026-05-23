import { useEffect, useRef } from 'react'
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

type UsePoseOverlayOptions = {
  enabled: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

const SMOOTHING = 0.65 // lerp factor: higher = more responsive, lower = smoother
const VISIBILITY_THRESHOLD = 0.5

export function usePoseOverlay({ enabled, videoRef, canvasRef }: UsePoseOverlayOptions) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const frameRef = useRef<number | null>(null)
  const drawUtilsRef = useRef<DrawingUtils | null>(null)
  const prevLandmarksRef = useRef<NormalizedLandmark[] | null>(null)

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
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
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
    if (!enabled) {
      prevLandmarksRef.current = null
      return
    }

    const draw = () => {
      const landmarker = landmarkerRef.current
      const video = videoRef.current
      const canvas = canvasRef.current

      if (landmarker && video && canvas && video.videoWidth > 0) {
        // Match canvas resolution to displayed size for correct positioning
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const cw = Math.round(rect.width * dpr)
        const ch = Math.round(rect.height * dpr)

        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw
          canvas.height = ch
        }

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          frameRef.current = requestAnimationFrame(draw)
          return
        }

        // Reuse DrawingUtils
        if (!drawUtilsRef.current) {
          drawUtilsRef.current = new DrawingUtils(ctx)
        }

        const result = landmarker.detectForVideo(video, performance.now())
        ctx.save()
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, rect.width, rect.height)

        if (result.landmarks[0]) {
          const raw = result.landmarks[0]

          // Compute object-cover crop offset so skeleton aligns with visible video
          const videoAR = video.videoWidth / video.videoHeight
          const containerAR = rect.width / rect.height
          let offsetX = 0
          let offsetY = 0
          let scaleX = rect.width
          let scaleY = rect.height

          if (videoAR > containerAR) {
            // Video is wider than container — cropped horizontally
            const visibleFraction = containerAR / videoAR
            offsetX = ((1 - visibleFraction) / 2) * rect.width / visibleFraction
            scaleX = rect.width / visibleFraction
          } else {
            // Video is taller than container — cropped vertically
            const visibleFraction = videoAR / containerAR
            offsetY = ((1 - visibleFraction) / 2) * rect.height / visibleFraction
            scaleY = rect.height / visibleFraction
          }

          // Mirror + apply object-cover transform
          ctx.translate(rect.width, 0)
          ctx.scale(-1, 1)

          // Smooth landmarks with exponential moving average
          const smoothed: NormalizedLandmark[] = raw.map((lm, i) => {
            const prev = prevLandmarksRef.current?.[i]
            if (!prev || (lm.visibility ?? 0) < VISIBILITY_THRESHOLD) {
              return { ...lm }
            }
            return {
              x: prev.x + SMOOTHING * (lm.x - prev.x),
              y: prev.y + SMOOTHING * (lm.y - prev.y),
              z: prev.z + SMOOTHING * (lm.z - prev.z),
              visibility: lm.visibility,
            }
          })
          prevLandmarksRef.current = smoothed

          // Filter out low-visibility landmarks for cleaner rendering
          const visible = smoothed.filter((lm) => (lm.visibility ?? 0) >= VISIBILITY_THRESHOLD)

          // Transform landmarks to canvas coordinates accounting for object-cover crop
          const toCanvas = (landmarks: NormalizedLandmark[]): NormalizedLandmark[] =>
            landmarks.map((lm) => ({
              x: (lm.x * scaleX - offsetX) / rect.width,
              y: (lm.y * scaleY - offsetY) / rect.height,
              z: lm.z,
              visibility: lm.visibility,
            }))

          const canvasLandmarks = toCanvas(smoothed)
          const canvasVisible = toCanvas(visible)

          // Draw connectors using full set (smoothed) so lines connect properly
          drawUtilsRef.current.drawConnectors(canvasLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
            color: '#34d399',
            lineWidth: 2.5,
          })

          // Draw only visible landmarks
          drawUtilsRef.current.drawLandmarks(canvasVisible, {
            color: '#f8fafc',
            fillColor: '#34d399',
            radius: 3,
          })
        } else {
          prevLandmarksRef.current = null
        }

        ctx.restore()
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      drawUtilsRef.current = null
    }
  }, [enabled, videoRef, canvasRef])
}
