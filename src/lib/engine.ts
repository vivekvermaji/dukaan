import type { Books, Card, Customer, Intent, Item, Outcome, Reply } from './types'
import { addLog, getState, mutate, pushSnapshot, undoLast, uid } from './store'
import { parse, setPending, fuzzyEq, tokenize } from './parser'
import { askLLM, llmEnabled } from './llm'

export const rupee = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const num = (n: number) => (Number.isInteger(n) ? String(n) : String(n))
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime() }

export function salesIn(b: Books, range: 'today' | 'yesterday' | 'week' | 'month') {
  const now = new Date()
  const t0 = startOfDay(now)
  let from = t0, to = Infinity
  if (range === 'yesterday') { from = t0 - 86400000; to = t0 }
  if (range === 'week') from = t0 - 6 * 86400000
  if (range === 'month') from = t0 - 29 * 86400000
  const sales = b.sales.filter((s) => s.ts >= from && s.ts < to)
  return { sales, total: sales.reduce((a, s) => a + s.total, 0) }
}

const find = {
  item: (b: Books, id: string) => b.items.find((i) => i.id === id)!,
  cust: (b: Books, id: string) => b.customers.find((c) => c.id === id)!,
}
const rangeWord = { today: ['aaj', 'आज'], yesterday: ['kal', 'कल'], week: ['is hafte', 'इस हफ़्ते'], month: ['is mahine', 'इस महीने'] }

