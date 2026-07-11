import { createClient } from '@/lib/supabase/server'
import { TaxonomyManager } from '@/components/admin/taxonomy-manager'
import { PageHeader } from '@/components/ui/page-header'
import { FolderTree } from 'lucide-react'

interface RawTopic {
  id: string
  name: string
  description: string | null
  is_active: boolean
  category_id: string
}

interface RawCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
}

export default async function TaxonomyPage() {
  const supabase = await createClient()

  const [{ data: cats }, { data: topics }] = (await Promise.all([
    supabase.from('categories').select('id, name, description, is_active, display_order').order('display_order'),
    supabase.from('topics').select('id, name, description, is_active, category_id').order('display_order'),
  ])) as [{ data: RawCategory[] | null }, { data: RawTopic[] | null }]

  const topicsByCategory = new Map<string, RawTopic[]>()
  for (const t of topics ?? []) {
    const list = topicsByCategory.get(t.category_id) ?? []
    list.push(t)
    topicsByCategory.set(t.category_id, list)
  }

  const categories = (cats ?? []).map((c) => ({
    ...c,
    topics: topicsByCategory.get(c.id) ?? [],
  }))

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        eyebrow="Catalog"
        icon={FolderTree}
        title="Taxonomy"
        subtitle="Manage categories and topics used to organise offerings."
      />
      <TaxonomyManager categories={categories} />
    </div>
  )
}
