'use client'
import { useEffect, useRef } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { Header } from './Header'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { PreviewPanel } from '@/components/preview/PreviewPanel'
import { FullscreenView } from '@/components/preview/FullscreenView'
import { RoadmapCanvas } from '@/components/roadmap/RoadmapCanvas'
import { RoadmapFullscreen } from '@/components/roadmap/RoadmapFullscreen'
import { CodeDocsPanel } from '@/components/codedocs/CodeDocsPanel'
import { CodeDocsFullscreen } from '@/components/codedocs/CodeDocsFullscreen'
import { CodeReviewPanel } from '@/components/codereview/CodeReviewPanel'
import { CodeReviewFullscreen } from '@/components/codereview/CodeReviewFullscreen'
import { SettingsModal } from '@/components/ui/SettingsModal'
import { useAppStore } from '@/store'

const Divider = () => (
  <PanelResizeHandle
    className="w-px transition-colors cursor-col-resize"
    style={{ background: 'var(--border)' }}
  />
)

function PersistenceSync() {
  const { chatSessions, activeSessionIdByMode, projects, activeProjectId } = useAppStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void fetch('/api/chat-sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: chatSessions, activeSessionIdByMode, projects, activeProjectId }),
      }).catch(() => {
        // Best-effort sync; local persisted state remains source of truth offline.
      })
    }, 350)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [chatSessions, activeSessionIdByMode, projects, activeProjectId])

  return null
}

export function WorkspaceLayout() {
  const { panelMode, activeMode, settings, hydrateSessionsFromRemote } = useAppStore()

  useEffect(() => {
    const html = window.document.documentElement
    if (settings.theme === 'dark') html.classList.add('dark')
    else html.classList.remove('dark')
  }, [settings.theme])

  useEffect(() => {
    void hydrateSessionsFromRemote()
  }, [hydrateSessionsFromRemote])

  const renderRight = () => {
    if (activeMode === 'prd') return <PreviewPanel />
    if (activeMode === 'roadmap') return <RoadmapCanvas />
    if (activeMode === 'codedocs') return <CodeDocsPanel />
    if (activeMode === 'codereview') return <CodeReviewPanel />
    return null
  }

  const renderFullscreen = () => {
    if (activeMode === 'prd') return <FullscreenView />
    if (activeMode === 'roadmap') return <RoadmapFullscreen />
    if (activeMode === 'codedocs') return <CodeDocsFullscreen />
    if (activeMode === 'codereview') return <CodeReviewFullscreen />
    return null
  }

  // Canvas-only mode for roadmap
  if (activeMode === 'roadmap' && panelMode === 'canvas') {
    return (
      <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>
        <Header />
        <div className="flex-1 overflow-hidden">
          <RoadmapCanvas fullWidth />
        </div>
        <SettingsModal />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>
      <PersistenceSync />
      <Header />
      <div className="flex-1 overflow-hidden">
        {panelMode === 'split' ? (
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={38} minSize={24} maxSize={55}>
              <ChatPanel />
            </Panel>
            <Divider />
            <Panel defaultSize={62} minSize={40}>
              {renderRight()}
            </Panel>
          </PanelGroup>
        ) : (
          // fullscreen: narrow chat strip + expanded view
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={20} minSize={15} maxSize={28}>
              <ChatPanel compact />
            </Panel>
            <Divider />
            <Panel defaultSize={80}>
              {renderFullscreen()}
            </Panel>
          </PanelGroup>
        )}
      </div>
      <SettingsModal />
    </div>
  )
}
