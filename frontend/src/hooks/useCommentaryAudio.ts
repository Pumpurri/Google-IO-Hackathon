import { useCallback, useRef } from 'react'

// Gemini Live outputs PCM audio at 24kHz, 16-bit, mono, little-endian
const SAMPLE_RATE = 24000

export function useCommentaryAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const nextStartRef = useRef(0)

  const playChunk = useCallback((base64Pcm: string) => {
    // Lazy-init AudioContext (must be after user gesture)
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
    }
    const ctx = ctxRef.current

    // Decode base64 to raw bytes
    const binary = atob(base64Pcm)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    // Convert 16-bit PCM to Float32
    const pcm16 = new Int16Array(bytes.buffer)
    const float32 = new Float32Array(pcm16.length)
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768
    }

    // Create audio buffer and schedule playback
    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE)
    buffer.getChannelData(0).set(float32)

    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Volume boost for commentary
    const gain = ctx.createGain()
    gain.gain.value = 1.5
    source.connect(gain)
    gain.connect(ctx.destination)

    // Schedule seamlessly after previous chunk
    const now = ctx.currentTime
    const startTime = Math.max(now, nextStartRef.current)
    source.start(startTime)
    nextStartRef.current = startTime + buffer.duration
  }, [])

  return { playChunk }
}
