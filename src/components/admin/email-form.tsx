'use client'

import { useState } from 'react'
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Send } from 'lucide-react'
import { sendGmailAction, disconnectGmailAction, type SendEmailActionState } from '@/app/actions/gmail'

interface EmailFormProps {
  isConnected: boolean
  hasRefreshToken: boolean
  error?: string
  connectedNotice?: boolean
  returnTo?: string
}

export function EmailForm({
  isConnected,
  hasRefreshToken,
  error: initialError,
  connectedNotice,
  returnTo = '/email',
}: EmailFormProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SendEmailActionState | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const formData = new FormData(e.currentTarget)
    const res = await sendGmailAction(undefined, formData)
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {connectedNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Gmail account connected successfully! You can now send emails from your address.
          </p>
        </div>
      )}

      {initialError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Authorization error: {initialError}</p>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-muted/40 text-muted-foreground'
            }`}
          >
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Gmail Status:{' '}
              {isConnected ? (
                <span className="text-emerald-600 font-medium">Connected</span>
              ) : (
                <span className="text-muted-foreground font-medium">Not connected</span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isConnected
                ? hasRefreshToken
                  ? 'Authorized with offline access (auto-refresh enabled)'
                  : 'Authorized for current session'
                : 'Connect your Gmail to send emails directly via Gmail API'}
            </p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <form action={disconnectGmailAction}>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition"
              >
                Disconnect
              </button>
            </form>
          ) : (
            <a
              href={`/api/gmail/auth?returnTo=${encodeURIComponent(returnTo)}`}
              className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition inline-flex items-center gap-2"
            >
              Connect Gmail
            </a>
          )}
        </div>
      </div>

      {/* Compose & Send Form */}
      {isConnected && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4"
        >
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Send Email
          </h3>

          <div>
            <label htmlFor="to" className="block text-xs font-semibold text-foreground mb-1">
              Recipient Email (To)
            </label>
            <input
              id="to"
              name="to"
              type="email"
              required
              placeholder="recipient@example.com"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-xs font-semibold text-foreground mb-1">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              placeholder="Email subject..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div>
            <label htmlFor="body" className="block text-xs font-semibold text-foreground mb-1">
              Message Content
            </label>
            <textarea
              id="body"
              name="body"
              rows={5}
              required
              placeholder="Write your email message here..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_html"
              name="is_html"
              type="checkbox"
              value="true"
              className="rounded border-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="is_html" className="text-xs text-muted-foreground">
              Send as HTML format
            </label>
          </div>

          {result?.error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{result.error}</span>
            </div>
          )}

          {result?.success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Email sent successfully! Message ID: {result.messageId}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
