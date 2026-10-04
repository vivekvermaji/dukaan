import type { Books } from './types'

const API = import.meta.env.VITE_API_URL ?? '/api/agent'
let available: boolean | null = null

export const llmEnabled = () => available !== false
export const llmStatus = () => available

/** Ask the serverless proxy (holds the OpenRouter key) to turn a messy sentence into a structured action. */
export async function askLLM(utterance: string, b: Books): Promise<any> {
  const ctx = {
    utterance,
    items: b.items.map((i) => i.name),
    customers: b.customers.map((c) => `${c.name} (baaki ₹${c.balance})`),
    today: new Date().toISOString().slice(0, 10),
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12000)
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ctx), signal: ctrl.signal })
    if (!r.ok) { if (r.status === 404 || r.status === 405) available = false; throw new Error('llm ' + r.status) }
    available = true
    return await r.json()
  } finally { clearTimeout(t) }
}

export async function probeLLM() {
  try { const r = await fetch(API, { method: 'GET' }); const j = await r.json().catch(() => null); available = r.ok && j?.ok === true } catch { available = false }
  return available
}

export type SaathiReply = { reply: string; actions: string[] }
/** Friendly owner chat: explains the day in simple Hinglish and can turn "aaj ye ye hua" into short commands. */
export async function askSaathi(message: string, digest: string, history: { who: 'me' | 'bot'; text: string }[], b: Books): Promise<SaathiReply> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 18000)
  try {
    const r = await fetch(API, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({
        mode: 'saathi', message, digest, history: history.slice(-6),
        items: b.items.map((i) => i.name), customers: b.customers.map((c) => c.name),
      }),
    })
    if (!r.ok) throw new Error('saathi ' + r.status)
    const j = await r.json()
    if (typeof j?.reply !== 'string') throw new Error('saathi bad reply')
    return j
  } finally { clearTimeout(t) }
}
