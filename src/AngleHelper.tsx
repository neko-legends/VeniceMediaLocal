// AngleHelper — "approximate angle (no GPU)" control for the Edit tab.
//
// Lets the user dial in a camera viewpoint with simple sliders/presets, see the
// natural-language instruction it produces, and insert it into the edit prompt.
// The actual re-render is done by whatever general image editor the user has
// selected in the Edit tab (e.g. Nano Banana via the Venice API).
//
// For identity-consistent, true multi-angle re-rendering on your own GPU, use
// the standalone Neko AngleForge app, which drives the Qwen Multiple-Angles LoRA.

import { Wand2 } from 'lucide-react'
import { useState } from 'react'
import {
  AngleValue,
  AZIMUTH_PRESETS,
  clamp,
  DEFAULT_ANGLE,
  DISTANCE_PRESETS,
  ELEVATION_PRESETS,
  formatAngleInstruction,
  wrapAzimuth,
} from './anglePrompt'

interface AngleHelperProps {
  /** Called to insert the generated instruction into the edit prompt. */
  onInsert: (instruction: string) => void
}

export function AngleHelper({ onInsert }: AngleHelperProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<AngleValue>(DEFAULT_ANGLE)

  function update(patch: Partial<AngleValue>) {
    setValue((prev) => {
      const next = { ...prev, ...patch }
      next.azimuth = wrapAzimuth(next.azimuth)
      next.elevation = clamp(next.elevation, -30, 60)
      next.distance = clamp(next.distance, 0, 10)
      return next
    })
  }

  const instruction = formatAngleInstruction(value)

  return (
    <div className="angle-helper">
      <button
        type="button"
        className="angle-helper-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Wand2 size={16} />
        Camera angle helper
        <span className="angle-helper-hint">{open ? 'Hide' : 'Approximate angle, no GPU'}</span>
      </button>

      {open && (
        <div className="angle-helper-body">
          <div className="angle-helper-row">
            <label>
              Horizontal
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={value.azimuth}
                onChange={(e) => update({ azimuth: Number(e.target.value) })}
              />
              <span>{Math.round(value.azimuth)}&deg;</span>
            </label>
            <select
              value=""
              onChange={(e) => e.target.value !== '' && update({ azimuth: Number(e.target.value) })}
            >
              <option value="">Preset…</option>
              {AZIMUTH_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="angle-helper-row">
            <label>
              Vertical
              <input
                type="range"
                min={-30}
                max={60}
                step={1}
                value={value.elevation}
                onChange={(e) => update({ elevation: Number(e.target.value) })}
              />
              <span>{Math.round(value.elevation)}&deg;</span>
            </label>
            <select
              value=""
              onChange={(e) => e.target.value !== '' && update({ elevation: Number(e.target.value) })}
            >
              <option value="">Preset…</option>
              {ELEVATION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="angle-helper-row">
            <label>
              Distance
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={value.distance}
                onChange={(e) => update({ distance: Number(e.target.value) })}
              />
              <span>{Math.round(value.distance)}</span>
            </label>
            <select
              value=""
              onChange={(e) => e.target.value !== '' && update({ distance: Number(e.target.value) })}
            >
              <option value="">Preset…</option>
              {DISTANCE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <p className="angle-helper-preview">{instruction}</p>

          <button type="button" className="angle-helper-insert" onClick={() => onInsert(instruction)}>
            Insert into prompt
          </button>
        </div>
      )}
    </div>
  )
}
