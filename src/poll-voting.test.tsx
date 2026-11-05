import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PollPage } from './routes/index'
import { defaultPoll } from './lib/poll'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('queues a vote clicked during a live refresh and submits it once', async () => {
  const result = { ...defaultPoll, mountains: 0, ocean: 0, choice: null }
  let finishRefresh: (value: Response) => void = () => {}
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json(result))
    .mockImplementationOnce(() => new Promise<Response>(resolve => { finishRefresh = resolve }))
    .mockResolvedValueOnce(Response.json({ ...result, mountains: 1, choice: 'mountains' }))
  vi.stubGlobal('fetch', fetchMock)
  let tick: () => void = () => {}
  const interval = globalThis.setInterval
  vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, delay, ...args) => {
    if (delay === 2000) tick = callback as () => void
    return interval(callback, delay, ...args)
  })
  render(<PollPage onCreated={vi.fn()} />)
  const button = await screen.findByRole('button', { name: 'Vote for into the mountains' })
  await waitFor(() => expect(button).toBeEnabled())
  await act(async () => { tick() })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  fireEvent.click(button)
  fireEvent.click(button)
  expect(screen.getByText('Voting…')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  await act(async () => { finishRefresh(Response.json(result)) })
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ choice: 'mountains' }) })
  expect(screen.getByText('Voted')).toBeInTheDocument()
  expect(screen.getByLabelText('1 votes')).toBeInTheDocument()
})
