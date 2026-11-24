import type { ChatMessage, LLMConfig } from './types'

const STORAGE_KEY = 'codepilot:llm-config'

export const DEFAULT_CONFIG: LLMConfig = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
}

export function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveLLMConfig(cfg: LLMConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function isLLMReady(cfg: LLMConfig): boolean {
  return cfg.enabled && cfg.apiKey.trim().length > 0 && cfg.baseUrl.trim().length > 0
}

const SYSTEM_PROMPT = `Kamu adalah CodePilot, asisten AI untuk programmer berbahasa Indonesia.
Tugasmu: membantu coding, memperbaiki bug dan error, menjelaskan konsep, dan menganalisis kode.
Aturan:
- Jawab selalu dalam Bahasa Indonesia yang natural.
- Saat memberi kode, sertakan penjelasan singkat mengapa perbaikan itu bekerja.
- Jika pesan berisi pesan error/stack trace, jelaskan penyebab paling mungkin dan langkah perbaikan berurutan.
- Jika tidak yakin, katakan dengan jujur daripada mengarang.
- Format blok kode dengan markdown.`

interface StreamCallbacks {
  onDelta: (text: string) => void
  signal?: AbortSignal
}

/**
 * Chat ke endpoint OpenAI-compatible (/chat/completions) dengan streaming SSE.
 * Mengembalikan teks lengkap; melempar Error dengan pesan yang bisa ditampilkan.
 */
export async function chatLLM(
  config: LLMConfig,
  history: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<string> {
  const url = config.baseUrl.replace(/\/+$/, '') + '/chat/completions'
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
  ]

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      temperature: 0.3,
    }),
    signal: callbacks.signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let hint = `HTTP ${res.status}`
    if (res.status === 401) hint = '401 — API key salah atau kedaluwarsa'
    else if (res.status === 404) hint = '404 — cek base URL dan nama model'
    else if (res.status === 429) hint = '429 — kuota habis / rate limit'
    throw new Error(`Gagal menghubungi LLM (${hint}). ${body.slice(0, 200)}`)
  }

  if (!res.body) throw new Error('Response streaming tidak tersedia di browser ini.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') {
        return full
      }
      try {
        const json = JSON.parse(payload)
        const delta: string = json.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          full += delta
          callbacks.onDelta(delta)
        }
      } catch {
        // baris JSON tidak lengkap — abaikan
      }
    }
  }
  return full
}
