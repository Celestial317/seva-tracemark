export const VER_COLOR: Record<string, string> = { O: '#64748B', A: '#0E7490', B: '#7C3AED', C: '#F59E0B' }
export const VER_NAME: Record<string, string> = { O: 'Original', A: 'New wording', B: 'New numbers', C: 'New order' }
export const VER_LEGEND: [string, string][] = [['O', 'original'], ['A', 'new wording'], ['B', 'new numbers'], ['C', 'new option order']]

export function VerCell({ n, v, delay = 0, small }: { n?: number; v: string; delay?: number; small?: boolean }) {
  return (
    <span
      className={`pop inline-flex flex-col items-center justify-center font-mono font-bold leading-none ${small ? 'w-[18px] h-[22px] text-[9px]' : 'w-[30px] h-[38px] text-[13px]'}`}
      style={{ background: VER_COLOR[v], color: v === 'C' ? '#1F2937' : '#fff', animationDelay: `${delay}ms` }}
      title={`${n ? `Q${n}: ` : ''}${VER_NAME[v] ?? v}`}
    >
      {n !== undefined && !small && <span className="text-[8px] font-medium opacity-80 mb-0.5">Q{n}</span>}
      {v}
    </span>
  )
}

export function Strip({ code, small, baseDelay = 0 }: { code: string; small?: boolean; baseDelay?: number }) {
  return (
    <span className="inline-flex gap-[3px]">
      {code.split('').map((v, i) => (
        <VerCell key={i} n={i + 1} v={v} small={small} delay={baseDelay + i * 35} />
      ))}
    </span>
  )
}

export function VerChip({ v }: { v: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ background: VER_COLOR[v], color: v === 'C' ? '#1F2937' : '#fff' }}
    >
      {VER_NAME[v] ?? v}
    </span>
  )
}
