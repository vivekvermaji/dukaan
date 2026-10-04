import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BaseCtx } from '../../lib/base'
import { api, getToken, setToken } from '../../lib/api'
import { flushPush, pullRemote, setBackend, useStore, syncStatus } from '../../lib/store'
import { Logo } from '../../components/ui'

type Phase = 'loading' | 'login' | 'ready'

export default function OwnerRoot({ base, mode }: { base: string; mode: 'local' | 'remote' }) {
  const [phase, setPhase] = useState<Phase>('loading')

  const load = () => {
    setPhase('loading')
    api.getState()
      .then((r) => { setBackend('remote', r.state ?? undefined, r.rev); if (!r.state) void flushPush(); setPhase('ready') })
      .catch(() => { setToken(''); setPhase('login') })
  }
  useEffect(() => {
    if (mode === 'local') { setBackend('local'); setPhase('ready'); return }
    if (getToken()) load(); else setPhase('login')
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  useStore()
  useEffect(() => {
    if (mode !== 'remote' || phase !== 'ready') return
    const t = setInterval(() => { void pullRemote() }, 6000)
    return () => clearInterval(t)
  }, [mode, phase])

  if (phase === 'loading') return <div className="gate"><div className="gate-card"><p className="muted">Khul raha hai…</p></div></div>
  if (phase === 'login') return <Login onDone={load} />
  return <BaseCtx.Provider value={base}>{mode === 'remote' && syncStatus.error && <div className="err" style={{ position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: '#2a1114', padding: '8px 14px', borderRadius: 12 }}>{syncStatus.error}</div>}<Outlet /></BaseCtx.Provider>
}

function Login({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const r = await api.login(pin); setToken(r.token); onDone() }
    catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="gate">
      <div className="glow g1" />
      <form className="gate-card" onSubmit={go}>
        <Logo />
        <h1>Malik login</h1>
        <p className="muted">Sirf dukaan ke malik ke liye.</p>
        <input type="password" autoFocus autoComplete="current-password" placeholder="PIN / password" value={pin} onChange={(e) => setPin(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn" type="submit" disabled={busy || !pin}>{busy ? 'Check ho raha…' : 'Andar jao'}</button>
      </form>
    </div>
  )
}
