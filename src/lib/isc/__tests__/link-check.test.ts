import { describe, expect, it } from 'vitest'
import {
  parseLink,
  interpretYouTube,
  interpretDrive,
  isDriveAccessWall,
} from '@/lib/isc/link-check'

describe('parseLink', () => {
  it('reads a standard watch link', () => {
    expect(parseLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      id: 'dQw4w9WgXcQ',
    })
  })

  it('reads a youtu.be short link', () => {
    expect(parseLink('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      id: 'dQw4w9WgXcQ',
    })
  })

  it('reads a Shorts link', () => {
    expect(parseLink('https://www.youtube.com/shorts/abc123XYZ_-')).toEqual({
      kind: 'youtube',
      id: 'abc123XYZ_-',
    })
  })

  it('keeps extra query params out of the id', () => {
    expect(parseLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share')).toEqual({
      kind: 'youtube',
      id: 'dQw4w9WgXcQ',
    })
  })

  it('reads a Drive file link', () => {
    expect(parseLink('https://drive.google.com/file/d/1AbC_dEfG/view?usp=sharing')).toEqual({
      kind: 'drive',
      id: '1AbC_dEfG',
    })
  })

  it('reads a Google Doc link', () => {
    expect(parseLink('https://docs.google.com/document/d/1XyZ123/edit')).toEqual({
      kind: 'drive',
      id: '1XyZ123',
    })
  })

  it('reads a Drive open?id= link', () => {
    expect(parseLink('https://drive.google.com/open?id=1AbC_dEfG')).toEqual({
      kind: 'drive',
      id: '1AbC_dEfG',
    })
  })

  it('treats anything else as other', () => {
    expect(parseLink('https://my-app.vercel.app').kind).toBe('other')
    expect(parseLink('not a url').kind).toBe('other')
  })

  // A student's own site is not something we can vet by fetching it — a 200
  // says the page exists, not that the work on it is visible.
  it('does not mistake a lookalike host for YouTube', () => {
    expect(parseLink('https://youtube.com.evil.example/watch?v=abc').kind).toBe('other')
    expect(parseLink('https://notdrive.google.com.evil.example/file/d/1/view').kind).toBe('other')
  })
})

describe('interpretYouTube', () => {
  // Unlisted answers 200, and unlisted is a perfectly good way to submit —
  // anyone with the link can watch it.
  it('passes a public or unlisted video', () => {
    expect(interpretYouTube(200)).toEqual({ status: 'ok' })
  })

  it('blocks a private video', () => {
    const v = interpretYouTube(401)
    expect(v.status).toBe('blocked')
    expect(v.status === 'blocked' && v.message).toMatch(/private/i)
  })

  // Confirmed against the live endpoint: oEmbed answers 400, not 404, for a
  // video id that does not exist, while a real video returns 200 from an
  // identically built request.
  it('blocks a deleted or nonexistent video (400 and 404)', () => {
    for (const code of [400, 404]) {
      const v = interpretYouTube(code)
      expect(v.status).toBe('blocked')
      expect(v.status === 'blocked' && v.message).toMatch(/could not be found/i)
    }
  })

  // Failing open matters more than catching every bad link: an outage must
  // never cost a student their entry.
  it('lets a server error through rather than blaming the student', () => {
    expect(interpretYouTube(500)).toEqual({ status: 'unknown' })
    expect(interpretYouTube(429)).toEqual({ status: 'unknown' })
  })
})

describe('interpretDrive', () => {
  it('passes a link anyone can open', () => {
    expect(interpretDrive(200, null)).toEqual({ status: 'ok' })
  })

  it('blocks when Drive bounces to a sign-in page', () => {
    const v = interpretDrive(302, 'https://accounts.google.com/ServiceLogin?continue=...')
    expect(v.status).toBe('blocked')
    expect(v.status === 'blocked' && v.message).toMatch(/Anyone with the link/i)
  })

  it('blocks a forbidden file', () => {
    expect(interpretDrive(403, null).status).toBe('blocked')
  })

  it('blocks a missing file', () => {
    const v = interpretDrive(404, null)
    expect(v.status).toBe('blocked')
    expect(v.status === 'blocked' && v.message).toMatch(/could not be found/i)
  })

  it('allows an ordinary redirect that is not a sign-in', () => {
    expect(interpretDrive(302, 'https://drive.google.com/file/d/1/preview')).toEqual({
      status: 'ok',
    })
  })

  it('lets a server error through', () => {
    expect(interpretDrive(500, null)).toEqual({ status: 'unknown' })
  })

  // Drive frequently serves a restricted file as a 200 carrying its
  // access-request page rather than redirecting.
  it('blocks a 200 that is really an access wall', () => {
    expect(interpretDrive(200, null, '<html><title>You need access</title>').status).toBe('blocked')
    expect(interpretDrive(200, null, '<html>Request access to continue').status).toBe('blocked')
  })

  it('passes a 200 that is a real file', () => {
    expect(interpretDrive(200, null, '<html><title>entry-video.mp4</title>')).toEqual({
      status: 'ok',
    })
  })
})

describe('isDriveAccessWall', () => {
  it('spots the access-request page', () => {
    expect(isDriveAccessWall('<html>You need access</html>')).toBe(true)
  })

  it('ignores an ordinary page', () => {
    expect(isDriveAccessWall('<html>My Startup Pitch Deck</html>')).toBe(false)
  })

  it('is not fooled by a mention deep inside a long document', () => {
    const long = 'x'.repeat(70_000) + 'You need access'
    expect(isDriveAccessWall(long)).toBe(false)
  })
})
