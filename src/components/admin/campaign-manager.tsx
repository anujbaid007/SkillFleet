'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Send,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  School,
  User,
  MousePointerClick,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Square,
  Download,
  MapPin,
} from 'lucide-react'
import {
  sendCampaignEmailAction,
  getCampaignTrackingAction,
  getCampaignSentHistoryAction,
  type CampaignSendResult,
} from '@/app/actions/campaign'
import type { CampaignRecipient } from '@/lib/gmail/campaign'

interface CampaignManagerProps {
  recipients: CampaignRecipient[]
  isConnected: boolean
  initialSentHistory?: Record<string, { sentAt: string; messageId?: string; index: number }>
}

function formatSentTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Sent'
  }
}

export function CampaignManager({
  recipients,
  isConnected,
  initialSentHistory = {},
}: CampaignManagerProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<CampaignRecipient>(recipients[0])
  const [statuses, setStatuses] = useState<
    Record<
      number,
      {
        state: 'idle' | 'sending' | 'sent' | 'error'
        error?: string
        messageId?: string
        sentAt?: string
      }
    >
  >(() => {
    const initial: Record<number, { state: 'sent'; sentAt: string; messageId?: string }> = {}
    for (const r of recipients) {
      if (initialSentHistory[r.recipient]) {
        initial[r.index] = {
          state: 'sent',
          sentAt: initialSentHistory[r.recipient].sentAt,
          messageId: initialSentHistory[r.recipient].messageId,
        }
      }
    }
    return initial
  })

  const [tracking, setTracking] = useState<Record<string, { opens: number; clicks: number }>>({})
  const [batchSending, setBatchSending] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const stopBatchRef = useRef(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'unsent' | 'missing'>('all')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50

  const availableStates = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of recipients) {
      const st = r.state || 'Other'
      counts[st] = (counts[st] || 0) + 1
    }
    return Object.entries(counts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
  }, [recipients])

  const refreshData = async () => {
    try {
      const [trackingStats, sentHistory] = await Promise.all([
        getCampaignTrackingAction(),
        getCampaignSentHistoryAction(),
      ])

      setTracking(trackingStats)

      setStatuses((prev) => {
        const next = { ...prev }
        for (const r of recipients) {
          if (sentHistory[r.recipient] && next[r.index]?.state !== 'sending') {
            next[r.index] = {
              state: 'sent',
              sentAt: sentHistory[r.recipient].sentAt,
              messageId: sentHistory[r.recipient].messageId,
            }
          }
        }
        return next
      })
    } catch {
      // Ignore polling errors
    }
  }

  useEffect(() => {
    setIsMounted(true)
    refreshData()
    const interval = setInterval(refreshData, 4000)
    return () => clearInterval(interval)
  }, [])

  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        r.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.state && r.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.district && r.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(r.index) === searchTerm.trim()

      if (!matchesSearch) return false

      if (stateFilter !== 'all') {
        const st = r.state || 'Other'
        if (st.toLowerCase() !== stateFilter.toLowerCase()) return false
      }

      const isSent = statuses[r.index]?.state === 'sent'
      if (statusFilter === 'sent') return isSent
      if (statusFilter === 'unsent') return !isSent && r.hasEmail
      if (statusFilter === 'missing') return !r.hasEmail

      return true
    })
  }, [recipients, searchTerm, statusFilter, stateFilter, statuses])

  const handleExportCsv = () => {
    const headers = ['Index', 'School Name', 'Contact Name', 'Recipient Email', 'Phone', 'State', 'District', 'Delivery Status', 'Opens', 'Clicks']
    const rows = filteredRecipients.map((r) => {
      const isSent = statuses[r.index]?.state === 'sent'
      const trackData = tracking[r.recipient.trim().toLowerCase()] || tracking[r.recipient]
      return [
        r.index,
        `"${r.schoolName.replace(/"/g, '""')}"`,
        `"${r.contactName ? r.contactName.replace(/"/g, '""') : ''}"`,
        `"${r.recipient}"`,
        `"${r.phone || ''}"`,
        `"${r.state || ''}"`,
        `"${r.district || ''}"`,
        isSent ? 'Sent' : r.hasEmail ? 'Unsent' : 'Missing Email',
        trackData?.opens || 0,
        trackData?.clicks || 0,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `ISC-2026-Mailing-List-${stateFilter}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalPages = Math.ceil(filteredRecipients.length / PAGE_SIZE) || 1
  const paginatedRecipients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRecipients.slice(start, start + PAGE_SIZE)
  }, [filteredRecipients, currentPage])

  const handleSendSingle = async (item: CampaignRecipient) => {
    setStatuses((prev) => ({ ...prev, [item.index]: { state: 'sending' } }))
    const res: CampaignSendResult = await sendCampaignEmailAction(item.index)
    if (res.success) {
      setStatuses((prev) => ({
        ...prev,
        [item.index]: {
          state: 'sent',
          messageId: res.messageId,
          sentAt: res.sentAt || new Date().toISOString(),
        },
      }))
    } else {
      setStatuses((prev) => ({ ...prev, [item.index]: { state: 'error', error: res.error } }))
    }
  }

  const handleSendBatch = async (limit?: number) => {
    setBatchSending(true)
    stopBatchRef.current = false
    let count = 0

    // Gather candidate items
    const candidates = recipients.filter(
      (r) => r.hasEmail && statuses[r.index]?.state !== 'sent'
    )
    const targetBatch = limit ? candidates.slice(0, limit) : candidates
    setBatchProgress({ current: 0, total: targetBatch.length })

    try {
      for (const item of targetBatch) {
        if (stopBatchRef.current) break

        setStatuses((prev) => ({ ...prev, [item.index]: { state: 'sending' } }))
        try {
          const res = await sendCampaignEmailAction(item.index)
          if (res.success) {
            setStatuses((prev) => ({
              ...prev,
              [item.index]: {
                state: 'sent',
                messageId: res.messageId,
                sentAt: res.sentAt || new Date().toISOString(),
              },
            }))
            count++
          } else {
            setStatuses((prev) => ({ ...prev, [item.index]: { state: 'error', error: res.error } }))
          }
        } catch (itemErr) {
          setStatuses((prev) => ({
            ...prev,
            [item.index]: {
              state: 'error',
              error: itemErr instanceof Error ? itemErr.message : 'Network error',
            },
          }))
        }
        setBatchProgress({ current: count, total: targetBatch.length })

        // Pacing delay (600ms) between emails to respect Gmail API limits
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
    } finally {
      setBatchSending(false)
      setBatchProgress(null)
    }
  }

  const handleStopBatch = () => {
    stopBatchRef.current = true
  }

  const sentCount = Object.values(statuses).filter((s) => s.state === 'sent').length
  const totalCount = recipients.length
  const withEmailCount = recipients.filter((r) => r.hasEmail).length
  const remainingCount = withEmailCount - sentCount

  return (
    <div className="space-y-6">
      {/* Campaign Header & Control Bar */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              Introduction to ISC 2026 ({totalCount} Contacts)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Loaded from master Excel sheet. {withEmailCount} valid school emails ({totalCount - withEmailCount} missing).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
              Sent: <strong className="text-foreground">{sentCount}</strong> / {totalCount}
            </div>

            {batchSending ? (
              <button
                type="button"
                onClick={handleStopBatch}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Pause Batch
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSendBatch(10)}
                  disabled={!isConnected || batchSending || remainingCount <= 0}
                  className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 disabled:opacity-40 rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send 10
                </button>

                <button
                  type="button"
                  onClick={() => handleSendBatch(50)}
                  disabled={!isConnected || batchSending || remainingCount <= 0}
                  className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 disabled:opacity-40 rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send 50
                </button>

                <button
                  type="button"
                  onClick={() => handleSendBatch(100)}
                  disabled={!isConnected || batchSending || remainingCount <= 0}
                  className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 disabled:opacity-40 rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send 100
                </button>

                <button
                  type="button"
                  onClick={() => handleSendBatch()}
                  disabled={!isConnected || batchSending || remainingCount <= 0}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send All Unsent ({remainingCount})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Batch Progress Bar */}
        {batchSending && batchProgress && (
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-primary flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Dispatching emails with safe pacing (600ms / email)...
              </span>
              <span className="font-semibold text-foreground">
                {batchProgress.current} / {batchProgress.total} sent
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 transition-all duration-300"
                style={{
                  width: `${(batchProgress.current / (batchProgress.total || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Filter and Search Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search school, principal, email, district..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            {/* State Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition max-w-[180px]"
              >
                <option value="all">All States ({totalCount})</option>
                {availableStates.map((st) => (
                  <option key={st.state} value={st.state}>
                    {st.state} ({st.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {(['all', 'unsent', 'sent', 'missing'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f)
                    setCurrentPage(1)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs capitalize transition ${
                    statusFilter === f
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredRecipients.length === 0}
              className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 disabled:opacity-40 rounded-lg transition inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Recipient Table */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 w-14">#</th>
                <th className="px-4 py-3">School Name</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Recipient Email</th>
                <th className="px-4 py-3 text-center w-32">Delivery Status</th>
                <th className="px-4 py-3 text-center w-32">Live Engagement</th>
                <th className="px-4 py-3 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRecipients.map((r) => {
                const current = statuses[r.index]
                const status = current?.state || 'idle'
                const isTestRow = r.recipient === 'anuj.aecpl@gmail.com'
                const normalizedEmail = r.recipient.trim().toLowerCase()
                const trackData = tracking[normalizedEmail] || tracking[r.recipient]

                return (
                  <tr
                    key={r.index}
                    className={`hover:bg-muted/20 transition ${
                      isTestRow ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-muted-foreground">{r.index}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span>{r.schoolName}</span>
                          {isTestRow && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                              TEST ROW
                            </span>
                          )}
                        </div>
                        {(r.state || r.district) && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {[r.district, r.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3 h-3 text-muted-foreground/60" />
                      {r.contactName || '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono">
                      {r.hasEmail ? (
                        r.recipient
                      ) : (
                        <span className="text-muted-foreground italic">Missing email</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!r.hasEmail ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                          No Email
                        </span>
                      ) : (
                        <>
                          {status === 'idle' && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                              Not Sent
                            </span>
                          )}
                          {status === 'sending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Sending
                            </span>
                          )}
                          {status === 'sent' && (
                            <span
                              title={current?.sentAt ? `Sent at ${current.sentAt}` : 'Delivered'}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600"
                            >
                              <CheckCircle className="w-2.5 h-2.5" /> Sent{' '}
                              {isMounted && current?.sentAt
                                ? `(${formatSentTime(current.sentAt)})`
                                : ''}
                            </span>
                          )}
                          {status === 'error' && (
                            <span
                              title={current?.error}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-600 cursor-help"
                            >
                              <AlertCircle className="w-2.5 h-2.5" /> Failed
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.hasEmail && trackData ? (
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {trackData.opens > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                              <Eye className="w-3 h-3" /> {trackData.opens} open
                              {trackData.opens > 1 ? 's' : ''}
                            </span>
                          ) : null}
                          {trackData.clicks > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full">
                              <MousePointerClick className="w-3 h-3" />{' '}
                              {trackData.clicks} click
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
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecipient(r)
                            setShowPreviewModal(true)
                          }}
                          className="px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition inline-flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="w-3 h-3" />
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendSingle(r)}
                          disabled={!isConnected || !r.hasEmail || status === 'sending'}
                          className={`px-2.5 py-1 rounded-md transition inline-flex items-center gap-1 text-[11px] font-medium ${
                            status === 'sent'
                              ? 'border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                              : 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50'
                          }`}
                        >
                          {status === 'sent' ? (
                            <>
                              <RotateCcw className="w-3 h-3" /> Re-send
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" /> Send
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(currentPage * PAGE_SIZE, filteredRecipients.length)} of{' '}
            {filteredRecipients.length} contacts
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-border hover:bg-muted/40 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-border hover:bg-muted/40 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreviewModal && selectedRecipient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>Email Preview for {selectedRecipient.schoolName}</span>
                  {selectedRecipient.recipient === 'anuj.aecpl@gmail.com' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                      YOUR TEST ROW
                    </span>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  To: {selectedRecipient.recipient || 'Missing email'} | Subject:{' '}
                  {selectedRecipient.subject}
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
                srcDoc={selectedRecipient.htmlBody}
                className="w-full h-[600px] border border-border rounded-xl bg-white shadow-inner"
              />
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Merge field{' '}
                <code className="bg-muted px-1 rounded text-primary font-bold">
                  {'{{SchoolName}}'}
                </code>{' '}
                replaced with{' '}
                <strong className="text-foreground">{selectedRecipient.schoolName}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  handleSendSingle(selectedRecipient)
                  setShowPreviewModal(false)
                }}
                disabled={!isConnected || !selectedRecipient.hasEmail}
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send to {selectedRecipient.schoolName}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
