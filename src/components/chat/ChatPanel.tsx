'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '@/store'
import { useAIAgent } from '@/hooks/useAIAgent'
import { MessageBubble } from './MessageBubble'
import { PermissionCard } from './PermissionCard'
import { Send, Paperclip, X, FileText, Map, Code2, GitPullRequest, Plus, Pencil, Trash2, ChevronDown, Check, Mic, Square } from 'lucide-react'
import { shallow } from 'zustand/shallow'
import toast from 'react-hot-toast'
import { transcribeGroqAudio } from '@/lib/groq'

const sessionListEqual = (
  prev: { id: string; name: string }[],
  next: { id: string; name: string }[],
) => {
  if (prev.length !== next.length) return false
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].id !== next[i].id || prev[i].name !== next[i].name) return false
  }
  return true
}

const MODE_META = {
  prd:        { icon: <FileText size={16} />,      label: 'AI PRD Generator',    desc: 'Describe your product requirements. AI Studio will reason, ask permission, then generate a detailed PRD.', starters: ['Build a mobile habit tracking app', 'Create a B2B SaaS analytics dashboard', 'Add real-time collaboration to our editor'] },
  roadmap:    { icon: <Map size={16} />,           label: 'AI Roadmap Builder',  desc: 'Paste a PRD or describe your product. AI Studio generates an interactive roadmap with phases, features, and tasks.', starters: ['Generate a roadmap from my PRD above', 'Plan a 6-month roadmap for a fintech app', 'Create roadmap for an e-commerce platform'] },
  codedocs:   { icon: <Code2 size={16} />,         label: 'Code Documentation',  desc: 'Upload code files on the right, then describe your project. AI Studio will generate comprehensive documentation.', starters: ['Document this React/TypeScript project', 'Generate API reference documentation', 'Write a README and setup guide'] },
  codereview: { icon: <GitPullRequest size={16} />, label: 'AI Code Reviewer',   desc: 'Upload code files on the right, then ask AI Studio to review for bugs, performance, security, and code quality.', starters: ['Review this code for security issues', 'Check for performance problems and N+1 queries', 'Full code review with severity ratings'] },
}

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const {
    activeMode, prdMessages, roadmapMessages, codeDocsMessages, codeReviewMessages,
    isGenerating, pendingPermission, codeDocsDoc, activeSessionIdByMode,
    setActiveChatSession, createChatSession, renameChatSession, deleteChatSession,
    settings,
  } = useAppStore((s) => ({
    activeMode: s.activeMode,
    prdMessages: s.prdMessages,
    roadmapMessages: s.roadmapMessages,
    codeDocsMessages: s.codeDocsMessages,
    codeReviewMessages: s.codeReviewMessages,
    isGenerating: s.isGenerating,
    pendingPermission: s.pendingPermission,
    codeDocsDoc: s.codeDocsDoc,
    activeSessionIdByMode: s.activeSessionIdByMode,
    setActiveChatSession: s.setActiveChatSession,
    createChatSession: s.createChatSession,
    renameChatSession: s.renameChatSession,
    deleteChatSession: s.deleteChatSession,
    settings: s.settings,
  }), shallow)
  const sessions = useAppStore(
    (s) => s.chatSessions
      .filter(session => session.mode === s.activeMode)
      .map(session => ({ id: session.id, name: session.name })),
    sessionListEqual,
  )
  const { sendMessage } = useAIAgent()
  const [input, setInput] = useState('')
  const [attached, setAttached] = useState<{ text: string; name: string } | null>(null)
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const sessionMenuRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const messages =
    activeMode === 'prd' ? prdMessages :
    activeMode === 'roadmap' ? roadmapMessages :
    activeMode === 'codedocs' ? codeDocsMessages :
    codeReviewMessages

  const meta = MODE_META[activeMode]
  const activeSessionId = activeSessionIdByMode[activeMode]

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isGenerating])
  useEffect(() => {
    if (!sessionMenuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (!sessionMenuRef.current?.contains(e.target as Node)) setSessionMenuOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [sessionMenuOpen])

  const handleSend = useCallback(async () => {
    const content = attached ? `${input}\n\n---\n**Attached:**\n${attached.text}` : input.trim()
    if (!content || isGenerating || pendingPermission) return
    setInput(''); setAttached(null)
    if (taRef.current) { taRef.current.style.height = 'auto' }
    // Pass code files for codedocs/codereview modes
    const files = (activeMode === 'codedocs' || activeMode === 'codereview') ? codeDocsDoc.files : undefined
    await sendMessage(content, files)
  }, [input, attached, isGenerating, pendingPermission, activeMode, codeDocsDoc.files, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (text.length > 400) { e.preventDefault(); setAttached({ text, name: 'Pasted content' }) }
  }

  const canSend = (input.trim() || attached) && !isGenerating && !pendingPermission
  const canUseMic = !pendingPermission && !isGenerating && !isTranscribing

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (mr.state !== 'inactive') mr.stop()
  }, [])

  const startRecording = useCallback(async () => {
    if (!canUseMic) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        try {
          setIsRecording(false)
          setIsTranscribing(true)
          toast('Using model Whisper Large V3 Turbo…', { duration: 1800 })
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
          const text = await transcribeGroqAudio(settings.groqApiKey, blob, { model: 'whisper-large-v3-turbo' })
          if (text.trim()) {
            setInput(prev => (prev ? (prev.trimEnd() + '\n' + text.trim()) : text.trim()))
            queueMicrotask(() => taRef.current?.focus())
          }
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Transcription failed')
        } finally {
          setIsTranscribing(false)
          // stop tracks
          for (const t of stream.getTracks()) t.stop()
          mediaRecorderRef.current = null
          chunksRef.current = []
        }
      }
      mr.start(250)
      setIsRecording(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Microphone permission denied')
      setIsRecording(false)
      setIsTranscribing(false)
    }
  }, [canUseMic, settings.groqApiKey])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>
      {!compact && (
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1" ref={sessionMenuRef}>
              <button
                type="button"
                onClick={() => setSessionMenuOpen(v => !v)}
                className="w-full flex items-center justify-between text-xs rounded-lg px-2.5 py-2 transition-colors"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              >
                <span className="truncate text-left">
                  {sessions.find(s => s.id === activeSessionId)?.name || 'Select session'}
                </span>
                <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />
              </button>
              {sessionMenuOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 rounded-xl py-1 z-50 max-h-56 overflow-y-auto"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
                >
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setActiveChatSession(s.id); setSessionMenuOpen(false) }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors"
                      style={{ color: s.id === activeSessionId ? 'var(--accent)' : 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span className="truncate">{s.name}</span>
                      {s.id === activeSessionId && <Check size={11} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              title="New session"
              className="p-2 rounded-lg"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onClick={() => {
                const name = window.prompt('Session name (optional):')
                createChatSession(activeMode, name || undefined)
              }}
            >
              <Plus size={12} />
            </button>
            <button
              title="Rename session"
              className="p-2 rounded-lg"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onClick={() => {
                const current = sessions.find(s => s.id === activeSessionId)
                if (!current) return
                const nextName = window.prompt('Rename session:', current.name)
                if (nextName === null) return
                renameChatSession(current.id, nextName)
              }}
            >
              <Pencil size={12} />
            </button>
            <button
              title="Delete session"
              className="p-2 rounded-lg"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: '#ef4444' }}
              onClick={() => {
                const current = sessions.find(s => s.id === activeSessionId)
                if (!current) return
                if (!window.confirm(`Delete "${current.name}"?`)) return
                deleteChatSession(current.id)
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4 animate-fade-in">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--accent)' }}>{meta.icon}</span>
            </div>
            {!compact && (
              <>
                <div>
                  <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{meta.label}</p>
                  <p className="text-xs leading-relaxed max-w-[240px]" style={{ color: 'var(--text-tertiary)' }}>{meta.desc}</p>
                </div>
                <div className="flex flex-col gap-1.5 w-full mt-1">
                  {meta.starters.map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-left text-xs px-3 py-2 rounded-lg transition-all"
                      style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id}>
            <MessageBubble message={msg} compact={compact} />
            {msg.permission && msg.permission.status === 'pending' && <PermissionCard permission={msg.permission} />}
            {msg.permission && msg.permission.status !== 'pending' && (
              <div className="ml-8 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: msg.permission.status === 'granted' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    color: msg.permission.status === 'granted' ? '#10b981' : '#ef4444',
                    border: `1px solid ${msg.permission.status === 'granted' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                  }}>
                  {msg.permission.status === 'granted' ? '✓ Allowed' : '✕ Denied'}
                </span>
              </div>
            )}
          </div>
        ))}

        {isGenerating && !messages.some(m => m.isStreaming) && (
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex gap-1"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></div>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>AI Studio is thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attached badge */}
      {attached && (
        <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <Paperclip size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{attached.name}</span>
          <button onClick={() => setAttached(null)} style={{ color: 'var(--text-tertiary)' }}>
            <X size={11} />
          </button>
        </div>
      )}

      {pendingPermission && (
        <div className="mx-3 mb-2 text-center">
          <span className="text-xs" style={{ color: '#f59e0b' }}>⏳ Waiting for your permission above...</span>
        </div>
      )}

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-end gap-2 rounded-xl px-3 py-2 transition-colors"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <textarea ref={taRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown} onPaste={handlePaste}
            placeholder={compact ? 'Message...' : `${meta.label}...`}
            disabled={!!pendingPermission || isGenerating}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none leading-relaxed"
            style={{ fontSize: compact ? '12px' : '13px', color: 'var(--text-primary)', maxHeight: '120px', minHeight: '20px' }}
            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }} />
          <div className="relative">
            <button
              type="button"
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              disabled={!canUseMic && !isRecording}
              className="p-1.5 rounded-lg transition-all shrink-0"
              title={isRecording ? 'Stop recording' : 'Voice input'}
              style={{
                background: isRecording ? 'rgba(239,68,68,0.12)' : 'var(--bg-tertiary)',
                color: isRecording ? '#ef4444' : 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = isRecording ? 'rgba(239,68,68,0.18)' : 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = isRecording ? 'rgba(239,68,68,0.12)' : 'var(--bg-tertiary)' }}
            >
              {isRecording ? <Square size={12} /> : <Mic size={12} />}
            </button>

            {(isRecording || isTranscribing) && !compact && (
              <div
                className="absolute right-0 bottom-10 rounded-xl px-3 py-2 z-50 w-[220px] animate-slide-up"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {isRecording ? 'Listening…' : 'Transcribing…'}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Using model Whisper Large V3 Turbo
                    </span>
                  </div>
                  <div className="audio-bars" aria-hidden>
                    <span className="audio-bar" />
                    <span className="audio-bar" />
                    <span className="audio-bar" />
                    <span className="audio-bar" />
                    <span className="audio-bar" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <button onClick={handleSend} disabled={!canSend}
            className="p-1.5 rounded-lg transition-all shrink-0"
            style={{ background: canSend ? 'var(--accent)' : 'var(--bg-tertiary)', color: canSend ? 'white' : 'var(--text-tertiary)' }}>
            <Send size={12} />
          </button>
        </div>
        {!compact && (
          <p className="mt-1.5 text-center" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            Enter to send · Shift+Enter new line · Paste large text to attach
          </p>
        )}
      </div>
    </div>
  )
}
