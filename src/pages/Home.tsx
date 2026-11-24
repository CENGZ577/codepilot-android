import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, FileSearch, Sparkles } from 'lucide-react'
import AssistantWidget from '@/components/AssistantWidget'
import CodeEditor from '@/components/CodeEditor'
import DiagnosticsPanel from '@/components/DiagnosticsPanel'
import SettingsDialog from '@/components/SettingsDialog'
import Sidebar from '@/components/Sidebar'
import StatusBar from '@/components/StatusBar'
import { composeLocalReply, streamReply, SAMPLES } from '@/engine/assistant'
import { analyzeCode } from '@/engine/diagnostics'
import { isLLMReady, loadLLMConfig, saveLLMConfig, chatLLM } from '@/engine/llm'
import type { ChatMessage, ChatSession, Diagnostic, Language, LLMConfig } from '@/engine/types'

const SESSIONS_KEY = 'codepilot:sessions'
const CURRENT_KEY = 'codepilot:current'

function uid() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    return []
  }
}

function loadCurrent(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    return raw ? (JSON.parse(raw) as ChatMessage[]) : []
  } catch {
    return []
  }
}

const COMMENT_SEP: Record<Language, { open: string; close: string }> = {
  javascript: { open: '// ── Perbaikan dari CodePilot ──', close: '' },
  typescript: { open: '// ── Perbaikan dari CodePilot ──', close: '' },
  python: { open: '# ── Perbaikan dari CodePilot ──', close: '' },
  java: { open: '// ── Perbaikan dari CodePilot ──', close: '' },
  php: { open: '// ── Perbaikan dari CodePilot ──', close: '' },
  cpp: { open: '// ── Perbaikan dari CodePilot ──', close: '' },
  sql: { open: '-- ── Perbaikan dari CodePilot ──', close: '' },
  css: { open: '/* ── Perbaikan dari CodePilot ── */', close: '' },
  html: { open: '<!-- ── Perbaikan dari CodePilot ── -->', close: '' },
}

