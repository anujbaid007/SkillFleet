import { describe, expect, it } from 'vitest'
import { parseRevisions, editCountLabel, truncate } from '../revisions'

const raw = [
  {
    revision_id: 'r2',
    edited_at: '2026-09-02T10:00:00Z',
    editor_name: 'Maya Sharma',
    changed: { app_url: { from: 'https://a.example.com', to: 'https://b.example.com' } },
  },
  {
    revision_id: 'r1',
    edited_at: '2026-09-01T10:00:00Z',
    editor_name: 'Maya Sharma',
    changed: { app_url: { from: '', to: 'https://a.example.com' } },
  },
]

describe('parseRevisions', () => {
  it('turns raw rows into displayable revisions', () => {
    const revisions = parseRevisions('ai_for_impact', raw)
    expect(revisions).toHaveLength(2)
    expect(revisions[0].revisionId).toBe('r2')
    expect(revisions[0].editorName).toBe('Maya Sharma')
  })

  it('labels each changed field with the label the student saw', () => {
    const [newest] = parseRevisions('ai_for_impact', raw)
    expect(newest.changes).toHaveLength(1)
    expect(newest.changes[0].key).toBe('app_url')
    expect(newest.changes[0].label).toBe('Link to your app or prototype')
    expect(newest.changes[0].from).toBe('https://a.example.com')
    expect(newest.changes[0].to).toBe('https://b.example.com')
  })

  it('falls back to the raw key for a field the track no longer has', () => {
    const [rev] = parseRevisions('ai_for_impact', [
      {
        revision_id: 'r',
        edited_at: '2026-09-01T10:00:00Z',
        editor_name: null,
        changed: { retired_field: { from: 'a', to: 'b' } },
      },
    ])
    expect(rev.changes[0].label).toBe('retired_field')
  })

  it('survives malformed input rather than throwing', () => {
    expect(parseRevisions('ai_for_impact', null)).toEqual([])
    expect(parseRevisions('ai_for_impact', 'nonsense')).toEqual([])
    expect(parseRevisions('ai_for_impact', [{}])).toEqual([])
  })

  it('sorts changed fields in the order the form shows them', () => {
    const [rev] = parseRevisions('ai_for_impact', [
      {
        revision_id: 'r',
        edited_at: '2026-09-01T10:00:00Z',
        editor_name: null,
        // Deliberately out of form order.
        changed: {
          explanation: { from: '', to: 'x' },
          app_url: { from: '', to: 'y' },
        },
      },
    ])
    expect(rev.changes.map((c) => c.key)).toEqual(['app_url', 'explanation'])
  })
})

describe('editCountLabel', () => {
  it('reads naturally at every count', () => {
    expect(editCountLabel(0)).toBe('Not edited')
    expect(editCountLabel(1)).toBe('Edited once')
    expect(editCountLabel(2)).toBe('Edited twice')
    expect(editCountLabel(5)).toBe('Edited 5 times')
  })
})

describe('truncate', () => {
  it('leaves short values alone', () => {
    expect(truncate('hello')).toBe('hello')
  })

  it('shortens long values with an ellipsis', () => {
    const out = truncate('x'.repeat(300), 120)
    expect(out).toHaveLength(121)
    expect(out.endsWith('…')).toBe(true)
  })

  it('shows a placeholder for an empty value, so a cleared field is visible', () => {
    expect(truncate('')).toBe('(empty)')
  })
})
