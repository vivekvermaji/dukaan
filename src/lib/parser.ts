import type { Books, Customer, Intent, Item } from './types'

// ---------- tokens ----------
export const tokenize = (s: string): string[] =>
  (s.toLowerCase().replace(/₹/g, ' ').match(/[\p{L}\p{M}\p{N}]+/gu) ?? [])

export function lev(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m || !n) return Math.max(m, n)
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}

/** token matches alias exactly, or within 1 edit for words of 5+ letters (Roman only). */
export const fuzzyEq = (tok: string, alias: string): boolean => {
  if (tok === alias) return true
  if (/[^\x00-\x7f]/.test(tok) || tok.length < 5 || alias.length < 5) return false
  return lev(tok, alias) <= 1
}

// ---------- numbers ----------
const NUM: Record<string, number> = {
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, pandrah: 15, bees: 20, pachees: 25, tees: 30, chalis: 40, pachas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90,
  dedh: 1.5, dhai: 2.5, adhai: 2.5, aadha: 0.5, aadhi: 0.5,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'पंद्रह': 15, 'बीस': 20, 'पच्चीस': 25, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  'डेढ़': 1.5, 'ढाई': 2.5, 'आधा': 0.5,
}
const MULT: Record<string, number> = { sau: 100, 'सौ': 100, hazaar: 1000, hazar: 1000, 'हज़ार': 1000, 'हजार': 1000 }
export const UNITS = new Set(['packet', 'pkt', 'packets', 'kilo', 'kg', 'litre', 'liter', 'dabba', 'dozen', 'piece', 'pcs', 'bottle', 'cup', 'bag',
  'पैकेट', 'किलो', 'लीटर', 'डिब्बा', 'दर्जन', 'बोतल'])
const RUPEE = new Set(['rupaye', 'rupay', 'rupee', 'rupees', 'rs', 'inr', 'रुपये', 'रुपए', 'रुपया', 'rupya'])

export type Num = { value: number; start: number; end: number }

export function parseNumbers(toks: string[], isItemTok: (i: number) => boolean): Num[] {
  const out: Num[] = []
  let i = 0
  const val = (t: string): number | null => {
    if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t)
    const m = t.match(/^(\d+)(rs|rupaye)$/); if (m) return parseInt(m[1])
    if (t in NUM) return NUM[t]
    return null
  }
  while (i < toks.length) {
    const t = toks[i]
    const v = val(t)
    const mult = MULT[t]
    if (v === null && mult === undefined) { i++; continue }
    // 'do' is also the verb "give" (likh do). Count it as 2 only before an item, unit, rupee word or multiplier.
    if ((t === 'do' || t === 'दो') ) {
      const nx = toks[i + 1]
      if (!(nx && (isItemTok(i + 1) || UNITS.has(nx) || RUPEE.has(nx) || MULT[nx] !== undefined))) { i++; continue }
    }
    let total = 0, cur = 0, j = i, any = false
    while (j < toks.length) {
      const tj = toks[j]
      const vj = val(tj)
      if (vj !== null && !(any && vj >= 100 && cur % 1000 !== 0 && false)) {
        if ((tj === 'do' || tj === 'दो') && j !== i) break
        // a plain number right after another plain number is a new number ("2 3")
        if (any && /^\d/.test(tj)) break
        cur += vj; any = true; j++
      } else if (MULT[tj] !== undefined) {
        const m = MULT[tj]
        if (m === 100) cur = (cur || 1) * 100
        else { total += (cur || 1) * 1000; cur = 0 }
        any = true; j++
      } else break
    }
    out.push({ value: total + cur, start: i, end: j })
    i = j
  }
  return out
}

