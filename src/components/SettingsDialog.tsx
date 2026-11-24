import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, Loader2, PlugZap, Trash2, XCircle } from 'lucide-react'
import type { LLMConfig } from '@/engine/types'
import { chatLLM } from '@/engine/llm'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: LLMConfig
  onSave: (cfg: LLMConfig) => void
  onClearHistory: () => void
}

export default function SettingsDialog({ open, onOpenChange, config, onSave, onClearHistory }: SettingsDialogProps) {
  const [draft, setDraft] = useState<LLMConfig>(config)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const update = (patch: Partial<LLMConfig>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setTestResult(null)
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await chatLLM(
        { ...draft, enabled: true },
        [{ id: 't', role: 'user', content: 'Balas hanya dengan kata: OK', createdAt: 0, engine: 'local' }],
        { onDelta: () => {} },
      )
      const ok = res.trim().length > 0
      setTestResult(ok ? { ok: true, msg: 'Terhubung! Koneksi API berhasil.' } : { ok: false, msg: 'Response kosong dari API.' })
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Koneksi gagal.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hairline bg-panel-1 text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4 text-[hsl(var(--signal))]" aria-hidden="true" />
            Pengaturan AI
          </DialogTitle>
          <DialogDescription className="text-ink-dim">
            Sambungkan API OpenAI-compatible milikmu untuk jawaban AI bebas. Tanpa koneksi, CodePilot berjalan
            dengan engine lokal berbasis basis pengetahuan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Engine toggle */}
          <div className="flex items-center justify-between rounded-lg border border-hairline bg-panel-2/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Gunakan LLM eksternal</p>
              <p className="text-xs text-ink-dim">
                {draft.enabled ? 'AI live aktif untuk chat' : 'Engine lokal (offline) aktif'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              onClick={() => update({ enabled: !draft.enabled })}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                draft.enabled ? 'bg-[hsl(var(--signal))]' : 'bg-hairline'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-panel-1 transition-transform duration-200 ${
                  draft.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label htmlFor="cfg-baseurl" className="chrome-label mb-1 block text-ink-dim">
                Base URL
              </label>
              <input
                id="cfg-baseurl"
                value={draft.baseUrl}
                onChange={(e) => update({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                spellCheck={false}
                className="mono h-9 w-full rounded-md border border-hairline bg-panel-1 px-3 text-[13px] text-foreground placeholder:text-ink-faint focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="cfg-model" className="chrome-label mb-1 block text-ink-dim">
                Model
              </label>
              <input
                id="cfg-model"
                value={draft.model}
                onChange={(e) => update({ model: e.target.value })}
                placeholder="gpt-4o-mini"
                spellCheck={false}
                className="mono h-9 w-full rounded-md border border-hairline bg-panel-1 px-3 text-[13px] text-foreground placeholder:text-ink-faint focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="cfg-key" className="chrome-label mb-1 block text-ink-dim">
                API Key
              </label>
              <input
                id="cfg-key"
                type="password"
                value={draft.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder="sk-…"
                autoComplete="off"
                className="mono h-9 w-full rounded-md border border-hairline bg-panel-1 px-3 text-[13px] text-foreground placeholder:text-ink-faint focus-visible:outline-none"
              />
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                Key hanya tersimpan di browser kamu (localStorage) dan dikirim langsung ke provider yang kamu isi.
              </p>
            </div>
          </div>

          {testResult && (
            <p
              role="status"
              className={`flex items-start gap-1.5 rounded-md border px-2.5 py-2 text-xs leading-relaxed ${
                testResult.ok
                  ? 'border-[hsl(var(--ok)/0.4)] bg-[hsl(var(--ok)/0.08)] text-[hsl(var(--ok))]'
                  : 'border-[hsl(var(--crit)/0.4)] bg-[hsl(var(--crit)/0.08)] text-[hsl(var(--crit))]'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              {testResult.msg}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={test}
              disabled={testing || !draft.apiKey.trim()}
              className="chrome-label flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-hairline text-foreground/80 transition-colors duration-150 hover:border-[hsl(var(--signal)/0.5)] hover:text-[hsl(var(--signal))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Tes Koneksi
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft)
                onOpenChange(false)
              }}
              className="chrome-label flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[hsl(var(--signal))] font-semibold text-[hsl(var(--void))] transition-colors duration-150 hover:bg-[hsl(var(--signal)/0.85)]"
            >
              Simpan
            </button>
          </div>

          <div className="border-t border-hairline pt-3">
            <button
              type="button"
              onClick={() => {
                onClearHistory()
                onOpenChange(false)
              }}
              className="chrome-label flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[hsl(var(--crit)/0.4)] text-[hsl(var(--crit))] transition-colors duration-150 hover:bg-[hsl(var(--crit)/0.1)]"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Hapus Semua Riwayat Chat
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
