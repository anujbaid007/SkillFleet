import { describe, it, expect, vi, beforeEach } from 'vitest'

/*
  Unit tests for src/app/(admin)/admin/queues/actions.ts.

  These exist because the three things this file does are the three things that
  most need protecting, and none of them show up in a type error: the admin
  gate (approving a coordinator claim hands a stranger a roster of children),
  the reject-reason gate, and the success-versus-failure accounting. Drop the
  `if (!supabase) return refused(...)` line, or move `ok++` outside the status
  check, and nothing else in this suite notices.

  createClient is stubbed rather than the RPC, deliberately: the gate is
  getUser() then the role out of user_profiles, and stubbing lower down would
  test a client that had already been trusted.
*/

const getUser = vi.fn()
const maybeSingle = vi.fn()
const rpc = vi.fn()
const createClient = vi.fn()
const revalidatePath = vi.fn()
const invalidateAdminCache = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ createClient: () => createClient() }))
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }))
vi.mock('@/lib/admin/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/cache')>()),
  invalidateAdminCache: () => invalidateAdminCache(),
}))

const {
  bulkReviewSchools,
  bulkReviewCoordinators,
  bulkReviewCertificates,
} = await import('@/app/(admin)/admin/queues/actions')
const { QUEUE_PAGE } = await import('@/lib/admin/queues')

/** A client whose auth and user_profiles answers are whatever the test says. */
function stubClient() {
  return {
    auth: { getUser: () => getUser() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }) }),
    rpc: (name: string, args: Record<string, unknown>) => rpc(name, args),
  }
}

function signedInAs(role: string | null) {
  getUser.mockResolvedValue({ data: { user: role === null ? null : { id: 'admin-1' } } })
  maybeSingle.mockResolvedValue({ data: role === null ? null : { role } })
  createClient.mockResolvedValue(stubClient())
}

function form(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) v.forEach((one) => fd.append(k, one))
    else fd.set(k, v)
  }
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  signedInAs('admin')
})

// ---------------------------------------------------------------
// The admin gate
// ---------------------------------------------------------------

