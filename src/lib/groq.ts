export const GROQ_MODELS = [
  // Ranked top (strongest) -> bottom (weaker/specialized).
  { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', contextWindow: 131072 },
  { id: 'moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2 Instruct 0905', contextWindow: 262144 },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', contextWindow: 131072 },
  { id: 'qwen/qwen3-32b', label: 'Qwen3 32B', contextWindow: 131072 },
  { id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 Instruct', contextWindow: 131072 },
  { id: 'groq/compound', label: 'Groq Compound', contextWindow: 131072 },
  { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B', contextWindow: 131072 },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B', contextWindow: 131072 },
  { id: 'groq/compound-mini', label: 'Groq Compound Mini', contextWindow: 131072 },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', contextWindow: 131072 },
  { id: 'allam-2-7b', label: 'Allam 2 7B', contextWindow: 4096 },
  { id: 'openai/gpt-oss-safeguard-20b', label: 'GPT OSS Safeguard 20B', contextWindow: 131072 },
  { id: 'meta-llama/llama-prompt-guard-2-86m', label: 'Llama Prompt Guard 2 86M', contextWindow: 512 },
  { id: 'meta-llama/llama-prompt-guard-2-22m', label: 'Llama Prompt Guard 2 22M', contextWindow: 512 },
  { id: 'canopylabs/orpheus-v1-english', label: 'Orpheus V1 English', contextWindow: 4000 },
  { id: 'canopylabs/orpheus-arabic-saudi', label: 'Orpheus Arabic Saudi', contextWindow: 4000 },
  { id: 'whisper-large-v3-turbo', label: 'Whisper Large V3 Turbo', contextWindow: 448 },
  { id: 'whisper-large-v3', label: 'Whisper Large V3', contextWindow: 448 },
]

export interface GroqMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function streamGroqCompletion(
  apiKey: string, model: string, messages: GroqMessage[],
  onChunk: (chunk: string) => void, onDone: () => void, onError: (err: string) => void
) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: 8192, temperature: 0.7 }),
    })
    if (!response.ok) {
      const err = await response.json()
      onError(err?.error?.message || `API error: ${response.status}`); return
    }
    const reader = response.body?.getReader()
    if (!reader) { onError('No response body'); return }
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue
        try {
          const json = JSON.parse(trimmed.slice(6))
          const delta = json.choices?.[0]?.delta?.content
          if (delta) onChunk(delta)
        } catch { }
      }
    }
    onDone()
  } catch (err: unknown) {
    onError(err instanceof Error ? err.message : 'Network error')
  }
}

export async function transcribeGroqAudio(
  apiKey: string,
  file: Blob,
  opts?: { model?: string; language?: string; prompt?: string },
): Promise<string> {
  const model = opts?.model || 'whisper-large-v3-turbo'
  const form = new FormData()
  form.append('model', model)
  if (opts?.language) form.append('language', opts.language)
  if (opts?.prompt) form.append('prompt', opts.prompt)
  form.append('file', file, 'audio.webm')

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!response.ok) {
    let msg = `API error: ${response.status}`
    try {
      const err = await response.json()
      msg = err?.error?.message || msg
    } catch { }
    throw new Error(msg)
  }
  const data = await response.json() as { text?: string }
  return data.text || ''
}