export default function Home() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<Language>('javascript')
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [scanned, setScanned] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const [assistantOpen, setAssistantOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(loadCurrent)
  const [streaming, setStreaming] = useState<{
    active: boolean
    partial: string
    partialCode?: string
    partialCodeLang?: string
  }>({ active: false, partial: '' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(loadLLMConfig)
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions)

  const streamCancel = useRef<{ cancelled: boolean }>({ cancelled: false })
  const llmAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  }, [sessions])

  const runAnalysis = useCallback(() => {
    setAnalyzing(true)
    // Jeda singkat memberi kesan pemindaian nyata dan menampilkan skeleton
    window.setTimeout(() => {
      setDiagnostics(analyzeCode(code, language))
      setScanned(true)
      setAnalyzing(false)
    }, 650)
  }, [code, language])

  const pushAssistantMessage = useCallback((content: string, engine: 'local' | 'llm', extraCode?: string, codeLang?: string) => {
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'assistant', content, code: extraCode, codeLang, createdAt: Date.now(), engine },
    ])
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming.active) return
      const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, createdAt: Date.now(), engine: 'local' }
      const history = [...messages, userMsg]
      setMessages(history)
      setStreaming({ active: true, partial: '' })
      streamCancel.current = { cancelled: false }

      const ctx = { code, language }

      if (isLLMReady(llmConfig)) {
        llmAbort.current = new AbortController()
        try {
          let acc = ''
          const full = await chatLLM(llmConfig, history, {
            onDelta: (d) => {
              acc += d
              setStreaming({ active: true, partial: acc })
            },
            signal: llmAbort.current.signal,
          })
          if (!streamCancel.current.cancelled) {
            pushAssistantMessage(full || acc, 'llm')
          }
          setStreaming({ active: false, partial: '' })
          return
        } catch (err) {
          if (streamCancel.current.cancelled || (err instanceof DOMException && err.name === 'AbortError')) {
            setStreaming({ active: false, partial: '' })
            return
          }
          // Jatuh ke engine lokal dengan pemberitahuan singkat
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              content: `Koneksi LLM gagal (${err instanceof Error ? err.message : 'error tidak diketahui'}). Saya jawab dengan engine lokal:`,
              createdAt: Date.now(),
              engine: 'local',
            },
          ])
        }
      }

      const reply = composeLocalReply(text, ctx)
      const final = await streamReply(reply, (partial) => {
        if (!streamCancel.current.cancelled)
          setStreaming({
            active: true,
            partial: partial.content,
            partialCode: partial.code,
            partialCodeLang: partial.codeLang,
          })
      }, streamCancel.current)
      setStreaming({ active: false, partial: '' })
      if (!streamCancel.current.cancelled) {
        pushAssistantMessage(final.content, 'local', final.code, final.codeLang)
      }
    },
    [code, language, llmConfig, messages, pushAssistantMessage, streaming.active],
  )

  const archiveCurrent = useCallback((): ChatSession[] => {
    if (messages.length === 0) return sessions
    const firstUser = messages.find((m) => m.role === 'user')
    const session: ChatSession = {
      id: uid(),
      title: firstUser ? firstUser.content.slice(0, 42) : 'Percakapan kosong',
      createdAt: messages[0]?.createdAt ?? Date.now(),
      messages,
    }
    const next = [session, ...sessions].slice(0, 20)
    setSessions(next)
    setMessages([])
    return next
  }, [messages, sessions])

  const newChat = useCallback(() => {
    streamCancel.current.cancelled = true
    llmAbort.current?.abort()
    setStreaming({ active: false, partial: '' })
    archiveCurrent()
  }, [archiveCurrent])

  const loadSession = useCallback(
    (id: string) => {
      const target = sessions.find((s) => s.id === id)
      if (!target) return
      if (messages.length > 0) archiveCurrent()
      setSessions((prev) => prev.filter((s) => s.id !== id))
      setMessages(target.messages)
      setAssistantOpen(true)
    },
    [sessions, messages, archiveCurrent],
  )

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const applyCodeToEditor = useCallback(
    (snippet: string) => {
      const sep = COMMENT_SEP[language]
      const block = `${code.trimEnd()}\n\n${sep.open}${sep.close ? '' : ''}\n${snippet}\n`
      setCode(block)
      window.setTimeout(() => {
        setDiagnostics(analyzeCode(block, language))
        setScanned(true)
      }, 250)
    },
    [code, language],
  )

  const explainInChat = useCallback(
    async (diag: Diagnostic) => {
      setAssistantOpen(true)
      const prompt = `Kenapa ini masalah: "${diag.title}" di baris ${diag.line}?`
      const userMsg: ChatMessage = { id: uid(), role: 'user', content: prompt, createdAt: Date.now(), engine: 'local' }
      setMessages((prev) => [...prev, userMsg])
      setStreaming({ active: true, partial: '' })
      streamCancel.current = { cancelled: false }
      const reply = `${diag.detail}\n\n**Cara memperbaiki:** ${diag.fix}`
      const final = await streamReply(
        { content: reply, code: diag.fixCode, codeLang: diag.language },
        (partial) => {
          if (!streamCancel.current.cancelled)
            setStreaming({
              active: true,
              partial: partial.content,
              partialCode: partial.code,
              partialCodeLang: partial.codeLang,
            })
        },
        streamCancel.current,
      )
      setStreaming({ active: false, partial: '' })
      if (!streamCancel.current.cancelled) {
        pushAssistantMessage(final.content, 'local', final.code, final.codeLang)
      }
    },
    [pushAssistantMessage],
  )

  const loadSample = useCallback(() => {
    const sample = SAMPLES[language]
    setCode(sample.code)
    setScanned(false)
    window.setTimeout(() => {
      setDiagnostics(analyzeCode(sample.code, language))
      setScanned(true)
    }, 350)
  }, [language])

  const saveConfig = useCallback((cfg: LLMConfig) => {
    setLlmConfig(cfg)
    saveLLMConfig(cfg)
  }, [])

  const clearHistory = useCallback(() => {
    setSessions([])
    setMessages([])
    localStorage.removeItem(SESSIONS_KEY)
    localStorage.removeItem(CURRENT_KEY)
  }, [])

  const llmReady = isLLMReady(llmConfig)

  return (
    <div className="scanlines radial-depth flex min-h-100dvh flex-col p-3 sm:p-4">
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3">
        {/* Top bar mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <img src="/icons/icon-192.png" alt="Logo CodePilot" className="h-7 w-7 rounded" />
          <span className="text-sm font-bold tracking-wide text-foreground">CODEPILOT</span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={loadSample}
              title="Muat contoh kode bermasalah"
              aria-label="Muat contoh kode"
              className="chrome-label flex h-8 cursor-pointer items-center gap-1.5 rounded border border-hairline px-2 text-foreground/80 sm:px-2.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--warn))]" aria-hidden="true" />
              <span className="hidden sm:inline">Contoh</span>
            </button>
            <button
              type="button"
              onClick={runAnalysis}
              aria-label="Analisis kode"
              className="chrome-label flex h-8 cursor-pointer items-center gap-1.5 rounded border border-hairline px-2 text-foreground/80 sm:px-2.5"
            >
              <FileSearch className="h-3.5 w-3.5 text-[hsl(var(--signal))]" aria-hidden="true" />
              <span className="hidden sm:inline">Analisis</span>
            </button>
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              aria-label="Buka panel asisten"
              className="chrome-label flex h-8 cursor-pointer items-center gap-1.5 rounded bg-[hsl(var(--signal))] px-2 font-semibold text-[hsl(var(--void))] sm:px-2.5"
            >
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Asisten</span>
            </button>
          </div>
        </div>

        {/* Main grid */}
        <main className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <div className="hidden lg:flex">
            <Sidebar
              sessions={sessions}
              currentCount={messages.length}
              assistantOpen={assistantOpen}
              onAnalyze={runAnalysis}
              onLoadSample={loadSample}
              onToggleAssistant={() => setAssistantOpen((o) => !o)}
              onLoadSession={loadSession}
              onDeleteSession={deleteSession}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <CodeEditor
              code={code}
              language={language}
              analyzing={analyzing}
              onChange={(c) => {
                setCode(c)
                setScanned(false)
              }}
              onLanguageChange={(l) => {
                setLanguage(l)
                setScanned(false)
                setDiagnostics([])
              }}
              onAnalyze={runAnalysis}
              onLoadSample={loadSample}
            />
            <div className="hidden lg:block">
              <StatusBar issueCount={diagnostics.length} scanned={scanned} engineLabel={llmReady ? 'AI LIVE · LLM' : 'ENGINE LOKAL'} />
            </div>
          </div>

          <div className="h-[440px] w-full shrink-0 lg:h-auto lg:w-[340px]">
            <DiagnosticsPanel
              diagnostics={diagnostics}
              scanned={scanned}
              analyzing={analyzing}
              onApplyFix={applyCodeToEditor}
              onExplainInChat={explainInChat}
            />
          </div>

          <div className="lg:hidden">
            <StatusBar issueCount={diagnostics.length} scanned={scanned} engineLabel={llmReady ? 'AI LIVE' : 'LOKAL'} />
          </div>
        </main>
      </div>

      <AssistantWidget
        open={assistantOpen}
        onToggle={setAssistantOpen}
        messages={messages}
        streaming={streaming}
        llmReady={llmReady}
        onSend={sendMessage}
        onNewChat={newChat}
        onOpenSettings={() => setSettingsOpen(true)}
        onApplyCode={applyCodeToEditor}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={llmConfig}
        onSave={saveConfig}
        onClearHistory={clearHistory}
      />
    </div>
  )
}
