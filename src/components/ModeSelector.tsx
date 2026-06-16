import type { CompareMode, OcrModesConfig } from '../api/types'

interface ModeSelectorProps {
  value: CompareMode
  onChange: (mode: CompareMode) => void
  disabled?: boolean
  ocrModes?: OcrModesConfig
}

const MODE_LABELS: Record<CompareMode, string> = {
  fast: 'Быстрый',
  accurate: 'Точный',
}

export function ModeSelector({
  value,
  onChange,
  disabled = false,
  ocrModes,
}: ModeSelectorProps) {
  const modes: CompareMode[] = ocrModes?.supported ?? ['fast', 'accurate']

  return (
    <div className="mode-selector">
      <div
        className="mode-selector__options"
        role="radiogroup"
        aria-label="Режим"
      >
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={value === mode}
            className={`mode-selector__option${
              value === mode ? ' mode-selector__option--active' : ''
            }`}
            disabled={disabled}
            onClick={() => onChange(mode)}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  )
}
