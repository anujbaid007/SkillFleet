import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Back to landing page */}
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <Link href="/" className="mb-8">
        <Image
          src="/logo.svg"
          alt="SkillFleet"
          width={160}
          height={44}
          className="h-10 w-auto"
          priority
        />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
