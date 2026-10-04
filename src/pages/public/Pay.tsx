import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api, type PublicHistory } from '../../lib/api'
import { rupee } from '../../lib/engine'
import { shrinkPhoto } from '../../lib/photo'
import type { ShopConfig } from '../../lib/types'

const KEY = 'dukaan.cust'
const LABEL = { pending: 'Owner ki confirmation baaki', confirmed: 'Confirm ho gaya ✓', rejected: 'Owner ne confirm nahi kiya' } as const
type Creds = { phone: string; code: string }
const saved = (): Creds | null => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { return null } }

export default function Pay() {
  const [cfg, setCfg] = useState<(ShopConfig & { ready: boolean }) | null>(null)
  const [amount, setAmount] = useState('')
  const [qr, setQr] = useState('')
  const [creds, setCreds] = useState<Creds | null>(saved)
  const [data, setData] = useState<PublicHistory | null>(null)
  const [phone, setPhone] = useState(creds?.phone ?? '')
  const [code, setCode] = useState('')
  const [utr, setUtr] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [photo, setPhoto] = useState('')
  const [myId, setMyId] = useState('')
  const [thanks, setThanks] = useState<number | null>(null)

  const refresh = useCallback(async (c: Creds) => {
    const d = await api.lookup(c.phone, c.code)
    setData(d)
    return d
  }, [])
  useEffect(() => { api.config().then(setCfg).catch(() => {}) }, [])
  useEffect(() => { if (creds) refresh(creds).then((d) => setAmount((a) => a || String(Math.max(0, d.balance) || ''))).catch(() => { sessionStorage.removeItem(KEY); setCreds(null) }) }, [creds, refresh])
  useEffect(() => { if (!creds) return; const t = setInterval(() => { void refresh(creds).catch(() => {}) }, 8000); return () => clearInterval(t) }, [creds, refresh])

  useEffect(() => {
    const mine = data?.payments.find((p) => p.id === myId)
    if (mine?.status === 'confirmed') setThanks(mine.amount)
  }, [data, myId])
  const pickPhoto = async (f?: File) => {
    if (!f) return
    setErr('')
    try { setPhoto(await shrinkPhoto(f)) } catch { setErr('Photo nahi khul payi, dobara lo.') }
  }

  const upi = cfg?.upiId
    ? `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(cfg.payee || cfg.shop)}${Number(amount) > 0 ? `&am=${Number(amount)}` : ''}&cu=INR&tn=${encodeURIComponent('Dukaan khata')}`
    : ''
  useEffect(() => {
    if (!upi) { setQr(''); return }
    QRCode.toDataURL(upi, { margin: 1, width: 280, color: { dark: '#111111', light: '#ffffff' } }).then(setQr).catch(() => setQr(''))
  }, [upi])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    const c = { phone: phone.replace(/\D/g, '').slice(-10), code: code.trim() }
    try {
      const r = await api.pay(c.phone, c.code, Number(amount), utr, photo)
      sessionStorage.setItem(KEY, JSON.stringify(c)); setCreds(c); setUtr(''); setSent(true); setMyId(r.id ?? '')
      await refresh(c)
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }

  if (thanks !== null) return (
    <main className="pub">
      <div className="thanks">
        <div className="thanks-tick">✓</div>
        <h1>Thank you sir</h1>
        <p className="lead">{rupee(thanks)} ka payment mil gaya. Visit our shop again.</p>
        <small className="muted">Aapka khata update ho gaya hai.</small>
      </div>
    </main>
  )

  return (
    <main className="pub">
      <h1>UPI se payment</h1>
      <p className="lead">Dukaandaar ka phone paas na ho tab bhi yaha se pay karo. Pay karke neeche UTR daalo, dukaandaar confirm karega aur aapka khata kam ho jayega.</p>
      {data && (
        <div className="bal-card">
          <div><small>Namaste</small><h2>{data.name}</h2></div>
          <div className="bal"><small>Aapka baaki</small><b className={data.balance > 0 ? 'warn' : 'ok'}>{data.balance > 0 ? rupee(data.balance) : 'Kuch baaki nahi'}</b></div>
        </div>
      )}
      <div className="grid2e">
        {!photo ? (
        <section className="card pay-step">
          <div className="card-title">1. Pehle apna photo lo</div>
          <p className="muted">Suraksha ke liye: payment se pehle ek photo. Ye sirf dukaandaar ko dikhegi, agar koi galat payment kare toh pehchan ke liye. Kisi aur ko nahi.</p>
          <label className="btn big paynow photo-btn">Camera kholo
            <input type="file" accept="image/*" capture="user" hidden onChange={(e) => { void pickPhoto(e.target.files?.[0]) }} />
          </label>
          {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
        </section>
        ) : (
        <section className="card pay-step">
          <div className="card-title">1. Pay karo</div>
          <div className="selfie-row"><img src={photo} alt="Aapki photo" /><button type="button" className="btn sm ghost" onClick={() => setPhoto('')}>Dobara lo</button></div>
          <label className="amt">Kitna dena hai (₹)<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} /></label>
          <div className="qr">
            {qr ? <img src={qr} alt="Dukaan ka UPI QR" width={220} height={220} /> : <div className="qr-ph"><b>DEMO QR</b><br />Dukaandaar ne abhi apna UPI ID set nahi kiya. Set hote hi asli QR yaha aa jayega.</div>}
          </div>
          {upi
            ? <a className="btn big paynow" href={upi}>Pay now · UPI app kholo</a>
            : <button className="btn big paynow" disabled>Pay now · UPI ID set hone ke baad</button>}
          {cfg?.upiId && <small className="muted center">UPI ID: {cfg.upiId}</small>}
          <small className="muted center">Phone me ho toh “Pay now” seedha UPI app kholega. Dusre phone se ho toh QR scan karo.</small>
        </section>
        )}
        <section className="card pay-step">
          <div className="card-title">2. Payment ho gaya? Confirm ke liye bhejo</div>
          <p className="muted">Payment ke baad apne UPI app me 12 ank ka UTR / transaction ID dikhta hai. Wo yaha daalo, saath me phone number aur dukaandaar ka diya khata code.</p>
          <form className="form-stack flat" onSubmit={submit}>
            <label>Phone number<input inputMode="numeric" autoComplete="tel" placeholder="10 ank" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <label>Khata code<input inputMode="numeric" placeholder="4 ank" value={code} onChange={(e) => setCode(e.target.value)} /></label>
            <label>UTR / Transaction ID<input inputMode="numeric" maxLength={12} placeholder="12 ank" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))} /></label>
            {err && <div className="err">{err}</div>}
            <button className="btn" type="submit" disabled={busy || !photo || utr.length !== 12 || phone.replace(/\D/g, '').length < 10 || code.length < 4 || !(Number(amount) > 0)}>{busy ? 'Bhej raha hoon…' : 'Maine pay kar diya'}</button>
          </form>
          {sent && <div className="note">Bhej diya. Dukaandaar ki confirmation baaki hai, ye page khud update ho jayega.</div>}
        </section>
      </div>
      {data && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Aapke payments</div>
          {data.payments.length === 0 && <div className="muted">Abhi koi payment nahi bheja.</div>}
          {data.payments.map((p) => (
            <div key={p.id} className="pay-row">
              <div className="grow"><div>{rupee(p.amount)}</div><small>UTR {p.utr} · {new Date(p.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div>
              <span className={`pill ${p.status === 'confirmed' ? '' : p.status === 'rejected' ? 'bad' : 'warn'}`}>{LABEL[p.status]}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
