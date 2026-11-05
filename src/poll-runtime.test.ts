// @vitest-environment node
import { expect, it } from 'vitest'
import type { Context } from '@netlify/functions'
import handler from '../netlify/functions/poll.mts'

// The platform's agent database connection is read-only. Verify the real read
// path on demand; submission and duplicate handling use isolated API tests.
it.runIf(process.env.RUN_POLL_DATABASE_TEST === '1')('reads numeric totals from the preview database', async () => {
  const context = { cookies: { get: () => crypto.randomUUID(), set: () => {} } } as unknown as Context
  const response = await handler(new Request('https://either.test/api/poll'), context)
  expect(response.status).toBe(200)
  const result = await response.json()
  expect(typeof result.mountains).toBe('number')
  expect(typeof result.ocean).toBe('number')
  expect(result.choice).toBeNull()
})
