import { useEffect, useRef } from 'react'
import { FileCode2, Loader2, Play, Sparkles } from 'lucide-react'
import type { Language } from '@/engine/types'
import { LANGUAGE_LABELS } from '@/engine/types'

interface CodeEditorProps {
  code: string
  language: Language
  analyzing: boolean
  onChange: (code: string) => void
  onLanguageChange: (lang: Language) => void
  onAnalyze: () => void
  onLoadSample: () => void
}

const LANGUAGES: Language[] = ['javascript', 'typescript', 'python', 'java', 'php', 'cpp', 'sql', 'html', 'css']

export default function CodeEditor({
  code,
  language,
  analyzing,
  onChange,
  onLanguageChange,
  onAnalyze,
  onLoadSample,
}: CodeEditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineCount = code ? code.split('\n').length : 1

  useEffect(() => {
    const ta = textareaRef.current
    const gu = gutterRef.current
    if (ta && gu) gu.scrollTop = ta.scrollTop
  }, [code])

  return (
    <section
      aria-label="Editor kode"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      {/* Title bar */}
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-panel-2/60 px-3">
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--crit)/0.85)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--warn)/0.85)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--ok)/0.85)]" />
        </div>
        <span className="chrome-label hidden items-center gap-1.5 text-foreground/80 md:flex">
          <FileCode2 className="h-3.5 w-3.5 text-[hsl(var(--signal))]" aria-hidden="true" />
          workspace / main.{language === 'cpp' ? 'cpp' : language}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="lang-select" className="chrome-label sr-only">
            Bahasa pemrograman
          </label>
          <select
            id="lang-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="h-7 cursor-pointer rounded border border-border bg-panel-1 px-2 text-xs text-foreground focus-visible:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onLoadSample}
            className="chrome-label hidden h-7 cursor-pointer items-center gap-1.5 rounded border border-border px-2.5 text-foreground/70 transition-colors duration-150 hover:border-[hsl(var(--signal)/0.5)] hover:text-[hsl(var(--signal))] sm:flex"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Muat Contoh
          </button>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={analyzing || !code.trim()}
            aria-label={analyzing ? 'Memindai kode' : 'Analisis kode'}
            className="chrome-label flex h-7 cursor-pointer items-center gap-1.5 rounded bg-[hsl(var(--signal))] px-2 font-semibold text-[hsl(var(--void))] transition-all duration-150 hover:bg-[hsl(var(--signal)/0.88)] disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
          >
            {analyzing ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-3 w-3" aria-hidden="true" />
            )}
            {analyzing ? 'Memindai…' : 'Analisis'}
          </button>
        </div>
      </header>

      {/* Editor body */}
      <div className="relative flex min-h-0 flex-1">
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="editor-line-numbers hidden overflow-hidden sm:block"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={
            '// Tempel kode kamu di sini…\n// Lalu klik ANALISIS atau tanya asisten lewat tombol mengambang di kanan bawah.\n\n// Contoh tanyaan:\n// "analisis kode ini"\n// "TypeError: Cannot read properties of undefined"'
          }
          aria-label="Kode sumber"
          className="editor-textarea min-h-[280px] h-full w-full flex-1 sm:min-h-0"
        />
      </div>

      {/* Footer info */}
      <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-panel-2/60 px-3">
        <span className="chrome-label text-foreground/50">{LANGUAGE_LABELS[language]}</span>
        <span className="chrome-label text-foreground/50">
          {lineCount} baris · {code.length} karakter
        </span>
        <span className="chrome-label ml-auto hidden items-center gap-1.5 text-[hsl(var(--ok))] md:flex">
          <span className="led" style={{ ['--led-color' as string]: 'var(--ok)' }} />
          UTF-8
        </span>
      </footer>
    </section>
  )
}
