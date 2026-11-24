import { Bot, FileSearch, History, MessageSquare, Play, Sparkles, Trash2, Zap } from 'lucide-react'
import type { ChatSession } from '@/engine/types'

interface SidebarProps {
  sessions: ChatSession[]
  currentCount: number
  assistantOpen: boolean
  onAnalyze: () => void
  onLoadSample: () => void
  onToggleAssistant: () => void
  onLoadSession: (id: string) => void
  onDeleteSession: (id: string) => void
}

export default function Sidebar({
  sessions,
  currentCount,
  assistantOpen,
  onAnalyze,
  onLoadSample,
  onToggleAssistant,
  onLoadSession,
  onDeleteSession,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card" aria-label="Navigasi">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-border px-3 py-3">
        <img src="/icons/icon-192.png" alt="Logo CodePilot" className="h-8 w-8 rounded-md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-wide text-foreground">CODEPILOT</p>
          <p className="chrome-label text-ink-faint">AI Coding Assistant</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-1.5 border-b border-border p-2.5">
        <button
          type="button"
          onClick={onAnalyze}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-hairline px-2.5 text-[13px] text-foreground/85 transition-colors duration-150 hover:border-[hsl(var(--signal)/0.55)] hover:text-[hsl(var(--signal))]"
        >
          <FileSearch className="h-4 w-4 shrink-0 text-[hsl(var(--signal))]" aria-hidden="true" />
          Analisis Kode
        </button>
        <button
          type="button"
          onClick={onLoadSample}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-hairline px-2.5 text-[13px] text-foreground/85 transition-colors duration-150 hover:border-[hsl(var(--signal)/0.55)] hover:text-[hsl(var(--signal))]"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-[hsl(var(--warn))]" aria-hidden="true" />
          Muat Contoh Bug
        </button>
        <button
          type="button"
          onClick={onToggleAssistant}
          aria-pressed={assistantOpen}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md bg-[hsl(var(--signal)/0.13)] px-2.5 text-[13px] font-medium text-[hsl(var(--signal))] transition-colors duration-150 hover:bg-[hsl(var(--signal)/0.22)]"
        >
          <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
          {assistantOpen ? 'Tutup Asisten' : 'Buka Asisten AI'}
        </button>
      </div>

      {/* History */}
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="chrome-label flex items-center gap-1.5 px-3 pb-1.5 pt-2.5 text-ink-faint">
          <History className="h-3 w-3" aria-hidden="true" />
          Riwayat Chat
        </p>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {currentCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--signal)/0.35)] bg-[hsl(var(--signal)/0.07)] px-2 py-1.5">
              <Zap className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--signal))]" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-foreground">Sesi berjalan</span>
                <span className="chrome-label text-[9px] text-ink-faint">{currentCount} pesan</span>
              </span>
              <Play className="h-3 w-3 text-[hsl(var(--signal))]" aria-hidden="true" />
            </div>
          )}
          {sessions.length === 0 && currentCount === 0 && (
            <p className="px-2 py-3 text-center text-[11px] leading-relaxed text-ink-faint">
              Belum ada riwayat. Mulai ngobrol dengan asisten — percakapan tersimpan otomatis di browser ini.
            </p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="group flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 transition-colors duration-150 hover:border-hairline hover:bg-panel-2"
            >
              <button
                type="button"
                onClick={() => onLoadSession(s.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
                title={`Buka: ${s.title}`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-xs text-foreground/85">{s.title}</span>
                  <span className="chrome-label text-[9px] text-ink-faint">
                    {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteSession(s.id)}
                aria-label={`Hapus sesi ${s.title}`}
                title="Hapus sesi"
                className="hidden h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-ink-faint transition-colors duration-150 hover:text-[hsl(var(--crit))] group-hover:flex"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
