import { useState } from 'react'
import { Activity, ChevronDown, ClipboardCheck, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { Diagnostic } from '@/engine/types'
import { healthScore } from '@/engine/diagnostics'

const SEVERITY_META = {
  critical: { label: 'Kritis', color: 'var(--crit)' },
  warning: { label: 'Peringatan', color: 'var(--warn)' },
  info: { label: 'Info', color: 'var(--signal)' },
} as const

interface DiagnosticsPanelProps {
  diagnostics: Diagnostic[]
  scanned: boolean
  analyzing: boolean
  onApplyFix: (fixCode: string) => void
  onExplainInChat: (diag: Diagnostic) => void
}

export default function DiagnosticsPanel({
  diagnostics,
  scanned,
  analyzing,
  onApplyFix,
  onExplainInChat,
}: DiagnosticsPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const score = healthScore(diagnostics)
  const criticalCount = diagnostics.filter((d) => d.severity === 'critical').length

  const copyFix = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  return (
    <section
      aria-label="Diagnostik kode"
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-panel-2/60 px-3">
        <Activity className="h-4 w-4 text-[hsl(var(--signal))]" aria-hidden="true" />
        <span className="chrome-label text-foreground/80">Diagnostik</span>
        <span
          className={`chrome-label ml-auto rounded px-1.5 py-0.5 ${
            !scanned
              ? 'bg-panel-2 text-ink-faint'
              : criticalCount > 0
                ? 'bg-crit/15 text-crit'
                : diagnostics.length > 0
                  ? 'bg-warn/15 text-warn'
                  : 'bg-ok/15 text-ok'
          }`}
        >
          {!scanned ? 'BELUM DIPINDAI' : `${diagnostics.length} TEMUAN`}
        </span>
      </header>

      {/* Health score */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3">
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center"
          role="img"
          aria-label={`Skor kesehatan kode ${score} dari 100`}
        >
          <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden="true">
            <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--hairline))" strokeWidth="4" />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke={score >= 90 ? 'hsl(var(--ok))' : score >= 60 ? 'hsl(var(--warn))' : 'hsl(var(--crit))'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 150.8} 150.8`}
              className="transition-all duration-500"
            />
          </svg>
          <span className="mono absolute text-sm font-semibold text-foreground">{score}</span>
        </div>
        <div className="min-w-0">
          <p className="chrome-label text-foreground/60">Skor kesehatan</p>
          <p className="truncate text-sm text-foreground/90">
            {!scanned
              ? 'Jalankan analisis untuk memindai kode.'
              : diagnostics.length === 0
                ? 'Bersih — tidak ada temuan.'
                : criticalCount > 0
                  ? `${criticalCount} masalah kritis perlu segera diperbaiki.`
                  : 'Tidak ada masalah kritis.'}
          </p>
        </div>
      </div>

      {/* Findings list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {analyzing && (
          <div className="space-y-2 p-1" aria-label="Memindai kode">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-md border border-border bg-panel-2/70"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        )}
        {!analyzing && !scanned && (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-center">
            <ShieldCheck className="h-6 w-6 text-ink-faint" aria-hidden="true" />
            <p className="text-sm text-ink-dim">
              Isi editor, lalu klik <span className="mono text-[hsl(var(--signal))]">ANALISIS</span> — temuan bug,
              risiko keamanan, dan anti-pattern akan muncul di sini lengkap dengan perbaikannya.
            </p>
          </div>
        )}
        {!analyzing && scanned && diagnostics.length === 0 && (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-center">
            <ShieldCheck className="h-6 w-6 text-[hsl(var(--ok))]" aria-hidden="true" />
            <p className="text-sm text-ink-dim">
              Tidak ada temuan pada pola yang dipindai. Kode ini bersih dari bug umum, kredensial bocor, dan
              anti-pattern.
            </p>
          </div>
        )}
        {!analyzing &&
          diagnostics.map((d) => {
            const meta = SEVERITY_META[d.severity]
            const isOpen = expanded === d.id
            return (
              <article key={d.id} className="mb-1.5 overflow-hidden rounded-md border border-border bg-panel-2/50">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-panel-2"
                >
                  <span
                    className={`led mt-1.5 shrink-0 ${d.severity !== 'critical' ? 'led-static' : ''}`}
                    style={{ ['--led-color' as string]: meta.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">{d.title}</span>
                    <span className="chrome-label mt-0.5 block text-ink-faint">
                      {meta.label} · baris {d.line}
                    </span>
                  </span>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border px-3 pb-3 pt-2.5">
                    <p className="text-[13px] leading-relaxed text-ink-dim">{d.detail}</p>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/90">
                      <span className="chrome-label mb-1 block text-[hsl(var(--signal))]">Perbaikan</span>
                      {d.fix}
                    </p>
                    {d.fixCode && (
                      <div className="code-window mt-2.5">
                        <pre>{d.fixCode}</pre>
                        <div className="flex items-center gap-1.5 border-t border-border px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => onApplyFix(d.fixCode!)}
                            className="chrome-label flex h-6 cursor-pointer items-center gap-1 rounded bg-[hsl(var(--signal)/0.14)] px-2 text-[hsl(var(--signal))] transition-colors duration-150 hover:bg-[hsl(var(--signal)/0.24)]"
                          >
                            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                            Terapkan ke editor
                          </button>
                          <button
                            type="button"
                            onClick={() => copyFix(d.id, d.fixCode!)}
                            className="chrome-label flex h-6 cursor-pointer items-center gap-1 rounded border border-border px-2 text-ink-dim transition-colors duration-150 hover:text-foreground"
                          >
                            <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
                            {copied === d.id ? 'Tersalin!' : 'Salin'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onExplainInChat(d)}
                            className="chrome-label ml-auto flex h-6 cursor-pointer items-center rounded border border-border px-2 text-ink-dim transition-colors duration-150 hover:text-foreground"
                          >
                            Jelaskan di chat
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
      </div>
    </section>
  )
}
