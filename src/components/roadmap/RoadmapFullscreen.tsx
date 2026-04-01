'use client'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { useAppStore } from '@/store'
import { RoadmapCanvas } from './RoadmapCanvas'
import { LayoutTemplate, Map } from 'lucide-react'

export function RoadmapFullscreen() {
  const { roadmap, updateRoadmapTemplate } = useAppStore()

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Bar */}
      <div className="h-10 flex items-center gap-4 px-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#14b8a6' }}>
          <LayoutTemplate size={11} /> Prompt Template
        </span>
        <span style={{ color: 'var(--border)' }}>→</span>
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
          <Map size={11} /> Roadmap Canvas
        </span>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Double-click labels to edit · Check tasks to mark complete
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Template pane */}
          <Panel defaultSize={28} minSize={18} maxSize={45}>
            <div className="flex flex-col h-full">
              <div className="h-9 flex items-center px-4 gap-2 shrink-0"
                style={{ background: 'rgba(20,184,166,0.05)', borderBottom: '2px solid rgba(20,184,166,0.2)' }}>
                <LayoutTemplate size={12} style={{ color: '#14b8a6' }} />
                <span className="text-xs font-semibold" style={{ color: '#14b8a6' }}>Prompt Template</span>
                <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>— editable</span>
              </div>
              <textarea
                value={roadmap.template}
                onChange={e => updateRoadmapTemplate(e.target.value)}
                className="flex-1 w-full resize-none outline-none p-4 font-mono leading-relaxed"
                style={{ fontSize: '11px', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
                spellCheck={false}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="w-px transition-colors cursor-col-resize" style={{ background: 'var(--border)' }} />

          {/* Canvas pane */}
          <Panel defaultSize={72} minSize={50}>
            <RoadmapCanvas />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}
