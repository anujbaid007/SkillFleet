'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { QuestionnaireStep } from './questionnaire-step'
import { AssessmentStep } from './assessment-step'
import { CertificateStep } from './certificate-step'
import { submitOnboardingAction } from '@/app/onboarding/actions'

type Step = 'intro' | 'questionnaire' | 'assessment' | 'certificates' | 'submitting'

interface WizardQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
}

interface OnboardingWizardProps {
  studentId: string
  questionnaire: { questions: WizardQuestion[] }
  assessment: { id: string; title: string; questions: WizardQuestion[] }
  parameters: { id: string; name: string }[]
}

const STEP_LABELS: Record<string, string> = {
  questionnaire: 'About You',
  assessment: 'Starter Quiz',
  certificates: 'Certificates',
}

const PROGRESS_STEPS: Step[] = ['questionnaire', 'assessment', 'certificates']

export function OnboardingWizard({
  studentId,
  questionnaire,
  assessment,
  parameters,
}: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('intro')
  const [qAnswers, setQAnswers] = useState<Record<string, string>>({})
  const [aAnswers, setAAnswers] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [skipping, setSkipping] = useState(false)
  const [, startTransition] = useTransition()

  function handleSkip() {
    setSkipping(true)
    router.push('/dashboard')
  }

  function handleSubmit() {
    setStep('submitting')
    setSubmitError(null)

    const fd = new FormData()
    fd.set('questionnaire_answers', JSON.stringify(qAnswers))
    fd.set('assessment_id', assessment.id)
    fd.set('assessment_answers', JSON.stringify(aAnswers))

    startTransition(async () => {
      const result = await submitOnboardingAction(undefined, fd)
      // If redirect happened, this line is never reached.
      // Only reached on error.
      if (result?.error) {
        setSubmitError(result.error)
        setStep('certificates')
      }
    })
  }

  const progressIdx = PROGRESS_STEPS.indexOf(step)

  return (
    <div className="w-full">
      {/* Progress bar */}
      {PROGRESS_STEPS.includes(step) && (
        <div className="flex items-center mb-8 gap-2">
          {PROGRESS_STEPS.map((s, idx) => {
            const done = progressIdx > idx
            const current = progressIdx === idx
            return (
              <div key={s} className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors',
                    done
                      ? 'bg-primary text-white'
                      : current
                        ? 'bg-cta text-white'
                        : 'bg-black/10 text-muted',
                  ].join(' ')}
                >
                  {done ? '✓' : idx + 1}
                </div>
                <span
                  className={[
                    'text-sm font-medium truncate',
                    current ? 'text-foreground' : 'text-muted',
                  ].join(' ')}
                >
                  {STEP_LABELS[s]}
                </span>
                {idx < PROGRESS_STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-black/10 mx-1" />
                )}
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          >
            <div className="clay-card p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-3xl">
                🌱
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Build your Growth Profile
                </h2>
                <p className="text-muted mt-2 text-sm max-w-md mx-auto leading-relaxed">
                  A quick 3-step starter — a few questions about you, a short quiz, and any
                  certificates — sets your baseline scores across every skill. It takes about 5
                  minutes. Prefer to do it later? You can start it anytime from your dashboard.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('questionnaire')}
                  disabled={skipping}
                  className="clay-button bg-cta text-white px-6 h-12 font-semibold disabled:opacity-60"
                >
                  Take the assessment →
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={skipping}
                  className="px-6 h-12 rounded-xl border-2 border-black/[0.06] text-muted font-medium hover:border-primary/40 transition-colors disabled:opacity-60"
                >
                  {skipping ? 'Taking you in…' : 'Skip for now'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'questionnaire' && (
          <motion.div
            key="questionnaire"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          >
            <QuestionnaireStep
              questions={questionnaire.questions}
              answers={qAnswers}
              onChange={(qId, optId) => setQAnswers((prev) => ({ ...prev, [qId]: optId }))}
              onNext={() => setStep('assessment')}
            />
          </motion.div>
        )}

        {step === 'assessment' && (
          <motion.div
            key="assessment"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          >
            <AssessmentStep
              assessmentTitle={assessment.title}
              questions={assessment.questions}
              answers={aAnswers}
              onChange={(qId, optId) => setAAnswers((prev) => ({ ...prev, [qId]: optId }))}
              onNext={() => setStep('certificates')}
              onBack={() => setStep('questionnaire')}
            />
          </motion.div>
        )}

        {step === 'certificates' && (
          <motion.div
            key="certificates"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          >
            {submitError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">
                {submitError}
              </p>
            )}
            <CertificateStep
              studentId={studentId}
              parameters={parameters}
              onNext={handleSubmit}
              onBack={() => setStep('assessment')}
            />
          </motion.div>
        )}

        {step === 'submitting' && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="clay-card p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <motion.div
                className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Building your growth profile…
            </h2>
            <p className="text-muted mt-2 text-sm">This only takes a moment.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
