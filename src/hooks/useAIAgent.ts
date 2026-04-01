'use client'
import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { streamGroqCompletion, GroqMessage } from '@/lib/groq'
import { BlockColor, CodeFile } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const BLOCK_COLORS: BlockColor[] = ['indigo', 'violet', 'teal', 'amber', 'rose', 'slate']

export function useAIAgent() {
  const store = useAppStore()

  const requestPermission = useCallback((action: string, onGranted: () => void) => {
    const permId = uuidv4()
    const permission = { id: permId, action, description: action, status: 'pending' as const, timestamp: Date.now() }
    const msgId = store.addMessage({ role: 'assistant', content: '', isReasoning: false, permission })
    store.setPendingPermission(permission)
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.permId !== permId) return
      window.removeEventListener('forge:permission-granted', handler)
      window.removeEventListener('forge:permission-denied', handler2)
      store.updateMessage(msgId, { permission: { ...permission, status: 'granted' } })
      onGranted()
    }
    const handler2 = (e: Event) => {
      if ((e as CustomEvent).detail?.permId !== permId) return
      window.removeEventListener('forge:permission-granted', handler)
      window.removeEventListener('forge:permission-denied', handler2)
      store.updateMessage(msgId, { permission: { ...permission, status: 'denied' } })
      store.addMessage({ role: 'assistant', content: "Understood — I won't proceed. Let me know if you'd like to adjust anything.", isReasoning: false })
      store.setIsGenerating(false)
    }
    window.addEventListener('forge:permission-granted', handler)
    window.addEventListener('forge:permission-denied', handler2)
  }, [store])

  // ── Streaming helper ──────────────────────────────────────
  const stream = useCallback(async (msgs: GroqMessage[], onChunk: (c: string) => void, onDone: () => void) => {
    await streamGroqCompletion(store.settings.groqApiKey, store.settings.selectedModel, msgs, onChunk,
      onDone, (err) => { store.addMessage({ role: 'assistant', content: `⚠️ ${err}` }); store.setIsGenerating(false) })
  }, [store])

  // ── Reasoning + permission flow ───────────────────────────
  const reasonThenAct = useCallback(async (
    systemPrompt: string,
    userContent: string,
    history: GroqMessage[],
    permissionLabel: string,
    onGranted: () => void
  ) => {
    const reasonId = store.addMessage({ role: 'assistant', content: '', isReasoning: true, isStreaming: true })
    let reasoning = ''
    let found = false
    await stream(
      [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userContent }],
      (chunk) => {
        if (found) return
        reasoning += chunk
        if (reasoning.includes('[PERMISSION_REQUEST:')) {
          const [before] = reasoning.split('[PERMISSION_REQUEST:')
          store.updateMessage(reasonId, { content: before.trim(), isStreaming: false })
          found = true
          requestPermission(permissionLabel, onGranted)
        } else {
          store.updateMessage(reasonId, { content: reasoning, isStreaming: true })
        }
      },
      () => { if (!found) { store.updateMessage(reasonId, { content: reasoning, isStreaming: false }); store.setIsGenerating(false) } }
    )
  }, [store, stream, requestPermission])

  // ── PRD generation ────────────────────────────────────────
  const generatePRD = useCallback(async (userContent: string) => {
    const msgId = store.addMessage({ role: 'assistant', content: '', isStreaming: true })
    let content = ''
    let titleSet = false
    await stream(
      [{
        role: 'system',
        content: `You are an expert product manager. Generate a comprehensive PRD in markdown.\n\nTemplate:\n${store.prdDoc.template}\n\nStart directly with # Title. No preamble. Be specific and detailed.`
      }, { role: 'user', content: `Generate the complete PRD for:\n${userContent}` }],
      (chunk) => {
        content += chunk
        store.updateMessage(msgId, { content, isStreaming: true })
        store.updatePRDMarkdown(content)
        if (!titleSet && content.includes('\n')) {
          const first = content.split('\n')[0]
          if (first.startsWith('# ')) { store.updatePRDTitle(first.replace(/^#\s+/, '').trim()); titleSet = true }
        }
      },
      () => {
        store.updateMessage(msgId, { content, isStreaming: false })
        store.addMessage({ role: 'assistant', content: '✅ PRD generated! Switch to **Fullscreen** to see the 3-pane editor. Use **Export** to download.' })
        store.setIsGenerating(false)
      }
    )
  }, [store, stream])

  // ── Roadmap generation ────────────────────────────────────
  const generateRoadmap = useCallback(async (userContent: string) => {
    const msgId = store.addMessage({ role: 'assistant', content: '', isStreaming: true })
    let raw = ''
    await stream(
      [{
        role: 'system',
        content: `You are an expert product manager. Using this template for guidance:\n${store.roadmap.template}\n\nOutput ONLY valid JSON, no markdown fences, no explanation.\nJSON: {"title":"...","blocks":[{"label":"...","description":"...","color":"indigo","subBlocks":[{"label":"...","tasks":[{"label":"...","completed":false}]}]}]}\nColors: indigo, violet, teal, amber, rose, slate. Generate 3-5 phases, 2-4 sub-features, 3-6 tasks each. Be specific.`
      }, { role: 'user', content: `Generate roadmap JSON for:\n${userContent}` }],
      (chunk) => { raw += chunk; store.updateMessage(msgId, { content: '```json\n' + raw + '\n```', isStreaming: true }) },
      () => {
        try {
          const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
          store.setRoadmapTitle(parsed.title || 'Product Roadmap')
          store.setRoadmapBlocks((parsed.blocks || []).map((b: { label?: string; description?: string; color?: string; subBlocks?: { label?: string; tasks?: { label?: string; completed?: boolean }[] }[] }, i: number) => ({
            id: uuidv4(), label: b.label || 'Phase', description: b.description || '',
            color: (b.color as BlockColor) || BLOCK_COLORS[i % BLOCK_COLORS.length],
            collapsed: false, position: i,
            subBlocks: (b.subBlocks || []).map((sb: { label?: string; tasks?: { label?: string; completed?: boolean }[] }) => ({
              id: uuidv4(), label: sb.label || 'Feature', collapsed: false,
              tasks: (sb.tasks || []).map((t: { label?: string; completed?: boolean }) => ({ id: uuidv4(), label: t.label || 'Task', completed: t.completed || false }))
            }))
          })))
          store.updateMessage(msgId, { content: `✅ Roadmap generated with **${(parsed.blocks || []).length} phases**! The canvas is on the right — expand to fullscreen for the template + canvas view.`, isStreaming: false })
          store.addMessage({ role: 'assistant', content: 'Double-click any label to edit it inline. Check tasks as you complete them. Use **+ Add phase** to add more blocks.' })
        } catch {
          store.updateMessage(msgId, { content: '⚠️ Failed to parse roadmap. Try the 70B model for better JSON output.', isStreaming: false })
        }
        store.setIsGenerating(false)
      }
    )
  }, [store, stream])

  // ── Code Docs generation ──────────────────────────────────
  const generateCodeDocs = useCallback(async (userContent: string, files: CodeFile[]) => {
    const msgId = store.addMessage({ role: 'assistant', content: '', isStreaming: true })
    const filesSummary = files.map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content.slice(0, 3000)}${f.content.length > 3000 ? '\n... (truncated)' : ''}\n\`\`\``).join('\n\n')
    let content = ''
    let titleSet = false
    await stream(
      [{
        role: 'system',
        content: `You are a senior software engineer writing comprehensive code documentation.\n\nTemplate to follow:\n${store.codeDocsDoc.template}\n\nGenerate documentation in markdown. Start with # Title. Be thorough and technical.`
      }, { role: 'user', content: `Document this codebase:\n\n${userContent}\n\n## Files:\n${filesSummary}` }],
      (chunk) => {
        content += chunk
        store.updateMessage(msgId, { content, isStreaming: true })
        store.updateCodeDocsMarkdown(content)
        if (!titleSet && content.includes('\n')) {
          const first = content.split('\n')[0]
          if (first.startsWith('# ')) { store.updateCodeDocsTitle(first.replace(/^#\s+/, '').trim()); titleSet = true }
        }
      },
      () => {
        store.updateMessage(msgId, { content, isStreaming: false })
        store.addMessage({ role: 'assistant', content: '✅ Documentation generated! Switch to **Fullscreen** to see the 3-pane editor with template, markdown, and preview.' })
        store.setIsGenerating(false)
      }
    )
  }, [store, stream])

  // ── Code Review generation ────────────────────────────────
  const generateCodeReview = useCallback(async (userContent: string, files: CodeFile[]) => {
    const msgId = store.addMessage({ role: 'assistant', content: '', isStreaming: true })
    const filesSummary = files.map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content.slice(0, 2500)}${f.content.length > 2500 ? '\n... (truncated)' : ''}\n\`\`\``).join('\n\n')
    let content = ''
    await stream(
      [{
        role: 'system',
        content: `You are a senior software engineer doing a thorough code review.\n\nTemplate/criteria:\n${store.codeReviewDoc.template}\n\nGenerate a comprehensive markdown code review. Include severity labels (🔴 Critical, 🟡 Warning, 🔵 Suggestion, ✅ Praise), file references, and specific fixes.`
      }, { role: 'user', content: `Review this code:\n\n${userContent}\n\n## Files:\n${filesSummary}` }],
      (chunk) => {
        content += chunk
        store.updateMessage(msgId, { content, isStreaming: true })
        store.updateCodeReviewMarkdown(content)
      },
      () => {
        store.updateMessage(msgId, { content, isStreaming: false })
        store.addMessage({ role: 'assistant', content: '✅ Code review complete! Switch to **Fullscreen** to see the full review with template and preview panes.' })
        store.setIsGenerating(false)
      }
    )
  }, [store, stream])

  // ── Main entry point ──────────────────────────────────────
  const sendMessage = useCallback(async (content: string, uploadedFiles?: CodeFile[]) => {
    if (!store.settings.groqApiKey) {
      store.addMessage({ role: 'assistant', content: '⚠️ Add your **Groq API key** in Settings (top right). Free at [console.groq.com](https://console.groq.com/keys).' })
      return
    }

    store.addMessage({ role: 'user', content })
    store.setIsGenerating(true)

    const mode = store.activeMode
    const isGenRequest = content.length > 50 || /prd|roadmap|document|review|generate|create|build|analyze|write/i.test(content)

    const getHistory = (msgs: typeof store.prdMessages): GroqMessage[] =>
      msgs.filter(m => !m.isReasoning && !m.permission && m.content).slice(-8)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    if (mode === 'prd') {
      if (!isGenRequest) {
        const replyId = store.addMessage({ role: 'assistant', content: '', isStreaming: true })
        let reply = ''
        await stream(
          [{ role: 'system', content: 'You are AI Studio, an AI PRD assistant. Be concise and helpful.' },
           ...getHistory(store.prdMessages), { role: 'user', content }],
          (c) => { reply += c; store.updateMessage(replyId, { content: reply, isStreaming: true }) },
          () => { store.updateMessage(replyId, { content: reply, isStreaming: false }); store.setIsGenerating(false) }
        )
      } else {
        await reasonThenAct(
          `You are AI Studio, an expert AI product manager helping create PRDs.\n1. Briefly explain your reasoning (what you understood, your approach, key sections you'll include).\n2. Output exactly: [PERMISSION_REQUEST:Generate full PRD document]\n3. Stop after that line.`,
          content, getHistory(store.prdMessages), 'Generate full PRD document',
          () => generatePRD(content)
        )
      }
    } else if (mode === 'roadmap') {
      if (!isGenRequest) {
        const replyId = store.addMessage({ role: 'assistant', content: '', isStreaming: true })
        let reply = ''
        await stream(
          [{ role: 'system', content: 'You are AI Studio, an AI roadmap planner. Be concise and helpful.' },
           ...getHistory(store.roadmapMessages), { role: 'user', content }],
          (c) => { reply += c; store.updateMessage(replyId, { content: reply, isStreaming: true }) },
          () => { store.updateMessage(replyId, { content: reply, isStreaming: false }); store.setIsGenerating(false) }
        )
      } else {
        await reasonThenAct(
          `You are AI Studio, an expert roadmap planner.\n1. Briefly explain the roadmap structure you'll create (phases, key features).\n2. Output exactly: [PERMISSION_REQUEST:Generate roadmap from requirements]\n3. Stop after that line.`,
          content, getHistory(store.roadmapMessages), 'Generate roadmap from requirements',
          () => generateRoadmap(content)
        )
      }
    } else if (mode === 'codedocs') {
      const files = uploadedFiles?.length ? uploadedFiles : store.codeDocsDoc.files
      if (!isGenRequest) {
        const replyId = store.addMessage({ role: 'assistant', content: '', isStreaming: true })
        let reply = ''
        await stream(
          [{ role: 'system', content: 'You are AI Studio, an AI code documentation assistant. Be concise.' },
           ...getHistory(store.codeDocsMessages), { role: 'user', content }],
          (c) => { reply += c; store.updateMessage(replyId, { content: reply, isStreaming: true }) },
          () => { store.updateMessage(replyId, { content: reply, isStreaming: false }); store.setIsGenerating(false) }
        )
      } else {
        if (!files.length) {
          store.addMessage({
            role: 'assistant',
            content: '⚠️ No code files detected. Upload files in the right panel first, then ask me to generate docs.',
          })
          store.setIsGenerating(false)
          return
        }
        await reasonThenAct(
          `You are AI Studio, an expert software engineer writing code documentation.\n1. Briefly explain what you'll document (structure, key areas).\n2. Output exactly: [PERMISSION_REQUEST:Generate code documentation]\n3. Stop after that line.`,
          content, getHistory(store.codeDocsMessages), 'Generate code documentation',
          () => generateCodeDocs(content, files)
        )
      }
    } else if (mode === 'codereview') {
      const files = uploadedFiles?.length ? uploadedFiles : store.codeDocsDoc.files
      if (!isGenRequest) {
        const replyId = store.addMessage({ role: 'assistant', content: '', isStreaming: true })
        let reply = ''
        await stream(
          [{ role: 'system', content: 'You are AI Studio, an AI code review assistant. Be concise.' },
           ...getHistory(store.codeReviewMessages), { role: 'user', content }],
          (c) => { reply += c; store.updateMessage(replyId, { content: reply, isStreaming: true }) },
          () => { store.updateMessage(replyId, { content: reply, isStreaming: false }); store.setIsGenerating(false) }
        )
      } else {
        if (!files.length) {
          store.addMessage({
            role: 'assistant',
            content: '⚠️ No code files detected. Upload files in the right panel first, then ask me to generate a review.',
          })
          store.setIsGenerating(false)
          return
        }
        await reasonThenAct(
          `You are AI Studio, an expert senior software engineer doing code reviews.\n1. Briefly explain your review approach (what you'll check, focus areas).\n2. Output exactly: [PERMISSION_REQUEST:Generate code review]\n3. Stop after that line.`,
          content, getHistory(store.codeReviewMessages), 'Generate code review',
          () => generateCodeReview(content, files)
        )
      }
    }
  }, [store, stream, reasonThenAct, generatePRD, generateRoadmap, generateCodeDocs, generateCodeReview])

  return { sendMessage }
}
