'use client'

import { useId, useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '@/lib/validation/password'

interface PasswordFieldProps {
  name?: string
  label?: string
  autoComplete?: string
  placeholder?: string
  required?: boolean
  /** Show the live rule checklist as the user types. Default true. */
  showChecklist?: boolean
}

export function PasswordField({
  name = 'password',
  label = 'Password',
  autoComplete = 'new-password',
  placeholder,
  required = true,
  showChecklist = true,
}: PasswordFieldProps) {
  const id = useId()
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-4 pr-11 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showChecklist && value.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value)
            return (
              <li
                key={rule.id}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  ok ? 'text-accent-teal' : 'text-muted'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 transition-colors ${
                    ok ? 'bg-accent-teal/15' : 'bg-black/[0.06]'
                  }`}
                >
                  {ok ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted/40" />
                  )}
                </span>
                {rule.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
