// Vercel serverless function. The OpenRouter key lives only in the OPENROUTER_API_KEY env var.
const MODELS = (process.env.OPENROUTER_MODELS ?? 'nvidia/nemotron-3-ultra:free,openai/gpt-oss-120b:free,meta-llama/llama-3.3-70b-instruct:free').split(',')

const SYSTEM = `You are the brain of "Dukaan", a voice assistant for Indian kirana shopkeepers. The user speaks Hindi/Hinglish.
Convert the utterance into ONE JSON object, nothing else. Schema:
{"type":"sale|udhaar|payment|stock_in|q_sales|q_udhaar|q_stock|undo|chat|unknown",
 "lines":[{"item":"<exact item name from list>","qty":number}],
 "customer":"<name as spoken>" | null,
 "amount":number | null,
 "credit":boolean,
 "range":"today|yesterday|week|month",
 "mode":"top|total" | null,
 "reply":"short Hinglish answer, only for type chat"}
Meanings: sale=goods sold (credit=true if sold on udhaar to a named customer); udhaar=add money owed by customer; payment=customer paid back money; stock_in=new stock arrived; q_*=questions about sales/udhaar/stock; undo=cancel last action.
Use "chat" only for general shop advice or small talk; keep reply under 25 words. If unclear use "unknown". Never invent items or amounts.`

export default async function handler(req: any, res: any) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method === 'GET') return res.status(process.env.OPENROUTER_API_KEY ? 200 : 503).json({ ok: !!process.env.OPENROUTER_API_KEY })
  if (req.method !== 'POST') return res.status(405).end()
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return res.status(503).json({ error: 'LLM not configured' })
  const { utterance, items, customers, today } = req.body ?? {}
  if (typeof utterance !== 'string' || utterance.length > 300) return res.status(400).json({ error: 'bad input' })
  const user = `Items: ${JSON.stringify((items ?? []).slice(0, 60))}\nCustomers: ${JSON.stringify((customers ?? []).slice(0, 60))}\nToday: ${today}\nUtterance: ${utterance}`
  for (const model of MODELS) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-title': 'Dukaan' },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 300, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
      })
      if (!r.ok) continue
      const j: any = await r.json()
      const text: string = j.choices?.[0]?.message?.content ?? ''
      const m = text.match(/\{[\s\S]*\}/)
      if (!m) continue
      return res.status(200).json(JSON.parse(m[0]))
    } catch { /* try next model */ }
  }
  return res.status(502).json({ error: 'all models failed' })
}
