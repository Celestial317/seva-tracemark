export type Centre = { id: string; city: string; code: string; status?: string }
export type KeyRow = { role: string; key: string }
export type CreatedCentre = Centre & { keys: KeyRow[] }

export type TraceQuestion = {
  number: number
  version: string
  label: string
  probability: number
  centres: string[]
}
export type TraceResult = {
  status: 'traced' | 'inconclusive' | 'retake'
  message?: string
  confidence?: string
  margin?: number
  questions_read?: number
  page_total?: number
  top: { centre: string; city: string; confidence: string; margin: number } | null
  ranking: { centre: string; city?: string; bar: number; label: string; score?: number }[]
  questions: TraceQuestion[]
  ocr?: { text: string; confidence: number; lines: number }
  steps: { page_found?: boolean; text_read?: number; questions_matched?: number; papers_compared?: number }
}

// Keys are shown once. They live only in memory for this tab and are gone on reload.
const keyStore: Record<string, KeyRow[]> = {}
export const rememberKeys = (centres: CreatedCentre[]) => {
  for (const c of centres) keyStore[c.id] = c.keys
}
export const keysFor = (id: string): KeyRow[] | undefined => keyStore[id]

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let msg = `Request failed (${r.status})`
    try {
      const body = await r.json()
      msg = body.error ?? body.detail ?? msg
    } catch { /* keep default */ }
    throw new Error(msg)
  }
  return r.json()
}

export const listPapers = () =>
  fetch('/api/papers').then((r) => json<{ created: boolean; centres: Centre[] }>(r))

export const createPapers = () =>
  fetch('/api/papers/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ centres: 5 }),
  }).then((r) => json<{ centres: CreatedCentre[] }>(r))

export type UnlockOutcome =
  | { ok: true; blob: Blob }
  | { ok: false; status: number; error: string; retryAfter?: number }

export async function unlock(centreId: string, keys: string[]): Promise<UnlockOutcome> {
  const r = await fetch(`/api/papers/${centreId}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  })
  if (r.ok) return { ok: true, blob: await r.blob() }
  let body: { error?: string; retry_after?: number } = {}
  try { body = await r.json() } catch { /* ignore */ }
  return { ok: false, status: r.status, error: body.error ?? 'Could not unlock.', retryAfter: body.retry_after }
}

export const traceImage = (file: File) => {
  const fd = new FormData()
  fd.append('image', file)
  return fetch('/api/trace', { method: 'POST', body: fd }).then((r) => json<TraceResult>(r))
}
