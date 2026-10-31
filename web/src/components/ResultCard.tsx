import type { TraceResult } from '../api'

type Props = { result: TraceResult; onDownload: () => void; onAgain: () => void }

function Ring({ value, total }: { value: number; total: number }) {
  const r = 38, len = 2 * Math.PI * r
  const off = len * (1 - Math.min(1, value / Math.max(1, total)))
  return (
    <div className="relative w-[104px] h-[104px] shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#FECACA" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="#DC2626" strokeWidth="9" strokeDasharray={len}
          strokeDashoffset={off} className="ringdraw" style={{ ['--len' as string]: len, ['--off' as string]: off }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-[24px] font-bold leading-none">{value}/{total}</div>
          <div className="mt-0.5 text-[10px] text-faint">questions</div>
        </div>
      </div>
    </div>
  )
}

export default function ResultCard({ result, onDownload, onAgain }: Props) {
  if (result.status === 'traced' && result.top) {
    const all = result.questions.length > 0 && result.questions.every((q) => q.centres.includes(result.top!.centre))
    const unique = all && result.questions.reduce<string[]>((a, q) => a.filter((c) => q.centres.includes(c)), result.questions[0].centres).length === 1
    return (
      <section className="rise p-6 border-2 border-alert" style={{ background: 'linear-gradient(135deg,#fff 55%,#FEF2F2)', boxShadow: '0 20px 50px -24px rgba(220,38,38,.55)' }}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <span className="inline-block font-mono text-[11px] font-bold tracking-widest text-white bg-alert px-2.5 py-1 pulse-red">LEAK TRACED</span>
            <h2 className="mt-3 mb-0 font-display text-[44px] sm:text-[64px] leading-none font-bold tracking-tight">{result.top.centre}</h2>
            <p className="mt-2 mb-0 text-[14px] text-muted">
              {result.top.city} · {unique ? 'only this centre matches every question' : 'best match across the questions read'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div>
                <div className="text-[11px] text-faint">Confidence</div>
                <div className="font-display text-[22px] font-bold text-alert leading-tight">{result.top.confidence}</div>
              </div>
              <button className="btn-dark" onClick={onDownload}>Download evidence</button>
            </div>
          </div>
          <Ring value={result.questions_read ?? 0} total={result.page_total ?? 5} />
        </div>
      </section>
    )
  }
  const retake = result.status === 'retake'
  const n = result.questions_read ?? 0
  return (
    <section className="card rise p-6 border-t-[3px] border-t-slate-400">
      <div className="eyebrow text-faint">{retake ? 'Photo unclear' : 'Not enough evidence'}</div>
      <h2 className="mt-2 mb-0 text-[28px] font-bold">{retake ? 'Retake the photo' : 'No centre named'}</h2>
      <p className="mt-2 mb-0 text-[13px] text-muted max-w-[480px]">
        {retake
          ? result.message
          : `Only ${n} question${n === 1 ? '' : 's'} could be read, and at least 2 to 3 are needed to name a centre safely. Photograph the whole page, flat and in good light.`}
      </p>
      <div className="mt-5"><button className="btn-outline" onClick={onAgain}>Trace another photo</button></div>
    </section>
  )
}
