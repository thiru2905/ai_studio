'use client'
import { useAppStore } from '@/store'
import { FileText, Maximize2, Upload, X, Code2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeFile } from '@/types'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { extractCodeFilesFromZip } from '@/lib/zip'

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    cs: 'csharp', cpp: 'cpp', c: 'c', php: 'php', swift: 'swift',
    kt: 'kotlin', md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
    css: 'css', scss: 'scss', html: 'html', sh: 'bash', sql: 'sql',
  }
  return map[ext] || 'text'
}

export function CodeDocsPanel() {
  const { codeDocsDoc, setPanelMode, setCodeFiles } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (fileList: FileList) => {
    const files: CodeFile[] = []
    for (const file of Array.from(fileList)) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const extracted = await extractCodeFilesFromZip(file)
        files.push(...extracted)
        continue
      }
      if (file.size > 2 * 1024 * 1024) continue // skip files > 2MB
      const text = await file.text()
      files.push({ name: file.name, path: file.name, content: text, language: detectLanguage(file.name), size: file.size })
    }
    if (files.length) setCodeFiles([...codeDocsDoc.files, ...files])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div className="h-10 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Code2 size={13} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Code Documentation</span>
          {codeDocsDoc.files.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>· {codeDocsDoc.files.length} file{codeDocsDoc.files.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button onClick={() => setPanelMode('fullscreen')}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors"
          style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}>
          <Maximize2 size={11} /> Fullscreen
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* File upload area */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="rounded-xl p-4 text-center cursor-pointer transition-colors"
            style={{ border: '2px dashed var(--border)', background: 'var(--bg-secondary)' }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <Upload size={18} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Drop code files here</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>.ts .js .py .go .rs .java and more + .zip · max 2MB per file</p>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              accept=".zip,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.cs,.cpp,.c,.rb,.php,.swift,.kt,.md,.json,.yaml,.yml,.css,.scss,.html,.sh,.sql"
              onChange={e => e.target.files && handleFiles(e.target.files)} />
          </div>

          {/* File list */}
          {codeDocsDoc.files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {codeDocsDoc.files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                  <Code2 size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span className="text-xs flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{f.language}</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{(f.size / 1024).toFixed(1)}kb</span>
                  <button onClick={() => setCodeFiles(codeDocsDoc.files.filter((_, j) => j !== i))}
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

        {/* Preview */}
        {codeDocsDoc.markdown ? (
          <div className="px-6 py-5">
            <div className="md-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{codeDocsDoc.markdown}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
              <FileText size={20} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No documentation yet</p>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
                Upload your code files above, then describe them in the chat and ask AI Studio to generate documentation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
