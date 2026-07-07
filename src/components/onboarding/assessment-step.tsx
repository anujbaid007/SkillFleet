'use client'

import { motion } from 'motion/react'

interface AssessmentQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
}

interface Props {
  assessmentTitle: string
  questions: AssessmentQuestion[]
  answers: Record<string, string>
  onChange: (questionId: string, optionId: string) => void
  onNext: () => void
  onBack: () => void
}

export function AssessmentStep({
  assessmentTitle,
  questions,
  answers,
  onChange,
  onNext,
  onBack,
}: Props) {
  const allAnswered = questions.length > 0 && questions.every((q) => !!answers[q.id])
  const answeredCount = questions.filter((q) => !!answers[q.id]).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{assessmentTitle}</h2>
        <p className="text-muted mt-1 text-sm">
          Pick the best answer for each question. Your score isn&apos;t shown — this builds your growth profile.
        </p>
        <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          />
        </div>
        <p className="text-xs text-muted mt-1">
          {answeredCount} of {questions.length} answered
        </p>
      </div>

      <div className="space-y-5">
        {questions.map((question, idx) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, type: 'spring', stiffness: 80, damping: 18 }}
            className="clay-card p-5"
          >
            <p className="font-medium text-foreground mb-3">
              {idx + 1}. {question.text}
            </p>
            <div className="space-y-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id
                return (
                  <label
                    key={option.id}
                    className={[
                      'flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 transition-colors border-2 text-sm',
                      selected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-black/[0.06] bg-white text-foreground hover:border-primary/40',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={`aq_${question.id}`}
                      value={option.id}
                      checked={selected}
                      onChange={() => onChange(question.id, option.id)}
                      className="sr-only"
                    />
                    {option.text}
                  </label>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-12 rounded-xl border-2 border-black/[0.06] text-muted font-medium hover:border-primary/40 transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!allAnswered}
          className="flex-[2] clay-button bg-cta text-white h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
