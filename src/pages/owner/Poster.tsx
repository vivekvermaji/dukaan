import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../../lib/api'

export default function Poster() {
  const [qr, setQr] = useState('')
  const [shop, setShop] = useState('Dukaan')
  const url = `${location.origin}/pay`
  useEffect(() => {
    api.config().then((c) => setShop(c.shop || 'Dukaan')).catch(() => {})
    QRCode.toDataURL(url, { margin: 1, width: 720, color: { dark: '#000000', light: '#ffffff' } }).then(setQr)
  }, [url])
  return (
    <>
      <div className="page-head no-print">
        <div><h1>Print karne wala QR</h1><p>Isse print karke counter pe laga do. Customer scan karega toh seedha payment page khulega, aapka phone paas ho ya na ho.</p></div>
        <button className="btn" onClick={() => window.print()}>Print karo</button>
      </div>
      <div className="poster">
        <div className="poster-shop">{shop}</div>
        <h2>Online payment ke liye scan karo</h2>
        {qr && <img src={qr} alt="Payment page ka QR" />}
        <p>Scan karo, UPI se pay karo, aur UTR daalo.<br />Dukaandaar confirm karega, aapka khata kam ho jayega.</p>
        <code>{url}</code>
      </div>
    </>
  )
}
