import { getDatabase } from '@netlify/database'
import { drizzle } from 'drizzle-orm/netlify-db'
import * as schema from './schema'

export function getDb() {
  return drizzle({ client: getDatabase(), schema })
}
