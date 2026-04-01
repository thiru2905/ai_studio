import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error('Missing MONGODB_URI environment variable')
}

declare global {
  // eslint-disable-next-line no-var
  var __forgeMongoClient: MongoClient | undefined
  // eslint-disable-next-line no-var
  var __forgeMongoClientPromise: Promise<MongoClient> | undefined
}

export const getMongoClient = async () => {
  if (globalThis.__forgeMongoClient) return globalThis.__forgeMongoClient
  if (globalThis.__forgeMongoClientPromise) return globalThis.__forgeMongoClientPromise

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  })

  globalThis.__forgeMongoClientPromise = client.connect().then((connected) => {
    globalThis.__forgeMongoClient = connected
    return connected
  }).catch((error) => {
    globalThis.__forgeMongoClientPromise = undefined
    throw error
  })

  return globalThis.__forgeMongoClientPromise
}
