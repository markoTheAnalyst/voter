import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export default async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } })
  const key = new URL(req.url).searchParams.get('key') ?? ''
  if (!/^[a-f0-9-]{36}-[01]\.(jpg|png|webp)$/.test(key)) return new Response('Not found', { status: 404 })
  try {
    const data = await getStore({ name: 'poll-images', consistency: 'strong' }).get(key, { type: 'arrayBuffer' })
    if (!data) return new Response('Not found', { status: 404 })
    const type = key.endsWith('.jpg') ? 'image/jpeg' : key.endsWith('.png') ? 'image/png' : 'image/webp'
    return new Response(data, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } })
  } catch {
    return new Response('Image temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
export const config: Config = { path: '/api/poll-image' }
