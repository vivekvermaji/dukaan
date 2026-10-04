export type Item = { id: string; name: string; hi: string; aliases: string[]; price: number; qty: number; reorder: number; unit: string }
export type Customer = { id: string; name: string; hi: string; aliases: string[]; balance: number; since: number }
export type SaleLine = { itemId: string; qty: number; price: number }
export type Sale = { id: string; ts: number; lines: SaleLine[]; total: number; customerId?: string; credit?: boolean }
export type LedgerEntry = { id: string; ts: number; customerId: string; amount: number; kind: 'udhaar' | 'payment'; note?: string }
export type LogEntry = {
  id: string; ts: number; utterance: string; intent: string; reply: string
  ok: boolean; source: 'rules' | 'llm' | 'system'; undone?: boolean; undoable?: boolean
}
export type Books = { items: Item[]; customers: Customer[]; sales: Sale[]; ledger: LedgerEntry[] }
export type State = Books & { log: LogEntry[]; snapshots: string[] }

export type Intent =
  | { type: 'sale'; lines: { itemId: string; qty: number }[]; customerId?: string; credit?: boolean }
  | { type: 'udhaar'; customerId: string; amount: number }
  | { type: 'payment'; customerId: string; amount: number }
  | { type: 'stock_in'; lines: { itemId: string; qty: number }[] }
  | { type: 'q_sales'; range: 'today' | 'yesterday' | 'week' | 'month' }
  | { type: 'q_udhaar'; customerId?: string; mode?: 'top' | 'total' }
  | { type: 'q_stock'; itemId?: string }
  | { type: 'undo' }
  | { type: 'new_customer_needed'; name: string; then: 'udhaar' | 'payment'; amount: number }
  | { type: 'clarify'; question: string; speech: string; options: { label: string; customerId: string }[]; resume: Intent }
  | { type: 'chat'; reply: string }
  | { type: 'unknown' }

export type Reply = { text: string; speech: string }
export type Card = { kind: string; title: string; rows: [string, string][]; undoable: boolean; tone?: 'ok' | 'warn' | 'info' }
export type Outcome = { intent: string; reply: Reply; card?: Card; ok: boolean; source: 'rules' | 'llm' | 'system' }
