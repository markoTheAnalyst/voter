import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PollCreator } from './components/poll-creator'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('adds and removes options while publishing the remaining titles and images in order', async () => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }))
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 'created-poll' }))
  vi.stubGlobal('fetch', fetchMock)
  const onCreated = vi.fn()
  const { container } = render(<PollCreator onCreated={onCreated} />)
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Where next?' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add option' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add option' }))
  for (const [i, input] of screen.getAllByLabelText('Option title').entries()) {
    fireEvent.change(input, { target: { value: `Choice ${i}` } })
  }
  for (const label of ['A', 'B', 'C', 'D']) {
    const input = screen.getByLabelText(`Image for option ${label}`) as HTMLInputElement
    const file = new File([label], `${label}.png`, { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
  }
  fireEvent.click(screen.getByRole('button', { name: 'Remove option B' }))
  expect(screen.getAllByLabelText('Option title')).toHaveLength(3)
  // jsdom does not serialize assigned file lists, so construct a browser-equivalent form snapshot.
  const NativeFormData = FormData
  vi.stubGlobal('FormData', class extends NativeFormData {
    constructor(form?: HTMLFormElement) {
      super(form)
      if (form) for (const input of form.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
        if (input.files?.[0]) this.set(input.name, input.files[0])
      }
    }
  })
  fireEvent.submit(container.querySelector('form')!)
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith('created-poll'))
  const body = fetchMock.mock.calls[0][1].body as FormData
  expect(body.get('optionCount')).toBe('3')
  expect([0, 1, 2].map(i => body.get(`title${i}`))).toEqual(['Choice 0', 'Choice 2', 'Choice 3'])
  expect([0, 1, 2].map(i => (body.get(`image${i}`) as File).name)).toEqual(['A.png', 'C.png', 'D.png'])
  expect(body.has('image3')).toBe(false)
})
it('keeps at least two options and caps the add control at ten', () => {
  render(<PollCreator onCreated={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /Remove option/ })).not.toBeInTheDocument()
  for (let i = 2; i < 10; i++) fireEvent.click(screen.getByRole('button', { name: 'Add option' }))
  expect(screen.getAllByLabelText('Option title')).toHaveLength(10)
  expect(screen.getByRole('button', { name: 'Add option' })).toBeDisabled()
})
