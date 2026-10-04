import type { Books, Payment } from './types'
import { rupee, salesIn } from './engine'

const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }

/** Compact facts about the shop that the chat companion can talk about. Plain text, no secrets. */
export function buildDigest(b: Books, payments: Payment[] = []) {
  const t0 = day0()
  const today = salesIn(b, 'today'), yest = salesIn(b, 'yesterday'), week = salesIn(b, 'week')
  const itemName = (id: string) => b.items.find((i) => i.id === id)?.name ?? '?'
  const custName = (id?: string) => b.customers.find((c) => c.id === id)?.name ?? ''
  const sold = new Map<string, number>()
  today.sales.forEach((s) => s.lines.forEach((l) => sold.set(l.itemId, (sold.get(l.itemId) || 0) + l.qty)))
  const givenToday = b.ledger.filter((l) => l.ts >= t0 && l.kind === 'udhaar')
  const paidToday = b.ledger.filter((l) => l.ts >= t0 && l.kind === 'payment')
  const owed = b.customers.filter((c) => c.balance > 0).sort((a, c) => c.balance - a.balance)
  const low = b.items.filter((i) => i.qty <= i.reorder)
  const pend = payments.filter((p) => p.status === 'pending')
  const lines = [
    `Aaj ki sale: ${rupee(today.total)} (${today.sales.length} bill). Kal: ${rupee(yest.total)} (${yest.sales.length} bill). Is hafte: ${rupee(week.total)} (${week.sales.length} bill).`,
    `Aaj sabse zyada bika: ${[...sold.entries()].sort((a, c) => c[1] - a[1]).slice(0, 5).map(([id, q]) => `${itemName(id)} x${q}`).join(', ') || 'kuch nahi'}.`,
    `Aaj udhaar diya: ${givenToday.length ? givenToday.map((l) => `${custName(l.customerId)} ${rupee(l.amount)}`).join(', ') : 'koi nahi'}.`,
    `Aaj paisa wapas aaya (khata me): ${paidToday.length ? paidToday.map((l) => `${custName(l.customerId)} ${rupee(Math.abs(l.amount))}`).join(', ') : 'koi nahi'}.`,
    `Kul udhaar baaki: ${rupee(owed.reduce((a, c) => a + c.balance, 0))}. Sabse zyada: ${owed.slice(0, 5).map((c) => `${c.name} ${rupee(c.balance)}`).join(', ') || 'kisi ka nahi'}.`,
    `Kam stock: ${low.map((i) => `${i.name} (${i.qty} bacha)`).join(', ') || 'koi nahi'}.`,
    `Pending UPI payments (owner confirm baaki): ${pend.length ? pend.map((p) => `${p.name} ${rupee(p.amount)}`).join(', ') : 'koi nahi'}.`,
  ]
  return lines.join('\n')
}

/** Offline answer when the AI model is not reachable. */
export function localSummary(b: Books, payments: Payment[] = []) {
  return 'Aaj ka haal (seedha khate se):\n' + buildDigest(b, payments)
}

export const SUMMARY_WORDS = /(kya hua|kya huaa|haal|hisaab|summary|report|batao|bataao|kaisa chal|kitna (sale|bika|udhaar)|aaj ka|din bhar)/i
