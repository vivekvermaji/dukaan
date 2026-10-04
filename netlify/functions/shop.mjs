// Shared shop data for Dukaan. Public endpoints (config, lookup, pay, login) and
// owner endpoints (state, payments, resolve, config PUT) that need a signed session.
// Data lives in Netlify Blobs. The owner PIN lives only in the ADMIN_PIN env var.
import { getStore } from '@netlify/blobs'
import crypto from 'node:crypto'

const store = () => getStore('dukaan')
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const hmac = (msg) => crypto.createHmac('sha256', 'dukaan|' + (process.env.ADMIN_PIN || '')).update(msg).digest('hex')
const makeToken = () => { const exp = Date.now() + 12 * 3600 * 1000; return `${exp}.${hmac(String(exp))}` }
function authed(req) {
  if (!process.env.ADMIN_PIN) return false
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const [exp, sig] = t.split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  const good = hmac(exp)
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))
}

// Failed-attempt limiter per client + bucket (login, customer lookup).
async function blocked(bucket, ip, max) {
  const s = store(); const key = `fail/${bucket}/${ip.replace(/[^a-zA-Z0-9.:]/g, '_')}`
  const rec = (await s.get(key, { type: 'json' })) || { n: 0, t: Date.now() }
  if (Date.now() - rec.t > 15 * 60 * 1000) return { key, rec: { n: 0, t: Date.now() }, hit: false }
  return { key, rec, hit: rec.n >= max }
}
const failed = async (b) => { b.rec.n += 1; await store().setJSON(b.key, b.rec) }

const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10)
const DEFAULT_CONFIG = { shop: 'Dukaan', payee: '', upiId: '' }

async function findCustomer(phone, code) {
  const st = await store().get('state', { type: 'json' })
  if (!st) return null
  const p = digits(phone)
  if (p.length < 10) return null
  const c = (st.customers || []).find((x) => x.phone && digits(x.phone) === p && x.code && String(x.code) === String(code).trim())
  return c ? { st, c } : null
}

const cors = (req, res) => {
  const o = req.headers.get('origin') || ''
  const ok = (process.env.ALLOWED_ORIGIN || '').split(',').map((x) => x.trim()).filter(Boolean)
  if (o && ok.includes(o)) {
    res.headers.set('access-control-allow-origin', o)
    res.headers.set('access-control-allow-headers', 'content-type, authorization')
    res.headers.set('access-control-allow-methods', 'GET, POST, PUT, OPTIONS')
    res.headers.set('vary', 'origin')
  }
  return res
}

export default async (req) => {
  if (req.method === 'OPTIONS') return cors(req, new Response(null, { status: 204 }))
  return cors(req, await handle(req))
}

