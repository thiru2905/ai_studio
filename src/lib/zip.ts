import JSZip from 'jszip'
import { CodeFile } from '@/types'

const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_FILES = 400

const detectLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    cs: 'csharp', cpp: 'cpp', c: 'c', php: 'php', swift: 'swift',
    kt: 'kotlin', md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
    css: 'css', scss: 'scss', html: 'html', sh: 'bash', sql: 'sql',
    xml: 'xml', toml: 'toml',
  }
  return map[ext] || 'text'
}

const isLikelyText = (path: string) => {
  const lowered = path.toLowerCase()
  const blocked = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
    '.mp4', '.mov', '.avi', '.mp3', '.wav', '.woff', '.woff2',
    '.ttf', '.otf', '.eot', '.class', '.jar', '.exe', '.dll',
  ]
  return !blocked.some(ext => lowered.endsWith(ext))
}

export const extractCodeFilesFromZip = async (zipFile: File): Promise<CodeFile[]> => {
  const zip = await JSZip.loadAsync(zipFile)
  const out: CodeFile[] = []
  const entries = Object.values(zip.files)

  for (const entry of entries) {
    if (out.length >= MAX_FILES) break
    if (entry.dir) continue
    if (!isLikelyText(entry.name)) continue
    const text = await entry.async('string')
    const size = new Blob([text]).size
    if (size > MAX_FILE_BYTES) continue
    out.push({
      name: entry.name.split('/').pop() || entry.name,
      path: entry.name,
      content: text,
      language: detectLanguage(entry.name),
      size,
    })
  }

  return out
}
