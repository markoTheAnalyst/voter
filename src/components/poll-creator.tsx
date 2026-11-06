import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, ImagePlus } from 'lucide-react'
import { maxImageBytes, maxOptions, maxUploadBytes, optionLabel } from '@/lib/poll'

function ImageField({ index, label }: { index: number; label: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  return <label className={`image-upload ${preview ? 'has-preview' : ''}`}>
    {preview ? <img src={preview} alt={`Preview for option ${label}`} /> : <ImagePlus size={28} strokeWidth={1.4} />}
    <span>{file ? file.name : 'Choose an image'}<small>{file ? 'Click to replace' : 'JPEG, PNG or WebP · up to 1.5 MB'}</small></span>
    <input type="file" name={`image${index}`} accept="image/jpeg,image/png,image/webp" required aria-label={`Image for option ${label}`} onChange={event => {
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
  const [options, setOptions] = useState([0, 1])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const original = new FormData(event.currentTarget)
    const form = new FormData()
    form.set('question', original.get('question') ?? '')
    const uploadBytes = [...original.values()].reduce((sum, value) => sum + (value instanceof File ? value.size : 0), 0)
    if (uploadBytes > maxUploadBytes) { setError('Keep all images together under 4 MB.'); return }
    form.set('optionCount', String(options.length))
    // Renumber form fields after removals while keeping each option’s React identity stable.
    options.forEach((key, index) => {
      for (const field of ['title', 'description', 'image']) {
        const value = original.get(`${field}${key}`)
        if (value !== null) form.set(`${field}${index}`, value)
      }
    })
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
      <div className="creator-options">{options.map((index, position) => <section key={index} className="creator-option">
        <span className="eyebrow">OPTION {optionLabel(position)}</span>
        {options.length > 2 && <button type="button" className="text-button" aria-label={`Remove option ${optionLabel(position)}`} onClick={() => setOptions(current => current.filter(key => key !== index))}>Remove option</button>}
        <ImageField index={index} label={optionLabel(position)} />
        <label className="creator-label" htmlFor={`title${index}`}>Option title<input id={`title${index}`} name={`title${index}`} placeholder={index === 0 ? 'The first contender' : 'The other contender'} maxLength={80} required /></label>
        <label className="creator-label" htmlFor={`description${index}`}>Description <span>(optional)</span><input id={`description${index}`} name={`description${index}`} placeholder="A little more about this choice" maxLength={160} /></label>
      </section>)}</div>
      <button type="button" className="copy-button add-option-button" disabled={options.length >= maxOptions} onClick={() => setOptions(current => [...current, Math.max(...current) + 1])}>Add option</button>
      <p className="creator-note">Choose 2–10 options. Images must total under 4 MB.</p>
      <p className="creator-note">Your poll is public to anyone with the link. Once published, its options stay fixed so every vote keeps its meaning.</p>
      {error && <p className="creator-error" role="alert">{error}</p>}
      <button className="copy-button" type="submit">{saving ? 'Uploading & creating…' : 'Publish your poll'}<ArrowUpRight size={17} /></button>
    </fieldset>
  </form>
}
