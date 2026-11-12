/**
 * Bulk-uploads the wholesale catalogue (scripts/catalog/**) to Sanity.
 * Idempotent: documents get deterministic _ids (or reuse an existing document with the same slug)
 * and are written with createOrReplace. Dry run by default.
 *
 *   bunx sanity login           # once
 *   bun run upload-products                # validate + show what would change
 *   UPLOAD_WRITE=1 bun run upload-products    # apply
 */
import {randomUUID} from 'node:crypto'
import {getCliClient} from 'sanity/cli'
import {apiVersion} from '../env'
import {ATTRIBUTES, CATEGORY_TREE} from './catalog/taxonomy'
import {products} from './catalog/products'
import type {CategoryNode} from './catalog/types'

const client = getCliClient({apiVersion})
const write = process.argv.includes('--write') || process.env.UPLOAD_WRITE === '1'

const key = () => randomUUID().replaceAll('-', '').slice(0, 12)
const ref = (id: string) => ({_type: 'reference', _ref: id})
const slugify = (text: string, max: number) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '')
const paragraph = (text: string) => [
  {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  },
]

type Existing = {_id: string; _type: string; slug: string; attribute?: string}
type Doc = {_id: string; _type: string; [field: string]: unknown}

const errors: string[] = []
const warnings: string[] = []

// Internal cost / supplier shorthand must never reach the public catalogue.
const LEAK = /\$|\bhst\b|\btax\b|\b[SAPW]\d{2,3}(\.\d+)?\b|\bSP\s?\d|\b(Rajan|Alvin|Ankur|Sam|vega|vga)\b/i

function flattenCategories(nodes: CategoryNode[], level = 1, parent?: string) {
  const out: {title: string; slug: string; level: number; parent?: string; sortOrder: number; leaf: boolean}[] = []
  for (const [index, node] of nodes.entries()) {
    out.push({title: node.title, slug: node.slug, level, parent, sortOrder: index + 1, leaf: !node.children?.length})
    if (node.children) out.push(...flattenCategories(node.children, level + 1, node.slug))
  }
  return out
}

