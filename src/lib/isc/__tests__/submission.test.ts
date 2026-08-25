import { describe, expect, it } from 'vitest'
import { readSubmission } from '../submission'

function form(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

describe('readSubmission', () => {
  it('reads the fields the track defines', () => {
    const out = readSubmission(
      'content_creator',
      form({
        video_url: 'https://youtu.be/abc',
        title: 'My film',
        theme_note: 'It answers the theme.',
        language: 'English',
      })
    )
    expect(out).toEqual({
      video_url: 'https://youtu.be/abc',
      title: 'My film',
      theme_note: 'It answers the theme.',
      language: 'English',
    })
  })

  it('omits fields the student left blank rather than storing an empty string', () => {
    const out = readSubmission('content_creator', form({ title: 'My film', language: '' }))
    expect(out).toEqual({ title: 'My film' })
    expect('language' in out).toBe(false)
    expect('video_url' in out).toBe(false)
  })

  it('treats whitespace as blank', () => {
    const out = readSubmission(
      'content_creator',
      form({ title: '   ', video_url: '  https://x.example.com  ' })
    )
    expect(out).toEqual({ video_url: 'https://x.example.com' })
  })

  it('ignores posted keys the track does not define', () => {
    const out = readSubmission(
      'content_creator',
      form({ title: 'My film', intent: 'submit', entry_id: 'abc' })
    )
    expect(out).toEqual({ title: 'My film' })
  })
})