function execute(intent: Intent, source: 'rules' | 'llm'): Outcome {
  const b = getState()
  const out = (reply: Reply, card?: Card, ok = true): Outcome => ({ intent: intent.type, reply, card, ok, source })

  switch (intent.type) {
    case 'sale': {
      const lines = intent.lines.filter((l) => l.qty > 0)
      // stock check: warn but still record (shop owner knows the shelf better than the app)
      const rows: [string, string][] = []
      let total = 0
      const low: Item[] = []
      pushSnapshot()
      mutate((d) => {
        for (const l of lines) {
          const it = d.items.find((i) => i.id === l.itemId)!
          it.qty = Math.max(0, it.qty - l.qty)
          if (it.qty <= it.reorder) low.push(it)
        }
        total = lines.reduce((a, l) => a + l.qty * find.item(b, l.itemId).price, 0)
        d.sales.push({
          id: uid(), ts: Date.now(), total, credit: intent.credit,
          customerId: intent.customerId,
          lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, price: find.item(b, l.itemId).price })),
        })
        if (intent.credit && intent.customerId) {
          const c = d.customers.find((x) => x.id === intent.customerId)!
          c.balance += total
          d.ledger.push({ id: uid(), ts: Date.now(), customerId: c.id, amount: total, kind: 'udhaar', note: 'Saaman udhaar' })
        }
      })
      lines.forEach((l) => rows.push([find.item(b, l.itemId).name, `${num(l.qty)} × ${rupee(find.item(b, l.itemId).price)}`]))
      rows.push(['Total', rupee(total)])
      const cust = intent.customerId ? find.cust(b, intent.customerId) : undefined
      const listR = lines.map((l) => `${num(l.qty)} ${find.item(b, l.itemId).name.split(' (')[0]}`).join(', ')
      const listH = lines.map((l) => `${num(l.qty)} ${find.item(b, l.itemId).hi}`).join(', ')
      let text = `Likh liya: ${listR} - ${rupee(total)}.`
      let speech = `लिख लिया: ${listH}, कुल ${total} रुपये।`
      if (intent.credit && cust) {
        const nb = cust.balance + total
        rows.push([`${cust.name} ka udhaar`, rupee(nb)])
        text += ` ${cust.name} ke khate me chadha diya, ab kul ${rupee(nb)} baaki.`
        speech += ` ${cust.hi} के खाते में चढ़ा दिया, अब कुल ${nb} रुपये बाकी।`
      }
      if (low.length) {
        text += ` Dhyan: ${low.map((i) => i.name.split(' (')[0]).join(', ')} kam bacha hai.`
        speech += ` ध्यान: ${low.map((i) => i.hi).join(', ')} कम बचा है।`
        low.forEach((i) => rows.push(['Stock kam', `${i.name.split(' (')[0]}: ${getState().items.find((x) => x.id === i.id)!.qty} bacha`]))
      }
      return out({ text, speech }, { kind: 'sale', title: intent.credit ? 'Udhaar sale darj' : 'Sale darj', rows, undoable: true, tone: 'ok' })
    }
    case 'udhaar': {
      const c = find.cust(b, intent.customerId)
      pushSnapshot()
      mutate((d) => {
        d.customers.find((x) => x.id === c.id)!.balance += intent.amount
        d.ledger.push({ id: uid(), ts: Date.now(), customerId: c.id, amount: intent.amount, kind: 'udhaar' })
      })
      const nb = c.balance + intent.amount
      return out(
        { text: `${c.name} ke khate me ${rupee(intent.amount)} udhaar likh diya. Ab kul ${rupee(nb)} baaki hai.`, speech: `${c.hi} के खाते में ${intent.amount} रुपये उधार लिख दिया। अब कुल ${nb} रुपये बाकी हैं।` },
        { kind: 'udhaar', title: 'Udhaar likha', rows: [['Customer', c.name], ['Naya udhaar', rupee(intent.amount)], ['Kul baaki', rupee(nb)]], undoable: true, tone: 'warn' })
    }
    case 'payment': {
      const c = find.cust(b, intent.customerId)
      const pay = Math.min(intent.amount, Math.max(c.balance, 0)) || intent.amount
      pushSnapshot()
      mutate((d) => {
        d.customers.find((x) => x.id === c.id)!.balance -= pay
        d.ledger.push({ id: uid(), ts: Date.now(), customerId: c.id, amount: -pay, kind: 'payment' })
      })
      const nb = c.balance - pay
      const extra = intent.amount > pay ? ` (${rupee(intent.amount - pay)} zyada tha, khate se utna hi kata)` : ''
      return out(
        { text: `${c.name} se ${rupee(pay)} mil gaye${extra}. ${nb > 0 ? `Ab ${rupee(nb)} baaki hai.` : 'Khata saaf!'}`, speech: `${c.hi} से ${pay} रुपये मिल गए। ${nb > 0 ? `अब ${nb} रुपये बाकी हैं।` : 'खाता साफ़!'}` },
        { kind: 'payment', title: 'Paisa mila', rows: [['Customer', c.name], ['Mile', rupee(pay)], ['Baaki', rupee(nb)]], undoable: true, tone: 'ok' })
    }
    case 'stock_in': {
      pushSnapshot()
      const rows: [string, string][] = []
      mutate((d) => {
        for (const l of intent.lines) {
          const it = d.items.find((i) => i.id === l.itemId)!
          it.qty += l.qty
          rows.push([it.name, `+${num(l.qty)} → ${it.qty}`])
        }
      })
      const listR = intent.lines.map((l) => `${num(l.qty)} ${find.item(b, l.itemId).name.split(' (')[0]}`).join(', ')
      const listH = intent.lines.map((l) => `${num(l.qty)} ${find.item(b, l.itemId).hi}`).join(', ')
      return out({ text: `Stock me jod diya: ${listR}.`, speech: `स्टॉक में जोड़ दिया: ${listH}।` },
        { kind: 'stock', title: 'Stock badha', rows, undoable: true, tone: 'ok' })
    }
    case 'q_sales': {
      const { sales, total } = salesIn(b, intent.range)
      const [rw, rh] = rangeWord[intent.range]
      const counts: Record<string, number> = {}
      sales.forEach((s) => s.lines.forEach((l) => (counts[l.itemId] = (counts[l.itemId] ?? 0) + l.qty)))
      const top = Object.entries(counts).sort((a, c) => c[1] - a[1])[0]
      const topItem = top ? find.item(b, top[0]) : undefined
      return out(
        { text: `${rw[0].toUpperCase() + rw.slice(1)} ${rupee(total)} ki sale hui, ${sales.length} bill.${topItem ? ` Sabse zyada ${topItem.name.split(' (')[0]} bika (${top[1]}).` : ''}`,
          speech: `${rh} ${total} रुपये की बिक्री हुई, ${sales.length} बिल।${topItem ? ` सबसे ज़्यादा ${topItem.hi} बिका (${top[1]})।` : ''}` },
        { kind: 'query', title: 'Sale report', rows: [['Kul sale', rupee(total)], ['Bill', String(sales.length)], ...(topItem ? [['Top item', `${topItem.name.split(' (')[0]} (${top[1]})`] as [string, string]] : [])], undoable: false, tone: 'info' })
    }
    case 'q_udhaar': {
      if (intent.customerId) {
        const c = find.cust(b, intent.customerId)
        return out({ text: c.balance > 0 ? `${c.name} ka ${rupee(c.balance)} baaki hai.` : `${c.name} ka kuch baaki nahi hai.`, speech: c.balance > 0 ? `${c.hi} का ${c.balance} रुपये बाकी है।` : `${c.hi} का कुछ बाकी नहीं है।` },
          { kind: 'query', title: c.name, rows: [['Baaki', rupee(c.balance)]], undoable: false, tone: 'info' })
      }
      const sorted = [...b.customers].sort((a, c) => c.balance - a.balance)
      const total = b.customers.reduce((a, c) => a + Math.max(0, c.balance), 0)
      if (intent.mode === 'top') {
        const t = sorted[0]
        return out({ text: `Sabse zyada udhaar ${t.name} ka hai - ${rupee(t.balance)}. Kul udhaar ${rupee(total)}.`, speech: `सबसे ज़्यादा उधार ${t.hi} का है, ${t.balance} रुपये। कुल उधार ${total} रुपये।` },
          { kind: 'query', title: 'Sabse zyada udhaar', rows: sorted.slice(0, 3).map((c) => [c.name, rupee(c.balance)] as [string, string]), undoable: false, tone: 'info' })
      }
      return out({ text: `Bazaar me kul ${rupee(total)} udhaar baaki hai, ${b.customers.filter((c) => c.balance > 0).length} logon ka.`, speech: `कुल ${total} रुपये उधार बाकी है, ${b.customers.filter((c) => c.balance > 0).length} लोगों का।` },
        { kind: 'query', title: 'Kul udhaar', rows: sorted.filter((c) => c.balance > 0).map((c) => [c.name, rupee(c.balance)] as [string, string]), undoable: false, tone: 'info' })
    }
    case 'q_stock': {
      if (intent.itemId) {
        const it = find.item(b, intent.itemId)
        return out({ text: `${it.name.split(' (')[0]} ${it.qty} ${it.unit} bacha hai${it.qty <= it.reorder ? ' - kam hai, mangwa lo.' : '.'}`, speech: `${it.hi} ${it.qty} बचा है${it.qty <= it.reorder ? ', कम है, मंगवा लो।' : '।'}` },
          { kind: 'query', title: it.name, rows: [['Bacha', `${it.qty} ${it.unit}`], ['Kam hone ka level', String(it.reorder)]], undoable: false, tone: it.qty <= it.reorder ? 'warn' : 'info' })
      }
      const low = b.items.filter((i) => i.qty <= i.reorder)
      return out(low.length
        ? { text: `${low.length} cheezein kam hain: ${low.map((i) => `${i.name.split(' (')[0]} (${i.qty})`).join(', ')}.`, speech: `${low.length} चीज़ें कम हैं: ${low.map((i) => `${i.hi} ${i.qty}`).join(', ')}।` }
        : { text: 'Sab kuch theek se stock me hai.', speech: 'सब कुछ ठीक से स्टॉक में है।' },
        { kind: 'query', title: 'Kam stock', rows: low.map((i) => [i.name, `${i.qty} / ${i.reorder}`] as [string, string]), undoable: false, tone: low.length ? 'warn' : 'ok' })
    }
    case 'undo': {
      const ok = undoLast()
      return out(ok ? { text: 'Theek hai, pichla kaam wapas kar diya.', speech: 'ठीक है, पिछला काम वापस कर दिया।' } : { text: 'Wapas karne ko kuch nahi mila.', speech: 'वापस करने को कुछ नहीं मिला।' },
        ok ? { kind: 'undo', title: 'Wapas kiya', rows: [['Status', 'Pichla action undo ho gaya']], undoable: false, tone: 'info' } : undefined, ok)
    }
    case 'new_customer_needed': {
      const name = intent.name[0].toUpperCase() + intent.name.slice(1)
      const id = 'c-' + uid()
      pushSnapshot()
      mutate((d) => {
        d.customers.push({ id, name, hi: name, aliases: [intent.name.toLowerCase()], balance: 0, since: Date.now(), phone: '', code: String(1000 + Math.floor(Math.random() * 9000)) })
      })
      const r = execute({ type: intent.then, customerId: id, amount: intent.amount } as Intent, source)
      r.reply.text = `Naya khata khola: ${name}. ` + r.reply.text
      r.reply.speech = `नया खाता खोला: ${name}। ` + r.reply.speech
      return r
    }
    case 'clarify':
      setPending({ resume: intent.resume, options: intent.options })
      return out({ text: intent.question, speech: intent.speech }, { kind: 'ask', title: 'Pooch raha hu', rows: intent.options.map((o, i) => [String(i + 1), o.label] as [string, string]), undoable: false, tone: 'info' }, true)
    case 'chat':
      return out({ text: intent.reply, speech: intent.reply }, undefined, true)
    default:
      return out({ text: 'Samajh nahi aaya. Aise bol ke dekho: "2 doodh aur 1 bread becho", "Ramesh ka 500 udhaar likh do", "aaj kitni sale hui?"', speech: 'समझ नहीं आया। ऐसे बोलकर देखो: दो दूध और एक ब्रेड बेचो, या रमेश का पाँच सौ उधार लिख दो।' }, undefined, false)
  }
}