// ---------- word lists ----------
const has = (toks: string[], words: string[]) => toks.some((t) => words.includes(t))
const W = {
  undo: ['undo', 'cancel', 'रद्द', 'ulta', 'उल्टा'],
  undoPhrase: ['wapas', 'वापस', 'hata', 'हटा', 'delete', 'mita', 'मिटा'],
  udhaar: ['udhaar', 'udhar', 'uadhar', 'उधार', 'khata', 'खाता', 'खाते', 'baaki', 'baki', 'बाकी'],
  udhaarWrite: ['likh', 'likhdo', 'लिख', 'chadha', 'चढ़ा', 'add', 'jodo', 'जोड़', 'jod', 'daal', 'डाल'],
  pay: ['diye', 'diya', 'diyee', 'दिए', 'दिये', 'दिया', 'jama', 'जमा', 'chukaye', 'chukaya', 'चुकाए', 'चुकाया', 'paid', 'de', 'दे', 'mile', 'मिले', 'lauta', 'लौटा', 'wapas', 'वापस'],
  sale: ['becho', 'beche', 'bech', 'bechna', 'bika', 'bike', 'बेचो', 'बेचा', 'बिका', 'बिके', 'sold', 'sale', 'diya', 'dena', 'do', 'दो', 'दिया', 'de', 'दे'],
  stockIn: ['aaya', 'aayi', 'aaye', 'aya', 'आया', 'आई', 'आए', 'mangwaya', 'mangwa', 'मंगवाया', 'jodo', 'जोड़ो', 'stock', 'restock', 'received', 'mila', 'मिला'],
  question: ['kitna', 'kitni', 'kitne', 'kaun', 'kiska', 'kiski', 'kya', 'batao', 'bata', 'bolo', 'dikhao', 'dikha', 'कितना', 'कितनी', 'कितने', 'कौन', 'किसका', 'क्या', 'बताओ', 'बता', 'दिखाओ', 'how', 'what', 'who'],
  salesQ: ['sale', 'bikri', 'बिक्री', 'kamai', 'कमाई', 'income', 'collection', 'gala', 'गल्ला', 'bika', 'बिका', 'hui', 'hua', 'हुई', 'हुआ'],
  stockQ: ['bacha', 'bachi', 'bache', 'बचा', 'बची', 'बचे', 'stock', 'khatam', 'ख़त्म', 'खत्म', 'kam', 'कम', 'low', 'baki', 'bacha', 'remaining'],
  top: ['sabse', 'zyada', 'jyada', 'सबसे', 'ज्यादा', 'zyaada', 'most', 'highest', 'top'],
  total: ['total', 'kul', 'कुल', 'sabka', 'saara', 'sara', 'सबका', 'सारा'],
  nameParticle: ['ka', 'ko', 'ne', 'ki', 'se', 'ke', 'का', 'को', 'ने', 'की', 'से', 'के'],
  today: ['aaj', 'आज', 'today'], yesterday: ['kal', 'कल', 'yesterday', 'beeta'],
  week: ['hafte', 'hafta', 'haftे', 'हफ्ते', 'हफ़्ता', 'सप्ताह', 'week', 'saptah'], month: ['mahine', 'mahina', 'महीने', 'महीना', 'month'],
  confirm: ['haan', 'han', 'ha', 'हाँ', 'हां', 'yes', 'theek', 'ठीक'],
}

// ---------- matching ----------
const itemMatch = (tok: string, it: Item) => it.aliases.some((a) => fuzzyEq(tok, a))

function customerCandidates(toks: string[], customers: Customer[]): { c: Customer; score: number }[] {
  const scored = customers.map((c) => {
    let score = 0
    for (const t of toks) if (c.aliases.some((a) => a === t || fuzzyEq(t, a))) score++
    return { c, score }
  }).filter((x) => x.score > 0)
  const max = Math.max(0, ...scored.map((x) => x.score))
  return scored.filter((x) => x.score === max)
}

// Name used before ka/ko/ne/ki when nobody in the khata matches (becomes a new customer).
function unknownNameBeforeParticle(toks: string[], numAt: Set<number>, itemAt: Set<number>): string | null {
  for (let i = 1; i < toks.length; i++) {
    if (W.nameParticle.includes(toks[i]) && !numAt.has(i - 1) && !itemAt.has(i - 1)) {
      const t = toks[i - 1]
      if (t.length >= 3 && !W.question.includes(t) && !W.udhaar.includes(t) && !UNITS.has(t) && !RUPEE.has(t)) return t
    }
  }
  return null
}

export type Pending = { resume: Intent; options: { label: string; customerId: string }[] } | null
let pending: Pending = null
export const setPending = (p: Pending) => { pending = p }
export const getPending = () => pending

function withCustomer(i: Intent, customerId: string): Intent {
  if (i.type === 'udhaar' || i.type === 'payment' || i.type === 'sale' || i.type === 'q_udhaar') return { ...i, customerId } as Intent
  return i
}

