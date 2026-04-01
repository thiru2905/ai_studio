'use client'
import { useAppStore } from '@/store'
import { GitPullRequest, Maximize2, Upload, X, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeFile } from '@/types'
import { useRef } from 'react'
import { extractCodeFilesFromZip } from '@/lib/zip'

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', go: 'go', rs: 'rust', java: 'java', rb: 'ruby',
    cs: 'csharp', cpp: 'cpp', c: 'c', swift: 'swift', kt: 'kotlin',
  }
  return map[ext] || 'text'
}

// Parse severity counts from markdown
function parseSeverity(markdown: string) {
  const critical = (markdown.match(/🔴|Critical/g) || []).length
  const warning = (markdown.match(/🟡|Warning/g) || []).length
  const suggestion = (markdown.match(/🔵|Suggestion/g) || []).length
  const praise = (markdown.match(/✅|Praise/g) || []).length
  return { critical, warning, suggestion, praise }
}

export function CodeReviewPanel() {
  const { codeReviewDoc, codeDocsDoc, setPanelMode, setCodeFiles } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Share file list with code docs
  const files = codeDocsDoc.files

  const handleFiles = async (fileList: FileList) => {
    const newFiles: CodeFile[] = []
    for (const file of Array.from(fileList)) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const extracted = await extractCodeFilesFromZip(file)
        newFiles.push(...extracted)
        continue
      }
      if (file.size > 2 * 1024 * 1024) continue
      const text = await file.text()
      newFiles.push({ name: file.name, path: file.name, content: text, language: detectLanguage(file.name), size: file.size })
    }
    if (newFiles.length) setCodeFiles([...files, ...newFiles])
  }

  const severity = codeReviewDoc.markdown ? parseSeverity(codeReviewDoc.markdown) : null

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div className="h-10 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <GitPullRequest size={13} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Code Review</span>
          {files.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>· {files.length} file{files.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button onClick={() => setPanelMode('fullscreen')}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
          style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}>
          <Maximize2 size={11} /> Fullscreen
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Upload */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div onDrop={e => { e.preventDefault(); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files) }}
            onDragOver={e => e.preventDefault()}
            className="rounded-xl p-4 text-center cursor-pointer transition-colors"
            style={{ border: '2px dashed var(--border)', background: 'var(--bg-secondary)' }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <GitPullRequest size={18} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Drop code files to review</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Paste code in chat or upload files (.zip supported) · max 2MB per file</p>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              accept=".zip,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.cs,.cpp,.c,.rb,.php,.swift,.kt"
              onChange={e => e.target.files && handleFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                  <GitPullRequest size={11} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span className="text-xs flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{f.language}</span>
                  <button onClick={() => setCodeFiles(files.filter((_, j) => j !== i))}
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Severity summary */}
        {severity && (severity.critical + severity.warning + severity.suggestion + severity.praise) > 0 && (
          <div className="px-4 py-3 grid grid-cols-4 gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <SeverityBadge icon={<Zap size={11} />} label="Critical" count={severity.critical} color="#ef4444" bg="rgba(239,68,68,0.08)" />
            <SeverityBadge icon={<AlertTriangle size={11} />} label="Warning" count={severity.warning} color="#f59e0b" bg="rgba(245,158,11,0.08)" />
            <SeverityBadge icon={<Info size={11} />} label="Suggestion" count={severity.suggestion} color="var(--accent)" bg="var(--accent-soft)" />
            <SeverityBadge icon={<CheckCircle size={11} />} label="Praise" count={severity.praise} color="#10b981" bg="rgba(16,185,129,0.08)" />
          </div>
        )}

        {codeReviewDoc.markdown ? (
          <div className="px-6 py-5">
            <div className="md-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{codeReviewDoc.markdown}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
              <GitPullRequest size={20} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No review yet</p>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
                Upload code files above or paste code in the chat, then ask AI Studio to review it.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SeverityBadge({ icon, label, count, color, bg }: { icon: React.ReactNode; label: string; count: number; color: string; bg: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: bg }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-lg font-bold" style={{ color }}>{count}</span>
      <span className="text-xs" style={{ color, opacity: 0.7 }}>{label}</span>
    </div>
  )
}
