import type { Config, Context } from '@netlify/functions'
import { and, count, eq } from 'drizzle-orm'
import { getDb } from '../../db/index'
import { polls, pollVotes, votes } from '../../db/schema'
import { defaultPoll, isPollId } from '../../src/lib/poll'

export default async (req: Request, context: Context) => {
  const headers = { 'Cache-Control': 'no-store' }
  if (!['GET', 'POST'].includes(req.method)) return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET, POST' } })
  const url = new URL(req.url)
  const id = url.searchParams.get('poll') ?? 'default'
  if (!isPollId(id)) return Response.json({ error: 'Poll not found.' }, { status: 404, headers })
  try {
    const db = getDb()
    const definition = id === 'default' ? defaultPoll : (await db.select().from(polls).where(eq(polls.id, id)))[0]
    if (!definition) return Response.json({ error: 'Poll not found. Check your link or create a new poll.' }, { status: 404, headers })
    let voterId = context.cookies.get('either_voter')
    if (!voterId || !/^[a-f0-9-]{36}$/.test(voterId)) {
      voterId = crypto.randomUUID()
      context.cookies.set({ name: 'either_voter', value: voterId, httpOnly: true, secure: url.protocol === 'https:', sameSite: 'Lax', path: '/', maxAge: 31536000 })
    }
    if (req.method === 'POST') {
      if (req.headers.get('origin') !== url.origin) return Response.json({ error: 'Request not allowed. Reload the poll and try again.' }, { status: 403, headers })
      let body: { choice?: unknown }
      try { body = await req.json() } catch { return Response.json({ error: 'Invalid vote.' }, { status: 400, headers }) }
      if (body.choice !== 'mountains' && body.choice !== 'ocean') return Response.json({ error: 'Choose option A or B.' }, { status: 400, headers })
      if (id === 'default') await db.insert(votes).values({ voterId, choice: body.choice }).onConflictDoNothing()
      else await db.insert(pollVotes).values({ pollId: id, voterId, choice: body.choice }).onConflictDoNothing()
    }
    // Both tables use the same choices; existing votes remain on the original poll.
    const table = id === 'default' ? votes : pollVotes
    const totals = await db.select({ choice: table.choice, count: count() }).from(table)
      .where(id === 'default' ? undefined : eq(pollVotes.pollId, id)).groupBy(table.choice)
    const [mine] = await db.select({ choice: table.choice }).from(table)
      .where(id === 'default' ? eq(votes.voterId, voterId) : and(eq(pollVotes.pollId, id), eq(pollVotes.voterId, voterId)))
    return Response.json({ id, question: definition.question, options: definition.options, mountains: Number(totals.find(r => r.choice === 'mountains')?.count ?? 0), ocean: Number(totals.find(r => r.choice === 'ocean')?.count ?? 0), choice: mine?.choice ?? null }, { headers })
  } catch {
    return Response.json({ error: 'We couldn’t connect to the poll. Please try again.' }, { status: 503, headers })
  }
}
export const config: Config = { path: '/api/poll' }
