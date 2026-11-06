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

it('renders nine digits and calculates percentages across all options', async () => {
  const result = { ...defaultPoll, options: [...defaultPoll.options, { id: 'option-3', title: 'Stay home', description: '', image: '/home.png' }], mountains: 0, ocean: 0, totals: { mountains: 123456789, ocean: 123456789, 'option-3': 246913578 }, choice: null }
  const fetchMock = vi.fn().mockResolvedValue(Response.json(result))
  vi.stubGlobal('fetch', fetchMock)
  render(<PollPage pollId="22222222-2222-4222-8222-222222222222" onCreated={vi.fn()} />)
  const button = await screen.findByRole('button', { name: 'Vote for stay home' })
  await waitFor(() => expect(button).toBeEnabled())
  expect(screen.getAllByLabelText('123456789 votes')[0].querySelectorAll('.flip-digit')).toHaveLength(9)
  expect(screen.getAllByLabelText('123456789 votes')[0].textContent).toBe('123456789')
  expect(screen.getByLabelText('246913578 votes').textContent).toBe('246913578')
  expect(screen.getByText('50')).toBeInTheDocument()
  fetchMock.mockResolvedValue(Response.json({ ...result, choice: 'option-3' }))
  fireEvent.click(button)
  await screen.findByText('Voted')
  expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ choice: 'option-3' }) })
})
