'use client'
import { ChatMessage } from '@/types'
import { cn, formatTime } from '@/lib/utils'
import { Brain, Sparkles, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MessageBubble({ message, compact }: { message: ChatMessage; compact?: boolean }) {
  const isUser = message.role === 'user'
  const isReasoning = message.isReasoning

  if (message.permission && !message.content) return null

  const UserBubble = () => (
    <div className={cn('flex justify-end gap-2 animate-slide-up', compact ? 'mb-1.5' : 'mb-3')}>
      <div
        className={cn('rounded-2xl rounded-tr-sm leading-relaxed', compact ? 'px-2.5 py-1.5 text-xs max-w-[90%]' : 'px-3.5 py-2.5 text-sm max-w-[84%]')}
        style={{ background: 'var(--accent)', color: 'white' }}
      >
        <p style={{ margin: 0 }}>{message.content}</p>
        <p className="mt-1 text-right" style={{ fontSize: '10px', opacity: 0.6, marginBottom: 0 }}>
          {formatTime(message.timestamp)}
        </p>
      </div>
      <div
        className={cn('rounded-full flex items-center justify-center shrink-0 mt-0.5', compact ? 'w-5 h-5' : 'w-6 h-6')}
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <User size={compact ? 10 : 11} style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </div>
  )

  const AssistantBubble = () => (
    <div className={cn('flex gap-2 animate-slide-up', compact ? 'mb-1.5' : 'mb-3')}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center shrink-0 mt-0.5',
          compact ? 'w-5 h-5' : 'w-6 h-6',
          isReasoning ? '' : ''
        )}
        style={{
          background: isReasoning ? 'rgba(245,158,11,0.1)' : 'var(--accent-soft)',
          border: `1px solid ${isReasoning ? 'rgba(245,158,11,0.2)' : 'transparent'}`,
        }}
      >
        {isReasoning
          ? <Brain size={compact ? 9 : 11} style={{ color: '#f59e0b' }} />
          : <Sparkles size={compact ? 9 : 11} style={{ color: 'var(--accent)' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        {isReasoning && !compact && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>Reasoning</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatTime(message.timestamp)}</span>
          </div>
        )}
        <div
          className={cn(
            'rounded-2xl rounded-tl-sm',
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm',
            isReasoning ? 'italic' : ''
          )}
          style={{
            background: isReasoning ? 'rgba(245,158,11,0.05)' : 'var(--bg-secondary)',
            border: `1px solid ${isReasoning ? 'rgba(245,158,11,0.12)' : 'var(--border)'}`,
            color: isReasoning ? '#d97706' : 'var(--text-primary)',
          }}
        >
          {message.content ? (
            <div className={cn(isReasoning && 'opacity-80')}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p style={{ margin: '0 0 6px 0', color: 'inherit' }} className="last:mb-0">{children}</p>,
                  code: ({ children, className }) => {
                    const block = className?.includes('language-')
                    return block ? (
                      <pre style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', margin: '6px 0', overflow: 'auto' }}>
                        <code style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: 'var(--text-primary)' }}>{children}</code>
                      </pre>
                    ) : (
                      <code style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '1px 4px', borderRadius: 3, fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: 'var(--accent-text)' }}>{children}</code>
                    )
                  },
                  ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: '1rem', color: 'inherit' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: '1rem', color: 'inherit' }}>{children}</ol>,
                  li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{children}</strong>,
                  h2: ({ children }) => <h2 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '8px 0 4px', color: 'var(--text-primary)' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '6px 0 3px', color: 'var(--text-secondary)' }}>{children}</h3>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : message.isStreaming ? (
            <div className="flex gap-1 py-0.5">
              <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
            </div>
          ) : null}
          {message.isStreaming && message.content && (
            <span className="inline-block w-0.5 h-3 ml-0.5 align-middle animate-pulse" style={{ background: 'var(--accent)' }} />
          )}
        </div>
        {!compact && !isReasoning && (
          <p className="mt-1 ml-1" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{formatTime(message.timestamp)}</p>
        )}
      </div>
    </div>
  )

  return isUser ? <UserBubble /> : <AssistantBubble />
}
