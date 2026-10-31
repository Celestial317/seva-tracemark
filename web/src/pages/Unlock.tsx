import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StepLayout from '../components/StepLayout'
import KeyInput from '../components/KeyInput'
import { Arrow, Check, Unlocked, Warning } from '../components/Icons'
import { listPapers, unlock, type Centre } from '../api'

const LABELS = ['Authority key', 'Superintendent key', 'Observer key']
const SLOTS = ['Authority', 'Superintendent', 'Observer']
type State = 'idle' | 'busy' | 'wrong' | 'locked' | 'open'

function LockArt({ open, bad }: { open: boolean; bad: boolean }) {
  return (
    <div className="relative grid place-items-center py-6">
      {open && <span className="lock-ring" />}
      <svg viewBox="0 0 120 140" className="w-[150px] drop-shadow-[0_0_24px_rgba(34,211,238,0.25)]">
        <g className={`lock-shackle ${open ? 'open' : ''}`}>
          <path d="M38 62V42a22 22 0 0144 0v20" fill="none" stroke="#CBD5E1" strokeWidth="9" />
        </g>
        <rect x="18" y="60" width="84" height="68" fill={bad ? '#FCA5A5' : '#E2E8F0'} />
        <circle cx="60" cy="88" r="8" fill="#0B1220" />
        <rect x="56" y="92" width="8" height="18" fill="#0B1220" />
      </svg>
    </div>
  )
}

