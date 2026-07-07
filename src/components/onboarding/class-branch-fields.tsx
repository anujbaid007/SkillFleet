'use client'

import { useState } from 'react'
import { CLASS_OPTIONS, BRANCH_OPTIONS, classRequiresBranch } from '@/lib/profile/details'

interface Props {
  /** Shared input styling from the host form, applied to both selects. */
  className: string
  initialClass?: string
  initialBranch?: string
}

// Class / Grade dropdown (Kindergarten → Class 12). When Class 11 or 12 is
// selected, a Stream / Branch dropdown appears. Shared by the onboarding
// details form and the account form.
export function ClassBranchFields({ className, initialClass = '', initialBranch = '' }: Props) {
  const [selectedClass, setSelectedClass] = useState(initialClass)
  const showBranch = classRequiresBranch(selectedClass)

  return (
    <>
      <div>
        <label htmlFor="school_class" className="block text-sm font-medium text-foreground mb-1">
          Class / Grade
        </label>
        <select
          id="school_class"
          name="school_class"
          required
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className={className}
        >
          <option value="" disabled>
            Select your class
          </option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {showBranch && (
        <div>
          <label htmlFor="school_branch" className="block text-sm font-medium text-foreground mb-1">
            Stream / Branch
          </label>
          <select
            id="school_branch"
            name="school_branch"
            required
            defaultValue={initialBranch}
            className={className}
          >
            <option value="" disabled>
              Select your stream
            </option>
            {BRANCH_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
