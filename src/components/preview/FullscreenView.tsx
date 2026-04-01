'use client'
import { useState } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { useAppStore } from '@/store'
import { downloadAsTxt, downloadAsMd } from '@/lib/utils'
import { FileText, Code2, Eye, Download, ChevronDown, LayoutTemplate, Printer } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function FullscreenView() {
  const { prdDoc: document, updatePRDTemplate: updateTemplate, updatePRDMarkdown: updateMarkdown } = useAppStore()
  const [dlOpen, setDlOpen] = useState(false)

  const ResizeHandle = () => (
    <PanelResizeHandle
      className="w-px transition-colors cursor-col-resize"
      style={{ background: 'var(--border)' }}
    />
  )

  const PaneBar = ({ icon, label, accentColor }: { icon: React.ReactNode; label: string; accentColor: string }) => (
    <div
      className="h-9 flex items-center px-4 gap-2 shrink-0"
      style={{ borderBottom: `2px solid ${accentColor}20`, background: `${accentColor}05` }}
    >
      <span style={{ color: accentColor }}>{icon}</span>
      <span className="text-xs font-semibold" style={{ color: accentColor }}>{label}</span>
    </div>
  )

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div className="h-10 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span className="flex items-center gap-1.5" style={{ color: '#14b8a6' }}><LayoutTemplate size={11} /> Template</span>
          <span style={{ color: 'var(--border)' }}>→</span>
          <span className="flex items-center gap-1.5" style={{ color: '#f59e0b' }}><Code2 size={11} /> Markdown</span>
          <span style={{ color: 'var(--border)' }}>→</span>
          <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}><Eye size={11} /> Preview</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setDlOpen(!dlOpen)}
            disabled={!document.markdown}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: document.markdown ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: document.markdown ? 'white' : 'var(--text-tertiary)',
              opacity: document.markdown ? 1 : 0.5,
            }}
          >
            <Download size={11} /> Export <ChevronDown size={9} />
          </button>
          {dlOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDlOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1.5 rounded-xl py-1 z-50 min-w-[170px] animate-slide-up"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
              >
                {[
                  { icon: <FileText size={11} />, label: 'Plain text (.txt)', fn: () => { downloadAsTxt(document.markdown, document.title); setDlOpen(false) } },
                  { icon: <Code2 size={11} />, label: 'Markdown (.md)', fn: () => { downloadAsMd(document.markdown, document.title); setDlOpen(false) } },
                  null,
                  { icon: <Printer size={11} />, label: 'Print / PDF', fn: () => { setDlOpen(false); window.print() } },
                ].map((item, i) => item === null ? (
                  <div key={i} className="h-px my-1" style={{ background: 'var(--border)' }} />
                ) : (
                  <button
                    key={item.label}
                    onClick={item.fn}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ color: 'var(--text-tertiary)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Template */}
          <Panel defaultSize={33} minSize={20}>
            <div className="flex flex-col h-full">
              <PaneBar icon={<LayoutTemplate size={12} />} label="Prompt Template" accentColor="#14b8a6" />
              <textarea
                value={document.template}
                onChange={e => updateTemplate(e.target.value)}
                className="flex-1 w-full resize-none outline-none p-4 font-mono leading-relaxed"
                style={{ fontSize: '11px', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
                spellCheck={false}
              />
            </div>
          </Panel>
          <ResizeHandle />

          {/* Markdown */}
          <Panel defaultSize={34} minSize={20}>
            <div className="flex flex-col h-full">
              <PaneBar icon={<Code2 size={12} />} label="Markdown Source" accentColor="#f59e0b" />
              <textarea
                value={document.markdown}
                onChange={e => updateMarkdown(e.target.value)}
                className="flex-1 w-full resize-none outline-none p-4 font-mono leading-relaxed"
                style={{ fontSize: '11px', background: 'var(--bg)', color: 'var(--text-secondary)' }}
                placeholder="PRD markdown will appear here after generation..."
                spellCheck={false}
              />
            </div>
          </Panel>
          <ResizeHandle />

          {/* Preview */}
          <Panel defaultSize={33} minSize={20}>
            <div className="flex flex-col h-full">
              <PaneBar icon={<Eye size={12} />} label="Rendered Preview" accentColor="var(--accent)" />
              <div className="flex-1 overflow-y-auto">
                {document.markdown ? (
                  <div className="px-5 py-4">
                    <div className="md-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.markdown}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-center px-4" style={{ color: 'var(--text-tertiary)' }}>
                      Generate a PRD from the chat to preview it here.
                    </p>
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
