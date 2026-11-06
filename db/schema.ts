import type { PollOption } from '../src/lib/poll'
import { pgTable, text, timestamp, check, jsonb, primaryKey } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const votes = pgTable('votes', {
  voterId: text('voter_id').primaryKey(),
  choice: text('choice').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check('valid_choice', sql`${table.choice} in ('mountains', 'ocean')`)])

export const polls = pgTable('polls', {
  id: text('id').primaryKey(),
  question: text('question').notNull(),
  options: jsonb('options').$type<PollOption[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const pollVotes = pgTable('poll_votes', {
  pollId: text('poll_id').notNull().references(() => polls.id),
  voterId: text('voter_id').notNull(),
  choice: text('choice').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.pollId, table.voterId] }),
])
