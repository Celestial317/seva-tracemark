import { Link } from 'react-router-dom'
import Stepper from './Stepper'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 no-underline text-ink">
      <span className="relative block w-[22px] h-[22px]" style={{ background: 'var(--grad)' }}>
        <span className="absolute inset-[6px] bg-white" />
      </span>
      <span className="font-display font-bold text-[16px] tracking-tight">TraceMark</span>
    </Link>
  )
}

type Props = { step?: 1 | 2 | 3; start?: boolean }

export default function Header({ step, start }: Props) {
  return (
    <header className="bg-white border-b border-line">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6">
        <Logo />
        <div className="flex justify-center min-w-0">{step ? <Stepper current={step} /> : null}</div>
        {start ? (
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[11px] text-faint">SEVA First Innovation Challenge 2026</span>
            <span className="font-mono text-[10px] font-bold tracking-widest text-white bg-ink px-2 py-1">
              <span className="inline-block w-1.5 h-1.5 bg-alert mr-1.5 pulse-red" />LIVE DEMO
            </span>
          </div>
        ) : (
          <span className="hidden sm:inline font-mono text-xs font-medium text-muted">MOCK-NEET-01</span>
        )}
      </div>
    </header>
  )
}
