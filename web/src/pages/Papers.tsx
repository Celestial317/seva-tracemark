import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StepLayout from '../components/StepLayout'
import { Arrow, Diff, Doc, Lock, Refresh, Rows, Warning } from '../components/Icons'
import { Strip, VerCell, VER_LEGEND } from '../components/Fingerprint'
import { createPapers, keysFor, listPapers, rememberKeys, type Centre } from '../api'

const BADGE = ['#22D3EE', '#A78BFA', '#FBBF24']

function minDiff(codes: string[]) {
  let m = 10
  for (let i = 0; i < codes.length; i++)
    for (let j = i + 1; j < codes.length; j++)
      m = Math.min(m, [...codes[i]].filter((c, k) => c !== codes[j][k]).length)
  return m
}

export default function Papers() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [created, setCreated] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [round, setRound] = useState(0) // restarts the pop animations after "Create again"

  useEffect(() => {
    listPapers()
      .then((r) => {
        setCentres(r.centres)
        setCreated(r.created)
        if (r.centres.length) setSelected(r.centres[3]?.id ?? r.centres[0].id)
      })
      .catch(() => setError('Cannot reach the TraceMark server. Is the backend running?'))
  }, [])

  async function create() {
    setBusy(true)
    setError('')
    try {
      const r = await createPapers()
      rememberKeys(r.centres)
      setCentres(r.centres.map(({ id, city, code }) => ({ id, city, code, status: 'locked' })))
      setCreated(true)
      setRound((n) => n + 1)
      setSelected(r.centres[3]?.id ?? r.centres[0].id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const sel = centres.find((c) => c.id === selected)
  const keys = selected ? keysFor(selected) : undefined
  const diff = useMemo(() => minDiff(centres.map((c) => c.code)), [centres])

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(text)
      setTimeout(() => setCopied(''), 1200)
    })
  }

  const stats = [
    { Icon: Doc, v: String(centres.length), l: 'papers created', c: 'bg-brand-tint text-brand' },
    { Icon: Rows, v: '10', l: 'questions each', c: 'bg-violet-50 text-ver-B' },
    { Icon: Diff, v: `${diff} of 10`, l: 'minimum difference', c: 'bg-amber-50 text-amber-600' },
    { Icon: Lock, v: 'AES-256', l: 'every paper locked', c: 'bg-alert-tint text-alert' },
  ]

  return (
    <StepLayout step={1} back="/">
      <div className="flex items-start justify-between gap-4 rise">
        <div>
          <h1 className="m-0 text-[30px] font-bold tracking-tight">Create papers</h1>
          <p className="mt-1 mb-0 text-[13px] text-muted">
            Same 10 questions. Five different fingerprints. Each paper locked with 3 keys.
          </p>
        </div>
        <button className="btn-grad" onClick={create} disabled={busy}>
          <Refresh />{busy ? 'Creating...' : created ? 'Create again' : 'Create 5 papers'}
        </button>
      </div>

      {error && <div role="alert" className="mt-4 p-3 text-[13px] bg-alert-tint border border-alert-edge text-alert">{error}</div>}

      {!created ? (
        <div className="mt-5 card grid-bg py-16 text-center rise">
          <div className="inline-flex gap-[3px] mb-4">
            {Array.from({ length: 10 }, (_, i) => <span key={i} className="w-[30px] h-[38px] bg-slate-200" />)}
          </div>
          <h2 className="m-0 text-xl font-bold">No papers yet</h2>
          <p className="mt-1 mb-5 text-[13px] text-muted">Create 5 locked papers for the mock exam.</p>
          <button className="btn-grad h-12 px-7" onClick={create} disabled={busy}>
            {busy ? 'Creating and locking...' : 'Create 5 papers'}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4" key={`stats-${round}`}>
            {stats.map((s, i) => (
              <div key={s.l} className="card flex items-center gap-3 p-3.5 rise" style={{ animationDelay: `${i * 60}ms` }}>
                <span className={`w-10 h-10 grid place-items-center shrink-0 ${s.c}`}><s.Icon size={18} /></span>
                <div>
                  <div className="font-display text-[22px] font-bold leading-none">{s.v}</div>
                  <div className="mt-1 text-[11px] text-faint">{s.l}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-5 items-start">
            <section className="card rise">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-line">
                <h2 className="m-0 text-[15px] font-bold">Fingerprints</h2>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted">
                  {VER_LEGEND.map(([v, t]) => (
                    <span key={v} className="inline-flex items-center gap-1.5"><VerCell v={v} small />{t}</span>
                  ))}
                </div>
              </div>
              <ul className="m-0 p-0 list-none" key={`rows-${round}`}>
                {centres.map((c, r) => (
                  <li
                    key={c.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-line last:border-0 border-l-[3px] ${
                      c.id === selected ? 'bg-brand-tint border-l-brand' : 'border-l-transparent'
                    }`}
                  >
                    <div className="w-[110px]">
                      <div className="font-mono text-[13px] font-bold">{c.id}</div>
                      <div className="text-[11px] text-faint">{c.city}</div>
                    </div>
                    <div className="overflow-x-auto"><Strip code={c.code} baseDelay={r * 90} /></div>
                    <div className="ml-auto flex gap-2">
                      <button className="btn-outline h-8 px-3 text-xs" onClick={() => setSelected(c.id)}>Keys</button>
                      <Link to={`/unlock?centre=${c.id}`} className="btn-dark h-8 px-3 text-xs"><Lock size={11} />Unlock</Link>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="m-0 px-4 py-3 text-[11px] text-faint border-t border-line">
                The fingerprint is never printed. It exists only in the wording, numbers and option order of each question.
              </p>
            </section>

            {sel && (
              <aside className="dark-panel p-5 rise" key={`keys-${sel.id}-${round}`}>
                <div className="font-mono text-[10px] tracking-widest text-cyan-300">KEYS FOR</div>
                <h2 className="mt-1 mb-4 text-[22px] font-bold">{sel.id} · {sel.city}</h2>
                {keys ? (
                  <div className="space-y-2.5">
                    {keys.map((k, i) => (
                      <div key={k.role} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                        <span className="w-7 h-7 grid place-items-center font-mono text-xs font-bold text-ink shrink-0" style={{ background: BADGE[i] }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-slate-400">{k.role}</div>
                          <div className="font-mono text-[19px] font-bold tracking-wider">{k.key}</div>
                        </div>
                        <button className="btn-ghost h-8 px-3 text-xs" onClick={() => copy(k.key)}>
                          {copied === k.key ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 p-3 text-[12px] leading-snug bg-alert/15 border border-alert/50 text-red-200">
                      <Warning className="shrink-0 mt-0.5" /><span><b>Shown once.</b> Give each key holder only their own key.</span>
                    </div>
                    <a href="/api/papers/keys-demo" className="btn w-full bg-white text-ink">Download all 15 keys</a>
                  </div>
                ) : (
                  <div className="p-3 text-[12px] leading-snug bg-white/5 border border-white/10 text-slate-300">
                    Keys were shown once, when these papers were created, and are not kept in this page. Use
                    &ldquo;Create again&rdquo; to make new papers with new keys.
                  </div>
                )}
                <Link to={`/unlock?centre=${sel.id}`} className="btn-grad w-full mt-3">Next: unlock {sel.id} <Arrow /></Link>
              </aside>
            )}
          </div>
        </>
      )}
    </StepLayout>
  )
}
