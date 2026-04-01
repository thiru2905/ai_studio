import { NextResponse } from 'next/server'
import { getMongoClient } from '@/lib/mongodb'
import type { AppMode, ChatSession, Project } from '@/types'
import type { MongoClient } from 'mongodb'

const DB_NAME = 'forge_prd'
const SESSIONS_COLLECTION = 'chat_sessions'
const APP_STATE_COLLECTION = 'app_state'
const APP_STATE_ID = 'default'

type SessionPayload = {
  sessions: ChatSession[]
  activeSessionIdByMode: Record<AppMode, string>
  projects: Project[]
  activeProjectId: string
}
type SessionDocument = ChatSession & {
  _id: string
}

type AppStateDocument = {
  _id: string
  projects: Project[]
  activeProjectId: string
  activeSessionIdByMode: Record<AppMode, string>
  createdAt?: Date
  updatedAt?: Date
}

let collectionPromise: Promise<MongoClient> | null = null
let indexesReadyPromise: Promise<void> | null = null

const ensureCollections = async () => {
  if (!collectionPromise) {
    collectionPromise = getMongoClient()
  }
  const client = await collectionPromise
  const db = client.db(DB_NAME)
  const sessions = db.collection<SessionDocument>(SESSIONS_COLLECTION)
  const appState = db.collection<AppStateDocument>(APP_STATE_COLLECTION)
  if (!indexesReadyPromise) {
    indexesReadyPromise = Promise.all([
      sessions.createIndex({ updatedAt: -1 }),
      sessions.createIndex({ mode: 1 }),
      sessions.createIndex({ projectId: 1 }),
      appState.createIndex({ updatedAt: -1 }),
    ]).then(() => undefined).catch((error) => {
      indexesReadyPromise = null
      throw error
    })
  }
  await indexesReadyPromise
  return { sessions, appState }
}

export async function GET() {
  try {
    const { sessions, appState } = await ensureCollections()
    const stateDoc = await appState.findOne({ _id: APP_STATE_ID })
    if (!stateDoc) {
      return NextResponse.json({ sessions: [], activeSessionIdByMode: null, projects: [], activeProjectId: null })
    }
    const sessionDocs = await sessions.find({}).sort({ updatedAt: -1 }).toArray()
    return NextResponse.json({
      sessions: sessionDocs.map(({ _id, ...rest }) => ({ ...rest, id: _id })),
      activeSessionIdByMode: stateDoc.activeSessionIdByMode ?? null,
      projects: stateDoc.projects ?? [],
      activeProjectId: stateDoc.activeProjectId ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load chat sessions', details: String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as SessionPayload
    if (!Array.isArray(payload.sessions) || !payload.activeSessionIdByMode || !Array.isArray(payload.projects) || !payload.activeProjectId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { sessions, appState } = await ensureCollections()
    const incoming = payload.sessions
    const incomingIds = incoming.map(s => s.id)

    if (incoming.length) {
      await sessions.bulkWrite(
        incoming.map((session) => ({
          updateOne: {
            filter: { _id: session.id },
            update: {
              $set: {
                ...session,
                _id: session.id,
              },
            },
            upsert: true,
          },
        })),
      )
    }

    await sessions.deleteMany({ _id: { $nin: incomingIds } })

    await appState.updateOne(
      { _id: APP_STATE_ID },
      {
        $set: {
          activeSessionIdByMode: payload.activeSessionIdByMode,
          projects: payload.projects,
          activeProjectId: payload.activeProjectId,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to persist chat sessions', details: String(error) },
      { status: 500 },
    )
  }
}
