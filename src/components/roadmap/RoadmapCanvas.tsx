'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { RoadmapBlock, RoadmapSubBlock, RoadmapTask, BlockColor } from '@/types'
import { downloadAsJson, downloadAsTxt } from '@/lib/utils'
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  Map, Download, ChevronRightSquare, Check,
  GripVertical, Pencil, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const COLOR_MAP: Record<BlockColor, { bg: string; border: string; text: string; soft: string; dot: string }> = {
  indigo: { bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.25)', text: '#6366f1', soft: 'rgba(99,102,241,0.1)', dot: '#6366f1' },
  violet: { bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.25)', text: '#8b5cf6', soft: 'rgba(139,92,246,0.1)', dot: '#8b5cf6' },
  teal:   { bg: 'rgba(20,184,166,0.06)',  border: 'rgba(20,184,166,0.25)',  text: '#14b8a6', soft: 'rgba(20,184,166,0.1)',  dot: '#14b8a6' },
  amber:  { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.25)',  text: '#f59e0b', soft: 'rgba(245,158,11,0.1)',  dot: '#f59e0b' },
  rose:   { bg: 'rgba(244,63,94,0.06)',   border: 'rgba(244,63,94,0.25)',   text: '#f43f5e', soft: 'rgba(244,63,94,0.1)',   dot: '#f43f5e' },
  slate:  { bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.25)', text: '#64748b', soft: 'rgba(100,116,139,0.1)', dot: '#64748b' },
}

const COLORS: BlockColor[] = ['indigo', 'violet', 'teal', 'amber', 'rose', 'slate']

function getProgress(block: RoadmapBlock): { done: number; total: number } {
  let done = 0, total = 0
  for (const sb of block.subBlocks) {
    for (const t of sb.tasks) { total++; if (t.completed) done++ }
  }
  return { done, total }
}

// ── Inline editable label ───────────────────────────────────
function InlineEdit({ value, onChange, className, style, placeholder }: {
  value: string; onChange: (v: string) => void
  className?: string; style?: React.CSSProperties; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  if (editing) return (
    <input
      autoFocus value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); if (val.trim()) onChange(val.trim()) }}
      onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); if (val.trim()) onChange(val.trim()) } if (e.key === 'Escape') { setEditing(false); setVal(value) } }}
      className={cn('bg-transparent outline-none border-b w-full', className)}
      style={{ ...style, borderColor: 'var(--accent)' }}
      onClick={e => e.stopPropagation()}
    />
  )
  return (
    <span
      className={cn('cursor-text hover:opacity-70 transition-opacity', className)}
      style={style}
      onDoubleClick={e => { e.stopPropagation(); setVal(value); setEditing(true) }}
      title="Double-click to edit"
    >{value || <span style={{ opacity: 0.4 }}>{placeholder}</span>}</span>
  )
}

