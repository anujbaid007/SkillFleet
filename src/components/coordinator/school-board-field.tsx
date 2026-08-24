'use client'

import { useEffect, useState } from 'react'
import { SearchableSelect, type SelectOption } from '@/components/ui/searchable-select'
import { BOARD_OPTIONS as BOARD_VALUES } from '@/lib/coordinator/validate'

const BOARD_OPTIONS: SelectOption[] = BOARD_VALUES.map((v) => ({ value: v, label: v }))

const OTHER = 'Other'

function isListed(board: string | null): boolean {
  return !!board && BOARD_OPTIONS.some((o) => o.value === board)
}

/**
 * Pre-fills from the picked school's known board (every CBSE-register school
 * already has one), but stays fully editable — the coordinator is the
 * authoritative human, and any correction they make is visible to the admin
 * reviewing the claim regardless.
 */
export function SchoolBoardField({
  className,
  knownBoard,
}: {
  className: string
  knownBoard: string | null
}) {
  const [board, setBoard] = useState(() => (isListed(knownBoard) ? (knownBoard as string) : ''))
  const [customBoard, setCustomBoard] = useState('')

  // The picked school changes as the coordinator moves through the cascade;
  // keep the pre-fill in step with whatever is currently selected.
  useEffect(() => {
    setBoard(isListed(knownBoard) ? (knownBoard as string) : '')
  }, [knownBoard])

  const isOther = board === OTHER

  return (
    <div>
      <label htmlFor="board_input" className="block text-sm font-medium text-foreground mb-1">
        Board of School
      </label>
      <SearchableSelect
        inputId="board_input"
        ariaLabel="Board of School"
        className={className}
        options={BOARD_OPTIONS}
        value={board}
        onChange={setBoard}
        placeholder="Search or select the board"
      />
      {isOther && (
        <input
          type="text"
          value={customBoard}
          onChange={(e) => setCustomBoard(e.target.value)}
          required
          placeholder="Which board?"
          aria-label="Board name"
          className={`${className} mt-2`}
        />
      )}
      <input type="hidden" name="board" value={isOther ? customBoard : board} />
    </div>
  )
}
