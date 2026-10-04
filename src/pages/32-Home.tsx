import { Link } from 'react-router-dom'
import { Wave } from '../components/ui'

const EX: [string, string][] = [
  ['“2 doodh aur 1 bread becho”', 'Sale likhi, stock se ghata'],
  ['“Ramesh ka 500 udhaar likh do”', 'Khata me chadha, kul baaki bataya'],
  ['“Sunita ne 200 diye”', 'Udhaar se kata, naya balance'],
  ['“aaj kitni sale hui?”', 'Aaj ka total aur top item'],
  ['“kya khatam ho raha hai?”', 'Kam stock ki list'],
  ['“wo wapas karo”', 'Pichla kaam undo']
]

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="eyebrow">Alexa+ ke andaaz me · India ki dukaanon ke liye</div>
        <h1>Bolo.<br /><span>Dukaan sambhal lega.</span></h1>
        <p className="lead">Kirana wale bhaiya ke haath busy hote hain. Dukaan ek voice agent hai jo Hindi / Hinglish sunta hai, sale, udhaar aur stock khud likhta hai, aur jawab bolkar deta hai.</p>
        <div className="cta-row">
          <Link to="/app" className="btn big">🎙 Voice agent try karo</Link>
          <Link to="/admin" className="btn big ghost">Admin panel dekho</Link>
        </div>
        <Wave active />
      </section>

      <section className="sect">
        <h2>Aise bolo, kaam ho jayega</h2>
        <div className="ex-grid">
          {EX.map(([say, does]) => (
            <div className="ex" key={say}><div className="ex-say">{say}</div><div className="ex-does">→ {does}</div></div>
          ))}
        </div>
      </section>

      <section className="sect cols">
        <div><div className="num-big">01</div><h3>Sunta hai</h3><p>Browser ka voice recognition, Hindi me. Mic nahi chalta toh type karo - dono chalte hain.</p></div>
        <div><div className="num-big">02</div><h3>Samajhta hai</h3><p>Pehle ek offline Hinglish parser, jo bina internet ke "paanch sau" aur "रमेश का" samajhta hai. Gadbad wale vaakya AI model ko jaate hain.</p></div>
        <div><div className="num-big">03</div><h3>Karta hai</h3><p>Sirf jawab nahi - agent asli kaam karta hai. Naam do jagah mile toh poochta hai "kaun sa Ramesh?". Galti ho toh Undo.</p></div>
      </section>

      <section className="sect">
        <h2>Admin panel: dukaan ka poora hisaab</h2>
        <p className="sub">Voice se jo likha, dashboard me turant dikhta hai.</p>
        <div className="feat-grid">
          <div className="feat"><b>Live dashboard</b><span>Aaj ki sale, hafte ka chart, kya zyada bik raha hai</span></div>
          <div className="feat"><b>Udhaar khata</b><span>Har customer ka hisaab, WhatsApp reminder ek tap me</span></div>
          <div className="feat"><b>Stock</b><span>Kam hote hi alert, daam aur level badlo</span></div>
          <div className="feat"><b>Voice log</b><span>Agent ne kya samjha, kis tareeke se, sab saaf dikhta hai</span></div>
        </div>
      </section>

      <footer className="foot">
        <div>Dukaan · open source (MIT) · Amazon Developer Hackathon, Alexa+ track</div>
        <div className="muted">Demo me sample dukaan ka data hai. Sab kuch aapke browser me rehta hai.</div>
      </footer>
    </main>
  )
}
