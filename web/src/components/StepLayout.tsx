import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'

type Props = { step: 1 | 2 | 3; children: ReactNode; back: string }

export default function StepLayout({ step, children, back }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header step={step} />
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
        {children}
        <div className="mt-8 pt-4 border-t border-line">
          <Link to={back} className="text-[13px] text-muted no-underline hover:text-ink">← Back</Link>
        </div>
      </main>
    </div>
  )
}
