export type Choice = 'mountains' | 'ocean'
export type PollOption = { id: Choice; title: string; description: string; image: string }
export type Poll = { id: string; question: string; options: PollOption[]; mountains: number; ocean: number; choice: Choice | null }
export const defaultPoll = {
  id: 'default',
  question: 'You’ve got a free weekend. Where are you heading?',
  options: [
    { id: 'mountains', title: 'Into the mountains', description: 'Fresh air. Wild trails. A little perspective.', image: '/.netlify/images?url=/img/mountains.jpg&w=1000&h=620&fit=cover&fm=webp' },
    { id: 'ocean', title: 'Down to the ocean', description: 'Salty hair. Slow days. Nothing on the agenda.', image: '/.netlify/images?url=/img/ocean.jpg&w=1000&h=620&fit=cover&fm=webp' },
  ] satisfies PollOption[],
}
export function isPollId(id: string) {
  return id === 'default' || /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
}
export const maxImageBytes = 1536 * 1024
