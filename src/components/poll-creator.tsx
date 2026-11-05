import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, ImagePlus } from 'lucide-react'
import { maxImageBytes } from '@/lib/poll'

function ImageField({ index }: { index: number }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  return <label className={`image-upload ${preview ? 'has-preview' : ''}`}>
    {preview ? <img src={preview} alt={`Preview for option ${index === 0 ? 'A' : 'B'}`} /> : <ImagePlus size={28} strokeWidth={1.4} />}
    <span>{file ? file.name : 'Choose an image'}<small>{file ? 'Click to replace' : 'JPEG, PNG or WebP · up to 1.5 MB'}</small></span>
    <input type="file" name={`image${index}`} accept="image/jpeg,image/png,image/webp" required aria-label={`Image for option ${index === 0 ? 'A' : 'B'}`} onChange={event => {
      const selected = event.target.files?.[0] ?? null
      event.target.setCustomValidity(selected && selected.size > maxImageBytes ? 'Choose an image under 1.5 MB.' : '')
      event.target.reportValidity()
      const valid = selected && selected.size <= maxImageBytes ? selected : null
      setFile(valid)
      setPreview(valid ? URL.createObjectURL(valid) : '')
    }} />
  </label>
}

export function PollCreator({ onCreated }: { onCreated: (id: string) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const form = new FormData(event.currentTarget)
    setSaving(true); setError('')
    try {
      const response = await fetch('/api/polls', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Your poll couldn’t be saved. Please try again.')
      onCreated(data.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Your poll couldn’t be saved. Please try again.')
      setSaving(false)
    }
  }
  return <form className="creator-form" onSubmit={event => void submit(event)}>
    <fieldset disabled={saving}>
      <label className="creator-label" htmlFor="poll-question">Your question<input id="poll-question" name="question" placeholder="Which one gets your vote?" maxLength={180} required /></label>
      <div className="creator-options">{[0, 1].map(index => <section key={index} className="creator-option">
        <span className="eyebrow">OPTION {index === 0 ? 'A' : 'B'}</span>
        <ImageField index={index} />
        <label className="creator-label" htmlFor={`title${index}`}>Option title<input id={`title${index}`} name={`title${index}`} placeholder={index === 0 ? 'The first contender' : 'The other contender'} maxLength={80} required /></label>
        <label className="creator-label" htmlFor={`description${index}`}>Description <span>(optional)</span><input id={`description${index}`} name={`description${index}`} placeholder="A little more about this choice" maxLength={160} /></label>
      </section>)}</div>
      <p className="creator-note">Your poll is public to anyone with the link. Once published, its options stay fixed so every vote keeps its meaning.</p>
      {error && <p className="creator-error" role="alert">{error}</p>}
      <button className="copy-button" type="submit">{saving ? 'Uploading & creating…' : 'Publish your poll'}<ArrowUpRight size={17} /></button>
    </fieldset>
  </form>
}
