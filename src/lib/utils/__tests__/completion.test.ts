import { describe, it, expect } from 'vitest'
import { mapCompletionResult } from '@/lib/utils/completion'

describe('mapCompletionResult', () => {
  it('ok returns success message and no error', () => {
    const result = mapCompletionResult('ok')
    expect(result.success).toBeTruthy()
    expect(result.error).toBeUndefined()
  })

  it('not_admin returns an error', () => {
    expect(mapCompletionResult('not_admin').error).toBeTruthy()
  })

  it('not_found returns an error', () => {
    expect(mapCompletionResult('not_found').error).toBeTruthy()
  })

  it('already_completed returns an error', () => {
    expect(mapCompletionResult('already_completed').error).toBeTruthy()
  })

  it('cancelled returns an error', () => {
    expect(mapCompletionResult('cancelled').error).toBeTruthy()
  })

  it('already_scored returns an error', () => {
    expect(mapCompletionResult('already_scored').error).toBeTruthy()
  })

  it('unknown status returns an error', () => {
    expect(mapCompletionResult('some_unexpected_code').error).toBeTruthy()
  })
})