/** Map names the LLM returns onto real ids, using the same fuzzy rules as the offline parser. */
export function resolveLLM(raw: any, b: Books): Intent {
  const item = (n: string) => { const t = tokenize(String(n)); return b.items.find((i) => i.name.toLowerCase().startsWith(String(n).toLowerCase()) || t.some((x) => i.aliases.some((a) => fuzzyEq(x, a)))) }
  const cust = (n: string): Customer[] => {
    const t = tokenize(String(n))
    const sc = b.customers.map((c) => ({ c, s: t.filter((x) => c.aliases.some((a) => fuzzyEq(x, a))).length })).filter((x) => x.s)
    const m = Math.max(0, ...sc.map((x) => x.s)); return sc.filter((x) => x.s === m).map((x) => x.c)
  }
  const lines = (Array.isArray(raw.lines) ? raw.lines : []).map((l: any) => ({ it: item(l.item), qty: Number(l.qty) || 1 })).filter((l: any) => l.it).map((l: any) => ({ itemId: l.it.id, qty: l.qty }))
  const amount = Number(raw.amount)
  const cs = raw.customer ? cust(raw.customer) : []
  const needC = (resume: Intent): Intent | null => {
    if (cs.length > 1) return { type: 'clarify', resume, options: cs.map((c) => ({ label: c.name, customerId: c.id })), question: `Kaun sa ${cs[0].name.split(' ')[0]}? ${cs.map((c) => c.name).join(' ya ')}?`, speech: `कौन सा ${cs[0].hi.split(' ')[0]}? ${cs.map((c) => c.hi).join(' या ')}?` }
    return null
  }
  switch (raw.type) {
    case 'sale': if (!lines.length) return { type: 'unknown' }
      if (raw.credit && !cs.length) return { type: 'unknown' }
      return needC({ type: 'sale', lines, credit: !!raw.credit }) ?? { type: 'sale', lines, customerId: cs[0]?.id, credit: !!raw.credit || undefined }
    case 'udhaar': case 'payment':
      if (!(amount > 0)) return { type: 'unknown' }
      if (!cs.length) return raw.customer && raw.type === 'udhaar' ? { type: 'new_customer_needed', name: String(raw.customer).split(' ')[0].toLowerCase(), then: 'udhaar', amount } : { type: 'unknown' }
      return needC({ type: raw.type, customerId: '', amount }) ?? { type: raw.type, customerId: cs[0].id, amount }
    case 'stock_in': return lines.length ? { type: 'stock_in', lines } : { type: 'unknown' }
    case 'q_sales': return { type: 'q_sales', range: ['today', 'yesterday', 'week', 'month'].includes(raw.range) ? raw.range : 'today' }
    case 'q_udhaar': return cs.length === 1 ? { type: 'q_udhaar', customerId: cs[0].id } : { type: 'q_udhaar', mode: raw.mode === 'top' ? 'top' : 'total' }
    case 'q_stock': return { type: 'q_stock', itemId: lines[0]?.itemId }
    case 'undo': return { type: 'undo' }
    case 'chat': return typeof raw.reply === 'string' && raw.reply ? { type: 'chat', reply: raw.reply } : { type: 'unknown' }
    default: return { type: 'unknown' }
  }
}

export async function handle(text: string): Promise<Outcome> {
  const clean = text.trim()
  const books = getState()
  let { intent, confidence } = parse(clean, books)
  let source: 'rules' | 'llm' = 'rules'
  if ((intent.type === 'unknown' || confidence < 0.7) && llmEnabled()) {
    try {
      const raw = await askLLM(clean, books)
      const li = resolveLLM(raw, getState())
      if (li.type !== 'unknown') { intent = li; source = 'llm' }
    } catch { /* offline parser result stands */ }
  }
  const res = execute(intent, source)
  addLog({ utterance: clean, intent: intent.type, reply: res.reply.text, ok: res.ok, source, undoable: !!res.card?.undoable })
  return res
}

export { execute }
