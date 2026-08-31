/*
  Shown the moment a platform link is tapped, instead of leaving the previous
  page on screen while the server renders.

  These pages are server-rendered per request and each one waits on several
  Supabase calls, so a tap could sit for a second or more with nothing
  happening — which reads as the app having missed the tap, and invites a
  second tap. Next.js swaps this in immediately on navigation, so the response
  is instant even when the data is not.
*/
export default function PlatformLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Page header */}
      <div className="space-y-3">
        <div className="h-6 w-56 rounded-full bg-black/[0.06]" />
        <div className="h-8 w-44 rounded-xl bg-black/[0.08]" />
        <div className="h-4 w-full max-w-md rounded-lg bg-black/[0.05]" />
      </div>

      {/* A couple of cards, sized like the real ones so the page does not
          jump when the content arrives. */}
      <div className="clay-card p-4 sm:p-6 space-y-3">
        <div className="h-5 w-40 rounded-lg bg-black/[0.07]" />
        <div className="h-4 w-full rounded-lg bg-black/[0.05]" />
        <div className="h-4 w-3/4 rounded-lg bg-black/[0.05]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="clay-card p-4 sm:p-6 space-y-3">
            <div className="h-11 w-11 rounded-2xl bg-black/[0.07]" />
            <div className="h-5 w-2/3 rounded-lg bg-black/[0.07]" />
            <div className="h-4 w-full rounded-lg bg-black/[0.05]" />
            <div className="h-4 w-1/2 rounded-lg bg-black/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  )
}
