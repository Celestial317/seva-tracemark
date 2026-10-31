import type { Ref } from 'react'

export const sanitizeKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
export const formatKey = (raw: string) => (raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw)

type Props = {
  label: string
  index: number // 1-3, picks the badge colour
  value: string // raw, 0-8 chars
  onChange: (raw: string) => void
  onFull?: () => void
  invalid?: boolean
  inputRef?: Ref<HTMLInputElement>
  disabled?: boolean
}

const BADGE = ['#22D3EE', '#A78BFA', '#FBBF24']

export default function KeyInput({ label, index, value, onChange, onFull, invalid, inputRef, disabled }: Props) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-muted mb-1.5">{label}</span>
      <span className="flex">
        <span className="w-14 grid place-items-center font-mono text-[18px] font-bold text-ink shrink-0" style={{ background: BADGE[index - 1] }}>
          {index}
        </span>
        <input
          ref={inputRef}
          value={formatKey(value)}
          disabled={disabled}
          onChange={(e) => {
            const raw = sanitizeKey(e.target.value)
            onChange(raw)
            if (raw.length === 8 && value.length < 8) onFull?.()
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXX"
          aria-invalid={invalid || undefined}
          className={`flex-1 min-w-0 h-14 px-4 font-mono text-[22px] font-bold tracking-[0.12em] bg-slate-50 border outline-none placeholder:text-slate-300 placeholder:font-medium ${
            invalid ? 'border-alert bg-alert-tint' : 'border-line focus:border-brand focus:bg-white'
          }`}
        />
      </span>
    </label>
  )
}
