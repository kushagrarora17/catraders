export type ProductInput = {
  title: string
  /** Part / SKU number shown on the site and searchable. */
  sku?: string
  /** Slug of a leaf category from taxonomy.ts. */
  category: string
  /** Attribute slug -> value label(s). Values are created on demand from these labels. */
  attrs?: Record<string, string | string[]>
  /** Plain-text description (one or two sentences, no prices). */
  description: string
  /** Defaults to true. */
  inStock?: boolean
}

export type CategoryNode = {title: string; slug: string; children?: CategoryNode[]}

export type AttributeDef = {
  title: string
  slug: string
  allowMultiple?: boolean
}
