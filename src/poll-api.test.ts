// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@netlify/functions'
import handler from '../netlify/functions/poll.mts'
import { defaultPoll } from './lib/poll'

const state = vi.hoisted(() => ({
  rows: [] as { pollId: string; voterId: string; choice: string }[],
  cookie: '11111111-1111-4111-8111-111111111111',
  id: '22222222-2222-4222-8222-222222222222',
}))
vi.mock('../db/index', async () => {
  const { polls, pollVotes } = await import('../db/schema')
  return { getDb: () => ({
    insert: (table: unknown) => ({ values: (row: { pollId?: string; voterId: string; choice: string }) => ({ onConflictDoNothing: async () => {
      const pollId = table === pollVotes ? row.pollId! : 'default'
      if (!state.rows.some(r => r.pollId === pollId && r.voterId === row.voterId)) state.rows.push({ ...row, pollId })
    } }) }),
    select: (fields?: { count?: unknown }) => ({ from: (table: unknown) => ({ where: () => {
      if (table === polls) return Promise.resolve([{ id: state.id, question: 'Tea or coffee?', options: defaultPoll.options }])
      const rows = state.rows.filter(r => r.pollId === (table === pollVotes ? state.id : 'default'))
      const mine = rows.filter(r => r.voterId === state.cookie)
      return Object.assign(Promise.resolve(mine), { groupBy: async () => fields?.count ? ['mountains', 'ocean'].map(choice => ({ choice, count: String(rows.filter(r => r.choice === choice).length) })) : [] })
    } }) }),
  }) }
})
function context() {
  return { cookies: { get: () => state.cookie, set: vi.fn() } } as unknown as Context
}
function vote(choice = 'mountains', poll = '', origin = 'https://either.test') {
  return handler(new Request(`https://either.test/api/poll${poll ? `?poll=${poll}` : ''}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ choice }) }), context())
}
beforeEach(() => { state.rows = []; state.cookie = '11111111-1111-4111-8111-111111111111' })
describe('poll voting', () => {
  it('returns numeric zero totals before anyone votes', async () => {
    const response = await handler(new Request('https://either.test/api/poll'), context())
    expect(await response.json()).toMatchObject({ mountains: 0, ocean: 0, choice: null })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  it('counts one vote per browser, even for concurrent submissions', async () => {
    await Promise.all([vote(), vote(), vote('ocean')])
    const result = await (await vote()).json()
    expect(result).toMatchObject({ mountains: 1, ocean: 0, choice: 'mountains' })
    state.cookie = '33333333-3333-4333-8333-333333333333'
    expect(await (await vote('ocean')).json()).toMatchObject({ mountains: 1, ocean: 1, choice: 'ocean' })
  })
  it('allows a browser to vote on another poll without mixing totals', async () => {
    await vote()
    expect(await (await vote('ocean', state.id)).json()).toMatchObject({ id: state.id, mountains: 0, ocean: 1, choice: 'ocean' })
    expect(await (await vote()).json()).toMatchObject({ mountains: 1, ocean: 0 })
  })
  it('rejects invalid choices, foreign origins and malformed poll links', async () => {
    expect((await vote('invalid')).status).toBe(400)
    expect((await vote('mountains', '', 'https://elsewhere.test')).status).toBe(403)
    expect((await vote('mountains', 'invalid')).status).toBe(404)
    expect(state.rows).toHaveLength(0)
  })
})
