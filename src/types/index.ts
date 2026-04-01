export type MessageRole = 'user' | 'assistant' | 'system'
export type PermissionStatus = 'pending' | 'granted' | 'denied'
export type PanelMode = 'split' | 'fullscreen' | 'canvas'
export type AppMode = 'prd' | 'roadmap' | 'codedocs' | 'codereview'
export type Theme = 'dark' | 'light'

export interface Permission {
  id: string
  action: string
  description: string
  status: PermissionStatus
  timestamp: number
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  isReasoning?: boolean
  permission?: Permission
  isStreaming?: boolean
  mode?: AppMode
}

export interface ChatSession {
  id: string
  projectId: string
  name: string
  mode: AppMode
  messages: ChatMessage[]
  prdDoc?: PRDDocument
  roadmapDoc?: RoadmapDocument
  codeDocsDoc?: CodeDocsDocument
  codeReviewDoc?: CodeReviewDocument
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface PRDDocument {
  id: string
  title: string
  template: string
  markdown: string
  createdAt: number
  updatedAt: number
}

// ── Roadmap ──────────────────────────────────────
export interface RoadmapTask {
  id: string
  label: string
  completed: boolean
}

export interface RoadmapSubBlock {
  id: string
  label: string
  tasks: RoadmapTask[]
  collapsed: boolean
}

export interface RoadmapBlock {
  id: string
  label: string
  description?: string
  color: BlockColor
  subBlocks: RoadmapSubBlock[]
  collapsed: boolean
  position: number
}

export type BlockColor = 'indigo' | 'violet' | 'teal' | 'amber' | 'rose' | 'slate'

export interface RoadmapDocument {
  id: string
  title: string
  template: string
  blocks: RoadmapBlock[]
  createdAt: number
  updatedAt: number
}

// ── Code Docs ────────────────────────────────────
export interface CodeFile {
  name: string
  path: string
  content: string
  language: string
  size: number
}

export interface CodeDocsDocument {
  id: string
  title: string
  template: string
  markdown: string
  files: CodeFile[]
  createdAt: number
  updatedAt: number
}

// ── Code Review ──────────────────────────────────
export interface ReviewComment {
  id: string
  file: string
  line?: number
  severity: 'critical' | 'warning' | 'suggestion' | 'praise'
  title: string
  body: string
  codeSnippet?: string
}

export interface CodeReviewDocument {
  id: string
  title: string
  template: string
  markdown: string
  comments: ReviewComment[]
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  groqApiKey: string
  selectedModel: string
  theme: Theme
}

export interface GroqModel {
  id: string
  label: string
  contextWindow: number
}
