/**
 * Capture a compressed JPEG frame from the webcam for AI scoring.
 * Returns a data URL (data:image/jpeg;base64,...).
 */
export function captureScoringFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null

  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 240
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.55)
}
