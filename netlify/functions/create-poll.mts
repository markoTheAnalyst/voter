import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { getDb } from '../../db/index'
import { polls } from '../../db/schema'
import { maxImageBytes, type PollOption } from '../../src/lib/poll'

function imageType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'png'
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'webp'
  return null
}

export default async (req: Request) => {
  const headers = { 'Cache-Control': 'no-store' }
  const fail = (error: string, status = 400) => Response.json({ error }, { status, headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'POST' } })
  if (req.headers.get('origin') !== new URL(req.url).origin) return fail('Request not allowed.', 403)
  if (Number(req.headers.get('content-length')) > 4 * 1024 * 1024) return fail('Choose images under 1.5 MB each.', 413)
  try {
    let form: FormData
    try { form = await req.formData() } catch { return fail('Please submit the poll form with two images.') }
    const field = (name: string) => typeof form.get(name) === 'string' ? (form.get(name) as string).trim() : ''
    const question = field('question')
    if (!question || question.length > 180) return fail('Add a question of up to 180 characters.')
    const id = crypto.randomUUID()
    const options: PollOption[] = []
    const uploads: { key: string; data: ArrayBuffer }[] = []
    for (const [index, choice] of (['mountains', 'ocean'] as const).entries()) {
      const title = field(`title${index}`)
      const description = field(`description${index}`)
      if (!title || title.length > 80 || description.length > 160) return fail('Each option needs a title of up to 80 characters and a description of up to 160 characters.')
      const image = form.get(`image${index}`)
      if (!(image instanceof File) || !image.size || image.size > maxImageBytes) return fail('Upload an image for each option, up to 1.5 MB each.')
      const data = await image.arrayBuffer()
      const extension = imageType(new Uint8Array(data))
      if (!extension) return fail('Use JPEG, PNG, or WebP images.')
      const key = `${id}-${index}.${extension}`
      uploads.push({ key, data })
      options.push({ id: choice, title, description, image: `/api/poll-image?key=${key}` })
    }
    const store = getStore({ name: 'poll-images', consistency: 'strong' })
    try {
      for (const upload of uploads) await store.set(upload.key, upload.data)
      await getDb().insert(polls).values({ id, question, options })
    } catch {
      await Promise.allSettled(uploads.map(upload => store.delete(upload.key)))
      return fail('Your poll couldn’t be saved. Please try again.', 503)
    }
    return Response.json({ id }, { status: 201, headers })
  } catch {
    return fail('Your poll couldn’t be saved. Please try again.', 503)
  }
}
export const config: Config = { path: '/api/polls' }
