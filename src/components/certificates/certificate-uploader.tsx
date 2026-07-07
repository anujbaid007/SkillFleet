'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveCertRecordAction } from '@/app/onboarding/actions'

interface GrowthParameter {
  id: string
  name: string
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export function CertificateUploader({
  studentId,
  parameters,
}: {
  studentId: string
  parameters: GrowthParameter[]
}) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [parameterId, setParameterId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so the same file can be re-chosen
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('File must be under 5 MB.')
      return
    }
    setError(null)

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
        setError('Upload failed. Please try again.')
        return
      }

      const fd = new FormData()
      fd.set('file_url', storageData.path)
      fd.set('file_name', file.name)
      fd.set('description', desc)
      fd.set('parameter_id', paramId)

      const result = await saveCertRecordAction(fd)
      if (result.error) {
        setError(result.error)
        return
      }

      setDescription('')
      setParameterId('')
      router.refresh()
    })
  }

  return (
    <div className="clay-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-pink to-accent-purple flex items-center justify-center shrink-0">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display font-bold text-foreground">Upload a certificate</h2>
          <p className="text-xs text-muted mt-0.5">
            Add as many as you like. An admin reviews each one and awards points.
          </p>
        </div>
      </div>

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

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
    </div>
  )
}
