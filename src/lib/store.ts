import { useSyncExternalStore } from 'react'
import type { State, Books, LogEntry } from './types'
import { seedBooks } from './seed'

const KEY = 'dukaan.state.v1'

function fresh(): State {
  const b = seedBooks()
  // sample opening ledger so the khata page has history from day one
  b.ledger = b.customers.filter((c) => c.balance > 0).map((c) => ({
    id: 'open-' + c.id, ts: c.since, customerId: c.id, amount: c.balance, kind: 'udhaar' as const, note: 'Purana hisaab',
  }))
  return { ...b, log: [], snapshots: [] }
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
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota */ } }
const emit = () => { save(); listeners.forEach((l) => l()) }

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
