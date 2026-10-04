import type { Books, Item, Customer, Sale } from './types'

const I = (id: string, name: string, hi: string, aliases: string[], price: number, qty: number, reorder: number, unit: string): Item =>
  ({ id, name, hi, aliases, price, qty, reorder, unit })

export const seedItems = (): Item[] => [
  I('doodh', 'Doodh (500 ml)', 'दूध', ['doodh', 'dudh', 'milk', 'दूध'], 30, 42, 20, 'packet'),
  I('bread', 'Bread', 'ब्रेड', ['bread', 'braid', 'ब्रेड', 'डबल'], 40, 14, 10, 'packet'),
  I('maggi', 'Maggi', 'मैगी', ['maggi', 'magi', 'noodles', 'मैगी'], 14, 60, 24, 'packet'),
  I('parleg', 'Parle-G', 'पारले जी', ['parleg', 'parle', 'biscuit', 'बिस्कुट', 'पारले'], 10, 80, 30, 'packet'),
  I('atta', 'Atta (5 kg)', 'आटा', ['atta', 'aata', 'आटा'], 250, 9, 6, 'bag'),
  I('chawal', 'Chawal (1 kg)', 'चावल', ['chawal', 'chaval', 'rice', 'चावल'], 70, 25, 10, 'kg'),
  I('chini', 'Chini (1 kg)', 'चीनी', ['chini', 'cheeni', 'sugar', 'चीनी'], 48, 18, 10, 'kg'),
  I('chai', 'Chai patti (250 g)', 'चाय पत्ती', ['chai', 'chaipatti', 'patti', 'चाय', 'पत्ती'], 110, 12, 6, 'packet'),
  I('namak', 'Namak (1 kg)', 'नमक', ['namak', 'salt', 'नमक'], 28, 20, 8, 'packet'),
  I('tel', 'Sarson tel (1 L)', 'सरसों तेल', ['tel', 'oil', 'sarson', 'तेल', 'सरसों'], 150, 7, 5, 'bottle'),
  I('sabun', 'Sabun', 'साबुन', ['sabun', 'soap', 'साबुन'], 38, 22, 10, 'piece'),
  I('ande', 'Ande', 'अंडे', ['ande', 'anda', 'egg', 'eggs', 'अंडे', 'अंडा'], 8, 60, 30, 'piece'),
  I('dahi', 'Dahi (400 g)', 'दही', ['dahi', 'curd', 'दही'], 35, 11, 8, 'cup'),
  I('haldi', 'Haldi (100 g)', 'हल्दी', ['haldi', 'हल्दी'], 30, 16, 6, 'packet'),
  I('colgate', 'Colgate', 'कोलगेट', ['colgate', 'toothpaste', 'paste', 'कोलगेट'], 55, 13, 6, 'piece'),
  I('colddrink', 'Cold drink', 'कोल्ड ड्रिंक', ['colddrink', 'coldrink', 'cola', 'thanda', 'ठंडा'], 40, 18, 10, 'bottle'),
]

const C = (id: string, name: string, hi: string, aliases: string[], balance: number, daysAgo: number): Customer =>
  ({ id, name, hi, aliases, balance, since: Date.now() - daysAgo * 86400000 })

const withContact = (cs: Customer[]): Customer[] => cs.map((c, i) => ({ ...c, phone: `12345000${10 + i}`, code: String(2041 + i * 313).slice(0, 4) }))
export const seedCustomers = (): Customer[] => withContact([
  C('ramesh-gupta', 'Ramesh Gupta', 'रमेश गुप्ता', ['ramesh', 'gupta', 'रमेश', 'गुप्ता'], 1250, 90),
  C('ramesh-sharma', 'Ramesh Sharma', 'रमेश शर्मा', ['ramesh', 'sharma', 'रमेश', 'शर्मा'], 400, 60),
  C('sunita', 'Sunita Devi', 'सुनीता देवी', ['sunita', 'devi', 'सुनीता', 'देवी'], 780, 120),
  C('mohan', 'Mohan Lal', 'मोहन लाल', ['mohan', 'lal', 'मोहन', 'लाल'], 2100, 200),
  C('pooja', 'Pooja Verma', 'पूजा वर्मा', ['pooja', 'puja', 'verma', 'पूजा', 'वर्मा'], 0, 30),
  C('imran', 'Imran Khan', 'इमरान खान', ['imran', 'khan', 'इमरान', 'खान'], 340, 45),
])

// Deterministic pseudo-random so the sample shop looks the same on every reset.
function rng(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
}

export function seedSales(items: Item[]): Sale[] {
  const r = rng(7)
  const sales: Sale[] = []
  const now = new Date()
  const popular = ['doodh', 'bread', 'maggi', 'parleg', 'ande', 'chai', 'sabun', 'chini', 'atta', 'dahi', 'colddrink']
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now); day.setDate(now.getDate() - d); day.setHours(0, 0, 0, 0)
    const count = d === 0 ? 5 : 14 + Math.floor(r() * 10)
    for (let n = 0; n < count; n++) {
      const hour = d === 0 ? 7 + Math.floor(r() * Math.max(1, Math.min(now.getHours() - 7, 8))) : 7 + Math.floor(r() * 14)
      const lines = []
      const k = 1 + Math.floor(r() * 3)
      const seen = new Set<string>()
      for (let j = 0; j < k; j++) {
        const pid = popular[Math.floor(r() * popular.length)]
        if (seen.has(pid)) continue
        seen.add(pid)
        const it = items.find((x) => x.id === pid)!
        lines.push({ itemId: it.id, qty: 1 + Math.floor(r() * 3), price: it.price })
      }
      const ts = day.getTime() + hour * 3600000 + Math.floor(r() * 3500000)
      if (ts > Date.now()) continue
      sales.push({ id: `s${d}-${n}`, ts, lines, total: lines.reduce((a, l) => a + l.qty * l.price, 0) })
    }
  }
  return sales.sort((a, b) => a.ts - b.ts)
}

export function seedBooks(): Books {
  const items = seedItems()
  const customers = seedCustomers()
  return { items, customers, sales: seedSales(items), ledger: [] }
}
