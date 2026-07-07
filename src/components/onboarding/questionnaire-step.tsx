'use client'

import { motion } from 'motion/react'

interface QuestionnaireQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
}

interface Props {
  questions: QuestionnaireQuestion[]
  answers: Record<string, string>
  onChange: (questionId: string, optionId: string) => void
  onNext: () => void
}

export function QuestionnaireStep({ questions, answers, onChange, onNext }: Props) {
  const allAnswered = questions.length > 0 && questions.every((q) => !!answers[q.id])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">About You</h2>
        <p className="text-muted mt-1 text-sm">
          Answer honestly — there are no wrong answers. This shapes your personal growth profile.
        </p>
      </div>

      <div className="space-y-5">
        {questions.map((question, idx) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07, type: 'spring', stiffness: 80, damping: 18 }}
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
                      name={`q_${question.id}`}
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

      <div className="space-y-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!allAnswered}
          className="clay-button bg-cta text-white w-full h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
        {!allAnswered && (
          <p className="text-center text-xs text-muted">
            Please answer all {questions.length} questions to continue.
          </p>
        )}
      </div>
    </div>
  )
}
