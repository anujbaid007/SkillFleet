'use client'

import { useState, useEffect } from 'react'
import {
  Send,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  School,
  Mail,
  User,
  Sparkles,
  MousePointerClick,
  RotateCcw,
} from 'lucide-react'
import {
  sendCustomTestEmailAction,
  previewCustomEmailAction,
  getCampaignTrackingAction,
  getSandboxHistoryAction,
  type CampaignSendResult,
} from '@/app/actions/campaign'
import { getConnectedSenderAccountsAction } from '@/app/actions/gmail'
import type { SentEmailRecord } from '@/lib/gmail/sent-log'

interface CustomTestEmailerProps {
  isConnected: boolean
}

function formatSentTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Sent'
  }
}

export function CustomTestEmailer({ isConnected }: CustomTestEmailerProps) {
  const [schoolName, setSchoolName] = useState('Delhi Public School')
  const [recipient, setRecipient] = useState('anuj.aecpl@gmail.com')
  const [contactName, setContactName] = useState('Anuj Baid')
  const [selectedSender, setSelectedSender] = useState<string>('')
  const [senders, setSenders] = useState<Array<{ email: string }>>([])

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CampaignSendResult | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const [history, setHistory] = useState<SentEmailRecord[]>([])
  const [tracking, setTracking] = useState<Record<string, { opens: number; clicks: number }>>({})
  const [isMounted, setIsMounted] = useState(false)

  const refreshHistory = async () => {
    try {
      const [hist, track, senderList] = await Promise.all([
        getSandboxHistoryAction(),
        getCampaignTrackingAction(),
        getConnectedSenderAccountsAction(),
      ])
      setHistory(hist)
      setTracking(track)
      setSenders(senderList)
      if (senderList.length > 0 && !selectedSender) {
        setSelectedSender(senderList[0].email)
      }
    } catch {
      // Ignore polling errors
    }
  }

  useEffect(() => {
    setIsMounted(true)
    refreshHistory()
    const interval = setInterval(refreshHistory, 4000)
    return () => clearInterval(interval)
  }, [])

  const handlePreview = async () => {
    const res = await previewCustomEmailAction({
      schoolName,
      recipient,
      contactName,
      senderEmail: selectedSender,
    })
    setPreviewHtml(res.htmlBody)
    setShowPreviewModal(true)
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setResult(null)

    const res = await sendCustomTestEmailAction({
      schoolName,
      recipient,
      contactName,
      senderEmail: selectedSender,
    })

    setResult(res)
    setLoading(false)
    refreshHistory()
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              ISC Emailer Test Sandbox
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter any custom school name and email address to preview and test live email delivery & open/click tracking.
            </p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {senders.length > 0 && (
            <div>
              <label
                htmlFor="senderAccount"
                className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                From (Connected Sender Account)
              </label>
              <select
                id="senderAccount"
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
              >
                {senders.map((s) => (
                  <option key={s.email} value={s.email}>
                    {s.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="schoolName"
                className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5"
              >
                <School className="w-3.5 h-3.5 text-primary" />
                Target School Name ({'{{SchoolName}}'})
              </label>
              <input
                id="schoolName"
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Modern School, Barakhamba Road"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div>
              <label
                htmlFor="recipient"
                className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                Recipient Email
              </label>
              <input
                id="recipient"
                type="email"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. anuj.aecpl@gmail.com"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="contactName"
              className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Contact / Principal Name (Optional)
            </label>
            <input
              id="contactName"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Dr. Ashok Pandey"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          {result?.error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{result.error}</span>
            </div>
          )}

          {result?.success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Test email sent successfully to <strong>{result.recipient}</strong> for{' '}
                <strong>{result.schoolName}</strong>! (Message ID: {result.messageId})
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handlePreview}
              className="px-4 py-2 text-xs font-semibold border border-border text-foreground hover:bg-muted/40 rounded-xl transition inline-flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview Personalized HTML
            </button>

            <button
              type="submit"
              disabled={!isConnected || loading}
              className="px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending Test...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Test Email via Gmail API
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sandbox Test Sent History & Live Engagement */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Sandbox Test Activity & Live Tracking</h4>
            <p className="text-xs text-muted-foreground">
              Shows real-time opens and clicks for tests sent from this sandbox.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshHistory}
            className="p-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg border border-border transition"
            title="Refresh engagement data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">School Name</th>
                <th className="px-4 py-3">Recipient Email</th>
                <th className="px-4 py-3 text-center w-36">Sent Time</th>
                <th className="px-4 py-3 text-center w-36">Live Engagement</th>
                <th className="px-4 py-3 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No sandbox test emails sent yet. Use the form above to dispatch your first test!
                  </td>
                </tr>
              ) : (
                history.map((h, i) => {
                  const trackData = tracking[h.recipient]

                  return (
                    <tr key={`${h.recipient}-${i}`} className="hover:bg-muted/20 transition">
                      <td className="px-4 py-3 font-semibold text-foreground">{h.schoolName}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{h.recipient}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {isMounted ? formatSentTime(h.sentAt) : 'Sent'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {trackData ? (
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            {trackData.opens > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                <Eye className="w-3 h-3" /> {trackData.opens} open
                                {trackData.opens > 1 ? 's' : ''}
                              </span>
                            ) : null}
                            {trackData.clicks > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full">
                                <MousePointerClick className="w-3 h-3" /> {trackData.clicks} click
                                {trackData.clicks > 1 ? 's' : ''}
                              </span>
                            ) : null}
                            {!trackData.opens && !trackData.clicks && (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSchoolName(h.schoolName)
                            setRecipient(h.recipient)
                            handleSend()
                          }}
                          disabled={!isConnected || loading}
                          className="px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition inline-flex items-center gap-1 text-[11px]"
                        >
                          <RotateCcw className="w-3 h-3" /> Re-test
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Personalized HTML Preview for {schoolName}
                </h4>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  To: {recipient}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border transition"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-muted/10">
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="w-full h-[600px] border border-border rounded-xl bg-white shadow-inner"
              />
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
              <span className="text-xs text-muted-foreground">
                School merge: <strong className="text-foreground">{schoolName}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false)
                  handleSend()
                }}
                disabled={!isConnected || loading}
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send Test to {recipient}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
