'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Eye,
  MousePointerClick,
  Send,
  TrendingUp,
  School,
  Mail,
  RefreshCw,
  Search,
  Download,
  ExternalLink,
  Smartphone,
  Laptop,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import {
  getDetailedCampaignAnalyticsAction,
  type CampaignAnalyticsData,
} from '@/app/actions/campaign'

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Recent'
  }
}

export function CampaignAnalytics() {
  const [data, setData] = useState<CampaignAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'clicks' | 'opens'>('all')
  const [isMounted, setIsMounted] = useState(false)

  const fetchAnalytics = async () => {
    try {
      const res = await getDetailedCampaignAnalyticsAction()
      setData(res)
    } catch {
      // Ignore polling errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setIsMounted(true)
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 4000)
    return () => clearInterval(interval)
  }, [])

  const filteredSchools = useMemo(() => {
    if (!data?.topSchools) return []
    return data.topSchools.filter((s) => {
      const matches =
        !searchTerm ||
        s.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.recipient.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matches) return false

      if (filterMode === 'clicks') return s.clicks > 0
      if (filterMode === 'opens') return s.opens > 0 && s.clicks === 0
      return true
    })
  }, [data, searchTerm, filterMode])

  const handleExportCsv = () => {
    if (!data?.topSchools) return
    const headers = ['School Name', 'Email Address', 'Total Opens', 'Total Clicks', 'Last Active']
    const rows = data.topSchools.map((s) => [
      `"${s.schoolName.replace(/"/g, '""')}"`,
      `"${s.recipient}"`,
      s.opens,
      s.clicks,
      `"${s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString() : ''}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `ISC-2026-Engaged-Schools-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Aggregating live campaign analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sent</span>
            <Send className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{data?.totalSent || 0}</div>
          <p className="text-[11px] text-muted-foreground">Master outreach batch</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Opens</span>
            <Eye className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data?.uniqueOpens || 0}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              ({data?.openRate || 0}%)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {data?.totalOpens || 0} total open events logged
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Clicks</span>
            <MousePointerClick className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data?.uniqueClicks || 0}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              ({data?.clickRate || 0}%)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {data?.totalClicks || 0} total CTA link clicks
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Click-To-Open</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data?.clickToOpenRate || 0}%
          </div>
          <p className="text-[11px] text-muted-foreground">Conversion among openers</p>
        </div>
      </div>

      {/* Breakdown by Clicked Link */}
      {data?.linkBreakdown && data.linkBreakdown.length > 0 && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-primary" />
            Most Clicked Buttons & CTAs
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.linkBreakdown.map((item, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="text-xs font-semibold text-foreground truncate">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    {item.url}
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-500/10 text-teal-600">
                  {item.count} click{item.count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unique Engaged Contacts Table */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm space-y-0">
        <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              Unique Engaged Schools & Email Addresses ({filteredSchools.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every contact that opened the email or clicked any registration / deck link.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search school or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'clicks', 'opens'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilterMode(m)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs capitalize transition ${
                    filterMode === m
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  {m === 'all' ? 'All Engaged' : m === 'clicks' ? 'Clicked CTA' : 'Opened Only'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredSchools.length === 0}
              className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 disabled:opacity-40 rounded-lg transition inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">School Name</th>
                <th className="px-4 py-3">Recipient Email</th>
                <th className="px-4 py-3 text-center w-28">Opens</th>
                <th className="px-4 py-3 text-center w-28">Clicks</th>
                <th className="px-4 py-3 text-center w-36">Status</th>
                <th className="px-4 py-3 text-right w-40">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No matching engaged contacts found.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((s, idx) => (
                  <tr key={s.recipient} className="hover:bg-muted/20 transition">
                    <td className="px-4 py-3 font-medium text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{s.schoolName}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{s.recipient}</td>
                    <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                      {s.opens}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-teal-600">
                      {s.clicks}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.clicks > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 border border-teal-500/20">
                          <MousePointerClick className="w-2.5 h-2.5" /> Clicked CTA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600">
                          <Eye className="w-2.5 h-2.5" /> Opened Email
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {isMounted && s.lastActiveAt ? formatTime(s.lastActiveAt) : 'Recent'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Activity Feed Stream */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm space-y-0">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Live Real-time Engagement Stream
              </h4>
              <p className="text-xs text-muted-foreground">
                Chronological feed of opens and link clicks as they happen in real time.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Stream
            </span>
          </div>

          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {data.recentActivity.map((ev, i) => (
              <div key={i} className="p-3.5 flex items-center justify-between hover:bg-muted/10 transition text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      ev.type === 'click'
                        ? 'bg-teal-500/10 text-teal-600'
                        : 'bg-indigo-500/10 text-indigo-600'
                    }`}
                  >
                    {ev.type === 'click' ? (
                      <MousePointerClick className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {ev.schoolName}{' '}
                      <span className="font-normal text-muted-foreground font-mono">
                        ({ev.recipientEmail})
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>
                        {ev.type === 'click'
                          ? `Clicked link: ${ev.targetUrl || 'Action Button'}`
                          : 'Opened email in mail client'}
                      </span>
                      <span>•</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{ev.device}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-muted-foreground flex-shrink-0 pl-3">
                  {isMounted ? formatTime(ev.timestamp) : 'Recent'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
