/**
 * Is the work behind this link actually openable?
 *
 * Entries are handed in as links, so a private video or a locked Drive file is
 * an entry a judge cannot judge — and the student almost never realises,
 * because it opens perfectly well for them while signed in to their own
 * account.
 *
 * The rules here are pure and unit-tested. Only `checkLink` touches the
 * network, and it is deliberately thin.
 */

export type LinkVerdict =
  | { status: 'ok' }
  /** Reachable but not viewable by a stranger — the case worth blocking on. */
  | { status: 'blocked'; message: string }
  /** We could not tell: an unknown host, or the check itself failed. */
  | { status: 'unknown' }

export type LinkKind = 'youtube' | 'drive' | 'other'

export interface ParsedLink {
  kind: LinkKind
  /** Video id for YouTube, file/doc id for Drive. Absent when unrecognised. */
  id?: string
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
])

const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com'])

function bareHost(url: URL): string {
  return url.hostname.toLowerCase()
}

/** Which service a link points at, and the id we need to ask about it. */
export function parseLink(raw: string): ParsedLink {
  let url: URL
  try {
    url = new URL((raw ?? '').trim())
  } catch {
    return { kind: 'other' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'other' }

  const host = bareHost(url)

  if (YOUTUBE_HOSTS.has(host)) {
    // youtu.be/<id>
    if (host.endsWith('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id ? { kind: 'youtube', id } : { kind: 'youtube' }
    }
    // /watch?v=<id>
    const v = url.searchParams.get('v')
    if (v) return { kind: 'youtube', id: v }
    // /shorts/<id>, /embed/<id>, /live/<id>
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
      return { kind: 'youtube', id: parts[1] }
    }
    return { kind: 'youtube' }
  }

  if (DRIVE_HOSTS.has(host)) {
    // /file/d/<id>/…, /document/d/<id>/…, /spreadsheets/d/<id>/…
    const parts = url.pathname.split('/').filter(Boolean)
    const dIndex = parts.indexOf('d')
    if (dIndex !== -1 && parts[dIndex + 1]) return { kind: 'drive', id: parts[dIndex + 1] }
    // /open?id=<id>, /uc?id=<id>
    const id = url.searchParams.get('id')
    if (id) return { kind: 'drive', id }
    return { kind: 'drive' }
  }

  return { kind: 'other' }
}

const YOUTUBE_PRIVATE =
  'This YouTube video is private. Open it on YouTube, and set it to Unlisted or Public so the judges can watch it.'
const YOUTUBE_MISSING =
  'This YouTube video could not be found. Check the link — it may have been deleted, or the address may be wrong.'
const DRIVE_LOCKED =
  'This Google Drive link is restricted. Open it in Drive, choose Share, and set "Anyone with the link" so the judges can open it.'

/**
 * What YouTube's oEmbed endpoint's status code means for us.
 *
 * Unlisted videos answer 200 here, which is the behaviour we want: unlisted is
 * viewable by anyone holding the link, so it is a perfectly good way to hand in
 * an entry. Only genuinely private and deleted videos are turned away.
 */
export function interpretYouTube(httpStatus: number): LinkVerdict {
  if (httpStatus === 200) return { status: 'ok' }
  if (httpStatus === 401 || httpStatus === 403) {
    return { status: 'blocked', message: YOUTUBE_PRIVATE }
  }
  // 400 is what oEmbed actually answers for a video that does not exist —
  // confirmed against the live endpoint, where a real video returns 200 from
  // an identically built request. 404 is handled alongside it in case that
  // ever changes.
  if (httpStatus === 400 || httpStatus === 404) {
    return { status: 'blocked', message: YOUTUBE_MISSING }
  }
  // 5xx, a rate limit, anything else: YouTube's problem, not the student's.
  return { status: 'unknown' }
}

/**
 * What a Drive response means.
 *
 * A file shared with "anyone with the link" is served straight away. A
 * restricted one bounces to a Google sign-in page — either as a redirect, or
 * as a 403 — because Drive wants to know who is asking.
 */
export function interpretDrive(
  httpStatus: number,
  location: string | null,
  body = ''
): LinkVerdict {
  if (location && /accounts\.google\.com|ServiceLogin/i.test(location)) {
    return { status: 'blocked', message: DRIVE_LOCKED }
  }
  // Drive does not always redirect: a restricted file is often served as a
  // 200 carrying its "you need access" page instead. Without this the check
  // would wave through the exact case it exists to catch.
  if (httpStatus >= 200 && httpStatus < 300 && isDriveAccessWall(body)) {
    return { status: 'blocked', message: DRIVE_LOCKED }
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return { status: 'blocked', message: DRIVE_LOCKED }
  }
  if (httpStatus === 404) {
    return {
      status: 'blocked',
      message:
        'This Google Drive link could not be found. Check the link — the file may have been deleted or moved.',
    }
  }
  if (httpStatus >= 200 && httpStatus < 400) return { status: 'ok' }
  return { status: 'unknown' }
}

/**
 * Markers from Drive's access-request page. Matched against the start of the
 * response only, so a document that merely mentions the phrase cannot trip it.
 */
const DRIVE_WALL = [
  'You need access',
  'Request access',
  'you need permission',
  'Ask for access',
  'ServiceLogin',
]

export function isDriveAccessWall(body: string): boolean {
  const head = (body ?? '').slice(0, 60_000)
  return DRIVE_WALL.some((marker) => head.toLowerCase().includes(marker.toLowerCase()))
}

/** Give up rather than hold up a submission behind a slow third party. */
const TIMEOUT_MS = 6000

async function fetchStatus(
  url: string,
  opts: { withBody?: boolean } = {}
): Promise<{ status: number; location: string | null; body: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      cache: 'no-store',
      // Drive serves its access-request page only to something that looks
      // like a browser.
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; SkillFleetLinkCheck/1.0)' },
    })
    const body = opts.withBody && res.status >= 200 && res.status < 300 ? await res.text() : ''
    return { status: res.status, location: res.headers.get('location'), body }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Ask the host whether a stranger could open this link.
 *
 * Fails open on purpose. If YouTube is slow, Drive is down, or the network
 * hiccups, the verdict is 'unknown' and the entry goes through — losing a
 * student's entry to somebody else's outage would be far worse than letting
 * one bad link reach a judge.
 */
export async function checkLink(raw: string): Promise<LinkVerdict> {
  const parsed = parseLink(raw)

  if (parsed.kind === 'youtube') {
    if (!parsed.id) return { status: 'unknown' }
    const target = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${parsed.id}`
    )}&format=json`
    const res = await fetchStatus(target)
    return res ? interpretYouTube(res.status) : { status: 'unknown' }
  }

  if (parsed.kind === 'drive') {
    if (!parsed.id) return { status: 'unknown' }
    const res = await fetchStatus(`https://drive.google.com/file/d/${parsed.id}/view`, {
      withBody: true,
    })
    return res ? interpretDrive(res.status, res.location, res.body) : { status: 'unknown' }
  }

  // Anything else — a deployed app, a personal site — cannot be judged this
  // way. A 200 would prove nothing about whether the work is visible.
  return { status: 'unknown' }
}
