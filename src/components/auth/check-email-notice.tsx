import Link from 'next/link'
import { MailCheck } from 'lucide-react'

export function CheckEmailNotice({ message }: { message: string }) {
  return (
    <div className="text-center space-y-3 py-2">
      <div className="w-14 h-14 rounded-2xl bg-accent-teal/10 flex items-center justify-center mx-auto">
        <MailCheck className="w-7 h-7 text-accent-teal" />
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground">Check your email</h1>
      <p className="text-muted text-sm max-w-xs mx-auto">{message}</p>
      <p className="text-xs text-muted/80 max-w-xs mx-auto">
        Didn&apos;t get it? Check spam, or wait a moment and try again.
      </p>
      <Link
        href="/login"
        className="inline-block clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold mt-1"
      >
        Go to sign in
      </Link>
    </div>
  )
}
