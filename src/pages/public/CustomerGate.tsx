import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api, type PublicHistory } from '../../lib/api'

const KEY = 'dukaan.cust'
type Creds = { phone: string; code: string }
const saved = (): Creds | null => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { return null } }

export default function CustomerGate({ title, lead, children }: { title: string; lead: string; children: (d: PublicHistory, creds: Creds, refresh: () => Promise<void>) => ReactNode }) {
  const [creds, setCreds] = useState<Creds | null>(saved)
  const [data, setData] = useState<PublicHistory | null>(null)
  const [phone, setPhone] = useState(creds?.phone ?? '')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const fetchIt = useCallback(async (c: Creds) => {
    const d = await api.lookup(c.phone, c.code)
    setData(d); setCreds(c)
    sessionStorage.setItem(KEY, JSON.stringify(c))
  }, [])
  useEffect(() => { const c = saved(); if (c) fetchIt(c).catch(() => { sessionStorage.removeItem(KEY); setCreds(null) }) }, [fetchIt])

  // Owner edits show up here without a manual refresh.
  useEffect(() => {
    if (!creds) return
    const tick = () => { if (!document.hidden) fetchIt(creds).catch(() => { /* keep showing the last good data */ }) }
    const t = setInterval(tick, 8000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick) }
  }, [creds, fetchIt])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { await fetchIt({ phone: phone.replace(/\D/g, '').slice(-10), code: code.trim() }) } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  const out = () => { sessionStorage.removeItem(KEY); setData(null); setCreds(null); setCode('') }

  if (!data || !creds) {
    return (
      <main className="pub">
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        <form className="card form-stack narrow" onSubmit={submit}>
          <label>Phone number<input inputMode="numeric" autoComplete="tel" placeholder="10 ank ka number" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>Khata code<input inputMode="numeric" placeholder="4 ank, dukaandaar se lo" value={code} onChange={(e) => setCode(e.target.value)} /></label>
          {err && <div className="err">{err}</div>}
          <button className="btn" type="submit" disabled={busy || phone.replace(/\D/g, '').length < 10 || code.length < 4}>{busy ? 'Dekh raha hoon…' : 'Dekho'}</button>
        </form>
      </main>
    )
  }
  return (
    <main className="pub">
      <div className="pub-top"><h1>{title}</h1><button className="btn sm ghost" onClick={out}>Dusra khata</button></div>
      {children(data, creds, () => fetchIt(creds))}
    </main>
  )
}