export default function Unlock() {
  const [params, setParams] = useSearchParams()
  const [centres, setCentres] = useState<Centre[]>([])
  const [keys, setKeys] = useState(['', '', ''])
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [shake, setShake] = useState(false)
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const pdfUrl = useRef<string | null>(null)
  const centre = params.get('centre') ?? centres[0]?.id ?? ''
  const full = keys.every((k) => k.length === 8)

  useEffect(() => {
    listPapers().then((r) => setCentres(r.centres)).catch(() => setMessage('Cannot reach the TraceMark server.'))
    return () => { if (pdfUrl.current) URL.revokeObjectURL(pdfUrl.current) }
  }, [])

  useEffect(() => {
    if (state !== 'locked') return
    const t = setInterval(() => setSeconds((s) => {
      if (s <= 1) { setState('idle'); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [state])

  const open = () => pdfUrl.current && window.open(pdfUrl.current, '_blank')
  const print = () => {
    const w = pdfUrl.current ? window.open(pdfUrl.current, '_blank') : null
    w?.addEventListener('load', () => w.print())
  }

  async function submit() {
    if (!full || state === 'busy' || state === 'locked' || state === 'open') return
    setState('busy')
    const popup = window.open('', '_blank') // opened on the click so the browser allows it
    const r = await unlock(centre, keys).catch(() => null)
    if (!r) { popup?.close(); setState('idle'); setMessage('Cannot reach the TraceMark server.'); return }
    if (r.ok) {
      if (pdfUrl.current) URL.revokeObjectURL(pdfUrl.current)
      pdfUrl.current = URL.createObjectURL(r.blob)
      if (popup) popup.location.href = pdfUrl.current
      setMessage('')
      setState('open')
      return
    }
    popup?.close()
    if (r.status === 429) {
      setSeconds(r.retryAfter ?? 60)
      setState('locked')
    } else {
      setMessage('These keys do not open this paper. Check each key with its holder.')
      setState('wrong')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  const setKey = (i: number, v: string) => {
    setKeys((k) => k.map((x, j) => (j === i ? v : x)))
    if (state === 'wrong') setState('idle')
  }

  const city = centres.find((c) => c.id === centre)?.city
  const wrong = state === 'wrong'
  const isOpen = state === 'open'

  return (
    <StepLayout step={2} back="/papers">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-5 max-w-[1100px] mx-auto">
        <section className="dark-panel p-6 flex flex-col rise min-h-[420px] min-w-0">
          <div className="font-mono text-[10px] tracking-widest text-cyan-300">ENCRYPTED PAPER</div>
          <h2 className="mt-1 mb-1 text-[26px] font-bold">{centre || '—'}{city ? ` · ${city}` : ''}</h2>
          <div className="text-[12px] text-slate-400">AES-256 · opens only with all 3 keys</div>
          <div className="flex-1 grid place-items-center"><LockArt open={isOpen} bad={wrong} /></div>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map((s, i) => {
              const ok = keys[i].length === 8 && !wrong
              const bad = wrong && keys[i].length === 8
              return (
                <div
                  key={s}
                  className={`px-2.5 py-2 border text-[11px] transition-colors ${
                    bad ? 'border-alert bg-alert/15' : ok || isOpen ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/15 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono tracking-wider">
                    <span className={bad ? 'text-red-300' : 'text-cyan-300'}>KEY {i + 1}</span>
                    {(ok || isOpen) && <Check className="text-cyan-300" size={12} />}
                    {bad && <Warning className="text-red-300" size={12} />}
                  </div>
                  <div className="mt-0.5 text-slate-200">{s}</div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card p-6 rise" style={{ animationDelay: '80ms' }}>
          <h1 className="m-0 text-[28px] font-bold tracking-tight">Unlock and print</h1>
          <p className="mt-1 mb-5 text-[13px] text-muted">Each official types their own key. The paper opens only when all three match.</p>

          <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Centre">
            {centres.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setParams({ centre: c.id })}
                className={`px-3 h-9 font-mono text-xs font-bold border cursor-pointer transition-colors ${
                  c.id === centre ? 'bg-ink text-white border-ink' : 'bg-white text-muted border-line hover:border-brand hover:text-brand'
                }`}
              >
                {c.id}
              </button>
            ))}
          </div>

          <form className={`space-y-4 ${shake ? 'shake' : ''}`} onSubmit={(e) => { e.preventDefault(); submit() }}>
            {LABELS.map((l, i) => (
              <KeyInput
                key={l} label={l} index={i + 1} value={keys[i]} inputRef={refs[i]} invalid={wrong}
                disabled={state === 'busy' || isOpen}
                onChange={(v) => setKey(i, v)}
                onFull={() => refs[i + 1]?.current?.focus()}
              />
            ))}
            {wrong && (
              <div role="alert" className="flex gap-2 p-3 text-[13px] bg-alert-tint border border-alert-edge text-alert">
                <Warning className="shrink-0 mt-0.5" />{message}
              </div>
            )}
            {state === 'locked' && (
              <div role="alert" className="flex gap-2 p-3 text-[13px] bg-alert-tint border border-alert-edge text-alert">
                <Warning className="shrink-0 mt-0.5" />Too many attempts. Try again in {seconds} seconds.
              </div>
            )}
            {state === 'idle' && message && <div role="alert" className="text-[13px] text-alert">{message}</div>}
            <button type="submit" className="btn-grad w-full h-12" disabled={!full || state === 'busy' || state === 'locked' || isOpen}>
              <Unlocked />{state === 'busy' ? 'Unlocking...' : 'Unlock and open PDF'}
            </button>
          </form>

          {isOpen && (
            <div className="mt-5 p-4 text-white rise" style={{ background: 'var(--grad)' }}>
              <div className="flex items-center gap-2 font-display text-[18px] font-bold"><Check size={18} />Paper unlocked</div>
              <p className="mt-1 mb-3 text-[13px] text-white/85">
                {centre}&rsquo;s paper opened in a new tab. Print it from there. Nothing is saved on this computer.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button className="btn bg-white text-ink" onClick={print}>Print</button>
                <button className="btn-ghost" onClick={open}>Open PDF again</button>
                <Link to="/trace" className="btn bg-ink text-white ml-auto">Next: trace a leak <Arrow /></Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </StepLayout>
  )
}
