// Tiny key/value store on Cloudflare D1 (strongly consistent), same get/set/setJSON shape the API code expects.
let ready = false
export async function init(db) {
  if (ready) return
  await db.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)')
  ready = true
}
export function getStore(db) {
  return {
    async get(key, opts) {
      const row = await db.prepare('SELECT v FROM kv WHERE k = ?').bind(key).first()
      if (!row) return null
      return opts && opts.type === 'json' ? JSON.parse(row.v) : row.v
    },
    async set(key, val) {
      await db.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(key, String(val)).run()
    },
    async setJSON(key, obj) { return this.set(key, JSON.stringify(obj)) },
  }
}
