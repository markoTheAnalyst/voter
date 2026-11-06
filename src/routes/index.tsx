import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Copy, ArrowRight, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

import { defaultPoll, optionLabel, voteCount, type Choice, type Poll } from '@/lib/poll'
import { PollCreator } from '@/components/poll-creator'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { poll?: string } => ({ poll: typeof search.poll === 'string' ? search.poll : undefined }),
  component: Home,
})
function FlipCounter({ value, loading }: { value: number; loading: boolean }) {
  return <div className={`flip-counter ${loading ? 'loading' : ''}`} aria-label={loading ? 'Loading votes' : `${value} votes`}>
    {String(value).padStart(9, '0').split('').map((digit, i) => <span className="flip-digit" key={i} aria-hidden="true"><span key={digit} className="digit-number">{loading ? '–' : digit}</span><i /></span>)}
  </div>
}
function Home() {
  const { poll: pollId } = Route.useSearch()
  const navigate = Route.useNavigate()
  return <PollPage key={pollId ?? 'default'} pollId={pollId} onCreated={id => { void navigate({ to: '/', search: { poll: id } }) }} />
}
export function PollPage({ pollId, onCreated }: { pollId?: string; onCreated: (id: string) => void }) {
  const endpoint = pollId ? `/api/poll?poll=${encodeURIComponent(pollId)}` : '/api/poll'
  const [poll, setPoll] = useState<Poll | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<Choice | null>(null)
  const [dialog, setDialog] = useState<'about' | 'share' | 'create' | null>(null)
  const [voting, setVoting] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const busy = useRef(false)
  const voteQueued = useRef(false)
  const refreshTask = useRef<Promise<void> | null>(null)
  const refresh = useCallback(() => {
    if (busy.current || voteQueued.current) return refreshTask.current ?? Promise.resolve()
    busy.current = true
    const task = (async () => {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 404) setNotFound(true)
        throw new Error(data.error || 'Live connection interrupted. Reconnecting…')
      }
      setPoll(data); setError('')
    } catch (error) { setError(error instanceof Error ? error.message : 'Live connection interrupted. Reconnecting…') }
    finally { busy.current = false }
    })()
    refreshTask.current = task
    return task
  }, [endpoint])
  useEffect(() => { void refresh(); const timer = setInterval(() => { void refresh() }, 2000); return () => clearInterval(timer) }, [refresh])
  async function vote(choice: Choice) {
    if (voteQueued.current || poll?.choice || !poll) return
    voteQueued.current = true
    setVoting(true); setPending(choice); setError('')
    await refreshTask.current
    busy.current = true
    try {
      const response = await fetch(endpoint, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ choice }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Your vote didn’t go through. Please try again.')
      setPoll(data)
    } catch (error) { setError(error instanceof Error ? error.message : 'Your vote didn’t go through. Please try again.') }
    finally { busy.current = false; setPending(null); setVoting(false); voteQueued.current = false }
  }
  const total = poll?.options.reduce((sum, option) => sum + voteCount(poll, option.id), 0) ?? 0
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true) } catch { setCopied(false) }
  }
  return <div className="app-shell">
    <header className="site-header"><a className="wordmark" href="/" aria-label="Either home">either<span className="brand-mark">↗</span></a><div className="brand-note">GOOD QUESTIONS. GREAT DIVIDES.</div><button className="create-poll-button" onClick={() => setDialog('create')}><Plus size={15} /> Create a poll</button><button className="text-button" onClick={() => setDialog('about')}>How it works <ArrowUpRight size={15} /></button></header>
    <main>
      <section className="intro"><div className="intro-copy"><div className="eyebrow"><span className="tiny-line" /> {pollId ? 'YOUR QUESTION · THEIR OPINION' : 'THE GREAT ESCAPE · POLL 001'}</div><h1>A little choice.<br />A <span>big debate.</span></h1><p>{poll?.question ?? (pollId ? (notFound ? 'Poll not found' : 'Loading your question…') : defaultPoll.question)}<br className="desktop-break" /> Great options. Only one gets your vote.</p></div><div className="intro-aside"><span className="live-pill"><span /> LIVE POLL</span><p>No wrong answers.<br />Just strong opinions.</p><span className="sketch-arrow">↙</span></div></section>
      <section className="poll-grid" aria-label={poll?.question ?? 'Choose an option'}>
        {(poll?.options ?? (pollId ? [] : defaultPoll.options)).map(({ id, title, description, image }, index) => {
          const letter = optionLabel(index)
          const value = voteCount(poll, id)
          const percent = total ? Math.round(value / total * 100) : 0
          const selected = poll?.choice === id
          return <article className={`option-card ${selected ? 'selected' : ''}`} key={id}>
            <div className="photo-wrap"><img src={image} alt={title} fetchPriority="high" /><span className="option-letter">OPTION {letter}</span>{selected && <span className="voted-stamp"><Check size={14} /> YOUR PICK</span>}</div>
            <div className="card-copy"><div><h2>{title}</h2><p>{description}</p></div><button className={`vote-button ${selected ? 'is-voted' : ''}`} onClick={() => void vote(id)} disabled={!poll || voting || !!poll.choice} aria-label={`Vote for ${title.toLowerCase()}`}>{pending === id ? 'Voting…' : selected ? <><Check size={16} /> Voted</> : poll?.choice ? 'Vote closed' : <>Vote {letter} <ArrowUpRight size={16} /></>}</button></div>
            <div className="results"><div><FlipCounter value={value} loading={!poll} /><span className="counter-caption">VOTES AND COUNTING</span></div><div className="percentage"><strong>{percent}<span>%</span></strong><span>of the vote</span></div></div>
            <div className="result-track"><div style={{ transform: `scaleX(${percent / 100})` }} /></div>
          </article>
        })}{pollId && !poll && <div className="poll-placeholder">{notFound ? 'This poll could not be found.' : 'Connecting to your poll…'}</div>}{(!pollId || poll) && (poll?.options.length ?? 2) === 2 && <div className="versus" aria-hidden="true">or</div>}
      </section>
      <div className="poll-meta"><span className="connection"><span className={error ? 'status-dot offline' : 'status-dot'} />{notFound ? 'Poll not found' : error ? 'Reconnecting' : poll ? 'Results update live' : 'Connecting to the poll'}<span className="meta-divider">/</span><strong>{poll ? total.toLocaleString() : '—'}</strong> total votes</span><span className="vote-note">{poll?.choice ? 'Your vote is in. Good choice.' : 'One vote per browser. Make it count.'}</span></div>
      {error && <div className="error-message" role="alert">{error}<button onClick={() => void refresh()}>Retry <ArrowRight size={14} /></button></div>}
      <section className="share-strip"><div><span className="little-star">✳</span><div><h3>Some decisions are better with friends.</h3><p>Send them the poll. See which side they’re on.</p></div></div><button onClick={() => { setCopied(false); setDialog('share') }}>Share this poll <ArrowUpRight size={17} /></button></section>
    </main>
    <footer><a href="/" className="footer-logo">either↗</a><span>A small question. A world of opinions.</span><span>Made for the beautifully undecided.</span></footer>
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null) }}><DialogContent className={`poll-dialog ${dialog === 'create' ? 'creator-dialog' : ''}`} ><DialogTitle>{dialog === 'create' ? 'Your question. Your contenders.' : dialog === 'about' ? 'Your options. One opinion.' : 'Bring a friend into the debate.'}</DialogTitle><DialogDescription>{dialog === 'create' ? 'Add your options, upload your photos, and share the debate.' : dialog === 'about' ? 'Choose an option that speaks to you and tap its vote button. Your vote is saved once per browser. Watch the flip counters change as everyone weighs in — results refresh every two seconds.' : 'Copy the link below and share it with your friends. Everyone’s votes count toward the same live results.'}</DialogDescription>{dialog === 'create' && <PollCreator onCreated={onCreated} />}{dialog === 'share' && <><input aria-label="Poll link" readOnly value={typeof window !== 'undefined' ? window.location.href : ''} onFocus={event => event.target.select()} /><button className="copy-button" onClick={() => void copyLink()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Link copied' : 'Copy poll link'}</button></>}</DialogContent></Dialog>
  </div>
}
