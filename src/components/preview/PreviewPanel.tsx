'use client'
import { useAppStore } from '@/store'
import { FileText, Maximize2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function PreviewPanel() {
  const { prdDoc: document, setPanelMode } = useAppStore()
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div
        className="h-10 flex items-center justify-between px-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={13} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Preview</span>
          {document.markdown && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              · {document.markdown.split('\n').length} lines
            </span>
          )}
        </div>
        <button
          onClick={() => setPanelMode('fullscreen')}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors"
          style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
        >
          <Maximize2 size={11} /> Fullscreen
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {document.markdown ? (
          <div className="px-8 py-6 max-w-2xl mx-auto">
            <div className="md-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.markdown}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
              <FileText size={20} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No document yet</p>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
                Describe your requirements in the chat and AI Studio will generate a comprehensive PRD here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
