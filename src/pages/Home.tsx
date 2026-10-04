import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

const STEPS: [string, string][] = [
  ['Khata code', 'Dukaandaar aapko 4 ank ka khata code deta hai. Phone number aur code se hi aapka hisaab khulta hai, aur kisi ka nahi.'],
  ['Sab saaf dikhta hai', 'Kitna baaki hai, kab kya liya, kitne ka, ek ek entry ke saath.'],
  ['UPI se chukao', 'Dukaan ka QR scan karo, UTR daalo. Dukaandaar bank me dekhkar confirm karta hai, phir khata kam hota hai.'],
]

export default function Home() {
  const [shop, setShop] = useState('Dukaan')
  useEffect(() => { api.config().then((c) => setShop(c.shop || 'Dukaan')).catch(() => {}) }, [])
  return (
    <main className="home">
      <section className="hero">
        <div className="eyebrow">{shop}</div>
        <h1>Aapka khata.<br /><span>Aapke haath me.</span></h1>
        <p className="lead">Dukaan pe kitna udhaar hai, kya-kya liya tha, sab yaha dekho. Aur dukaandaar ka phone paas na ho, tab bhi UPI se payment karke confirmation yahi pao.</p>
        <div className="cta-row">
          <Link to="/hisaab" className="btn big">Mera hisaab dekho</Link>
          <Link to="/pay" className="btn big ghost">UPI se payment karo</Link>
        </div>
      </section>
      <section className="steps">
        {STEPS.map(([t, d], i) => (
          <div key={t} className="step"><span className="step-n">{i + 1}</span><h3>{t}</h3><p>{d}</p></div>
        ))}
      </section>
      <footer className="foot"><span>{shop}</span><span>Aapka hisaab sirf aapke code se khulta hai.</span></footer>
    </main>
  )
}
