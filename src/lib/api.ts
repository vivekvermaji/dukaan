import type { Payment, ShopConfig, State } from './types'

const TOKEN_KEY = 'dukaan.owner.token'
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
export const setToken = (t: string) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ } }

async function call<T>(op: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.auth) headers.authorization = 'Bearer ' + getToken()
  const r = await fetch((import.meta.env.VITE_API_BASE || '') + '/api/shop?op=' + op, { method: opts.method ?? (opts.body ? 'POST' : 'GET'), headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(data.error || 'Request fail ho gayi'), { status: r.status })
  return data as T
}

export type PublicHistory = {
  name: string; balance: number
  sales: { ts: number; total: number; credit: boolean; items: { name: string; qty: number; price: number }[] }[]
  ledger: { ts: number; amount: number; kind: string; note?: string }[]
  payments: Pick<Payment, 'id' | 'amount' | 'utr' | 'ts' | 'status'>[]
}

export const api = {
  config: () => call<ShopConfig & { ready: boolean }>('config'),
  lookup: (phone: string, code: string) => call<PublicHistory>('lookup', { body: { phone, code } }),
  pay: (phone: string, code: string, amount: number, utr: string, photo: string) => call<{ ok: true; id?: string }>('pay', { body: { phone, code, amount, utr, photo } }),
  photo: (id: string) => call<{ photo: string }>('photo&id=' + id, { auth: true }),
  login: (pin: string) => call<{ token: string }>('login', { body: { pin } }),
  getState: () => call<{ state: State | null }>('state', { auth: true }),
  putState: (state: State) => call<{ ok: true }>('state', { method: 'PUT', body: { state }, auth: true }),
  payments: () => call<{ payments: Payment[] }>('payments', { auth: true }),
  resolve: (id: string, status: 'confirmed' | 'rejected') => call<{ ok: true }>('resolve', { body: { id, status }, auth: true }),
  setConfig: (c: ShopConfig) => call<{ ok: true }>('config', { method: 'PUT', body: c, auth: true }),
}
