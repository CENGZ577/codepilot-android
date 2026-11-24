export type Severity = 'critical' | 'warning' | 'info'

export type Language =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'php'
  | 'cpp'
  | 'sql'
  | 'html'
  | 'css'

export interface Diagnostic {
  id: string
  severity: Severity
  line: number
  title: string
  detail: string
  fix: string
  fixCode?: string
  language: Language
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
  codeLang?: string
  createdAt: number
  engine: 'local' | 'llm'
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  messages: ChatMessage[]
}

export interface AssistantReply {
  content: string
  code?: string
  codeLang?: string
}

export interface LLMConfig {
  enabled: boolean
  baseUrl: string
  apiKey: string
  model: string
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  php: 'PHP',
  cpp: 'C++',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
}
