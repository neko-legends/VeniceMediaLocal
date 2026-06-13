// Angle -> natural-language instruction for general image editors.
//
// Unlike the standalone Neko AngleForge app (which targets the Qwen
// Multiple-Angles LoRA and emits the LoRA's `<sks> ...` token vocabulary), the
// Venice edit pipeline runs general-purpose image editors (e.g. Nano Banana,
// GPT Image, Qwen Image Edit) that do NOT understand the LoRA tokens. So here we
// translate the picked camera angle into a plain-English editing instruction.
//
// This is the "approximate angle (no GPU)" path: flexible, works for everyone,
// but less identity-consistent across angles than the dedicated LoRA.

export interface AngleValue {
  /** Horizontal angle around the subject, 0-360 degrees. */
  azimuth: number
  /** Vertical angle, -30..60 degrees. */
  elevation: number
  /** Distance bucket driver, 0..10. */
  distance: number
}

export const DEFAULT_ANGLE: AngleValue = { azimuth: 0, elevation: 0, distance: 5 }

export function wrapAzimuth(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

const AZIMUTH_PHRASES: { deg: number; phrase: string }[] = [
  { deg: 0, phrase: 'from the front' },
  { deg: 45, phrase: 'from the front-right at a three-quarter angle' },
  { deg: 90, phrase: 'from the right side' },
  { deg: 135, phrase: 'from the back-right at a three-quarter angle' },
  { deg: 180, phrase: 'from directly behind' },
  { deg: 225, phrase: 'from the back-left at a three-quarter angle' },
  { deg: 270, phrase: 'from the left side' },
  { deg: 315, phrase: 'from the front-left at a three-quarter angle' },
]

export function snapAzimuthIndex(azimuth: number): number {
  const a = wrapAzimuth(azimuth)
  return Math.round(a / 45) % 8
}

export function azimuthPhrase(azimuth: number): string {
  return AZIMUTH_PHRASES[snapAzimuthIndex(azimuth)].phrase
}

export function elevationPhrase(elevation: number): string {
  if (elevation <= -15) return 'from a low angle looking up'
  if (elevation < 15) return 'at eye level'
  if (elevation <= 45) return 'from a slightly elevated angle looking down'
  return 'from a high angle looking down'
}

export function distancePhrase(distance: number): string {
  if (distance <= 3.33) return 'as a close-up shot'
  if (distance <= 6.66) return 'as a medium shot'
  return 'as a wide shot'
}

/**
 * Build a natural-language camera instruction for a general image editor.
 *
 * Example: { azimuth: 90, elevation: 60, distance: 1 } =>
 *   "Show the same subject from the right side, from a high angle looking down,
 *    as a close-up shot. Keep the subject's identity, clothing, colors, and
 *    style consistent; only change the camera viewpoint."
 */
export function formatAngleInstruction(value: AngleValue): string {
  const az = azimuthPhrase(value.azimuth)
  const el = elevationPhrase(value.elevation)
  const dist = distancePhrase(value.distance)
  return (
    `Show the same subject ${az}, ${el}, ${dist}. ` +
    `Keep the subject's identity, clothing, colors, and style consistent; ` +
    `only change the camera viewpoint.`
  )
}

export const AZIMUTH_PRESETS: { label: string; value: number }[] = [
  { label: 'Front', value: 0 },
  { label: 'Front-right 3/4', value: 45 },
  { label: 'Right side', value: 90 },
  { label: 'Back-right 3/4', value: 135 },
  { label: 'Back', value: 180 },
  { label: 'Back-left 3/4', value: 225 },
  { label: 'Left side', value: 270 },
  { label: 'Front-left 3/4', value: 315 },
]

export const ELEVATION_PRESETS: { label: string; value: number }[] = [
  { label: 'Low angle', value: -30 },
  { label: 'Eye level', value: 0 },
  { label: 'Elevated', value: 30 },
  { label: 'High angle', value: 60 },
]

export const DISTANCE_PRESETS: { label: string; value: number }[] = [
  { label: 'Close-up', value: 1 },
  { label: 'Medium shot', value: 5 },
  { label: 'Wide shot', value: 9 },
]
