import { useEffect, useRef, useState } from 'react'
import { Bot, Copy, Minus, RotateCcw, SendHorizonal, Settings2, SquareCode, User } from 'lucide-react'
import type { ChatMessage } from '@/engine/types'

const QUICK_CHIPS = [
  'Analisis kode di editor',
  'Apa itu async/await?',
  'Cara debounce di JavaScript',
  'Kenapa muncul CORS error?',
]

/** Render markdown-lite: **bold**, baris baru, dan daftar bernomor. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <span key={i}>
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**') ? (
                <strong key={j} className="font-semibold text-foreground">
                  {p.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{p}</span>
              ),
            )}
            {i < text.split('\n').length - 1 && <br />}
          </span>
        )
      })}
    </>
  )
}

interface AssistantWidgetProps {
  open: boolean
  onToggle: (open: boolean) => void
  messages: ChatMessage[]
  streaming: { active: boolean; partial: string; partialCode?: string; partialCodeLang?: string }
  llmReady: boolean
  onSend: (text: string) => void
  onNewChat: () => void
  onOpenSettings: () => void
  onApplyCode: (code: string) => void
}

export default function AssistantWidget({
  open,
  onToggle,
  messages,
  streaming,
  llmReady,
  onSend,
  onNewChat,
  onOpenSettings,
  onApplyCode,
}: AssistantWidgetProps) {
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streaming.partial, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const submit = (text: string) => {
    const t = text.trim()
    if (!t || streaming.active) return
    onSend(t)
    setInput('')
  }

  const copyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        aria-label={open ? 'Tutup asisten AI' : 'Buka asisten AI'}
        className={`assistant-halo fixed bottom-5 right-5 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[hsl(var(--signal)/0.55)] bg-panel-2/95 backdrop-blur-md transition-all duration-200 hover:scale-105 ${
          open ? 'rotate-0' : ''
        }`}
      >
        <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full opacity-40" aria-hidden="true">
          <circle cx="28" cy="28" r="26" fill="none" stroke="hsl(var(--signal))" strokeWidth="1" strokeDasharray="4 7" />
          <g className="radar-sweep">
            <path d="M28 28 L28 2 A26 26 0 0 1 46.4 9.2 Z" fill="hsl(var(--signal)/0.25)" />
          </g>
        </svg>
        <Bot className="relative h-6 w-6 text-[hsl(var(--signal))]" aria-hidden="true" />
        {!open && (
          <span className="led absolute right-1 top-1" aria-hidden="true" />
        )}
      </button>

      {/* Chat panel */}
      <div
        role="dialog"
        aria-label="Asisten AI CodePilot"
        className={`fixed z-50 flex flex-col overflow-hidden rounded-xl border border-hairline bg-panel-1/97 shadow-[0_24px_80px_hsl(222_60%_2%/0.8)] backdrop-blur-xl transition-all duration-200 ease-out ${
          open
            ? 'pointer-events-auto bottom-[92px] right-4 h-[min(600px,calc(100dvh-120px))] w-[min(392px,calc(100vw-32px))] opacity-100'
            : 'pointer-events-none bottom-[92px] right-4 h-[min(600px,calc(100dvh-120px))] w-[min(392px,calc(100vw-32px))] translate-y-3 opacity-0'
        }`}
        style={{ visibility: open ? 'visible' : 'hidden' }}
      >
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-hairline bg-panel-2/70 px-3">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[hsl(var(--signal)/0.4)] bg-[hsl(var(--signal)/0.1)]">
            <Bot className="h-4 w-4 text-[hsl(var(--signal))]" aria-hidden="true" />
            <span className="led absolute -right-0.5 -top-0.5 h-1.5 w-1.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">CodePilot AI</p>
            <p className="chrome-label flex items-center gap-1 text-ink-faint">
              <span
                className="led h-1.5 w-1.5"
                style={{ ['--led-color' as string]: llmReady ? 'var(--ok)' : 'var(--signal)' }}
                aria-hidden="true"
              />
              {llmReady ? 'AI LIVE · TERHUBUNG' : 'ENGINE LOKAL · REAL-TIME'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewChat}
            title="Percakapan baru"
            aria-label="Percakapan baru"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-dim transition-colors duration-150 hover:bg-panel-2 hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Pengaturan AI"
            aria-label="Pengaturan AI"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-dim transition-colors duration-150 hover:bg-panel-2 hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onToggle(false)}
            title="Minimalkan"
            aria-label="Minimalkan asisten"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-dim transition-colors duration-150 hover:bg-panel-2 hover:text-foreground"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite">
          {messages.length === 0 && !streaming.active && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--signal)/0.35)] bg-[hsl(var(--signal)/0.08)]">
                <Bot className="h-6 w-6 text-[hsl(var(--signal))]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Halo! Saya CodePilot.</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
                  Asisten coding real-time — tempel pesan error, minta analisis kode di editor, atau tanya cara
                  ngoding apa saja.
                </p>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`msg-enter flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--signal)/0.35)] bg-[hsl(var(--signal)/0.08)]">
                  <Bot className="h-3.5 w-3.5 text-[hsl(var(--signal))]" aria-hidden="true" />
                </span>
              )}
              <div className={`min-w-0 max-w-[85%] ${m.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[hsl(var(--signal)/0.14)] text-foreground'
                      : 'border-l-2 border-[hsl(var(--signal))] bg-panel-2/80 text-ink-dim'
                  }`}
                >
                  {m.role === 'user' ? (
                    <span className="whitespace-pre-wrap break-words">{m.content}</span>
                  ) : (
                    <RichText text={m.content} />
                  )}
                </div>
                {m.code && (
                  <div className="code-window mt-1.5">
                    <pre>{m.code}</pre>
                    <div className="flex items-center gap-1.5 border-t border-border px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => copyCode(m.id, m.code!)}
                        className="chrome-label flex h-6 cursor-pointer items-center gap-1 rounded border border-border px-2 text-ink-dim transition-colors duration-150 hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        {copiedId === m.id ? 'Tersalin!' : 'Salin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyCode(m.code!)}
                        className="chrome-label flex h-6 cursor-pointer items-center gap-1 rounded bg-[hsl(var(--signal)/0.14)] px-2 text-[hsl(var(--signal))] transition-colors duration-150 hover:bg-[hsl(var(--signal)/0.24)]"
                      >
                        <SquareCode className="h-3 w-3" aria-hidden="true" />
                        Terapkan ke editor
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-hairline bg-panel-2">
                  <User className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
                </span>
              )}
            </div>
          ))}

          {streaming.active && (
            <div className="msg-enter flex gap-2">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--signal)/0.35)] bg-[hsl(var(--signal)/0.08)]">
                <Bot className="h-3.5 w-3.5 text-[hsl(var(--signal))]" aria-hidden="true" />
              </span>
              <div className="min-w-0 max-w-[85%]">
                {streaming.partial ? (
                  <div className="rounded-lg border-l-2 border-[hsl(var(--signal))] bg-panel-2/80 px-3 py-2 text-[13px] leading-relaxed text-ink-dim">
                    <span className="stream-caret">
                      <RichText text={streaming.partial} />
                    </span>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 rounded-lg border-l-2 border-[hsl(var(--signal))] bg-panel-2/80 px-3 py-2.5"
                    aria-label="Asisten sedang mengetik"
                  >
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--signal))]" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--signal))]" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--signal))]" />
                  </div>
                )}
                {streaming.partialCode && (
                  <div className="code-window mt-1.5 opacity-80">
                    <pre>{streaming.partialCode}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick chips */}
        {messages.length <= 1 && !streaming.active && (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2" role="list" aria-label="Saran pertanyaan">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                role="listitem"
                onClick={() => submit(chip)}
                className="chrome-label shrink-0 cursor-pointer rounded-full border border-hairline px-2.5 py-1.5 text-foreground/70 transition-colors duration-150 hover:border-[hsl(var(--signal)/0.6)] hover:text-[hsl(var(--signal))]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
          className="flex shrink-0 items-center gap-2 border-t border-hairline bg-panel-2/70 p-2.5"
        >
          <label htmlFor="assistant-input" className="sr-only">
            Tanya asisten
          </label>
          <input
            id="assistant-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(input)
              }
            }}
            placeholder="Tanya soal coding, tempel pesan error…"
            disabled={streaming.active}
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-md border border-hairline bg-panel-1 px-3 text-[13px] text-foreground placeholder:text-ink-faint focus-visible:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming.active || !input.trim()}
            aria-label="Kirim pesan"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[hsl(var(--signal))] text-[hsl(var(--void))] transition-all duration-150 hover:bg-[hsl(var(--signal)/0.85)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendHorizonal className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  )
}
