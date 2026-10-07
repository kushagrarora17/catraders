/**
 * Seeds sample automotive categories, attributes, products and reviews.
 * Idempotent: documents are matched by slug (reviews by name) and only created when missing.
 *
 *   bunx sanity login          # once
 *   bun run seed
 */
import {randomUUID} from 'node:crypto'
import {getCliClient} from 'sanity/cli'
import {apiVersion} from '../env'

const client = getCliClient({apiVersion})

const key = () => randomUUID().replaceAll('-', '').slice(0, 12)
const ref = (id: string) => ({_type: 'reference', _ref: id})
const slug = (current: string) => ({_type: 'slug', current})
const paragraph = (text: string) => [
  {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  },
]

async function ensure(
  type: string,
  slugValue: string,
  doc: Record<string, unknown>,
  scope: {filter: string; params: Record<string, unknown>} = {filter: '', params: {}},
): Promise<string> {
  const existing = await client.fetch<string | null>(
    `*[_type == $type && slug.current == $slug ${scope.filter}][0]._id`,
    {type, slug: slugValue, ...scope.params},
  )
  if (existing) return existing
  const created = await client.create({_type: type, slug: slug(slugValue), ...doc})
  console.log(`created ${type} ${slugValue}`)
  return created._id
}

type CategoryNode = {title: string; slug: string; children?: CategoryNode[]}

const CATEGORY_TREE: CategoryNode[] = [
  {
    title: 'Engine Oils',
    slug: 'engine-oils',
    children: [
      {
        title: 'Passenger Car Motor Oil',
        slug: 'passenger-car-motor-oil',
        children: [
          {title: 'Fully Synthetic', slug: 'pcmo-fully-synthetic'},
          {title: 'Semi Synthetic', slug: 'pcmo-semi-synthetic'},
        ],
      },
      {
        title: 'Heavy Duty Diesel Oil',
        slug: 'heavy-duty-diesel-oil',
        children: [{title: 'Mineral', slug: 'hddo-mineral'}],
      },
    ],
  },
  {
    title: 'Coolants',
    slug: 'coolants',
    children: [
      {
        title: 'Ready-to-Use Coolant',
        slug: 'ready-to-use-coolant',
        children: [{title: 'OAT Long-Life', slug: 'rtu-oat-long-life'}],
      },
      {
        title: 'Coolant Concentrate',
        slug: 'coolant-concentrate',
        children: [{title: 'HOAT', slug: 'concentrate-hoat'}],
      },
    ],
  },
]

const ATTRIBUTES: {
  title: string
  slug: string
  allowMultiple?: boolean
  values: [label: string, slug: string][]
}[] = [
  {
    title: 'Viscosity Grade',
    slug: 'viscosity',
    values: [
      ['0W-20', '0w-20'],
      ['5W-30', '5w-30'],
      ['5W-40', '5w-40'],
      ['15W-40', '15w-40'],
    ],
  },
  {
    title: 'Pack Size',
    slug: 'pack-size',
    values: [
      ['1 L', '1-l'],
      ['4 L', '4-l'],
      ['5 L', '5-l'],
      ['20 L', '20-l'],
    ],
  },
  {
    title: 'Specification',
    slug: 'specification',
    allowMultiple: true,
    values: [
      ['API SP', 'api-sp'],
      ['ACEA C3', 'acea-c3'],
      ['API CK-4', 'api-ck-4'],
      ['ACEA E9', 'acea-e9'],
    ],
  },
  {
    title: 'Coolant Technology',
    slug: 'coolant-technology',
    values: [
      ['OAT', 'oat'],
      ['HOAT', 'hoat'],
    ],
  },
]

