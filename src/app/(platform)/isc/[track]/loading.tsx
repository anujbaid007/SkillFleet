/*
  The track page is the heaviest read in ISC — the entry, the team, the
  deadline and the consent check — so it is the one where a tap most needs an
  immediate answer. Shaped like the real page: back link, hero, two fact
  cards, then the form.
*/
export default function TrackLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading championship">
      <div className="h-5 w-24 rounded-lg bg-black/[0.06]" />

      <div className="clay-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-black/[0.08] shrink-0" />
          <div className="h-6 w-48 rounded-lg bg-black/[0.08]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded-lg bg-black/[0.05]" />
          <div className="h-4 w-4/5 rounded-lg bg-black/[0.05]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-7 w-52 rounded-full bg-black/[0.05]" />
          <div className="h-7 w-28 rounded-full bg-black/[0.05]" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="clay-card p-4 sm:p-5 space-y-3">
            <div className="h-5 w-40 rounded-lg bg-black/[0.07]" />
            <div className="h-4 w-full rounded-lg bg-black/[0.05]" />
            <div className="h-4 w-2/3 rounded-lg bg-black/[0.05]" />
          </div>
        ))}
      </div>

      <div className="clay-card p-4 sm:p-6 space-y-4">
        <div className="h-16 w-full rounded-xl bg-black/[0.04]" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-44 rounded-lg bg-black/[0.06]" />
            <div className="h-11 w-full rounded-xl bg-black/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  )
}
