import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Arrow, Doc, Lock, Search } from '../components/Icons'
import { Strip } from '../components/Fingerprint'

const SAMPLE = [
  { id: 'C-01', code: 'BOCBAOCOAB' },
  { id: 'C-02', code: 'CCBOAOBBCA' },
  { id: 'C-03', code: 'BCAOBCCAAO' },
  { id: 'C-04', code: 'AOOBCAOOCB', hit: true },
  { id: 'C-05', code: 'ABOCAABCOB' },
]

const STATS = [
  { v: '89', l: 'paper leaks, 2014 to 2024', c: 'text-ink' },
  { v: '6.5 cr', l: 'candidates affected', c: 'text-ink' },
  { v: '22 lakh', l: 're-sat NEET-UG 2026', c: 'text-alert' },
]

const CARDS = [
  { n: 1, t: 'Create 5 papers', b: 'One click. Each centre gets its own mix of question versions, locked with 3 keys.', top: '#0E7490', Icon: Doc, tint: 'bg-brand-tint text-brand' },
  { n: 2, t: 'Unlock with 3 keys', b: 'Three officials, three keys. The PDF opens for printing only when all three match.', top: '#7C3AED', Icon: Lock, tint: 'bg-violet-50 text-ver-B' },
  { n: 3, t: 'Trace from a photo', b: 'Snap the leaked page on a phone. AI reads it and names the centre in seconds.', top: '#DC2626', Icon: Search, tint: 'bg-alert-tint text-alert' },
]

export default function Start() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header start />
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <section className="grid-bg border border-line p-6 md:p-10 grid lg:grid-cols-[1.05fr_1fr] gap-8 items-center overflow-hidden">
          <div className="rise">
            <span className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold text-brand bg-brand-tint border border-brand-edge">
              <span className="w-1.5 h-1.5 bg-brand pulse-cyan" />AI + cryptography against paper leaks
            </span>
            <h1 className="mt-5 mb-0 text-[40px] sm:text-[56px] leading-[1.04] font-bold tracking-tight">
              Every paper carries a <span className="text-grad">hidden fingerprint.</span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-muted max-w-[520px]">
              Each centre&rsquo;s paper tests the same thing but differs in tiny, invisible ways. Photograph a leaked
              copy and TraceMark names the centre it came from, so only one centre re-sits.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/papers" className="btn-grad h-12 px-6">Start the demo <Arrow /></Link>
              <Link to="/trace" className="btn-outline h-12 px-6">Jump to tracing</Link>
            </div>
            <div className="mt-7 grid grid-cols-3 bg-white border border-line max-w-[520px]">
              {STATS.map((s, i) => (
                <div key={s.l} className={`p-3.5 rise ${i ? 'border-l border-line' : ''}`} style={{ animationDelay: `${200 + i * 80}ms` }}>
                  <div className={`font-display text-[24px] font-bold leading-none ${s.c}`}>{s.v}</div>
                  <div className="mt-1.5 text-[11px] leading-snug text-faint">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="dark-panel p-5 rise" style={{ animationDelay: '120ms', boxShadow: '0 30px 60px -30px rgba(11,18,32,.6)' }}>
            <div className="flex justify-between font-mono text-[10px] tracking-widest text-slate-400">
              <span>TRACE / LEAKED PHOTO</span>
              <span className="text-cyan-300"><span className="inline-block w-1.5 h-1.5 bg-cyan-300 mr-1.5 pulse-cyan" />SCANNING</span>
            </div>
            <div className="mt-4 grid grid-cols-[120px_1fr] gap-4 items-center">
              <div className="relative h-[150px] bg-slate-100 p-2.5 floaty overflow-hidden">
                {[70, 90, 60, 80, 50, 85].map((w, i) => (
                  <div key={i} className="h-[5px] mb-2.5" style={{ width: `${w}%`, background: i === 2 ? '#F59E0B' : i === 4 ? '#7C3AED' : '#94A3B8' }} />
                ))}
                <div className="scanline" />
              </div>
              <div className="space-y-1.5">
                {SAMPLE.map((s, i) => (
                  <div key={s.id} className={`flex items-center gap-2.5 px-1.5 py-1 ${s.hit ? 'border border-alert bg-alert/10' : ''}`}>
                    <span className={`font-mono text-[10px] w-8 ${s.hit ? 'text-red-300 font-bold' : 'text-slate-400'}`}>{s.id}</span>
                    <Strip code={s.code} small baseDelay={300 + i * 120} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-end justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-slate-400">SOURCE IDENTIFIED</div>
                <div className="mt-1 font-display text-[20px] font-bold">C-04 · Rohini, Delhi</div>
              </div>
              <span className="font-mono text-[11px] font-bold text-white bg-alert px-2.5 py-1.5 pulse-red">MATCH 5/5</span>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-5">
          {CARDS.map((c, i) => (
            <div key={c.n} className="card lift p-5 rise" style={{ borderTop: `3px solid ${c.top}`, animationDelay: `${300 + i * 80}ms` }}>
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 grid place-items-center ${c.tint}`}><c.Icon size={18} /></span>
                <span className="eyebrow text-faint">Step {c.n}</span>
              </div>
              <h2 className="mt-3.5 mb-1.5 text-[18px] font-bold">{c.t}</h2>
              <p className="m-0 text-[13px] leading-relaxed text-muted">{c.b}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
