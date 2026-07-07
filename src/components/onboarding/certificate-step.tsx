'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { saveCertRecordAction } from '@/app/onboarding/actions'

interface GrowthParameter {
  id: string
  name: string
}

interface UploadedCert {
  id: string
  fileName: string
  parameterName: string | null
}

interface Props {
  studentId: string
  parameters: GrowthParameter[]
  onNext: () => void
  onBack: () => void
}

const MAX_CERTS = 10
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export function CertificateStep({ studentId, parameters, onNext, onBack }: Props) {
  const [uploaded, setUploaded] = useState<UploadedCert[]>([])
  const [description, setDescription] = useState('')
  const [parameterId, setParameterId] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so same file can be re-chosen
    if (!file) return

    if (uploaded.length >= MAX_CERTS) {
      setUploadError(`You can upload up to ${MAX_CERTS} certificates.`)
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadError('File must be under 5 MB.')
      return
    }

    setUploadError(null)
    const desc = description.trim()
    const paramId = parameterId

    startTransition(async () => {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'bin'
      const storagePath = `${studentId}/${Date.now()}.${ext}`

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('certificates')
        .upload(storagePath, file, { upsert: false })

      if (storageErr || !storageData) {
        setUploadError('Upload failed. Please try again.')
        return
      }

      const fd = new FormData()
      fd.set('file_url', storageData.path)
      fd.set('file_name', file.name)
      fd.set('description', desc)
      fd.set('parameter_id', paramId)

      const result = await saveCertRecordAction(fd)
      if (result.error) {
        setUploadError(result.error)
        return
      }

      const param = parameters.find((p) => p.id === paramId)
      setUploaded((prev) => [
        ...prev,
        { id: result.certId!, fileName: file.name, parameterName: param?.name ?? null },
      ])
      setDescription('')
      setParameterId('')
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Certificates &amp; Achievements
        </h2>
        <p className="text-muted mt-1 text-sm">
          Have certificates, awards, or achievements? Upload them now and an admin will review each
          one to add points to your profile. You can skip this and add or manage them anytime from
          your Certificates page.
        </p>
      </div>

      {uploaded.length > 0 && (
        <div className="space-y-2">
          {uploaded.map((cert) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 clay-card p-4"
            >
              <CheckCircle className="w-5 h-5 text-accent-teal flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{cert.fileName}</p>
                {cert.parameterName && <p className="text-xs text-muted">{cert.parameterName}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {uploaded.length < MAX_CERTS && (
        <div className="clay-card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. State-level chess winner, 2024"
              className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Related skill <span className="text-muted font-normal">(optional)</span>
            </label>
            <select
              value={parameterId}
              onChange={(e) => setParameterId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border-2 border-black/[0.06] bg-white text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
            >
              <option value="">— Select a skill —</option>
              {parameters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <label
            className={[
              'flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors font-medium text-sm',
              isPending
                ? 'border-black/[0.06] text-muted cursor-not-allowed'
                : 'border-primary/40 text-primary hover:bg-primary/5',
            ].join(' ')}
          >
            <Upload className="w-4 h-4" />
            {isPending ? 'Uploading…' : 'Choose file (JPG, PNG, PDF · max 5 MB)'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              disabled={isPending}
              onChange={handleFileChange}
            />
          </label>

          {uploadError && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{uploadError}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="flex-1 h-12 rounded-xl border-2 border-black/[0.06] text-muted font-medium hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isPending}
          className="flex-[2] clay-button bg-cta text-white h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploaded.length > 0
            ? `Continue with ${uploaded.length} certificate${uploaded.length > 1 ? 's' : ''} →`
            : 'Skip for now →'}
        </button>
      </div>
    </div>
  )
}
