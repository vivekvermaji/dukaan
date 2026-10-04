import { useEffect, useState } from 'react'
import { api, setToken } from '../../lib/api'
import { useBase } from '../../lib/base'

export default function Settings() {
  const demo = useBase() !== '/malik'
  const [f, setF] = useState({ shop: '', payee: '', upiId: '' })
  const [msg, setMsg] = useState('')
  useEffect(() => { if (!demo) api.config().then((c) => setF({ shop: c.shop, payee: c.payee, upiId: c.upiId })).catch(() => {}) }, [demo])
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('')
    try { await api.setConfig(f); setMsg('Save ho gaya. Ab public payment page pe aapka QR dikhega.') } catch (x) { setMsg((x as Error).message) }
  }
  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p>Payment page pe customer ko yahi UPI ID ka QR dikhta hai.</p></div></div>
      {demo ? <div className="card"><p className="muted">Demo sandbox me settings band hain. Asli owner area me yaha dukaan ka naam aur UPI ID set hota hai.</p></div> : (
        <form className="card form-stack" onSubmit={save}>
          <label>Dukaan ka naam<input value={f.shop} onChange={(e) => setF({ ...f, shop: e.target.value })} placeholder="Jaise Verma Kirana Store" /></label>
          <label>UPI par naam<input value={f.payee} onChange={(e) => setF({ ...f, payee: e.target.value })} placeholder="Jo naam UPI me dikhta hai" /></label>
          <label>UPI ID<input value={f.upiId} onChange={(e) => setF({ ...f, upiId: e.target.value })} placeholder="naam@bank" autoCapitalize="none" /></label>
          <button className="btn" type="submit">Save</button>
          {msg && <div className="muted">{msg}</div>}
          <hr />
          <button type="button" className="btn ghost sm" onClick={() => { setToken(''); location.reload() }}>Logout</button>
        </form>
      )}
    </>
  )
}
