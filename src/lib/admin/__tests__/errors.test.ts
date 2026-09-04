import { describe, it, expect } from 'vitest'
import { AdminError, adminError, mapRpcError, ok } from '@/lib/admin/errors'

describe('mapRpcError', () => {
  it('recognises a missing function as the migration not having run', () => {
    expect(mapRpcError({ code: 'PGRST202', message: 'Could not find the function' })).toEqual({
      ok: false,
      kind: 'migration-missing',
      message: expect.stringContaining('admin-scale-migration.sql'),
    })
  })
  it('passes other errors through as failed', () => {
    expect(
      mapRpcError({ code: '57014', message: 'canceling statement due to statement timeout' })
    ).toEqual({
      ok: false,
      kind: 'failed',
      message: 'canceling statement due to statement timeout',
    })
  })
  it('survives a null error and a message-less one', () => {
    expect(mapRpcError(null)).toEqual({ ok: false, kind: 'failed', message: 'Unknown error' })
    expect(mapRpcError({ code: '42501' })).toEqual({
      ok: false,
      kind: 'failed',
      message: 'Unknown error',
    })
  })
  it('wraps data', () => {
    expect(ok(3)).toEqual({ ok: true, data: 3 })
  })
})

describe('adminError', () => {
  it('carries the same kind as an exception, for the streaming export', () => {
    const e = adminError({ code: 'PGRST202', message: 'nope' })
    expect(e).toBeInstanceOf(AdminError)
    expect(e).toBeInstanceOf(Error)
    expect(e.kind).toBe('migration-missing')
    expect(e.message).toContain('admin-scale-migration.sql')
    expect(adminError({ message: 'boom' }).kind).toBe('failed')
  })
})
