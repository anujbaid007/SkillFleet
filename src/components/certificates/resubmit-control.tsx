'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resubmitCertAction } from '@/app/(platform)/certificates/actions'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// Lets a student attach a new file to a REJECTED certificate and send it back
// for review. Uploads to storage client-side, then resubmitCertAction resets
// the row to 'pending'.
export function ResubmitControl({ certId, studentId }: { certId: string; studentId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('File must be under 5 MB.')
      return
    }
    setError(null)

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
      fd.set('cert_id', certId)
      fd.set('file_url', storageData.path)
      fd.set('file_name', file.name)

      const result = await resubmitCertAction(fd)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-1.5">
      <label
        className={[
          'inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors',
          isPending ? 'text-muted cursor-not-allowed' : 'text-primary hover:underline',
        ].join(' ')}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {isPending ? 'Resubmitting…' : 'Resubmit with a new file'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          disabled={isPending}
          onChange={handleFileChange}
        />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