// [title, slug, sku, category slug, inStock, attribute value keys "attr/value", description]
const PRODUCTS: [string, string, string, string, boolean, string[], string][] = [
  ['Synthetic 5W-30 Engine Oil 4 L', 'synthetic-5w-30-engine-oil-4l', 'EO-5W30-4L', 'pcmo-fully-synthetic', true,
    ['viscosity/5w-30', 'pack-size/4-l', 'specification/api-sp', 'specification/acea-c3'],
    'Fully synthetic low-SAPS engine oil for modern petrol and diesel passenger cars.'],
  ['Synthetic 5W-30 Engine Oil 1 L', 'synthetic-5w-30-engine-oil-1l', 'EO-5W30-1L', 'pcmo-fully-synthetic', true,
    ['viscosity/5w-30', 'pack-size/1-l', 'specification/api-sp', 'specification/acea-c3'],
    'Top-up size of our fully synthetic 5W-30.'],
  ['Synthetic 0W-20 Engine Oil 4 L', 'synthetic-0w-20-engine-oil-4l', 'EO-0W20-4L', 'pcmo-fully-synthetic', false,
    ['viscosity/0w-20', 'pack-size/4-l', 'specification/api-sp'],
    'Fuel-economy 0W-20 for hybrid and late-model petrol engines.'],
  ['Semi-Synthetic 5W-40 Engine Oil 5 L', 'semi-synthetic-5w-40-engine-oil-5l', 'EO-5W40-5L', 'pcmo-semi-synthetic', true,
    ['viscosity/5w-40', 'pack-size/5-l', 'specification/acea-c3'],
    'Semi-synthetic 5W-40 for high-mileage passenger cars.'],
  ['Heavy Duty 15W-40 Diesel Oil 20 L', 'heavy-duty-15w-40-diesel-oil-20l', 'HD-15W40-20L', 'hddo-mineral', true,
    ['viscosity/15w-40', 'pack-size/20-l', 'specification/api-ck-4', 'specification/acea-e9'],
    'Mineral heavy-duty diesel engine oil for trucks and fleets.'],
  ['Long-Life OAT Coolant Ready-to-Use 5 L', 'long-life-oat-coolant-rtu-5l', 'CL-OAT-RTU-5L', 'rtu-oat-long-life', true,
    ['coolant-technology/oat', 'pack-size/5-l'],
    'Pre-diluted 50/50 OAT long-life coolant.'],
  ['Long-Life OAT Coolant Ready-to-Use 1 L', 'long-life-oat-coolant-rtu-1l', 'CL-OAT-RTU-1L', 'rtu-oat-long-life', true,
    ['coolant-technology/oat', 'pack-size/1-l'],
    'Top-up size of our pre-diluted OAT coolant.'],
  ['HOAT Coolant Concentrate 4 L', 'hoat-coolant-concentrate-4l', 'CL-HOAT-CON-4L', 'concentrate-hoat', true,
    ['coolant-technology/hoat', 'pack-size/4-l'],
    'Hybrid OAT concentrate; dilute before use.'],
]

async function seedCategories(nodes: CategoryNode[], level: number, parentId?: string) {
  const ids = new Map<string, string>()
  for (const [index, node] of nodes.entries()) {
    const id = await ensure('category', node.slug, {
      title: node.title,
      vertical: 'automotive',
      level,
      sortOrder: index + 1,
      ...(parentId ? {parent: ref(parentId)} : {}),
    })
    ids.set(node.slug, id)
    if (node.children) {
      for (const [childSlug, childId] of await seedCategories(node.children, level + 1, id)) {
        ids.set(childSlug, childId)
      }
    }
  }
  return ids
}

async function seedAttributes() {
  const valueIds = new Map<string, string>()
  for (const [index, attr] of ATTRIBUTES.entries()) {
    const attributeId = await ensure('attribute', attr.slug, {
      title: attr.title,
      vertical: 'automotive',
      filterable: true,
      allowMultiple: attr.allowMultiple ?? false,
      sortOrder: index + 1,
    })
    for (const [valueIndex, [label, valueSlug]] of attr.values.entries()) {
      const valueId = await ensure(
        'attributeValue',
        valueSlug,
        {attribute: ref(attributeId), label, sortOrder: valueIndex + 1},
        {filter: '&& attribute._ref == $attributeId', params: {attributeId}},
      )
      valueIds.set(`${attr.slug}/${valueSlug}`, valueId)
    }
  }
  return valueIds
}

const TESTIMONIALS = [
  {
    quote:
      'CA Traders has been our go-to supplier for engine oils and filters for over two years. The pricing is unbeatable and the product range is exactly what a busy shop needs.',
    name: 'Ranjit K.',
    role: 'Owner — Brampton Auto Service',
    city: 'Brampton',
  },
  {
    quote:
      'I love that they carry Liqui Moly. My customers specifically ask for it, and CA Traders gives us the best wholesale price in the GTA. Always responsive and reliable.',
    name: 'Sam M.',
    role: 'Head Technician — Mississauga Lube Centre',
    city: 'Mississauga',
  },
  {
    quote:
      'From ATF to refrigerants and shop rags — we get almost everything from CA Traders. The team is great to deal with, answers calls fast, and always has stock ready.',
    name: 'Pavan D.',
    role: 'Manager — Scarborough Automotive',
    city: 'Scarborough',
  },
]

async function seedTestimonials() {
  for (const [index, testimonial] of TESTIMONIALS.entries()) {
    const existing = await client.fetch<string | null>(
      '*[_type == "testimonial" && name == $name][0]._id',
      {name: testimonial.name},
    )
    if (existing) continue
    await client.create({
      _type: 'testimonial',
      ...testimonial,
      rating: 5,
      vertical: 'automotive',
      sortOrder: index + 1,
    })
    console.log(`created testimonial ${testimonial.name}`)
  }
}

async function main() {
  const categoryIds = await seedCategories(CATEGORY_TREE, 1)
  const valueIds = await seedAttributes()

  for (const [title, productSlug, sku, categorySlug, inStock, values, description] of PRODUCTS) {
    await ensure('product', productSlug, {
      title,
      vertical: 'automotive',
      sku,
      inStock,
      category: ref(categoryIds.get(categorySlug)!),
      attributeValues: values.map((v) => ({...ref(valueIds.get(v)!), _key: key()})),
      description: paragraph(description),
    })
  }
  await seedTestimonials()
  console.log('Seed complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
