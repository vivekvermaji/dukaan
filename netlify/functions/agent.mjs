// Netlify function. The OpenRouter key lives only in the OPENROUTER_API_KEY environment variable.
const MODELS = (process.env.OPENROUTER_MODELS || 'nvidia/nemotron-3-ultra-550b-a55b:free,nvidia/nemotron-3-super-120b-a12b:free,google/gemma-4-31b-it:free,qwen/qwen3.8-27b:free').split(',')

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

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })

export default async (req) => {
  const key = process.env.OPENROUTER_API_KEY
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } })
  if (req.method === 'GET') return json({ ok: !!key }, key ? 200 : 503)
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  if (!key) return json({ error: 'LLM not configured' }, 503)
  let body
  try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
  const { utterance, items, customers, today } = body || {}
  if (typeof utterance !== 'string' || utterance.length > 300) return json({ error: 'bad input' }, 400)
  const user = `Items: ${JSON.stringify((items || []).slice(0, 60))}\nCustomers: ${JSON.stringify((customers || []).slice(0, 60))}\nToday: ${today}\nUtterance: ${utterance}`
  for (const model of MODELS) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-title': 'Dukaan' },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 300, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
      })
      if (!r.ok) continue
      const j = await r.json()
      const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''
      const m = text.match(/\{[\s\S]*\}/)
      if (!m) continue
      return json(JSON.parse(m[0]))
    } catch (e) { /* try next model */ }
  }
  return json({ error: 'all models failed' }, 502)
}
