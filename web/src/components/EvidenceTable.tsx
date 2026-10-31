import type { TraceQuestion } from '../api'
import { VER_COLOR, VerChip } from './Fingerprint'

type Props = { winner: string; centres: string[]; questions: TraceQuestion[] }

export default function EvidenceTable({ winner, centres, questions }: Props) {
  const cols = [...centres].sort()
  const counts = cols.map((c) => questions.filter((q) => q.centres.includes(c)).length)
  return (
    <section className="card rise" style={{ animationDelay: '120ms' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-line">
        <h3 className="m-0 text-[15px] font-bold">Evidence grid</h3>
        <span className="text-[11px] text-faint">Filled square = that centre&rsquo;s paper has the version seen in the photo</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="w-[200px]" />
              {cols.map((c) => (
                <th
                  key={c}
                  className={`px-2 py-2.5 font-mono text-[12px] font-bold ${c === winner ? 'bg-alert text-white' : 'bg-page text-muted'}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, ri) => (
              <tr key={q.number} className="border-t border-line">
                <td className="px-5 py-2.5">
                  <span className="inline-flex items-center gap-2.5">
                    <span className="font-mono font-bold w-8">Q{q.number}</span>
                    <VerChip v={q.version} />
                  </span>
                </td>
                {cols.map((c, ci) => {
                  const on = q.centres.includes(c)
                  const win = c === winner
                  return (
                    <td key={c} className={`text-center py-2.5 ${win ? 'bg-alert-tint' : ''}`}>
                      {on && (
                        <span
                          className="pop inline-block w-[18px] h-[18px]"
                          style={{ background: win ? '#DC2626' : VER_COLOR[q.version], animationDelay: `${(ri * cols.length + ci) * 35}ms` }}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td className="px-5 py-2.5 text-[11px] font-semibold text-faint">Matches</td>
              {cols.map((c, i) => {
                const win = c === winner
                return (
                  <td key={c} className={`px-3 py-2.5 text-center ${win ? 'bg-alert-tint' : ''}`}>
                    <div className={`font-mono text-[12px] font-bold ${win ? 'text-alert' : 'text-muted'}`}>{counts[i]}/{questions.length}</div>
                    <div className="mt-1 h-1 bg-slate-200">
                      <div className="barfill h-full" style={{ width: `${(counts[i] / Math.max(1, questions.length)) * 100}%`, background: win ? '#DC2626' : '#94A3B8' }} />
                    </div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