// ── Task row ────────────────────────────────────────────────
function TaskRow({ task, blockId, subId }: { task: RoadmapTask; blockId: string; subId: string }) {
  const { toggleTask, updateTask, deleteTask } = useAppStore()
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="flex items-center gap-2 py-1 px-2 rounded-lg group transition-colors"
      style={{ background: hovered ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => toggleTask(blockId, subId, task.id)}
        className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all"
        style={{
          background: task.completed ? 'var(--accent)' : 'transparent',
          border: `1.5px solid ${task.completed ? 'var(--accent)' : 'var(--border-strong)'}`,
        }}
      >
        {task.completed && <Check size={9} className="text-white" strokeWidth={3} />}
      </button>
      <InlineEdit
        value={task.label}
        onChange={v => updateTask(blockId, subId, task.id, { label: v })}
        className="flex-1 text-xs"
        style={{
          color: task.completed ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          textDecoration: task.completed ? 'line-through' : 'none',
        }}
        placeholder="Task name"
      />
      {hovered && (
        <button
          onClick={() => deleteTask(blockId, subId, task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}

// ── Sub-block ───────────────────────────────────────────────
function SubBlockCard({ sub, blockId, color }: { sub: RoadmapSubBlock; blockId: string; color: BlockColor }) {
  const { updateSubBlock, deleteSubBlock, addTask } = useAppStore()
  const c = COLOR_MAP[color]
  const doneTasks = sub.tasks.filter(t => t.completed).length
  const allDone = sub.tasks.length > 0 && doneTasks === sub.tasks.length

  return (
    <div
      className="rounded-xl mb-2 overflow-hidden"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      {/* Sub-block header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer group"
        style={{ borderBottom: sub.collapsed ? 'none' : `1px solid var(--border)` }}
        onClick={() => updateSubBlock(blockId, sub.id, { collapsed: !sub.collapsed })}
      >
        <button className="shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {sub.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
        <InlineEdit
          value={sub.label}
          onChange={v => updateSubBlock(blockId, sub.id, { label: v })}
          className="flex-1 text-xs font-semibold"
          style={{
            color: allDone ? 'var(--text-tertiary)' : 'var(--text-primary)',
            textDecoration: allDone ? 'line-through' : 'none',
          }}
          placeholder="Feature name"
        />
        {sub.tasks.length > 0 && (
          <span className="text-xs shrink-0" style={{ color: allDone ? '#10b981' : 'var(--text-tertiary)' }}>
            {doneTasks}/{sub.tasks.length}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); deleteSubBlock(blockId, sub.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={ev => (ev.currentTarget.style.color = '#ef4444')}
          onMouseLeave={ev => (ev.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Tasks */}
      {!sub.collapsed && (
        <div className="p-2">
          {sub.tasks.map(task => (
            <TaskRow key={task.id} task={task} blockId={blockId} subId={sub.id} />
          ))}
          <button
            onClick={() => addTask(blockId, sub.id)}
            className="flex items-center gap-1.5 w-full text-xs px-2 py-1 rounded-lg mt-1 transition-colors"
            style={{ color: c.text }}
            onMouseEnter={e => (e.currentTarget.style.background = c.soft)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus size={10} /> Add task
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main block ──────────────────────────────────────────────
function BlockCard({ block }: { block: RoadmapBlock }) {
  const { updateBlock, deleteBlock, addSubBlock } = useAppStore()
  const c = COLOR_MAP[block.color]
  const { done, total } = getProgress(block)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  return (
    <div
      className="rounded-2xl flex flex-col animate-slide-in"
      style={{
        width: 260,
        minWidth: 260,
        background: 'var(--surface-raised)',
        border: `1px solid ${c.border}`,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Block header */}
      <div
        className="p-4 pb-3 rounded-t-2xl"
        style={{ background: c.bg, borderBottom: `1px solid ${c.border}` }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Color dot / picker */}
            <div className="relative shrink-0">
              <button
                onClick={() => setColorPickerOpen(!colorPickerOpen)}
                className="w-3 h-3 rounded-full transition-transform hover:scale-125"
                style={{ background: c.dot }}
                title="Change color"
              />
              {colorPickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setColorPickerOpen(false)} />
                  <div
                    className="absolute left-0 top-5 flex gap-1.5 p-2 rounded-xl z-50"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
                  >
                    {COLORS.map(col => (
                      <button
                        key={col}
                        onClick={() => { updateBlock(block.id, { color: col }); setColorPickerOpen(false) }}
                        className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                        style={{ background: COLOR_MAP[col].dot }}
                        title={col}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <InlineEdit
              value={block.label}
              onChange={v => updateBlock(block.id, { label: v })}
              className="flex-1 text-sm font-bold"
              style={{ color: c.text }}
              placeholder="Phase name"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => updateBlock(block.id, { collapsed: !block.collapsed })}
              className="p-1 rounded-lg transition-colors"
              style={{ color: c.text }}
              onMouseEnter={e => (e.currentTarget.style.background = c.soft)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {block.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
            <button
              onClick={() => deleteBlock(block.id)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {/* Description */}
        <InlineEdit
          value={block.description || ''}
          onChange={v => updateBlock(block.id, { description: v })}
          className="block text-xs mt-1"
          style={{ color: 'var(--text-tertiary)' }}
          placeholder="Add description..."
        />

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: c.text }}>
              <span>{done}/{total} tasks</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.soft }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: c.dot }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sub-blocks */}
      {!block.collapsed && (
        <div className="p-3 flex-1">
          {block.subBlocks.map(sb => (
            <SubBlockCard key={sb.id} sub={sb} blockId={block.id} color={block.color} />
          ))}
          <button
            onClick={() => addSubBlock(block.id)}
            className="flex items-center gap-1.5 w-full text-xs px-3 py-2 rounded-xl transition-colors"
            style={{ color: c.text, border: `1px dashed ${c.border}` }}
            onMouseEnter={e => (e.currentTarget.style.background = c.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus size={11} /> Add sub-feature
          </button>
        </div>
      )}
    </div>
  )
}

// ── Canvas ──────────────────────────────────────────────────
export function RoadmapCanvas({ fullWidth = false }: { fullWidth?: boolean }) {
  const { roadmap, addBlock } = useAppStore()
  const [dlOpen, setDlOpen] = useState(false)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div
        className="h-10 flex items-center justify-between px-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Map size={13} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {roadmap.title}
          </span>
          {roadmap.blocks.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              · {roadmap.blocks.length} phases
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addBlock}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid rgba(99,102,241,0.2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
          >
            <Plus size={11} /> Add phase
          </button>

          <div className="relative">
            <button
              onClick={() => setDlOpen(!dlOpen)}
              disabled={roadmap.blocks.length === 0}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Download size={11} /> Export
            </button>
            {dlOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDlOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1.5 rounded-xl py-1 z-50 min-w-[160px] animate-slide-up"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
                >
                  {[
                    { label: 'Export as JSON', fn: () => { downloadAsJson(roadmap, roadmap.title); setDlOpen(false) } },
                    { label: 'Export as text', fn: () => { downloadAsTxt(roadmapToText(roadmap), roadmap.title); setDlOpen(false) } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.fn}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto">
        {roadmap.blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <Map size={24} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                No roadmap yet
              </p>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
                In the chat, describe your product or paste a PRD and say{' '}
                <span style={{ color: 'var(--accent)' }}>&ldquo;generate roadmap&rdquo;</span>. The AI will create an interactive roadmap with phases, features, and tasks.
              </p>
            </div>
            <button
              onClick={addBlock}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              style={{ background: 'var(--accent)', color: 'white' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Plus size={14} /> Add phase manually
            </button>
          </div>
        ) : (
          <div className="roadmap-canvas">
            {/* Connector lines */}
            {roadmap.blocks.map((block, i) => (
              <div key={block.id} className="flex items-start gap-0">
                <BlockCard block={block} />
                {i < roadmap.blocks.length - 1 && (
                  <div className="flex items-center" style={{ height: 44, marginTop: 24 }}>
                    <div className="flex items-center gap-0">
                      <div className="w-4 h-px" style={{ background: 'var(--border-strong)' }} />
                      <ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function roadmapToText(roadmap: { title: string; blocks: RoadmapBlock[] }): string {
  let out = `# ${roadmap.title}\n\n`
  for (const b of roadmap.blocks) {
    out += `## ${b.label}\n`
    if (b.description) out += `${b.description}\n`
    out += '\n'
    for (const sb of b.subBlocks) {
      out += `### ${sb.label}\n`
      for (const t of sb.tasks) {
        out += `- [${t.completed ? 'x' : ' '}] ${t.label}\n`
      }
      out += '\n'
    }
  }
  return out
}
