'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { GROQ_MODELS } from '@/lib/groq'
import { cn } from '@/lib/utils'
import { Settings, Maximize2, Minimize2, Trash2, ChevronDown, Sun, Moon, FileText, Map, Code2, GitPullRequest, Zap, LayoutGrid } from 'lucide-react'
import type { AppMode, PanelMode } from '@/types'

const MODES: { id: AppMode; label: string; icon: React.ReactNode; shortLabel: string }[] = [
  { id: 'prd',        label: 'PRD',           shortLabel: 'PRD',     icon: <FileText size={12} /> },
  { id: 'roadmap',    label: 'Roadmap',        shortLabel: 'Map',     icon: <Map size={12} /> },
  { id: 'codedocs',   label: 'Code Docs',      shortLabel: 'Docs',    icon: <Code2 size={12} /> },
  { id: 'codereview', label: 'Code Review',    shortLabel: 'Review',  icon: <GitPullRequest size={12} /> },
]

const GREEN_HIGHLIGHT_MODEL_IDS = new Set([
  'moonshotai/kimi-k2-instruct-0905',
  'llama-3.3-70b-versatile',
])

const YELLOW_HIGHLIGHT_MODEL_IDS = new Set([
  'groq/compound',
  'groq/compound-mini',
])

export function Header() {
  const {
    settings, updateSettings,
    activeMode, setActiveMode,
    prdDoc, roadmap, codeDocsDoc, codeReviewDoc,
    updatePRDTitle, updateRoadmapTitle, updateCodeDocsTitle, updateCodeReviewTitle,
    panelMode, setPanelMode,
    clearMessages, setSettingsOpen,
  } = useAppStore()

  const [modelOpen, setModelOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!GROQ_MODELS.some(m => m.id === settings.selectedModel)) {
      updateSettings({ selectedModel: GROQ_MODELS[0].id })
    }
  }, [settings.selectedModel, updateSettings])

  const isDark = settings.theme === 'dark'
  const selectedModel = GROQ_MODELS.find(m => m.id === settings.selectedModel) || GROQ_MODELS[0]

  const currentTitle =
    activeMode === 'prd' ? prdDoc.title :
    activeMode === 'roadmap' ? roadmap.title :
    activeMode === 'codedocs' ? codeDocsDoc.title :
    codeReviewDoc.title

  const handleTitleSave = () => {
    setEditingTitle(false)
    if (!titleVal.trim()) return
    if (activeMode === 'prd') updatePRDTitle(titleVal)
    else if (activeMode === 'roadmap') updateRoadmapTitle(titleVal)
    else if (activeMode === 'codedocs') updateCodeDocsTitle(titleVal)
    else updateCodeReviewTitle(titleVal)
  }

  useEffect(() => {
    const html = window.document.documentElement
    if (isDark) html.classList.add('dark')
    else html.classList.remove('dark')
  }, [isDark])

  const canFullscreen = activeMode !== 'roadmap' || panelMode !== 'canvas'
  const nextPanelMode: PanelMode =
    panelMode === 'split' ? 'fullscreen' :
    panelMode === 'fullscreen' && activeMode === 'roadmap' ? 'canvas' :
    'split'

  const panelIcon = panelMode === 'split' ? <Maximize2 size={14} /> :
    panelMode === 'fullscreen' && activeMode === 'roadmap' ? <LayoutGrid size={14} /> :
    <Minimize2 size={14} />

  const panelTitle = panelMode === 'split' ? 'Fullscreen' :
    panelMode === 'fullscreen' && activeMode === 'roadmap' ? 'Canvas only' :
    'Split view'

  if (!mounted) return null

  return (
    <header className="h-12 flex items-center px-4 gap-2 shrink-0 z-30 no-print"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Brand */}
      <div className="flex items-center gap-2 mr-1 select-none">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
          <Zap size={13} className="text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight hidden sm:block" style={{ color: 'var(--text-primary)' }}>AI Studio</span>
      </div>

      <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />

      {/* Mode tabs */}
      <div className="flex items-center rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--bg-tertiary)' }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setActiveMode(m.id); setPanelMode('split') }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              background: activeMode === m.id ? 'var(--surface-raised)' : 'transparent',
              color: activeMode === m.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeMode === m.id ? 'var(--shadow-sm)' : 'none',
            }}>
            {m.icon}
            <span className="hidden md:inline">{m.label}</span>
            <span className="md:hidden">{m.shortLabel}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />

      {/* Title */}
      {editingTitle ? (
        <input autoFocus value={titleVal}
          onChange={e => setTitleVal(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false) }}
          className="text-sm outline-none bg-transparent min-w-[120px] max-w-[220px] px-1"
          style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--accent)' }} />
      ) : (
        <button onClick={() => { setTitleVal(currentTitle); setEditingTitle(true) }}
          className="text-sm max-w-[180px] truncate transition-opacity hover:opacity-60"
          style={{ color: 'var(--text-secondary)' }}>
          {currentTitle}
        </button>
      )}

      <div className="flex-1" />

      {/* Model picker */}
      <div className="relative">
        <button onClick={() => setModelOpen(!modelOpen)}
          className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="hidden lg:inline">{selectedModel.label}</span>
          <span className="lg:hidden">Model</span>
          <ChevronDown size={10} />
        </button>
        {modelOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setModelOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 rounded-xl py-1 z-50 min-w-[260px] max-h-72 overflow-y-auto overflow-x-hidden animate-slide-up"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
              {GROQ_MODELS.map(m => (
                <button key={m.id} onClick={() => { updateSettings({ selectedModel: m.id }); setModelOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors"
                  style={{ color: settings.selectedModel === m.id ? 'var(--accent)' : 'var(--text-secondary)', background: settings.selectedModel === m.id ? 'var(--accent-soft)' : 'transparent' }}
                  onMouseEnter={e => { if (settings.selectedModel !== m.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = settings.selectedModel === m.id ? 'var(--accent-soft)' : 'transparent' }}>
                  <span
                    className="font-medium"
                    style={
                      GREEN_HIGHLIGHT_MODEL_IDS.has(m.id)
                        ? { color: '#22c55e' }
                        : YELLOW_HIGHLIGHT_MODEL_IDS.has(m.id)
                          ? { color: '#eab308' }
                          : undefined
                    }
                  >
                    {m.label}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{m.contextWindow / 1000}k</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Theme */}
      <button onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
        className="p-1.5 rounded-lg transition-colors" title="Toggle theme"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      {/* Panel mode */}
      <button onClick={() => setPanelMode(nextPanelMode)}
        className="p-1.5 rounded-lg transition-colors" title={panelTitle}
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        {panelIcon}
      </button>

      {/* Clear */}
      <button onClick={() => { if (confirm('Clear chat history for this mode?')) clearMessages() }}
        className="p-1.5 rounded-lg transition-colors" title="Clear chat"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}>
        <Trash2 size={14} />
      </button>

      {/* Settings */}
      <button onClick={() => setSettingsOpen(true)}
        className="p-1.5 rounded-lg transition-colors" title="Settings"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <Settings size={14} />
      </button>
    </header>
  )
}
