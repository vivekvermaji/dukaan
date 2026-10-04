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
