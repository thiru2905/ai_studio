import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatTime(ts: number): string {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

export const downloadAsTxt = (md: string, title: string) =>
  downloadFile(md, `${title.replace(/\s+/g, '-')}.txt`, 'text/plain')
export const downloadAsMd = (md: string, title: string) =>
  downloadFile(md, `${title.replace(/\s+/g, '-')}.md`, 'text/markdown')
export const downloadAsJson = (data: unknown, title: string) =>
  downloadFile(JSON.stringify(data, null, 2), `${title.replace(/\s+/g, '-')}.json`, 'application/json')

export function slugify(str: string) { return str.replace(/\s+/g, '-').toLowerCase() }
