import { useSyncExternalStore } from 'react'
import type { State, Books, LogEntry } from './types'
import { seedBooks } from './seed'
import { api } from './api'

const KEY = 'dukaan.state.v1'

function fresh(): State {
  const b = seedBooks()
  // sample opening ledger + one itemised credit sale per customer so the khata history is not empty
  const DAY = 86400000
  b.ledger = []
  b.customers.filter((c) => c.balance > 0).forEach((c, n) => {
    const picks = [b.items[(n * 2) % b.items.length], b.items[(n * 2 + 3) % b.items.length]]
    let lines = picks.map((it, k) => ({ itemId: it.id, qty: 1 + ((n + k) % 3), price: it.price }))
    if (lines.reduce((a, l) => a + l.qty * l.price, 0) > c.balance) lines = [{ ...lines[0], qty: 1 }]
    const sold = lines.reduce((a, l) => a + l.qty * l.price, 0)
    const ts = Date.now() - (n + 2) * DAY
    if (c.balance - sold > 0) b.ledger.push({ id: 'open-' + c.id, ts: c.since, customerId: c.id, amount: c.balance - sold, kind: 'udhaar' as const, note: 'Purana hisaab' })
    b.sales.push({ id: 'cs-' + c.id, ts, lines, total: sold, customerId: c.id, credit: true })
    b.ledger.push({ id: 'cl-' + c.id, ts, customerId: c.id, amount: sold, kind: 'udhaar' as const, note: 'Saaman udhaar' })
  })
  return { ...b, log: [], snapshots: [], shopping: [] }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fresh()
}

let state: State = load()
const listeners = new Set<() => void>()
let remote = false
let pushTimer: ReturnType<typeof setTimeout> | undefined
export const syncStatus = { error: '' as string }
const save = () => {
  if (remote) {
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => { void flushPush() }, 500)
    return
  }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota */ }
}
export async function flushPush() {
  clearTimeout(pushTimer)
  if (!remote) return
  try { await api.putState(state); syncStatus.error = '' } catch (e) { syncStatus.error = (e as Error).message }
  listeners.forEach((l) => l())
}
const emit = () => { save(); listeners.forEach((l) => l()) }

/** Switch between the browser-only demo sandbox and the shared (server) shop data. */
export function setBackend(mode: 'local' | 'remote', initial?: State) {
  remote = mode === 'remote'
  state = remote ? (initial ?? fresh()) : load()
  listeners.forEach((l) => l())
}
export const freshState = fresh

export const getState = () => state
export const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l) }
export const useStore = () => useSyncExternalStore(subscribe, getState)

export const uid = () => Math.random().toString(36).slice(2, 9)

export function mutate(fn: (draft: State) => void) {
  const draft: State = structuredClone(state)
  fn(draft)
  state = draft
  emit()
}

const booksOf = (s: State): Books => ({ items: s.items, customers: s.customers, sales: s.sales, ledger: s.ledger })

/** Snapshot books so the last action can be undone. */
export function pushSnapshot() {
  const snap = JSON.stringify(booksOf(state))
  state = { ...state, snapshots: [...state.snapshots.slice(-19), snap] }
}

export function undoLast(): boolean {
  if (!state.snapshots.length) return false
  const snaps = [...state.snapshots]
  const snap = JSON.parse(snaps.pop()!) as Books
  const log = [...state.log]
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].undoable && !log[i].undone) { log[i] = { ...log[i], undone: true }; break }
  }
  state = { ...state, ...snap, snapshots: snaps, log }
  emit()
  return true
}

export function addLog(e: Omit<LogEntry, 'id' | 'ts'>) {
  state = { ...state, log: [...state.log, { ...e, id: uid(), ts: Date.now() }].slice(-200) }
  emit()
}

export function resetAll() { state = fresh(); emit() }
export function silentUpdate(fn: (draft: State) => void) { mutate(fn) }