export function parse(text: string, books: Books): { intent: Intent; confidence: number } {
  const toks = tokenize(text)
  if (!toks.length) return { intent: { type: 'unknown' }, confidence: 0 }

  // answer to a pending "kaun sa Ramesh?"
  if (pending) {
    const p = pending
    const ord = toks.some((t) => ['pehla', 'pehle', 'first', '1', 'पहला', 'ek'].includes(t)) ? 0
      : toks.some((t) => ['dusra', 'doosra', 'second', '2', 'दूसरा', 'do'].includes(t)) ? 1 : -1
    let pick = -1
    const cands = p.options.map((o) => books.customers.find((c) => c.id === o.customerId)!)
    const hit = cands.map((c, idx) => ({ idx, s: toks.filter((t) => c.aliases.some((a) => a === t || fuzzyEq(t, a))).length }))
    const best = Math.max(...hit.map((h) => h.s))
    if (best > 0 && hit.filter((h) => h.s === best).length === 1) pick = hit.find((h) => h.s === best)!.idx
    else if (ord >= 0 && ord < p.options.length) pick = ord
    if (pick >= 0) {
      pending = null
      return { intent: withCustomer(p.resume, p.options[pick].customerId), confidence: 0.95 }
    }
    pending = null // did not answer the question; treat as a fresh command
  }

  if (has(toks, W.undo) || (has(toks, W.undoPhrase) && has(toks, ['karo', 'kar', 'do', 'दो', 'करो', 'wo', 'woh', 'vo', 'ye', 'last', 'pichla', 'पिछला'])
      && !has(toks, W.pay.filter((x) => x !== 'wapas' && x !== 'वापस')) && !books.customers.some((c) => toks.some((t) => c.aliases.includes(t)))))
    return { intent: { type: 'undo' }, confidence: 0.9 }

  // ---- items and quantities ----
  const itemHits: { idx: number; item: Item }[] = []
  toks.forEach((t, i) => { const it = books.items.find((x) => itemMatch(t, x)); if (it) itemHits.push({ idx: i, item: it }) })
  const itemAt = new Set(itemHits.map((h) => h.idx))
  const nums = parseNumbers(toks, (i) => itemAt.has(i))
  const numAt = new Set<number>(); nums.forEach((n) => { for (let k = n.start; k < n.end; k++) numAt.add(k) })

  const used = new Set<Num>()
  const lines: { itemId: string; qty: number }[] = []
  for (const h of itemHits) {
    let qty = 1
    // number right before (skipping a unit word) wins; otherwise a number right after, unless it is a price ("Maggi 14 ka")
    let before = nums.find((n) => !used.has(n) && (n.end === h.idx || (n.end === h.idx - 1 && UNITS.has(toks[h.idx - 1]))))
    if (!before) before = nums.find((n) => !used.has(n) && n.end === h.idx - 1 && UNITS.has(toks[h.idx - 1]))
    const after = nums.find((n) => !used.has(n) && n.start === h.idx + 1 || (!used.has(n) && n.start === h.idx + 2 && UNITS.has(toks[h.idx + 1])))
    const priceAfter = after && (W.nameParticle.includes(toks[after.end] ?? '') || RUPEE.has(toks[after.end] ?? '') )
    if (before) { qty = before.value; used.add(before) }
    else if (after && !priceAfter) { qty = after.value; used.add(after) }
    const ex = lines.find((l) => l.itemId === h.item.id)
    if (ex) ex.qty += qty; else lines.push({ itemId: h.item.id, qty })
  }
  const spare = nums.filter((n) => !used.has(n))
  // an amount is the spare number nearest a rupee word, else the first spare number
  const rupeeIdx = toks.findIndex((t) => RUPEE.has(t))
  const amountNum = rupeeIdx >= 0
    ? spare.find((n) => n.end === rupeeIdx) ?? spare[0]
    : spare[0]
  const amount = amountNum?.value

  // ---- customer ----
  const nameToks = toks.filter((_, i) => !numAt.has(i) && !itemAt.has(i))
  const cands = customerCandidates(nameToks, books.customers)

  const isQ = has(toks, W.question) || /\?|कितन|कौन/.test(text)
  const range: 'today' | 'yesterday' | 'week' | 'month' = has(toks, W.week) ? 'week' : has(toks, W.month) ? 'month' : has(toks, W.yesterday) && !has(toks, W.today) ? 'yesterday' : 'today'

  const needCustomer = (resume: Intent): { intent: Intent; confidence: number } | null => {
    if (cands.length === 1) return null
    if (cands.length > 1) {
      const options = cands.map(({ c }) => ({ label: c.name, customerId: c.id }))
      const q = options.map((o) => o.label)
      return {
        confidence: 0.9,
        intent: {
          type: 'clarify', resume, options,
          question: `Kaun sa ${cands[0].c.name.split(' ')[0]}? ${q.join(' ya ')}?`,
          speech: `कौन सा ${cands[0].c.hi.split(' ')[0]}? ${cands.map(({ c }) => c.hi).join(' या ')}?`,
        },
      }
    }
    return null
  }

  // ---- restock ----
  if (lines.length && has(toks, W.stockIn) && !isQ && !has(toks, W.udhaar))
    return { intent: { type: 'stock_in', lines }, confidence: 0.85 }

  // ---- queries ----
  if (!lines.length || isQ) {
    if (has(toks, W.top) && (has(toks, W.udhaar) || has(toks, W.question)) && !cands.length)
      return { intent: { type: 'q_udhaar', mode: 'top' }, confidence: 0.85 }
    if ((has(toks, W.udhaar) || (isQ && cands.length)) && amount === undefined && !has(toks, W.salesQ.filter((x) => x !== 'baki'))) {
      if (cands.length) { const nc = needCustomer({ type: 'q_udhaar' }); return nc ?? { intent: { type: 'q_udhaar', customerId: cands[0].c.id }, confidence: 0.9 } }
      if (has(toks, W.total) || isQ) return { intent: { type: 'q_udhaar', mode: 'total' }, confidence: 0.75 }
    }
    if (isQ && has(toks, W.salesQ) && !has(toks, W.stockQ.filter((x) => !['baki'].includes(x))))
      return { intent: { type: 'q_sales', range }, confidence: 0.85 }
    if (has(toks, ['bikri', 'बिक्री', 'kamai', 'कमाई', 'gala', 'गल्ला', 'income', 'collection']) || (has(toks, ['sale']) && isQ))
      return { intent: { type: 'q_sales', range }, confidence: 0.8 }
    if (has(toks, W.stockQ) && (isQ || !lines.length)) {
      if (lines.length) return { intent: { type: 'q_stock', itemId: lines[0].itemId }, confidence: 0.85 }
      if (has(toks, ['khatam', 'ख़त्म', 'खत्म', 'kam', 'कम', 'low', 'stock']) || isQ) return { intent: { type: 'q_stock' }, confidence: 0.75 }
    }
  }

  // ---- udhaar / payment (money, no goods) ----
  const unk = unknownNameBeforeParticle(toks, numAt, itemAt)
  const udhaarWord = has(toks, W.udhaar.filter((x) => !['baki', 'baaki', 'बाकी'].includes(x)))
  const payWord = has(toks, W.pay)
  if (!lines.length && amount !== undefined && amount > 0) {
    if (udhaarWord || (has(toks, W.udhaarWrite) && !payWord)) {
      if (cands.length) { const nc = needCustomer({ type: 'udhaar', customerId: '', amount }); return nc ?? { intent: { type: 'udhaar', customerId: cands[0].c.id, amount }, confidence: 0.92 } }
      if (unk) return { intent: { type: 'new_customer_needed', name: unk, then: 'udhaar', amount }, confidence: 0.7 }
    }
    if (payWord && !udhaarWord) {
      if (cands.length) { const nc = needCustomer({ type: 'payment', customerId: '', amount }); return nc ?? { intent: { type: 'payment', customerId: cands[0].c.id, amount }, confidence: 0.9 } }
    }
  }

  // ---- sale (goods) ----
  if (lines.length && !isQ) {
    const credit = udhaarWord || (has(toks, W.udhaarWrite) && cands.length > 0)
    if (credit && cands.length === 0) return { intent: { type: 'unknown' }, confidence: 0.3 }
    const base: Intent = { type: 'sale', lines, customerId: cands.length === 1 ? cands[0].c.id : undefined, credit: credit || undefined }
    if (credit) { const nc = needCustomer({ ...base, customerId: undefined }); if (nc) return nc }
    const conf = has(toks, W.sale) ? 0.9 : 0.65
    return { intent: base, confidence: conf }
  }

  return { intent: { type: 'unknown' }, confidence: 0 }
}