function assertValid() {
  for (const w of warnings) console.warn(`warn: ${w}`)
  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`)
    throw new Error(`${errors.length} validation error(s); nothing written`)
  }
}

async function main() {
  const existing = await client.fetch<Existing[]>(
    `*[_type in ["category","attribute","attributeValue","product"] && !(_id in path("drafts.**"))]{
      _id, _type, "slug": slug.current, "attribute": attribute._ref
    }`,
  )
  const idBySlug = (type: string, slug: string, attribute?: string) =>
    existing.find((e) => e._type === type && e.slug === slug && (!attribute || e.attribute === attribute))?._id
  const existingIds = new Set(existing.map((e) => e._id))

  const docs: Doc[] = []

  // categories
  const categories = flattenCategories(CATEGORY_TREE)
  const categoryId = new Map<string, string>()
  function addCategories() {
  for (const c of categories) {
    categoryId.set(c.slug, idBySlug('category', c.slug) ?? `category-${c.slug}`)
  }
  categories.forEach((c) => docs.push({
      _id: categoryId.get(c.slug)!,
      _type: 'category',
      title: c.title,
      slug: {_type: 'slug', current: c.slug},
      vertical: 'automotive',
      level: c.level,
      sortOrder: c.sortOrder,
      ...(c.parent ? {parent: ref(categoryId.get(c.parent)!)} : {}),
    }))
  }
  addCategories()
  const leaves = new Set(categories.filter((c) => c.leaf && c.level >= 2).map((c) => c.slug))

  // attributes
  const attributeId = new Map<string, string>()
  const attributeMulti = new Map<string, boolean>()
  function addAttributes() {
  for (const [index, a] of ATTRIBUTES.entries()) {
    const id = idBySlug('attribute', a.slug) ?? `attribute-${a.slug}`
    attributeId.set(a.slug, id)
    const allowMultiple = a.allowMultiple ?? false
    attributeMulti.set(a.slug, allowMultiple)
    docs.push({
      _id: id,
      _type: 'attribute',
      title: a.title,
      slug: {_type: 'slug', current: a.slug},
      vertical: 'automotive',
      filterable: true,
      allowMultiple,
      sortOrder: index + 1,
    })
  }

  }
  addAttributes()

  // attribute values: collected from products (labels -> slug)
  const valueLabels = new Map<string, Map<string, string>>() // attr slug -> value slug -> label
  function valueBucket(attr: string) {
    return valueLabels.get(attr) ?? new Map<string, string>()
  }

  function rememberLabel(attr: string, valueSlug: string, label: string) {
    const bucket = valueBucket(attr)
    const prev = bucket.get(valueSlug)
    if (prev && prev !== label) warnings.push(`attribute ${attr}: "${prev}" and "${label}" share slug ${valueSlug}`)
    if (!prev) bucket.set(valueSlug, label)
    valueLabels.set(attr, bucket)
  }

  function labelRef(attr: string, label: string, title: string): [string, string][] {
    const valueSlug = slugify(label, 48)
    if (!valueSlug) {
      errors.push(`[${title}] attribute "${attr}" has an empty/invalid label "${label}"`)
      return []
    }
    rememberLabel(attr, valueSlug, label)
    return [[attr, valueSlug]]
  }

  function checkMultiplicity(attr: string, labels: string[], title: string) {
    if (labels.length > 1 && !attributeMulti.get(attr)) {
      errors.push(`[${title}] attribute "${attr}" allows one value, got ${labels.length}`)
    }
  }

  function attributeRefs(attr: string, raw: string | string[], title: string) {
    if (!attributeId.has(attr)) {
      errors.push(`[${title}] unknown attribute "${attr}"`)
      return []
    }
    const labels = (Array.isArray(raw) ? raw : [raw]).map((label) => label.trim()).filter(Boolean)
    checkMultiplicity(attr, labels, title)
    return labels.flatMap((label) => labelRef(attr, label, title))
  }

  const productAttrs = products.map((product, index) => ({
    index,
    refs: Object.entries(product.attrs ?? {}).flatMap(([attr, raw]) => attributeRefs(attr, raw, product.title)),
  }))

  const valueId = new Map<string, string>() // "attr/valueSlug" -> _id
  const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'})
  function addValues() {
  for (const [attr, bucket] of valueLabels) {
    const sorted = [...bucket.entries()].sort((a, b) => collator.compare(a[1], b[1]))
    for (const [order, [valueSlug, label]] of sorted.entries()) {
      const id = idBySlug('attributeValue', valueSlug, attributeId.get(attr)) ?? `attributeValue-${attr}-${valueSlug}`
      valueId.set(`${attr}/${valueSlug}`, id)
      docs.push({
        _id: id,
        _type: 'attributeValue',
        attribute: ref(attributeId.get(attr)!),
        label,
        slug: {_type: 'slug', current: valueSlug},
        sortOrder: order + 1,
      })
    }
  }

  }
  addValues()

  // products
  const seenSlugs = new Map<string, string>()
  const seenSkus = new Map<string, string>()
  const usedCategories = new Set<string>()
  function checkPublicText(p: (typeof products)[number]) {
    const label = `[${p.title}]`
    for (const [field, text] of [['title', p.title], ['description', p.description], ['sku', p.sku ?? '']] as const) {
      const hit = LEAK.exec(text)
      if (hit) errors.push(`${label} ${field} looks like internal cost/supplier info: "${hit[0]}"`)
    }
  }

  function shortDescription(description: string) {
    return !description || description.trim().length < 15
  }

  function validateProductText(p: (typeof products)[number], i: number) {
    const label = `[${p.title}]`
    if (!p.title.trim()) errors.push(`product #${i} has no title`)
    if (shortDescription(p.description)) errors.push(`${label} description too short`)
    if (!leaves.has(p.category)) errors.push(`${label} category "${p.category}" is not a leaf category`)
    checkPublicText(p)
  }

  function checkSku(p: (typeof products)[number]) {
    const label = `[${p.title}]`
    if (p.sku) {
      if (seenSkus.has(p.sku)) warnings.push(`${label} sku "${p.sku}" also used by [${seenSkus.get(p.sku)}]`)
      seenSkus.set(p.sku, p.title)
    }
  }

  function validateProduct(p: (typeof products)[number], i: number) {
    const label = `[${p.title}]`
    validateProductText(p, i)
    usedCategories.add(p.category)
    const slug = slugify(p.title, 96)
    if (!slug) errors.push(`${label} produces an empty slug`)
    if (seenSlugs.has(slug)) errors.push(`${label} duplicate slug with [${seenSlugs.get(slug)}]`)
    seenSlugs.set(slug, p.title)
    checkSku(p)
    return slug
  }

  function productId(slug: string) {
    return idBySlug('product', slug) ?? `product-${slug}`
  }

  function addProduct(p: (typeof products)[number], i: number, slug: string) {
    docs.push({
      _id: productId(slug),
      _type: 'product',
      title: p.title.trim(),
      slug: {_type: 'slug', current: slug},
      vertical: 'automotive',
      ...(p.sku ? {sku: p.sku} : {}),
      inStock: p.inStock ?? true,
      category: ref(categoryId.get(p.category) ?? `category-${p.category}`),
      attributeValues: productAttrs[i].refs.map(([attr, valueSlug]) => ({
        ...ref(valueId.get(`${attr}/${valueSlug}`)!),
        _key: key(),
      })),
      description: paragraph(p.description.trim()),
    })
  }

  function addProducts() {
  for (const [i, p] of products.entries()) {
    const slug = validateProduct(p, i)
    addProduct(p, i, slug)
  }
  }
  addProducts()
  for (const slug of leaves) if (!usedCategories.has(slug)) warnings.push(`category "${slug}" has no products`)

  const count = (type: string) => {
    const all = docs.filter((d) => d._type === type)
    const created = all.filter((d) => !existingIds.has(d._id)).length
    return `${all.length} (${created} new, ${all.length - created} update)`
  }
  console.log(
    `categories ${count('category')}\nattributes ${count('attribute')}\nattribute values ${count('attributeValue')}\nproducts ${count('product')}`,
  )
  assertValid()
  if (!write) {
    console.log('Dry run only. Re-run with --write to apply.')
    return
  }

  async function upload() {
  const order = ['category', 'attribute', 'attributeValue', 'product']
  for (const type of order) {
    const batch = docs.filter((d) => d._type === type)
    for (let i = 0; i < batch.length; i += 100) {
      const tx = client.transaction()
      for (const doc of batch.slice(i, i + 100)) tx.createOrReplace(doc as never)
      await tx.commit()
      console.log(`wrote ${type} ${Math.min(i + 100, batch.length)}/${batch.length}`)
    }
  }
  }
  await upload()
  console.log('Upload complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
