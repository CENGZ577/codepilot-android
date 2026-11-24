import { useEffect, useState } from 'react'

const TIPS = [
  'Tempel pesan error lengkap (dari "at ..." sampai akhir) agar saya bisa pinpoint penyebabnya',
  'Gunakan === bukan == di JavaScript — hindari coercion tipe yang tak terduga',
  'Selalu cek res.ok sebelum res.json() — fetch tidak melempar error untuk HTTP 500',
  'Prepared statement adalah satu-satunya jawaban untuk SQL injection',
  'while (true) tanpa break = thread beku. Pastikan ada jalan keluar',
  'Jangan simpan API key di source code — pakai environment variable',
  'DELETE tanpa WHERE menghapus seluruh tabel. Uji dengan SELECT dulu',
  'Koma di akhir object valid di JS tapi merusak JSON.parse',
  'Gunakan optional chaining ?. untuk data dari API yang bisa kosong',
  'equals() di Java, bukan ==, untuk membandingkan isi String',
]

interface StatusBarProps {
  issueCount: number
  scanned: boolean
  engineLabel: string
}

export default function StatusBar({ issueCount, scanned, engineLabel }: StatusBarProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <footer className="flex h-9 shrink-0 items-stretch overflow-hidden rounded-lg border border-border bg-card" aria-label="Status">
      <div className="flex items-center gap-2 border-r border-border bg-panel-2/60 px-3">
        <span
          className="led"
          style={{ ['--led-color' as string]: scanned && issueCount > 0 ? 'var(--warn)' : 'var(--ok)' }}
          aria-hidden="true"
        />
        <span className="chrome-label whitespace-nowrap text-foreground/70">
          {scanned ? (issueCount === 0 ? 'KODE BERSIH' : `${issueCount} TEMUAN`) : 'STANDBY'}
        </span>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden" aria-label="Tips coding">
        <div className="ticker-track flex h-full w-max items-center">
          {[...TIPS, ...TIPS].map((tip, i) => (
            <span key={i} className="chrome-label flex h-full items-center whitespace-nowrap px-6 text-ink-faint">
              <span className="mr-2 text-[hsl(var(--signal))]" aria-hidden="true">
                ▸
              </span>
              {tip}
            </span>
          ))}
        </div>
      </div>

      <div className="hidden items-center gap-3 border-l border-border bg-panel-2/60 px-3 md:flex">
        <span className="chrome-label whitespace-nowrap text-ink-faint">{engineLabel}</span>
        <span className="mono text-[10.5px] whitespace-nowrap text-foreground/60 tabular-nums">
          {now.toLocaleTimeString('id-ID')}
        </span>
      </div>
    </footer>
  )
}
