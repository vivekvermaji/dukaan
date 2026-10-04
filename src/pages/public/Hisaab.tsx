import { Link } from 'react-router-dom'
import CustomerGate from './CustomerGate'
import { rupee } from '../../lib/engine'

const day = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Hisaab() {
  return (
    <CustomerGate title="Mera hisaab" lead="Phone number aur dukaandaar ka diya khata code daalo. Aapka udhaar aur kya-kya liya, sab dikhega.">
      {(d) => (
        <>
          <div className="bal-card">
            <div><small>Namaste</small><h2>{d.name}</h2></div>
            <div className="bal"><small>Aapka baaki</small><b className={d.balance > 0 ? 'warn' : 'ok'}>{d.balance > 0 ? rupee(d.balance) : 'Kuch baaki nahi'}</b></div>
            {d.balance > 0 && <Link to="/pay" className="btn">UPI se chukao</Link>}
          </div>

          {d.payments.some((p) => p.status === 'pending') && <div className="note">Aapka payment owner ki confirmation ka wait kar raha hai. Confirm hote hi baaki kam ho jayega.</div>}

          <div className="grid2e">
            <section className="card">
              <div className="card-title">Kya liya</div>
              {d.sales.length === 0 && <div className="muted">Abhi koi saaman udhaar nahi likha.</div>}
              {d.sales.map((s, i) => (
                <div key={i} className="hist">
                  <div className="hist-top"><span>{day(s.ts)}</span><b>{rupee(s.total)}</b></div>
                  <div className="hist-items">{s.items.map((x) => `${x.name} × ${x.qty}`).join(', ')}</div>
                </div>
              ))}
            </section>
            <section className="card">
              <div className="card-title">Hisaab ki entries</div>
              {d.ledger.length === 0 && <div className="muted">Abhi koi entry nahi.</div>}
              {d.ledger.map((e, i) => (
                <div key={i} className="ledger-line">
                  <span>{day(e.ts)}</span>
                  <span>{e.note ?? (e.kind === 'payment' ? 'Paisa diya' : 'Udhaar')}</span>
                  <b className={e.amount < 0 ? 'ok' : 'warn'}>{e.amount < 0 ? '−' : '+'}{rupee(Math.abs(e.amount))}</b>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </CustomerGate>
  )
}
