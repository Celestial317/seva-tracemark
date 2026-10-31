import { useEffect, useRef, useState } from 'react'
import StepLayout from '../components/StepLayout'
import ResultCard from '../components/ResultCard'
import EvidenceTable from '../components/EvidenceTable'
import { VER_COLOR } from '../components/Fingerprint'
import { Camera } from '../components/Icons'
import { traceImage, type TraceResult } from '../api'

type Phase = 'idle' | 'reading' | 'matching'

function Row({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-[12px]">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-brand">{value}</span>
      </div>
      <div className="mt-1.5 h-1 bg-slate-200">
        <div className="h-full origin-left transition-[width] duration-700" style={{ width: `${pct}%`, background: 'var(--grad)' }} />
      </div>
    </div>
  )
}

export default function Trace() {
  const [file, setFile] = useState<File | null>(null)
  const [thumb, setThumb] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<TraceResult | null>(null)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) { setThumb(''); return }
    const u = URL.createObjectURL(file)
    setThumb(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  function pick(f: File | undefined) {
    if (!f) return
    setFile(f)
    setResult(null)
    setError('')
  }

  async function run() {
    if (!file) return
    setError('')
    setResult(null)
    setPhase('reading')
    const t = setTimeout(() => setPhase('matching'), 1500)
    try {
      setResult(await traceImage(file))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      clearTimeout(t)
      setPhase('idle')
    }
  }

  function download() {
    if (!result) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }))
    Object.assign(document.createElement('a'), { href: url, download: 'tracemark-evidence.json' }).click()
    URL.revokeObjectURL(url)
  }

  function again() {
    setFile(null)
    setResult(null)
    setError('')
    input.current?.click()
  }

  const busy = phase !== 'idle'
  const done = !!result && result.status !== 'retake'
  const s = result?.steps
  const conf = result?.ocr ? Math.round(result.ocr.confidence * 100) : 0
  const rows = [
    { label: 'Page found and straightened', value: done ? (s?.page_found ? 'done' : 'full photo') : '', pct: done ? 100 : busy ? 60 : 0 },
    { label: 'Text read', value: result ? `${conf}%` : '', pct: result ? 100 : phase === 'matching' ? 100 : 0 },
    { label: 'Questions matched (MiniLM + fuzzy)', value: done ? `${s?.questions_matched ?? 0} of ${result?.page_total ?? 5}` : '', pct: done ? 100 : phase === 'matching' ? 55 : 0 },
    { label: 'Compared with all papers', value: done ? String(s?.papers_compared ?? 5) : '', pct: done ? 100 : 0 },
  ]
  const centreIds = result?.ranking.map((r) => r.centre) ?? []

  return (
    <StepLayout step={3} back="/unlock">
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="mb-5 rise">
        <h1 className="m-0 text-[30px] font-bold tracking-tight">Trace a leak</h1>
        <p className="mt-1 mb-0 text-[13px] text-muted">Photograph a printed page with your phone and upload it. Keep the page flat and fill the frame.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-4">
          <section className="dark-panel p-4 rise">
            <div className="flex justify-between font-mono text-[10px] tracking-widest text-slate-400 mb-3">
              <span className="truncate pr-2">{file ? file.name.toUpperCase() : 'NO PHOTO'}</span>
              <span className="text-cyan-300 shrink-0">{result?.ocr ? `OCR ${conf}%` : busy ? 'SCANNING' : 'READY'}</span>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden bg-black/30 grid place-items-center">
              {file ? (
                <img src={thumb} alt="Uploaded page" className="max-h-full max-w-full object-contain" style={{ transform: 'rotate(-1.5deg) scale(.94)', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }} />
              ) : (
                <button
                  type="button"
                  className="w-full h-full bg-transparent border border-dashed border-white/25 text-slate-300 cursor-pointer hover:bg-white/5"
                  onClick={() => input.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}
                >
                  <Camera size={30} className="mx-auto text-cyan-300" />
                  <div className="mt-3 text-sm font-semibold text-white">Take or choose a photo</div>
                  <div className="mt-1 text-xs text-slate-400">On a phone this opens the camera. JPG or PNG.</div>
                </button>
              )}
              {busy && <div className="scanline" />}
              {done && result.questions.length > 0 && (
                <div className="absolute left-2 right-2 bottom-2 flex flex-wrap gap-1.5">
                  {result.questions.map((q) => (
                    <span key={q.number} className="pop font-mono text-[11px] font-bold px-1.5 py-0.5" style={{ background: VER_COLOR[q.version], color: q.version === 'C' ? '#1F2937' : '#fff' }}>
                      Q{q.number} {q.version}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="card p-4 space-y-3.5 rise" style={{ animationDelay: '80ms' }}>
            {rows.map((r) => <Row key={r.label} {...r} />)}
          </section>

          <div className="flex gap-3 rise" style={{ animationDelay: '140ms' }}>
            <button type="button" className="btn-outline" onClick={() => input.current?.click()}><Camera />{file ? 'New photo' : 'Photo'}</button>
            <button className="btn-leak flex-1" onClick={run} disabled={!file || busy}>
              {phase === 'reading' ? 'Reading the photo...' : phase === 'matching' ? 'Matching against 5 papers...' : 'Trace source'}
            </button>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          {error && <div role="alert" className="p-3 text-[13px] bg-alert-tint border border-alert-edge text-alert">{error}</div>}
          {!result && !error && (
            <div className="card grid-bg py-24 text-center rise">
              <h2 className="m-0 text-[24px] font-bold">{busy ? 'Working on it...' : 'Ready when you are'}</h2>
              <p className="mt-1.5 mb-0 text-[13px] text-muted">Upload a photo and press Trace source.</p>
            </div>
          )}
          {result && (
            <>
              <ResultCard result={result} onDownload={download} onAgain={again} />
              {result.status === 'traced' && result.top && (
                <EvidenceTable winner={result.top.centre} centres={centreIds} questions={result.questions} />
              )}
              {result.ocr && (
                <details className="card px-5 py-3 text-[13px]">
                  <summary className="cursor-pointer font-semibold">Text read from the photo</summary>
                  <pre className="mt-3 mb-0 whitespace-pre-wrap font-mono text-xs text-muted">{result.ocr.text}</pre>
                </details>
              )}
              {result.status === 'traced' && (
                <p className="m-0 text-xs text-faint">An investigative lead: an expert confirms the matches before action.</p>
              )}
            </>
          )}
        </div>
      </div>
    </StepLayout>
  )
}