describe('the admin gate', () => {
  it('touches nothing when nobody is signed in', async () => {
    signedInAs(null)
    const r = await bulkReviewSchools(form({ ids: ['s1', 's2'], decision: 'approve' }))
    expect(r).toEqual({ ok: 0, failed: 2, message: 'Admins only. Nothing was changed.' })
    expect(rpc).not.toHaveBeenCalled()
    expect(invalidateAdminCache).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('touches nothing when the caller is signed in but is not an admin', async () => {
    signedInAs('coordinator')
    const r = await bulkReviewCoordinators(form({ ids: ['sc1'], decision: 'approve' }))
    expect(r).toMatchObject({ ok: 0, failed: 1 })
    expect(rpc).not.toHaveBeenCalled()
    expect(invalidateAdminCache).not.toHaveBeenCalled()
  })

  it('gates the certificates action too, before any points are read', async () => {
    signedInAs('student')
    const r = await bulkReviewCertificates(form({ ids: ['c1'], decision: 'approve', points: '50' }))
    expect(r).toMatchObject({ ok: 0, failed: 1, message: 'Admins only. Nothing was changed.' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('reads the role from user_profiles, not from the form', async () => {
    signedInAs('admin')
    rpc.mockResolvedValue({ data: 'approved', error: null })
    await bulkReviewSchools(form({ ids: ['s1'], decision: 'approve', role: 'admin' }))
    expect(getUser).toHaveBeenCalled()
    expect(maybeSingle).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------
// The reject-reason gate
// ---------------------------------------------------------------

describe('rejecting without a reason', () => {
  it.each([
    ['an empty reason', ''],
    ['a whitespace-only reason', '   \n  '],
  ])('is refused before any database call, given %s', async (_label, note) => {
    const r = await bulkReviewSchools(form({ ids: ['s1', 's2'], decision: 'reject', note }))
    expect(r).toEqual({
      ok: 0,
      failed: 2,
      message: 'Give a reason when rejecting. Nothing was changed.',
    })
    expect(createClient).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
    expect(invalidateAdminCache).not.toHaveBeenCalled()
  })

  it('is refused on the coordinators queue as well', async () => {
    const r = await bulkReviewCoordinators(form({ ids: ['sc1'], decision: 'reject', note: ' ' }))
    expect(r).toMatchObject({ ok: 0, failed: 1 })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('is refused on the certificates queue as well', async () => {
    const r = await bulkReviewCertificates(form({ ids: ['c1'], decision: 'reject', note: '' }))
    expect(r).toMatchObject({ ok: 0, failed: 1 })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('does not ask for a reason when approving', async () => {
    rpc.mockResolvedValue({ data: 'approved', error: null })
    const r = await bulkReviewSchools(form({ ids: ['s1'], decision: 'approve' }))
    expect(r).toMatchObject({ ok: 1, failed: 0 })
  })

  it('sends the reason on a reject and null on an approve', async () => {
    rpc.mockResolvedValue({ data: 'rejected', error: null })
    await bulkReviewSchools(form({ ids: ['s1'], decision: 'reject', note: '  not a school  ' }))
    expect(rpc).toHaveBeenCalledWith('admin_review_school', {
      p_school_id: 's1',
      p_decision: 'reject',
      p_notes: 'not a school',
      p_merge_into: null,
    })

    rpc.mockClear()
    rpc.mockResolvedValue({ data: 'approved', error: null })
    await bulkReviewSchools(form({ ids: ['s1'], decision: 'approve', note: 'ignored' }))
    expect(rpc).toHaveBeenCalledWith(
      'admin_review_school',
      expect.objectContaining({ p_notes: null })
    )
  })
})

// ---------------------------------------------------------------
// Counting successes and failures
// ---------------------------------------------------------------

describe('a row failing in the middle of the loop', () => {
  it('keeps the rows either side applied and reports both numbers honestly', async () => {
    rpc.mockImplementation(async (_n, args) =>
      args.p_school_id === 's2'
        ? { data: 'not_pending', error: null }
        : { data: 'approved', error: null }
    )
    const r = await bulkReviewSchools(form({ ids: ['s1', 's2', 's3'], decision: 'approve' }))
    // The loop did not stop at the failure.
    expect(rpc).toHaveBeenCalledTimes(3)
    expect(r).toEqual({
      ok: 2,
      failed: 1,
      message: 'Approved 2 schools. 1 could not be approved: already reviewed.',
    })
  })

  it('names every distinct reason, once each', async () => {
    const answers: Record<string, string> = {
      c1: 'ok',
      c2: 'no_parameter',
      c3: 'not_found',
      c4: 'no_parameter',
    }
    rpc.mockImplementation(async (_n, args) => ({
      data: answers[args.p_cert_id as string],
      error: null,
    }))
    const r = await bulkReviewCertificates(
      form({ ids: ['c1', 'c2', 'c3', 'c4'], decision: 'approve', points: '50' })
    )
    expect(r.ok).toBe(1)
    expect(r.failed).toBe(3)
    expect(r.message).toBe(
      'Approved 1 certificate. 3 could not be approved: no skill tagged, so open it and pick one; no longer there.'
    )
  })

  it('counts a database error as a failure, not a success', async () => {
    rpc.mockImplementation(async (_n, args) =>
      args.p_school_id === 's2'
        ? { data: null, error: { code: '57014', message: 'statement timeout' } }
        : { data: 'rejected', error: null }
    )
    const r = await bulkReviewSchools(form({ ids: ['s1', 's2'], decision: 'reject', note: 'no' }))
    expect(r).toEqual({
      ok: 1,
      failed: 1,
      message: 'Rejected 1 school. 1 could not be rejected: the database did not answer.',
    })
  })

  it('says nothing changed when every row fails, and never claims a success', async () => {
    rpc.mockResolvedValue({ data: 'not_pending', error: null })
    const r = await bulkReviewCoordinators(form({ ids: ['sc1', 'sc2'], decision: 'approve' }))
    expect(r).toEqual({
      ok: 0,
      failed: 2,
      message: 'Nothing was approved. 2 applications could not be approved: already reviewed.',
    })
  })

  it('does not treat an unknown status word as a success', async () => {
    rpc.mockResolvedValue({ data: 'something_new', error: null })
    const r = await bulkReviewSchools(form({ ids: ['s1'], decision: 'approve' }))
    expect(r).toMatchObject({ ok: 0, failed: 1 })
    expect(r.message).toContain('could not be completed')
  })

  it('reads a merge as a success, since the school was decided', async () => {
    rpc.mockResolvedValue({ data: 'merged', error: null })
    expect(await bulkReviewSchools(form({ ids: ['s1'], decision: 'approve' }))).toMatchObject({
      ok: 1,
      failed: 0,
    })
  })

  it('uses the singular for one row', async () => {
    rpc.mockResolvedValue({ data: 'ok', error: null })
    const r = await bulkReviewCertificates(form({ ids: ['c1'], decision: 'reject', note: 'no' }))
    expect(r.message).toBe('Rejected 1 certificate.')
  })
})

// ---------------------------------------------------------------
// What is sent, and what is refreshed
// ---------------------------------------------------------------

describe('the request the action builds', () => {
  it('refuses an empty selection without calling anything', async () => {
    const r = await bulkReviewSchools(form({ decision: 'approve' }))
    expect(r).toEqual({ ok: 0, failed: 0, message: 'Nothing was selected.' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('refuses a decision that is neither approve nor reject', async () => {
    const r = await bulkReviewSchools(form({ ids: ['s1'], decision: 'merge' }))
    expect(r).toMatchObject({ ok: 0, failed: 1, message: 'Unknown action. Nothing was changed.' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('deduplicates ids, so a doubled row is decided once', async () => {
    rpc.mockResolvedValue({ data: 'approved', error: null })
    const r = await bulkReviewSchools(form({ ids: ['s1', 's1', 's2'], decision: 'approve' }))
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(r).toMatchObject({ ok: 2 })
  })

  it('caps a hand-crafted selection at the page size', async () => {
    rpc.mockResolvedValue({ data: 'approved', error: null })
    const many = Array.from({ length: QUEUE_PAGE + 40 }, (_, i) => `s${i}`)
    const r = await bulkReviewSchools(form({ ids: many, decision: 'approve' }))
    expect(rpc).toHaveBeenCalledTimes(QUEUE_PAGE)
    expect(r.ok).toBe(QUEUE_PAGE)
  })

  it('refuses points that are not a whole number in range, before any database call', async () => {
    for (const points of ['', 'lots', '-1', '1001']) {
      vi.clearAllMocks()
      signedInAs('admin')
      const r = await bulkReviewCertificates(form({ ids: ['c1'], decision: 'approve', points }))
      expect(r).toMatchObject({ ok: 0, failed: 1 })
      expect(r.message).toContain('Points must be a whole number')
      expect(createClient).not.toHaveBeenCalled()
    }
  })

  it('sends the points on approve and the note on reject for a certificate', async () => {
    rpc.mockResolvedValue({ data: 'ok', error: null })
    await bulkReviewCertificates(form({ ids: ['c1'], decision: 'approve', points: '75' }))
    expect(rpc).toHaveBeenCalledWith('admin_approve_cert', {
      p_cert_id: 'c1',
      p_points_approved: 75,
      p_admin_notes: null,
      p_parameter_id: null,
    })

    rpc.mockClear()
    await bulkReviewCertificates(form({ ids: ['c1'], decision: 'reject', note: 'blurry scan' }))
    expect(rpc).toHaveBeenCalledWith('admin_reject_cert', {
      p_cert_id: 'c1',
      p_admin_notes: 'blurry scan',
    })
  })

  it('clears the admin cache and revalidates the queue and the dashboard', async () => {
    rpc.mockResolvedValue({ data: 'approved', error: null })
    await bulkReviewSchools(form({ ids: ['s1'], decision: 'approve' }))
    expect(invalidateAdminCache).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/admin/schools')
    expect(revalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('also revalidates a coordinator console after deciding their claim', async () => {
    rpc.mockResolvedValue({ data: 'approved', error: null })
    await bulkReviewCoordinators(form({ ids: ['sc1'], decision: 'approve' }))
    expect(revalidatePath).toHaveBeenCalledWith('/admin/coordinators')
    expect(revalidatePath).toHaveBeenCalledWith('/coordinator')
  })

  it('still clears the cache when every row failed, since the queue may have moved', async () => {
    rpc.mockResolvedValue({ data: 'not_pending', error: null })
    await bulkReviewSchools(form({ ids: ['s1'], decision: 'approve' }))
    expect(invalidateAdminCache).toHaveBeenCalledTimes(1)
  })
})
