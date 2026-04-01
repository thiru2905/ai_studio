'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { X, Eye, EyeOff, Key, ExternalLink, CheckCircle, Zap } from 'lucide-react'
import { GROQ_MODELS } from '@/lib/groq'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, settings, updateSettings } = useAppStore()
  const [apiKey, setApiKey] = useState(settings.groqApiKey)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)

  if (!settingsOpen) return null

  const handleSave = () => {
    updateSettings({ groqApiKey: apiKey })
    setSettingsOpen(false)
    toast.success('Settings saved')
  }

  const handleTest = async () => {
    if (!apiKey) return
    setTesting(true)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (res.ok) toast.success('API key is valid ✓')
      else toast.error('Invalid API key')
    } catch { toast.error('Could not reach Groq') }
    finally { setTesting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={() => setSettingsOpen(false)}
      />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl animate-slide-up overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Zap size={12} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* API Key */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Groq API Key
            </label>
            <div className="flex gap-2">
              <div
                className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <Key size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="gsk_..."
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button onClick={() => setShowKey(!showKey)} style={{ color: 'var(--text-tertiary)' }}>
                  {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <button
                onClick={handleTest}
                disabled={!apiKey || testing}
                className="px-3 text-xs rounded-xl transition-colors disabled:opacity-40"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              >
                {testing ? '...' : 'Test'}
              </button>
            </div>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Free at{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5" style={{ color: 'var(--accent-text)' }}>
                console.groq.com <ExternalLink size={9} />
              </a>
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Default Model
            </label>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {GROQ_MODELS.map(m => {
                const active = settings.selectedModel === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => updateSettings({ selectedModel: m.id })}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: active ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                      border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                      color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
                    }}
                  >
                    <div>
                      <p className="text-xs font-medium">{m.label}</p>
                      <p className="text-xs mt-0.5 opacity-60">{m.contextWindow / 1000}k context</p>
                    </div>
                    {active && <CheckCircle size={13} style={{ color: 'var(--accent)' }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Theme
            </label>
            <div className="flex gap-2">
              {(['light', 'dark'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize"
                  style={{
                    background: settings.theme === t ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: settings.theme === t ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${settings.theme === t ? 'transparent' : 'var(--border)'}`,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 text-xs rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-white transition-opacity"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
