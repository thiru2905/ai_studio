import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  ChatMessage, PRDDocument, PanelMode, AppSettings, Permission,
  AppMode, RoadmapDocument, RoadmapBlock, RoadmapSubBlock, RoadmapTask,
  BlockColor, Theme, CodeDocsDocument, CodeReviewDocument, CodeFile, ReviewComment, ChatSession, Project
} from '@/types'
import { v4 as uuidv4 } from 'uuid'

const BLOCK_COLORS: BlockColor[] = ['indigo','violet','teal','amber','rose','slate']
type MessageKey = 'prdMessages' | 'roadmapMessages' | 'codeDocsMessages' | 'codeReviewMessages'
const MESSAGE_KEY_BY_MODE: Record<AppMode, MessageKey> = {
  prd: 'prdMessages',
  roadmap: 'roadmapMessages',
  codedocs: 'codeDocsMessages',
  codereview: 'codeReviewMessages',
}
const MODES: AppMode[] = ['prd', 'roadmap', 'codedocs', 'codereview']
const DEFAULT_PROJECT_ID = uuidv4()
const DEFAULT_PROJECT: Project = {
  id: DEFAULT_PROJECT_ID,
  name: 'Default Project',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const makeSessionName = (mode: AppMode, index: number) => {
  const label =
    mode === 'prd' ? 'PRD' :
    mode === 'roadmap' ? 'Roadmap' :
    mode === 'codedocs' ? 'Code Docs' :
    'Code Review'
  return `${label} Session ${index}`
}

const makeDefaultPRDDoc = (): PRDDocument => ({
  id: uuidv4(),
  title: 'Untitled PRD',
  template: PRD_TEMPLATE,
  markdown: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const makeDefaultRoadmap = (): RoadmapDocument => ({
  id: uuidv4(),
  title: 'Untitled Roadmap',
  template: ROADMAP_TEMPLATE,
  blocks: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const makeDefaultCodeDocs = (): CodeDocsDocument => ({
  id: uuidv4(),
  title: 'Code Documentation',
  template: CODEDOCS_TEMPLATE,
  markdown: '',
  files: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const makeDefaultCodeReview = (): CodeReviewDocument => ({
  id: uuidv4(),
  title: 'Code Review',
  template: CODEREVIEW_TEMPLATE,
  markdown: '',
  comments: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const defaultSessionForMode = (mode: AppMode): ChatSession => ({
  id: uuidv4(),
  projectId: DEFAULT_PROJECT_ID,
  name: makeSessionName(mode, 1),
  mode,
  messages: [],
  prdDoc: mode === 'prd' ? makeDefaultPRDDoc() : undefined,
  roadmapDoc: mode === 'roadmap' ? makeDefaultRoadmap() : undefined,
  codeDocsDoc: mode === 'codedocs' ? makeDefaultCodeDocs() : undefined,
  codeReviewDoc: mode === 'codereview' ? makeDefaultCodeReview() : undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const makeDefaultSessionState = () => {
  const sessions: ChatSession[] = MODES.map(defaultSessionForMode)
  const activeSessionIdByMode: Record<AppMode, string> = {
    prd: sessions.find(s => s.mode === 'prd')!.id,
    roadmap: sessions.find(s => s.mode === 'roadmap')!.id,
    codedocs: sessions.find(s => s.mode === 'codedocs')!.id,
    codereview: sessions.find(s => s.mode === 'codereview')!.id,
  }
  return { sessions, activeSessionIdByMode }
}

const withSyncedModeMessages = (state: Pick<AppStore, 'chatSessions' | 'activeSessionIdByMode'>): Pick<AppStore, MessageKey> => {
  const getMessages = (mode: AppMode): ChatMessage[] => {
    const activeId = state.activeSessionIdByMode[mode]
    const session = state.chatSessions.find(s => s.id === activeId && s.mode === mode)
      || state.chatSessions.find(s => s.mode === mode)
    return session?.messages ?? []
  }
  return {
    prdMessages: getMessages('prd'),
    roadmapMessages: getMessages('roadmap'),
    codeDocsMessages: getMessages('codedocs'),
    codeReviewMessages: getMessages('codereview'),
  }
}

const withSyncedModeDocuments = (state: Pick<AppStore, 'chatSessions' | 'activeSessionIdByMode'>): Pick<AppStore, 'prdDoc' | 'roadmap' | 'codeDocsDoc' | 'codeReviewDoc'> => {
  const getSession = (mode: AppMode) => {
    const activeId = state.activeSessionIdByMode[mode]
    return state.chatSessions.find(s => s.id === activeId && s.mode === mode)
      || state.chatSessions.find(s => s.mode === mode)
  }
  return {
    prdDoc: getSession('prd')?.prdDoc ?? makeDefaultPRDDoc(),
    roadmap: getSession('roadmap')?.roadmapDoc ?? makeDefaultRoadmap(),
    codeDocsDoc: getSession('codedocs')?.codeDocsDoc ?? makeDefaultCodeDocs(),
    codeReviewDoc: getSession('codereview')?.codeReviewDoc ?? makeDefaultCodeReview(),
  }
}

const syncRoadmapToActiveSession = (
  state: Pick<AppStore, 'chatSessions' | 'activeSessionIdByMode' | 'roadmap'>,
  roadmap: RoadmapDocument,
) => {
  const activeId = state.activeSessionIdByMode.roadmap
  const chatSessions = state.chatSessions.map(session => session.mode === 'roadmap' && session.id === activeId
    ? { ...session, roadmapDoc: roadmap, updatedAt: Date.now() }
    : session)
  const next = { chatSessions, activeSessionIdByMode: state.activeSessionIdByMode }
  return { ...next, ...withSyncedModeDocuments(next) }
}

// ── Default templates ────────────────────────────────────────
const PRD_TEMPLATE = `# PRD Template — AI Agent Instructions

## Role
You are a senior product manager. Generate a comprehensive, specific PRD from user requirements.

## Required Sections
### 1. Executive Summary
### 2. Problem Statement
### 3. Goals & Success Metrics (include KPIs)
### 4. User Personas (2–3 personas)
### 5. User Stories (P0/P1/P2 priority)
### 6. Functional Requirements
### 7. Non-Functional Requirements
### 8. Technical Considerations
### 9. Timeline & Milestones
### 10. Risks & Mitigations
### 11. Open Questions
---
*Be specific, include real metrics, realistic timelines, and technical depth.*`

const ROADMAP_TEMPLATE = `# Roadmap Generation Template

## AI Instructions
You are a senior product manager creating a visual roadmap.
Analyze the provided PRD or requirements and generate a structured roadmap JSON.

## Output Rules
- Generate 3–6 phases ordered chronologically
- Each phase: 2–4 sub-features (epics)
- Each sub-feature: 3–6 specific, actionable tasks
- Use descriptive phase names: "Phase 1: Foundation", "Phase 2: Core Features"
- Tasks must be concrete and verifiable (not vague)
- Assign colors logically: indigo=foundation, teal=core, amber=enhancement, rose=launch

## Phase Structure Guidelines
- Phase 1: Infrastructure, setup, core architecture
- Phase 2: Core user-facing features (MVP)
- Phase 3: Secondary features, polish
- Phase 4+: Growth, scaling, advanced features

## Colors Available
indigo, violet, teal, amber, rose, slate`

const CODEDOCS_TEMPLATE = `# Code Documentation Template

## AI Instructions
You are a senior software engineer creating comprehensive documentation.
Analyze the provided code files and generate thorough documentation.

## Documentation Structure
### 1. Project Overview
- What does this project do?
- Architecture summary
- Key technologies and dependencies

### 2. File-by-File Documentation
For each file:
- Purpose and responsibility
- Key functions/classes with signatures
- Parameters and return types
- Usage examples

### 3. API Reference
- All exported functions/classes
- Type definitions
- Configuration options

### 4. Setup & Installation
- Prerequisites
- Installation steps
- Environment variables
- Running locally

### 5. Architecture Decisions
- Why key technical choices were made
- Data flow diagrams (as text/ASCII)

### 6. Contributing Guide
- Code style
- Testing approach
- PR process

---
*Generate documentation that would help a new developer understand and contribute to this codebase immediately.*`

const CODEREVIEW_TEMPLATE = `# Code Review Template

## AI Instructions
You are a senior software engineer conducting a thorough code review.
Analyze the provided code and give structured, actionable feedback.

## Review Criteria
### Security
- SQL injection, XSS, auth vulnerabilities
- Secrets/credentials in code
- Input validation

### Performance
- Algorithm complexity (O notation)
- Unnecessary re-renders, memory leaks
- N+1 queries, missing indexes
- Bundle size concerns

### Code Quality
- DRY violations
- Single responsibility principle
- Naming clarity
- Magic numbers/strings

### Error Handling
- Unhandled promise rejections
- Missing error boundaries
- Silent failures

### Testing
- Missing test coverage
- Untested edge cases
- Flaky test patterns

## Output Format
For each issue found, provide:
- File and line reference
- Severity: critical | warning | suggestion | praise
- Clear explanation of the problem
- Specific, copy-pasteable fix

---
*Be thorough but constructive. Acknowledge good patterns too.*`

interface AppStore {
  settings: AppSettings
  updateSettings: (s: Partial<AppSettings>) => void

  activeMode: AppMode
  setActiveMode: (m: AppMode) => void

  panelMode: PanelMode
  setPanelMode: (m: PanelMode) => void

  isGenerating: boolean
  setIsGenerating: (v: boolean) => void

  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  projects: Project[]
  activeProjectId: string

  // Per-mode messages
  chatSessions: ChatSession[]
  activeSessionIdByMode: Record<AppMode, string>
  createChatSession: (mode?: AppMode, name?: string) => string
  renameChatSession: (id: string, name: string) => void
  deleteChatSession: (id: string) => void
  setActiveChatSession: (id: string) => void
  prdMessages: ChatMessage[]
  roadmapMessages: ChatMessage[]
  codeDocsMessages: ChatMessage[]
  codeReviewMessages: ChatMessage[]
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  clearMessages: () => void

  pendingPermission: Permission | null
  setPendingPermission: (p: Permission | null) => void
  grantPermission: (id: string) => void
  denyPermission: (id: string) => void

  hydrateSessionsFromRemote: () => Promise<void>

  // PRD
  prdDoc: PRDDocument
  updatePRDTemplate: (t: string) => void
  updatePRDMarkdown: (m: string) => void
  updatePRDTitle: (t: string) => void

  // Roadmap
  roadmap: RoadmapDocument
  updateRoadmapTemplate: (t: string) => void
  updateRoadmapTitle: (t: string) => void
  setRoadmapBlocks: (blocks: RoadmapBlock[]) => void
  setRoadmapTitle: (t: string) => void
  addBlock: () => void
  updateBlock: (id: string, updates: Partial<RoadmapBlock>) => void
  deleteBlock: (id: string) => void
  addSubBlock: (blockId: string) => void
  updateSubBlock: (blockId: string, subId: string, updates: Partial<RoadmapSubBlock>) => void
  deleteSubBlock: (blockId: string, subId: string) => void
  addTask: (blockId: string, subId: string) => void
  updateTask: (blockId: string, subId: string, taskId: string, updates: Partial<RoadmapTask>) => void
  deleteTask: (blockId: string, subId: string, taskId: string) => void
  toggleTask: (blockId: string, subId: string, taskId: string) => void

  // Code Docs
  codeDocsDoc: CodeDocsDocument
  updateCodeDocsTemplate: (t: string) => void
  updateCodeDocsMarkdown: (m: string) => void
  updateCodeDocsTitle: (t: string) => void
  setCodeFiles: (files: CodeFile[]) => void

  // Code Review
  codeReviewDoc: CodeReviewDocument
  updateCodeReviewTemplate: (t: string) => void
  updateCodeReviewMarkdown: (m: string) => void
  updateCodeReviewTitle: (t: string) => void
  setReviewComments: (comments: ReviewComment[]) => void
}

const makeBlock = (position: number, colorIdx: number): RoadmapBlock => ({
  id: uuidv4(), label: 'New Phase', description: '',
  color: BLOCK_COLORS[colorIdx % BLOCK_COLORS.length],
  subBlocks: [], collapsed: false, position,
})

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      const defaults = makeDefaultSessionState()
      return ({
      settings: { groqApiKey: '', selectedModel: 'llama-3.1-8b-instant', theme: 'dark' },
      updateSettings: (s) => set(state => ({ settings: { ...state.settings, ...s } })),

      activeMode: 'prd',
      setActiveMode: (activeMode) => set({ activeMode }),

      panelMode: 'split',
      setPanelMode: (panelMode) => set({ panelMode }),

      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),

      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      projects: [DEFAULT_PROJECT],
      activeProjectId: DEFAULT_PROJECT.id,

      // Messages
      chatSessions: defaults.sessions,
      activeSessionIdByMode: defaults.activeSessionIdByMode,
      createChatSession: (mode, name) => {
        const targetMode = mode ?? get().activeMode
        const id = uuidv4()
        set(state => {
          const count = state.chatSessions.filter(s => s.mode === targetMode).length + 1
          const session: ChatSession = {
            id,
            projectId: state.activeProjectId,
            mode: targetMode,
            name: name?.trim() || makeSessionName(targetMode, count),
            messages: [],
            prdDoc: targetMode === 'prd' ? makeDefaultPRDDoc() : undefined,
            roadmapDoc: targetMode === 'roadmap' ? makeDefaultRoadmap() : undefined,
            codeDocsDoc: targetMode === 'codedocs' ? makeDefaultCodeDocs() : undefined,
            codeReviewDoc: targetMode === 'codereview' ? makeDefaultCodeReview() : undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          const next = {
            chatSessions: [...state.chatSessions, session],
            activeSessionIdByMode: { ...state.activeSessionIdByMode, [targetMode]: id },
          }
          return { ...next, ...withSyncedModeMessages(next), ...withSyncedModeDocuments(next) }
        })
        return id
      },
      renameChatSession: (id, name) => set(state => ({
        chatSessions: state.chatSessions.map(s => s.id === id ? { ...s, name: name.trim() || s.name, updatedAt: Date.now() } : s)
      })),
      deleteChatSession: (id) => set(state => {
        const target = state.chatSessions.find(s => s.id === id)
        if (!target) return {}
        const remainingInMode = state.chatSessions.filter(s => s.mode === target.mode && s.id !== id)
        const replacement = remainingInMode[0] || defaultSessionForMode(target.mode)
        const kept = state.chatSessions.filter(s => s.id !== id)
        const chatSessions = remainingInMode.length ? kept : [...kept, replacement]
        const activeSessionIdByMode = {
          ...state.activeSessionIdByMode,
          [target.mode]: state.activeSessionIdByMode[target.mode] === id ? replacement.id : state.activeSessionIdByMode[target.mode],
        }
        const next = { chatSessions, activeSessionIdByMode }
        return { ...next, ...withSyncedModeMessages(next), ...withSyncedModeDocuments(next) }
      }),
      setActiveChatSession: (id) => set(state => {
        const session = state.chatSessions.find(s => s.id === id)
        if (!session) return {}
        const next = { activeSessionIdByMode: { ...state.activeSessionIdByMode, [session.mode]: id }, chatSessions: state.chatSessions }
        return { ...next, ...withSyncedModeMessages(next), ...withSyncedModeDocuments(next) }
      }),
      prdMessages: withSyncedModeMessages({ chatSessions: defaults.sessions, activeSessionIdByMode: defaults.activeSessionIdByMode }).prdMessages,
      roadmapMessages: withSyncedModeMessages({ chatSessions: defaults.sessions, activeSessionIdByMode: defaults.activeSessionIdByMode }).roadmapMessages,
      codeDocsMessages: withSyncedModeMessages({ chatSessions: defaults.sessions, activeSessionIdByMode: defaults.activeSessionIdByMode }).codeDocsMessages,
      codeReviewMessages: withSyncedModeMessages({ chatSessions: defaults.sessions, activeSessionIdByMode: defaults.activeSessionIdByMode }).codeReviewMessages,
      addMessage: (msg) => {
        const id = uuidv4()
        const mode = get().activeMode
        const key = MESSAGE_KEY_BY_MODE[mode]
        const activeSessionId = get().activeSessionIdByMode[mode]
        set(state => {
          const chatSessions = state.chatSessions.map(s => {
            if (s.id !== activeSessionId || s.mode !== mode) return s
            return {
              ...s,
              messages: [...s.messages, { ...msg, id, timestamp: Date.now(), mode }],
              updatedAt: Date.now(),
            }
          })
          const next = { chatSessions, activeSessionIdByMode: state.activeSessionIdByMode }
          return { ...next, ...withSyncedModeMessages(next), ...withSyncedModeDocuments(next), [key]: withSyncedModeMessages(next)[key] } as Partial<AppStore>
        })
        return id
      },
      updateMessage: (id, updates) => {
        const mode = get().activeMode
        const activeSessionId = get().activeSessionIdByMode[mode]
        set(state => ({
          chatSessions: state.chatSessions.map(s => {
            if (s.id !== activeSessionId || s.mode !== mode) return s
            return {
              ...s,
              messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m),
              updatedAt: Date.now(),
            }
          }),
          ...withSyncedModeMessages({
            chatSessions: state.chatSessions.map(s => {
              if (s.id !== activeSessionId || s.mode !== mode) return s
              return {
                ...s,
                messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m),
                updatedAt: Date.now(),
              }
            }),
            activeSessionIdByMode: state.activeSessionIdByMode,
          }),
          ...withSyncedModeDocuments({
            chatSessions: state.chatSessions.map(s => {
              if (s.id !== activeSessionId || s.mode !== mode) return s
              return {
                ...s,
                messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m),
                updatedAt: Date.now(),
              }
            }),
            activeSessionIdByMode: state.activeSessionIdByMode,
          }),
        } as Partial<AppStore>))
      },
      clearMessages: () => {
        const mode = get().activeMode
        const activeSessionId = get().activeSessionIdByMode[mode]
        set(state => {
          const chatSessions = state.chatSessions.map(s => {
            if (s.id !== activeSessionId || s.mode !== mode) return s
            return { ...s, messages: [], updatedAt: Date.now() }
          })
          const next = { chatSessions, activeSessionIdByMode: state.activeSessionIdByMode }
          return { ...next, ...withSyncedModeMessages(next), ...withSyncedModeDocuments(next) } as Partial<AppStore>
        })
      },

      pendingPermission: null,
      setPendingPermission: (p) => set({ pendingPermission: p }),
      grantPermission: (id) => set(state => {
        const chatSessions = state.chatSessions.map(s => ({
          ...s,
          messages: s.messages.map(m => m.permission?.id === id ? { ...m, permission: { ...m.permission!, status: 'granted' as const } } : m),
        }))
        const next = { chatSessions, activeSessionIdByMode: state.activeSessionIdByMode }
        return { pendingPermission: null, ...next, ...withSyncedModeMessages(next), ...withSyncedModeDocuments(next) } as Partial<AppStore>
      }),
      denyPermission: (id) => set(state => {
        const chatSessions = state.chatSessions.map(s => ({
          ...s,
          messages: s.messages.map(m => m.permission?.id === id ? { ...m, permission: { ...m.permission!, status: 'denied' as const } } : m),
        }))
        const next = { chatSessions, activeSessionIdByMode: state.activeSessionIdByMode }
        return { pendingPermission: null, ...next, ...withSyncedModeMessages(next), ...withSyncedModeDocuments(next) } as Partial<AppStore>
      }),
      hydrateSessionsFromRemote: async () => {
        try {
          const response = await fetch('/api/chat-sessions', { cache: 'no-store' })
          if (!response.ok) return
          const data = await response.json() as {
            sessions?: ChatSession[]
            activeSessionIdByMode?: Record<AppMode, string>
            projects?: Project[]
            activeProjectId?: string
          }
          if (!Array.isArray(data.sessions) || !data.activeSessionIdByMode) return
          const sessions = data.sessions
          const activeSessionIdByMode = data.activeSessionIdByMode
          set(() => {
            const next = {
              chatSessions: sessions,
              activeSessionIdByMode,
              projects: Array.isArray(data.projects) && data.projects.length ? data.projects : [DEFAULT_PROJECT],
              activeProjectId: data.activeProjectId || (Array.isArray(data.projects) && data.projects[0]?.id) || DEFAULT_PROJECT.id,
            }
            return { ...next, ...withSyncedModeMessages(next), ...withSyncedModeDocuments(next) } as Partial<AppStore>
          })
        } catch {
          // Ignore remote hydration errors and keep local state.
        }
      },

      // PRD
      prdDoc: withSyncedModeDocuments({ chatSessions: defaults.sessions, activeSessionIdByMode: defaults.activeSessionIdByMode }).prdDoc,
      updatePRDTemplate: (template) => set(s => {
        const activeId = s.activeSessionIdByMode.prd
        const chatSessions = s.chatSessions.map(session => session.mode === 'prd' && session.id === activeId
          ? { ...session, prdDoc: { ...(session.prdDoc ?? makeDefaultPRDDoc()), template, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { prdDoc: { ...s.prdDoc, template, updatedAt: Date.now() }, ...next }
      }),
      updatePRDMarkdown: (markdown) => set(s => {
        const activeId = s.activeSessionIdByMode.prd
        const chatSessions = s.chatSessions.map(session => session.mode === 'prd' && session.id === activeId
          ? { ...session, prdDoc: { ...(session.prdDoc ?? makeDefaultPRDDoc()), markdown, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { prdDoc: { ...s.prdDoc, markdown, updatedAt: Date.now() }, ...next }
      }),
      updatePRDTitle: (title) => set(s => {
        const activeId = s.activeSessionIdByMode.prd
        const chatSessions = s.chatSessions.map(session => session.mode === 'prd' && session.id === activeId
          ? { ...session, prdDoc: { ...(session.prdDoc ?? makeDefaultPRDDoc()), title, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { prdDoc: { ...s.prdDoc, title, updatedAt: Date.now() }, ...next }
      }),

      // Roadmap
      roadmap: withSyncedModeDocuments({ chatSessions: defaults.sessions, activeSessionIdByMode: defaults.activeSessionIdByMode }).roadmap,
      updateRoadmapTemplate: (template) => set(s => {
        const activeId = s.activeSessionIdByMode.roadmap
        const chatSessions = s.chatSessions.map(session => session.mode === 'roadmap' && session.id === activeId
          ? { ...session, roadmapDoc: { ...(session.roadmapDoc ?? makeDefaultRoadmap()), template, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { roadmap: { ...s.roadmap, template, updatedAt: Date.now() }, ...next }
      }),
      updateRoadmapTitle: (title) => set(s => {
        const activeId = s.activeSessionIdByMode.roadmap
        const chatSessions = s.chatSessions.map(session => session.mode === 'roadmap' && session.id === activeId
          ? { ...session, roadmapDoc: { ...(session.roadmapDoc ?? makeDefaultRoadmap()), title, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { roadmap: { ...s.roadmap, title, updatedAt: Date.now() }, ...next }
      }),
      setRoadmapBlocks: (blocks) => set(s => {
        const activeId = s.activeSessionIdByMode.roadmap
        const chatSessions = s.chatSessions.map(session => session.mode === 'roadmap' && session.id === activeId
          ? { ...session, roadmapDoc: { ...(session.roadmapDoc ?? makeDefaultRoadmap()), blocks, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { roadmap: { ...s.roadmap, blocks, updatedAt: Date.now() }, ...next }
      }),
      setRoadmapTitle: (title) => set(s => {
        const activeId = s.activeSessionIdByMode.roadmap
        const chatSessions = s.chatSessions.map(session => session.mode === 'roadmap' && session.id === activeId
          ? { ...session, roadmapDoc: { ...(session.roadmapDoc ?? makeDefaultRoadmap()), title, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { roadmap: { ...s.roadmap, title, updatedAt: Date.now() }, ...next }
      }),
      addBlock: () => set(s => {
        const pos = s.roadmap.blocks.length
        const roadmap = { ...s.roadmap, blocks: [...s.roadmap.blocks, makeBlock(pos, pos)], updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      updateBlock: (id, updates) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.map(b => b.id === id ? { ...b, ...updates } : b), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      deleteBlock: (id) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.filter(b => b.id !== id), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      addSubBlock: (blockId) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.map(b => b.id === blockId ? { ...b, subBlocks: [...b.subBlocks, { id: uuidv4(), label: 'New Feature', tasks: [], collapsed: false }] } : b), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      updateSubBlock: (blockId, subId, updates) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.map(b => b.id === blockId ? { ...b, subBlocks: b.subBlocks.map(sb => sb.id === subId ? { ...sb, ...updates } : sb) } : b), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      deleteSubBlock: (blockId, subId) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.map(b => b.id === blockId ? { ...b, subBlocks: b.subBlocks.filter(sb => sb.id !== subId) } : b), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      addTask: (blockId, subId) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.map(b => b.id === blockId ? { ...b, subBlocks: b.subBlocks.map(sb => sb.id === subId ? { ...sb, tasks: [...sb.tasks, { id: uuidv4(), label: 'New task', completed: false }] } : sb) } : b), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      updateTask: (blockId, subId, taskId, updates) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.map(b => b.id === blockId ? { ...b, subBlocks: b.subBlocks.map(sb => sb.id === subId ? { ...sb, tasks: sb.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) } : sb) } : b), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      deleteTask: (blockId, subId, taskId) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.map(b => b.id === blockId ? { ...b, subBlocks: b.subBlocks.map(sb => sb.id === subId ? { ...sb, tasks: sb.tasks.filter(t => t.id !== taskId) } : sb) } : b), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),
      toggleTask: (blockId, subId, taskId) => set(s => {
        const roadmap = { ...s.roadmap, blocks: s.roadmap.blocks.map(b => b.id === blockId ? { ...b, subBlocks: b.subBlocks.map(sb => sb.id === subId ? { ...sb, tasks: sb.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) } : sb) } : b), updatedAt: Date.now() }
        return syncRoadmapToActiveSession(s, roadmap)
      }),

      // Code Docs
      codeDocsDoc: withSyncedModeDocuments({ chatSessions: defaults.sessions, activeSessionIdByMode: defaults.activeSessionIdByMode }).codeDocsDoc,
      updateCodeDocsTemplate: (template) => set(s => {
        const activeId = s.activeSessionIdByMode.codedocs
        const chatSessions = s.chatSessions.map(session => session.mode === 'codedocs' && session.id === activeId
          ? { ...session, codeDocsDoc: { ...(session.codeDocsDoc ?? makeDefaultCodeDocs()), template, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { codeDocsDoc: { ...s.codeDocsDoc, template, updatedAt: Date.now() }, ...next }
      }),
      updateCodeDocsMarkdown: (markdown) => set(s => {
        const activeId = s.activeSessionIdByMode.codedocs
        const chatSessions = s.chatSessions.map(session => session.mode === 'codedocs' && session.id === activeId
          ? { ...session, codeDocsDoc: { ...(session.codeDocsDoc ?? makeDefaultCodeDocs()), markdown, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { codeDocsDoc: { ...s.codeDocsDoc, markdown, updatedAt: Date.now() }, ...next }
      }),
      updateCodeDocsTitle: (title) => set(s => {
        const activeId = s.activeSessionIdByMode.codedocs
        const chatSessions = s.chatSessions.map(session => session.mode === 'codedocs' && session.id === activeId
          ? { ...session, codeDocsDoc: { ...(session.codeDocsDoc ?? makeDefaultCodeDocs()), title, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { codeDocsDoc: { ...s.codeDocsDoc, title, updatedAt: Date.now() }, ...next }
      }),
      setCodeFiles: (files) => set(s => {
        const activeId = s.activeSessionIdByMode.codedocs
        const chatSessions = s.chatSessions.map(session => session.mode === 'codedocs' && session.id === activeId
          ? { ...session, codeDocsDoc: { ...(session.codeDocsDoc ?? makeDefaultCodeDocs()), files, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { codeDocsDoc: { ...s.codeDocsDoc, files, updatedAt: Date.now() }, ...next }
      }),

      // Code Review
      codeReviewDoc: withSyncedModeDocuments({ chatSessions: defaults.sessions, activeSessionIdByMode: defaults.activeSessionIdByMode }).codeReviewDoc,
      updateCodeReviewTemplate: (template) => set(s => {
        const activeId = s.activeSessionIdByMode.codereview
        const chatSessions = s.chatSessions.map(session => session.mode === 'codereview' && session.id === activeId
          ? { ...session, codeReviewDoc: { ...(session.codeReviewDoc ?? makeDefaultCodeReview()), template, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { codeReviewDoc: { ...s.codeReviewDoc, template, updatedAt: Date.now() }, ...next }
      }),
      updateCodeReviewMarkdown: (markdown) => set(s => {
        const activeId = s.activeSessionIdByMode.codereview
        const chatSessions = s.chatSessions.map(session => session.mode === 'codereview' && session.id === activeId
          ? { ...session, codeReviewDoc: { ...(session.codeReviewDoc ?? makeDefaultCodeReview()), markdown, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { codeReviewDoc: { ...s.codeReviewDoc, markdown, updatedAt: Date.now() }, ...next }
      }),
      updateCodeReviewTitle: (title) => set(s => {
        const activeId = s.activeSessionIdByMode.codereview
        const chatSessions = s.chatSessions.map(session => session.mode === 'codereview' && session.id === activeId
          ? { ...session, codeReviewDoc: { ...(session.codeReviewDoc ?? makeDefaultCodeReview()), title, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { codeReviewDoc: { ...s.codeReviewDoc, title, updatedAt: Date.now() }, ...next }
      }),
      setReviewComments: (comments) => set(s => {
        const activeId = s.activeSessionIdByMode.codereview
        const chatSessions = s.chatSessions.map(session => session.mode === 'codereview' && session.id === activeId
          ? { ...session, codeReviewDoc: { ...(session.codeReviewDoc ?? makeDefaultCodeReview()), comments, updatedAt: Date.now() }, updatedAt: Date.now() }
          : session)
        const next = { chatSessions, activeSessionIdByMode: s.activeSessionIdByMode }
        return { codeReviewDoc: { ...s.codeReviewDoc, comments, updatedAt: Date.now() }, ...next }
      }),
    })},
    {
      name: 'forge-v3-store',
      partialize: (state) => ({
        settings: state.settings,
        activeMode: state.activeMode,
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        prdDoc: state.prdDoc,
        roadmap: state.roadmap,
        codeDocsDoc: state.codeDocsDoc,
        codeReviewDoc: state.codeReviewDoc,
        chatSessions: state.chatSessions,
        activeSessionIdByMode: state.activeSessionIdByMode,
        prdMessages: state.prdMessages,
        roadmapMessages: state.roadmapMessages,
        codeDocsMessages: state.codeDocsMessages,
        codeReviewMessages: state.codeReviewMessages,
      }),
    }
  )
)
