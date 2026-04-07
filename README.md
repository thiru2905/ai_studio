# AI Studio — PRD & Roadmap Workspace 

Generate comprehensive Product Requirements Documents, Roadmaps, Code Reviews & Documentations  using AI, powered by Groq's ultra-fast inference.

## Features

- **Split panel workspace** — Chat with AI on the left, live preview on the right
- **AI reasoning display** — See the AI's thought process before it writes
- **Permission system** — AI asks before generating; you stay in control
- **Full-screen 3-pane view** — Template editor | Markdown source | Rendered preview
- **Editable template** — Customize the PRD structure the AI follows
- **Live markdown editor** — Edit the generated PRD directly
- **Export** — Download as `.txt`, `.md`, or print to PDF
- **Model selector** — Switch between Groq models on the fly
- **Persistent storage** — Chat history and documents saved in your browser

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Run the dev server

```bash
npm run dev
```

### 3. Open the app

Visit [http://localhost:3000](http://localhost:3000)

### 4. Add your Groq API Key

Click the **Settings** button (top right) and paste your Groq API key.
Get one free at [console.groq.com](https://console.groq.com/keys)

## How to Use

1. **Describe your product** — Type your requirements in the chat (or paste a document)
2. **Watch the reasoning** — AI Studio shows its thinking process in amber bubbles
3. **Grant permission** — Click "Allow" when AI Studio asks to generate the PRD
4. **Get your PRD** — The full document appears in the preview panel
5. **Refine** — Ask AI Studio to modify any section via chat
6. **Export** — Switch to full-screen mode and export as TXT, MD, or PDF

## Recommended Models

| Model | Best For |
|-------|----------|
| `llama-3.1-8b-instant` | Fast generation, simple PRDs |
| `llama-3.1-70b-versatile` | Detailed, complex PRDs |
| `llama-3.3-70b-versatile` | Best quality, slower |
| `mixtral-8x7b-32768` | Balanced speed/quality |

## Tech Stack

- **Next.js 14** — App router
- **Tailwind CSS** — Styling
- **Zustand** — State management (persisted to localStorage)
- **react-resizable-panels** — Draggable split panels
- **react-markdown** — Markdown rendering
- **Groq API** — Ultra-fast LLM inference (streaming)
- **react-hot-toast** — Notifications