async function handle(req) {
  const url = new URL(req.url)
  const op = url.searchParams.get('op') || ''
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown'
  const s = store()
  const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}))

  try {
    if (op === 'config' && req.method === 'GET') {
      const cfg = (await s.get('config', { type: 'json' })) || DEFAULT_CONFIG
      const st = await s.get('state', { type: 'json' })
      return json({ ...cfg, ready: !!st })
    }

    if (op === 'login') {
      if (!process.env.ADMIN_PIN) return json({ error: 'Owner PIN abhi server pe set nahi hai.' }, 503)
      const b = await blocked('login', ip, 8)
      if (b.hit) return json({ error: 'Bahut galat koshish. 15 minute baad dobara try karo.' }, 429)
      const a = Buffer.from(String(body.pin || '')); const z = Buffer.from(process.env.ADMIN_PIN)
      if (a.length === z.length && crypto.timingSafeEqual(a, z)) return json({ token: makeToken() })
      await failed(b)
      return json({ error: 'PIN galat hai.' }, 401)
    }

    if (op === 'lookup' || op === 'pay') {
      const b = await blocked('cust', ip, 12)
      if (b.hit) return json({ error: 'Bahut galat koshish. Thodi der baad try karo.' }, 429)
      const found = await findCustomer(body.phone, body.code)
      if (!found) { await failed(b); return json({ error: 'Phone number ya khata code match nahi hua. Owner se code pooch lo.' }, 404) }
      const { st, c } = found
      const payments = (await s.get('payments', { type: 'json' })) || []

      if (op === 'lookup') {
        const itemName = Object.fromEntries((st.items || []).map((i) => [i.id, i.name]))
        const sales = (st.sales || []).filter((x) => x.customerId === c.id).sort((p, q) => q.ts - p.ts).slice(0, 40)
          .map((x) => ({ ts: x.ts, total: x.total, credit: !!x.credit, items: x.lines.map((l) => ({ name: itemName[l.itemId] || l.itemId, qty: l.qty, price: l.price })) }))
        const ledger = (st.ledger || []).filter((e) => e.customerId === c.id).sort((p, q) => q.ts - p.ts).slice(0, 60)
          .map((e) => ({ ts: e.ts, amount: e.amount, kind: e.kind, note: e.note }))
        const mine = payments.filter((p) => p.customerId === c.id).sort((p, q) => q.ts - p.ts).slice(0, 15)
          .map((p) => ({ id: p.id, amount: p.amount, utr: p.utr, ts: p.ts, status: p.status }))
        return json({ name: c.name, balance: c.balance, sales, ledger, payments: mine })
      }

      // pay: customer reports a UPI payment. It stays PENDING until the owner confirms.
      const amount = Math.round(Number(body.amount))
      const utr = String(body.utr || '').replace(/\s/g, '')
      if (!(amount > 0)) return json({ error: 'Amount sahi daalo.' }, 400)
      if (amount > Math.max(0, c.balance)) return json({ error: 'Itna amount baaki nahi hai. Aapka baaki ' + c.balance + ' rupaye hai.' }, 400)
      if (!/^\d{12}$/.test(utr)) return json({ error: 'UTR / transaction ID 12 ank ka hota hai (UPI app me payment ke baad dikhta hai).' }, 400)
      if (payments.some((p) => p.utr === utr)) return json({ error: 'Ye UTR pehle hi use ho chuka hai.' }, 409)
      if (payments.filter((p) => p.customerId === c.id && p.status === 'pending').length >= 3) return json({ error: 'Pehle ke pending payments owner confirm kar de.' }, 429)
      const photo = String(body.photo || '')
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo) || photo.length > 250000) return json({ error: 'Pehle apna photo lo (sirf camera wali photo, chhoti size).' }, 400)
      const id = crypto.randomUUID().slice(0, 8)
      await s.set('photo/' + id, photo) // kept apart from the payment list so that list stays small
      payments.push({ id, customerId: c.id, name: c.name, amount, utr, ts: Date.now(), status: 'pending', hasPhoto: true })
      await s.setJSON('payments', payments.slice(-500))
      return json({ ok: true, id })
    }

    // ---- owner only ----
    if (!authed(req)) return json({ error: 'Login chahiye.' }, 401)

    if (op === 'state' && req.method === 'GET') {
      const rev = Number(await s.get('state-rev')) || 0
      return json({ state: (await s.get('state', { type: 'json' })) || null, rev })
    }
    if (op === 'state' && req.method === 'PUT') {
      if (!body.state || !Array.isArray(body.state.customers)) return json({ error: 'bad state' }, 400)
      // Optimistic lock: a device with an old copy must not overwrite newer data from another device.
      const rev = Number(await s.get('state-rev')) || 0
      if (Number(body.rev) !== rev) return json({ error: 'conflict', state: (await s.get('state', { type: 'json' })) || null, rev }, 409)
      await s.setJSON('state', body.state)
      await s.set('state-rev', String(rev + 1))
      return json({ ok: true, rev: rev + 1 })
    }
    if (op === 'photo') { const ph = await s.get('photo/' + String(url.searchParams.get('id') || '').replace(/[^a-z0-9-]/gi, '')); return ph ? json({ photo: ph }) : json({ error: 'no photo' }, 404) }
    if (op === 'payments') return json({ payments: ((await s.get('payments', { type: 'json' })) || []).sort((a, b) => b.ts - a.ts) })
    if (op === 'resolve') {
      const list = (await s.get('payments', { type: 'json' })) || []
      const p = list.find((x) => x.id === body.id)
      if (!p || p.status !== 'pending') return json({ error: 'Ye payment pehle hi handle ho chuka hai.' }, 409)
      p.status = body.status === 'confirmed' ? 'confirmed' : 'rejected'
      p.resolvedTs = Date.now()
      await s.setJSON('payments', list)
      return json({ ok: true })
    }
    if (op === 'config' && req.method === 'PUT') {
      const cfg = { shop: String(body.shop || 'Dukaan').slice(0, 60), payee: String(body.payee || '').slice(0, 60), upiId: String(body.upiId || '').trim().slice(0, 60) }
      await s.setJSON('config', cfg)
      return json({ ok: true })
    }
    return json({ error: 'unknown op' }, 404)
  } catch (e) {
    return json({ error: 'Server error' }, 500)
  }
}
