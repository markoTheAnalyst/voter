// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import create from '../netlify/functions/create-poll.mts'
import image from '../netlify/functions/poll-image.mts'

const mocks = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn(), insert: vi.fn() }))
vi.mock('@netlify/blobs', () => ({ getStore: () => ({ set: mocks.set, get: mocks.get, delete: mocks.delete }) }))
vi.mock('../db/index', () => ({ getDb: () => ({ insert: () => ({ values: mocks.insert }) }) }))
beforeEach(() => { vi.resetAllMocks() })
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
function request(options: { badImage?: boolean; noTitle?: boolean; count?: number } = {}) {
  const form = new FormData()
  form.set('question', 'Which should we choose?')
  if (options.count !== undefined) form.set('optionCount', String(options.count))
  for (let i = 0; i < (options.count ?? 2); i++) {
    form.set(`title${i}`, options.noTitle ? '' : `Choice ${i}`)
    form.set(`image${i}`, new File([options.badImage ? '<svg>bad</svg>' : png], 'image.png', { type: 'image/png' }))
  }
  return new Request('https://either.test/api/polls', { method: 'POST', headers: { origin: 'https://either.test' }, body: form })
}
it('stores both uploads and saves a shareable poll definition', async () => {
  const response = await create(request())
  expect(response.status).toBe(201)
  const { id } = await response.json()
  expect(mocks.set).toHaveBeenCalledTimes(2)
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ id, question: 'Which should we choose?', options: [
    expect.objectContaining({ title: 'Choice 0', image: `/api/poll-image?key=${id}-0.png` }),
    expect.objectContaining({ title: 'Choice 1', image: `/api/poll-image?key=${id}-1.png` }),
  ] }))
})
it('rejects missing titles and files masquerading as images before storing them', async () => {
  expect((await create(request({ noTitle: true }))).status).toBe(400)
  expect((await create(request({ badImage: true }))).status).toBe(400)
  expect(mocks.set).not.toHaveBeenCalled()
  expect(mocks.insert).not.toHaveBeenCalled()
})
it('cleans up uploaded files when saving the poll fails', async () => {
  mocks.insert.mockRejectedValue(new Error('unavailable'))
  expect((await create(request())).status).toBe(503)
  expect(mocks.delete).toHaveBeenCalledTimes(2)
})
it('serves uploaded image bytes and rejects arbitrary keys', async () => {
  mocks.get.mockResolvedValue(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength))
  const response = await image(new Request('https://either.test/api/poll-image?key=11111111-1111-4111-8111-111111111111-0.png'))
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(Buffer.from(await response.arrayBuffer())).toEqual(png)
  expect((await image(new Request('https://either.test/api/poll-image?key=../private'))).status).toBe(404)
})

it('creates every option and serves images beyond the original pair', async () => {
  const response = await create(request({ count: 4 }))
  expect(response.status).toBe(201)
  expect(mocks.set).toHaveBeenCalledTimes(4)
  expect(mocks.insert.mock.calls[0][0].options.map((option: { id: string }) => option.id)).toEqual(['mountains', 'ocean', 'option-3', 'option-4'])
  mocks.get.mockResolvedValue(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength))
  expect((await image(new Request('https://either.test/api/poll-image?key=11111111-1111-4111-8111-111111111111-3.png'))).status).toBe(200)
})
it('rejects option counts outside the supported range before uploading', async () => {
  for (const count of [0, 1, 2.5, 11]) expect((await create(request({ count }))).status).toBe(400)
  expect(mocks.set).not.toHaveBeenCalled()
})
