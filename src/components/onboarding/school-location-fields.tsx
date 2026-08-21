'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { getSchoolDistrictsAction, getSchoolsAction, type SchoolOption } from '@/app/actions/schools'
import { MANUAL_SENTINEL } from '@/lib/schools/validate'
import { filterSchools } from '@/lib/schools/search'

const MANUAL_DISTRICT = '__manual_district__'

interface Props {
  /** Shared input styling from the host form. */
  className: string
  states: string[]
  initialState?: string
  initialDistrict?: string
  initialSchoolId?: string
  initialSchoolName?: string
  /** Free text the student entered before the cascade existed, shown as a hint. */
  previousFreeText?: string
}

/**
 * State -> District -> School. Each field stays locked until the one above it
 * is answered, because districts only make sense within a state and school
 * names are only unique-ish within a district.
 *
 * The district's schools are fetched once on selection (729 rows worst case)
 * and filtered in the browser, so typing narrows the list with no round-trip.
 */
export function SchoolLocationFields({
  className,
  states,
  initialState = '',
  initialDistrict = '',
  initialSchoolId = '',
  initialSchoolName = '',
  previousFreeText = '',
}: Props) {
  const [state, setState] = useState(initialState)
  const [districts, setDistricts] = useState<string[]>([])
  const [district, setDistrict] = useState(initialDistrict)
  const [manualDistrict, setManualDistrict] = useState('')
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [schoolId, setSchoolId] = useState(initialSchoolId)
  const [query, setQuery] = useState(initialSchoolName)
  const [manualName, setManualName] = useState('')
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const districtIsManual = district === MANUAL_DISTRICT
  const schoolIsManual = schoolId === MANUAL_SENTINEL
  // With no district list to pick from, there are no schools to list either.
  const effectiveDistrict = districtIsManual ? manualDistrict.trim() : district

  // Load this state's districts. Also runs on mount when editing a saved profile.
  useEffect(() => {
    if (!state) {
      setDistricts([])
      return
    }
    startTransition(async () => {
      setDistricts(await getSchoolDistrictsAction(state))
    })
  }, [state])

  // Load the district's schools. Skipped entirely for a typed-in district.
  useEffect(() => {
    if (!state || !district || districtIsManual) {
      setSchools([])
      return
    }
    startTransition(async () => {
      setSchools(await getSchoolsAction(state, district))
    })
  }, [state, district, districtIsManual])

  const filtered = useMemo(() => filterSchools(schools, query), [schools, query])

  const selected = schools.find((s) => s.id === schoolId)

  function pickState(next: string) {
    setState(next)
    setDistrict('')
    setManualDistrict('')
    setSchoolId('')
    setQuery('')
    setManualName('')
  }

  function pickDistrict(next: string) {
    setDistrict(next)
    setSchoolId(next === MANUAL_DISTRICT ? MANUAL_SENTINEL : '')
    setQuery('')
    setManualName('')
  }

  return (
    <>
      {previousFreeText && !initialSchoolId && (
        <p className="text-xs text-muted bg-black/[0.03] rounded-xl px-4 py-3">
          Previously entered: <span className="font-semibold text-foreground">{previousFreeText}</span>{' '}
          — please find your school in the list below.
        </p>
      )}

      {/* State */}
      <div>
        <label htmlFor="school_state" className="block text-sm font-medium text-foreground mb-1">
          State
        </label>
        <select
          id="school_state"
          name="school_state"
          required
          value={state}
          onChange={(e) => pickState(e.target.value)}
          className={className}
        >
          <option value="" disabled>Select your state</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* District */}
      <div>
        <label htmlFor="school_district_select" className="block text-sm font-medium text-foreground mb-1">
          District
        </label>
        <select
          id="school_district_select"
          value={district}
          onChange={(e) => pickDistrict(e.target.value)}
          disabled={!state}
          className={className}
        >
          <option value="" disabled>
            {state ? 'Select your district' : 'Select a state first'}
          </option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value={MANUAL_DISTRICT}>My district isn&apos;t listed</option>
        </select>

        {districtIsManual && (
          <input
            type="text"
            value={manualDistrict}
            onChange={(e) => setManualDistrict(e.target.value)}
            required
            placeholder="Type your district"
            className={`${className} mt-2`}
          />
        )}
        {/* The value the server reads, whether picked or typed. */}
        <input type="hidden" name="school_district" value={effectiveDistrict} />
      </div>

      {/* School */}
      <div>
        <label htmlFor="school_query" className="block text-sm font-medium text-foreground mb-1">
          School name
        </label>

        {schoolIsManual ? (
          <>
            <input
              id="school_manual_name"
              name="school_manual_name"
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              required
              maxLength={100}
              placeholder="Type your school's full name"
              className={className}
            />
            <p className="text-xs text-muted mt-1">
              We&apos;ll check this and add it to our list.{' '}
              {!districtIsManual && (
                <button
                  type="button"
                  onClick={() => { setSchoolId(''); setManualName('') }}
                  className="text-primary font-semibold hover:underline"
                >
                  Search the list instead
                </button>
              )}
            </p>
          </>
        ) : (
          <div className="relative">
            <input
              id="school_query"
              type="text"
              autoComplete="off"
              value={selected ? selected.name : query}
              onChange={(e) => { setQuery(e.target.value); setSchoolId(''); setOpen(true) }}
              onFocus={() => setOpen(true)}
              disabled={!effectiveDistrict}
              placeholder={
                effectiveDistrict
                  ? pending ? 'Loading schools…' : 'Start typing your school name'
                  : 'Select a district first'
              }
              className={className}
            />

            {open && effectiveDistrict && (
              <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto clay-card p-1 bg-white">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => { setSchoolId(s.id); setQuery(s.name); setOpen(false) }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/[0.04]"
                    >
                      <span className="block text-sm font-medium text-foreground">{s.name}</span>
                      {s.address && (
                        <span className="block text-xs text-muted truncate">{s.address}</span>
                      )}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && !pending && (
                  <li className="px-3 py-2 text-sm text-muted">No match in this district.</li>
                )}
                <li className="border-t border-black/[0.06] mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => { setSchoolId(MANUAL_SENTINEL); setOpen(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/[0.06]"
                  >
                    + My school isn&apos;t listed
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}

        <input type="hidden" name="school_id" value={schoolId} />
      </div>
    </>
  )
}
