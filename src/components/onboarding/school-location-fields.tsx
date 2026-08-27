'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { getSchoolDistrictsAction, getSchoolsAction, type SchoolOption } from '@/app/actions/schools'
import { MANUAL_SENTINEL } from '@/lib/schools/validate'
import { SearchableSelect, type SelectOption } from '@/components/ui/searchable-select'

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
  /**
   * Fires with the fully resolved picked school, or null whenever the
   * selection is cleared or typed in by hand. Used by the coordinator form to
   * pre-fill the board without a second round trip.
   */
  onSchoolPicked?: (school: SchoolOption | null) => void
}

/**
 * State -> District -> School. Each field stays locked until the one above it
 * is answered, because districts only make sense within a state and school
 * names are only unique-ish within a district.
 *
 * All three are SearchableSelect rather than a native <select>: the lists are
 * long enough that a native dropdown flips upward near the bottom of the page,
 * and they need to be typed into as well as picked from.
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
  onSchoolPicked,
}: Props) {
  const [state, setState] = useState(initialState)
  const [districts, setDistricts] = useState<string[]>([])
  const [district, setDistrict] = useState(initialDistrict)
  const [manualDistrict, setManualDistrict] = useState('')
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [schoolId, setSchoolId] = useState(initialSchoolId)
  const [manualName, setManualName] = useState('')
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

  const stateOptions = useMemo<SelectOption[]>(
    () => states.map((s) => ({ value: s, label: s })),
    [states]
  )
  const districtOptions = useMemo<SelectOption[]>(
    () => districts.map((d) => ({ value: d, label: d })),
    [districts]
  )
  const schoolOptions = useMemo<SelectOption[]>(
    () => schools.map((s) => ({ value: s.id, label: s.name, sublabel: s.address })),
    [schools]
  )

  // A saved profile shows its school name before the district's list arrives.
  const selectedSchoolKnown = schools.some((s) => s.id === schoolId)

  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === schoolId) ?? null,
    [schools, schoolId]
  )

  // Held in a ref so an inline arrow from the parent does not re-fire this on
  // every render — the effect should track the selection, not the callback.
  const onSchoolPickedRef = useRef(onSchoolPicked)
  useEffect(() => {
    onSchoolPickedRef.current = onSchoolPicked
  }, [onSchoolPicked])

  // Reports the resolved school rather than firing inside each handler: this
  // also covers the case where a school id is set before the district's list
  // has finished loading, which a per-handler call would miss.
  useEffect(() => {
    onSchoolPickedRef.current?.(selectedSchool)
  }, [selectedSchool])

  function pickState(next: string) {
    setState(next)
    setDistrict('')
    setManualDistrict('')
    setSchoolId('')
    setManualName('')
  }

  function pickDistrict(next: string) {
    setDistrict(next)
    setSchoolId(next === MANUAL_DISTRICT ? MANUAL_SENTINEL : '')
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
        <label htmlFor="school_state_input" className="block text-sm font-medium text-foreground mb-1">
          State
        </label>
        <SearchableSelect
          inputId="school_state_input"
          ariaLabel="State"
          className={className}
          options={stateOptions}
          value={state}
          onChange={pickState}
          placeholder="Search or select your state"
        />
        <input type="hidden" name="school_state" value={state} />
      </div>

      {/* District */}
      <div>
        <label htmlFor="school_district_input" className="block text-sm font-medium text-foreground mb-1">
          District
        </label>
        <SearchableSelect
          inputId="school_district_input"
          ariaLabel="District"
          className={className}
          options={districtOptions}
          value={district}
          onChange={pickDistrict}
          disabled={!state}
          loading={Boolean(state) && districts.length === 0 && pending}
          placeholder={state ? 'Search or select your district' : 'Select a state first'}
          footerAction={
            state ? { label: "My district isn't listed", onSelect: () => pickDistrict(MANUAL_DISTRICT) } : undefined
          }
        />

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
        <label htmlFor="school_input" className="block text-sm font-medium text-foreground mb-1">
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
          <SearchableSelect
            inputId="school_input"
            ariaLabel="School name"
            className={className}
            options={schoolOptions}
            value={selectedSchoolKnown ? schoolId : ''}
            onChange={setSchoolId}
            disabled={!effectiveDistrict}
            loading={Boolean(effectiveDistrict) && schools.length === 0 && pending}
            placeholder={
              effectiveDistrict
                ? initialSchoolName && !selectedSchoolKnown
                  ? initialSchoolName
                  : 'Start typing your school name'
                : 'Select a district first'
            }
            footerAction={
              effectiveDistrict
                ? { label: "+ My school isn't listed", onSelect: () => setSchoolId(MANUAL_SENTINEL) }
                : undefined
            }
          />
        )}

        <input type="hidden" name="school_id" value={schoolId} />
      </div>
    </>
  )
}
