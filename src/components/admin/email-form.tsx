'use client'

import { useState, useEffect } from 'react'
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Send, Plus, Trash2, ShieldCheck } from 'lucide-react'
import {
  sendGmailAction,
  getConnectedSenderAccountsAction,
  removeSenderAccountAction,
  type SendEmailActionState,
} from '@/app/actions/gmail'

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
  const [accounts, setAccounts] = useState<Array<{ email: string; updatedAt: string }>>([])
  const [selectedSender, setSelectedSender] = useState<string>('')

  const loadAccounts = async () => {
    try {
      const list = await getConnectedSenderAccountsAction()
      setAccounts(list)
      if (list.length > 0 && !selectedSender) {
        setSelectedSender(list[0].email)
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleRemoveAccount = async (email: string) => {
    if (confirm(`Disconnect sender account "${email}"?`)) {
      await removeSenderAccountAction(email)
      await loadAccounts()
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const formData = new FormData(e.currentTarget)
    if (selectedSender) {
      formData.set('sender_email', selectedSender)
    }
    const res = await sendGmailAction(undefined, formData)
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {connectedNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Google Account connected successfully! It is now available as a sender across all campaigns.
          </p>
        </div>
      )}

      {initialError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Authorization error: {initialError}</p>
        </div>
      )}

      {/* Connected Sender Accounts Management Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Connected Sender Accounts ({accounts.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect multiple Gmail/Workspace accounts (e.g. <code>contact@skillfleet.org</code>, <code>isc@skillfleet.org</code>).
            </p>
          </div>

          <a
            href={`/api/gmail/auth?returnTo=${encodeURIComponent(returnTo)}`}
            className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition inline-flex items-center gap-2 self-start"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Another Account
          </a>
        </div>

        {accounts.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            No Gmail accounts connected yet. Click &quot;Connect Another Account&quot; to authorize a sender address.
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {accounts.map((acc) => (
              <div
                key={acc.email}
                className="p-3.5 flex items-center justify-between hover:bg-muted/20 transition bg-background"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {acc.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground font-mono">
                      {acc.email}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Authorized for sending • Active
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveAccount(acc.email)}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition"
                    title="Disconnect this sender"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose & Send Form */}
      {accounts.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4"
        >
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Single Custom Email Composer
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sender_select" className="block text-xs font-semibold text-foreground mb-1">
                From (Sender Account)
              </label>
              <select
                id="sender_select"
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
              >
                {accounts.map((acc) => (
                  <option key={acc.email} value={acc.email}>
                    {acc.email}
                  </option>
                ))}
              </select>
            </div>

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
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
              />
            </div>
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
