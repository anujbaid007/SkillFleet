'use client'

import { useActionState, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import {
  createCategoryAction,
  createTopicAction,
  toggleCategoryAction,
  toggleTopicAction,
} from '@/app/(admin)/admin/taxonomy/actions'

interface Topic {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface Category {
  id: string
  name: string
  description: string | null
  is_active: boolean
  topics: Topic[]
}

export function TaxonomyManager({ categories }: { categories: Category[] }) {
  const [catState, catAction, catPending] = useActionState(createCategoryAction, undefined)
  const [topicState, topicAction, topicPending] = useActionState(createTopicAction, undefined)
  const [toggleCatState, toggleCatAction] = useActionState(toggleCategoryAction, undefined)
  const [toggleTopicState, toggleTopicAction2] = useActionState(toggleTopicAction, undefined)
  const [expandedCat, setExpandedCat] = useState<string | null>(categories[0]?.id ?? null)
  const [addingTopicFor, setAddingTopicFor] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="clay-card divide-y divide-black/[0.06]">
        {categories.length === 0 && (
          <p className="px-5 py-8 text-center text-muted text-sm">No categories yet. Add one below.</p>
        )}
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center gap-3 px-5 py-3">
              <button
                type="button"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <ChevronDown
                  className={`w-4 h-4 text-muted transition-transform ${expandedCat === cat.id ? 'rotate-180' : ''}`}
                />
                <span className={`font-medium text-sm ${!cat.is_active ? 'line-through text-muted' : 'text-foreground'}`}>
                  {cat.name}
                </span>
                <span className="text-xs text-muted">({cat.topics.length} topics)</span>
              </button>
              <form action={toggleCatAction}>
                <input type="hidden" name="id" value={cat.id} />
                <input type="hidden" name="is_active" value={String(cat.is_active)} />
                <button type="submit" className="text-xs text-muted hover:text-foreground transition-colors">
                  {cat.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </form>
            </div>

            {expandedCat === cat.id && (
              <div className="pl-10 pb-3 space-y-1 border-t border-black/[0.06] pt-2">
                {cat.topics.map((topic) => (
                  <div key={topic.id} className="flex items-center justify-between pr-5 py-1.5">
                    <span className={`text-sm ${!topic.is_active ? 'line-through text-muted' : 'text-foreground'}`}>
                      {topic.name}
                    </span>
                    <form action={toggleTopicAction2}>
                      <input type="hidden" name="id" value={topic.id} />
                      <input type="hidden" name="is_active" value={String(topic.is_active)} />
                      <button type="submit" className="text-xs text-muted hover:text-foreground transition-colors">
                        {topic.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                  </div>
                ))}

                {addingTopicFor === cat.id ? (
                  <form action={topicAction} className="flex gap-2 pt-1 pr-5">
                    <input type="hidden" name="category_id" value={cat.id} />
                    <input
                      name="name"
                      placeholder="Topic name"
                      autoFocus
                      className="flex-1 h-9 px-3 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="submit"
                      disabled={topicPending}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingTopicFor(null)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTopicFor(cat.id)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add topic
                  </button>
                )}
                {topicState?.error && addingTopicFor === cat.id && (
                  <p className="text-xs text-red-500 pr-5">{topicState.error}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {(catState?.success || topicState?.success || toggleCatState?.success || toggleTopicState?.success) && (
        <p className="text-sm text-green-600">
          {catState?.success ?? topicState?.success ?? toggleCatState?.success ?? toggleTopicState?.success}
        </p>
      )}

      <div className="clay-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Add Category</h3>
        {catState?.error && <p className="text-sm text-red-500">{catState.error}</p>}
        <form action={catAction} className="flex gap-2">
          <input
            name="name"
            placeholder="Category name"
            className="flex-1 h-10 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={catPending}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50"
          >
            {catPending ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
