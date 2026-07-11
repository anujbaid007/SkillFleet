'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Baby, Trash2, Plus, X, TrendingUp } from 'lucide-react'
import { linkStudentAction, unlinkStudentAction } from '@/app/actions/auth'
import type { AuthFormState } from '@/app/actions/auth'

export interface LinkedChild {
  student_id: string
  full_name: string | null
  email: string
  relationship: string
}

export function ChildrenManager({ students }: { students: LinkedChild[] }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <Baby className="w-3.5 h-3.5" /> Family
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">My Children</h1>
          <p className="text-muted mt-1 text-sm">
            Link the SkillFleet accounts of the children you manage.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="clay-button bg-cta text-white inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0"
          >
            <Plus className="w-4 h-4" />
            Link a child
          </button>
        )}
      </div>

      {showForm && <LinkForm onDone={() => setShowForm(false)} />}

      {students.length === 0 ? (
        <div className="clay-card p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center mx-auto">
            <Baby className="w-7 h-7 text-white" />
          </div>
          <p className="text-foreground font-display font-bold">No children linked yet</p>
          <p className="text-muted text-sm max-w-xs mx-auto">
            Link your child&apos;s account to follow their growth journey.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {students.map((child) => (
            <li key={child.student_id} className="clay-card p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-white">
                      {child.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-foreground truncate">
                      {child.full_name ?? 'Student'}
                    </p>
                    <p className="text-xs text-muted truncate">{child.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/children/${child.student_id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold px-3 py-2 hover:bg-primary/15 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Progress</span>
                  </Link>
                  <UnlinkButton studentId={child.student_id} name={child.full_name ?? 'this student'} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LinkForm({ onDone }: { onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    linkStudentAction,
    undefined
  )

  // On success the server revalidates the list; reset and close the form.
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      onDone()
    }
  }, [state, onDone])

  return (
    <form ref={formRef} action={action} className="clay-card p-5 mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Link a child&apos;s account</h2>
        <button
          type="button"
          onClick={onDone}
          className="text-muted hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label htmlFor="student_email" className="block text-sm font-medium text-foreground mb-1">
          Child&apos;s email
        </label>
        <input
          id="student_email"
          name="student_email"
          type="email"
          required
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
          placeholder="child@example.com"
        />
      </div>

      <div>
        <label htmlFor="student_password" className="block text-sm font-medium text-foreground mb-1">
          Child&apos;s password
        </label>
        <input
          id="student_password"
          name="student_password"
          type="password"
          required
          autoComplete="off"
          className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors"
          placeholder="Their account password"
        />
        <p className="text-xs text-muted mt-1">
          Used only to confirm the account is yours — it&apos;s never stored.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white w-full h-11 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Linking…' : 'Link account'}
      </button>
    </form>
  )
}

function UnlinkButton({ studentId, name }: { studentId: string; name: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    unlinkStudentAction,
    undefined
  )
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="student_id" value={studentId} />
        <span className="text-xs text-muted hidden sm:inline">Unlink {name}?</span>
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
        >
          {pending ? 'Removing…' : 'Yes, unlink'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs font-medium text-muted hover:text-foreground"
        >
          Cancel
        </button>
        {state?.error && <span className="text-xs text-red-500">{state.error}</span>}
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-red-600 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      <span className="hidden sm:inline">Unlink</span>
    </button>
  )
}
