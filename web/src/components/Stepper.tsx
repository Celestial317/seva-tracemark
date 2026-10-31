import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Check } from './Icons'

const STEPS = [
  { n: 1, label: 'Create papers', to: '/papers' },
  { n: 2, label: 'Unlock and print', to: '/unlock' },
  { n: 3, label: 'Trace a leak', to: '/trace' },
]

export default function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Steps" className="flex items-center gap-1.5 sm:gap-2.5">
      {STEPS.map((s, i) => {
        const done = s.n < current
        const active = s.n === current
        return (
          <Fragment key={s.n}>
            {i > 0 && (
              <span
                className="w-4 sm:w-10 h-[2px]"
                style={{ background: s.n <= current ? 'var(--grad)' : '#E2E8F0' }}
              />
            )}
            <Link
              to={s.to}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-2 px-1.5 py-1 text-[13px] no-underline border ${
                active ? 'bg-brand-tint border-brand-edge text-ink font-semibold' : 'border-transparent'
              } ${done ? 'text-brand' : ''} ${!active && !done ? 'text-faint' : ''}`}
            >
              <span
                className={`w-5 h-5 grid place-items-center text-[11px] font-mono font-bold ${
                  active ? 'text-white' : done ? 'bg-brand-tint text-brand border border-brand-edge' : 'bg-white text-faint border border-line'
                }`}
                style={active ? { background: 'var(--grad)' } : undefined}
              >
                {done ? <Check size={12} /> : s.n}
              </span>
              <span className={active ? 'hidden sm:inline' : 'hidden md:inline'}>{s.label}</span>
            </Link>
          </Fragment>
        )
      })}
    </nav>
  )
}
