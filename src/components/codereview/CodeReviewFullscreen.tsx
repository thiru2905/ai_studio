'use client'
import { useState } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { useAppStore } from '@/store'
import { downloadAsTxt, downloadAsMd } from '@/lib/utils'
import { LayoutTemplate, Code2, Eye, Download, ChevronDown, Printer, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function CodeReviewFullscreen() {
  const { codeReviewDoc, updateCodeReviewTemplate, updateCodeReviewMarkdown } = useAppStore()
  const [dlOpen, setDlOpen] = useState(false)

  const Divider = () => (
    <PanelResizeHandle className="w-px cursor-col-resize" style={{ background: 'var(--border)' }} />
  )

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div className="h-10 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#14b8a6' }}><LayoutTemplate size={11} /> Template</span>
          <span style={{ color: 'var(--border)' }}>→</span>
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#ef4444' }}><Code2 size={11} /> Review Source</span>
          <span style={{ color: 'var(--border)' }}>→</span>
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--accent)' }}><Eye size={11} /> Preview</span>
        </div>
        <div className="relative">
          <button onClick={() => setDlOpen(!dlOpen)} disabled={!codeReviewDoc.markdown}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: codeReviewDoc.markdown ? 'var(--accent)' : 'var(--bg-tertiary)', color: codeReviewDoc.markdown ? 'white' : 'var(--text-tertiary)', opacity: codeReviewDoc.markdown ? 1 : 0.4 }}>
            <Download size={11} /> Export <ChevronDown size={9} />
          </button>
          {dlOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDlOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 rounded-xl py-1 z-50 min-w-[170px]"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                {[
                  { icon: <FileText size={11} />, label: 'Plain text (.txt)', fn: () => { downloadAsTxt(codeReviewDoc.markdown, codeReviewDoc.title); setDlOpen(false) } },
                  { icon: <Code2 size={11} />, label: 'Markdown (.md)', fn: () => { downloadAsMd(codeReviewDoc.markdown, codeReviewDoc.title); setDlOpen(false) } },
                  null as null,
                  { icon: <Printer size={11} />, label: 'Print / PDF', fn: () => { setDlOpen(false); window.print() } },
                ].map((item, i) => item === null ? (
                  <div key={i} className="h-px my-1" style={{ background: 'var(--border)' }} />
                ) : (
                  <button key={item.label} onClick={item.fn}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={33} minSize={20}>
            <div className="flex flex-col h-full">
              <div className="h-9 flex items-center px-4 gap-2 shrink-0"
                style={{ background: 'rgba(20,184,166,0.05)', borderBottom: '2px solid rgba(20,184,166,0.2)' }}>
                <LayoutTemplate size={12} style={{ color: '#14b8a6' }} />
                <span className="text-xs font-semibold" style={{ color: '#14b8a6' }}>Review Template</span>
              </div>
              <textarea value={codeReviewDoc.template} onChange={e => updateCodeReviewTemplate(e.target.value)}
                className="flex-1 w-full resize-none outline-none p-4 font-mono leading-relaxed"
                style={{ fontSize: '11px', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
                spellCheck={false} />
            </div>
          </Panel>
          <Divider />
          <Panel defaultSize={34} minSize={20}>
            <div className="flex flex-col h-full">
              <div className="h-9 flex items-center px-4 gap-2 shrink-0"
                style={{ background: 'rgba(239,68,68,0.05)', borderBottom: '2px solid rgba(239,68,68,0.2)' }}>
                <Code2 size={12} style={{ color: '#ef4444' }} />
                <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Review Markdown</span>
              </div>
              <textarea value={codeReviewDoc.markdown} onChange={e => updateCodeReviewMarkdown(e.target.value)}
                className="flex-1 w-full resize-none outline-none p-4 font-mono leading-relaxed"
                style={{ fontSize: '11px', background: 'var(--bg)', color: 'var(--text-secondary)' }}
                placeholder="Code review will appear here..." spellCheck={false} />
            </div>
          </Panel>
          <Divider />
          <Panel defaultSize={33} minSize={20}>
            <div className="flex flex-col h-full">
              <div className="h-9 flex items-center px-4 gap-2 shrink-0"
                style={{ background: 'rgba(99,102,241,0.05)', borderBottom: '2px solid rgba(99,102,241,0.2)' }}>
                <Eye size={12} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Rendered Review</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {codeReviewDoc.markdown ? (
                  <div className="px-5 py-4"><div className="md-preview">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{codeReviewDoc.markdown}</ReactMarkdown>
                  </div></div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-center px-4" style={{ color: 'var(--text-tertiary)' }}>Review preview appears here.</p>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}
