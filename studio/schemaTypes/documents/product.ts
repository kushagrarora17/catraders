import {defineArrayMember, defineField, defineType} from 'sanity'
import {apiVersion} from '../../env'
import {verticalField} from '../shared/vertical'

type AttributeRow = {_id: string; attributeId: string; attributeTitle: string; allowMultiple: boolean}

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    verticalField,
    defineField({
      name: 'sku',
      title: 'Part / SKU Number',
      type: 'string',
    }),
    defineField({
      name: 'inStock',
      title: 'In stock',
      type: 'boolean',
      description: 'Out-of-stock products stay visible but cannot be added to a quote.',
      initialValue: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      description: 'Pick the most specific (usually L3) category.',
      options: {
        filter: ({document}) => ({
          filter: 'vertical == $vertical',
          params: {vertical: document?.vertical ?? 'automotive'},
        }),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'attributeValues',
      title: 'Attributes',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'attributeValue'}],
          options: {
            filter: ({document}) => ({
              filter: 'attribute->vertical == $vertical',
              params: {vertical: document?.vertical ?? 'automotive'},
            }),
          },
        }),
      ],
      validation: (rule) =>
        rule.unique().custom(async (value, context) => {
          const ids = (value as {_ref?: string}[] | undefined)?.flatMap((v) => (v._ref ? [v._ref] : []))
          if (!ids?.length) return true
          const rows = await context.getClient({apiVersion}).fetch<AttributeRow[]>(
            `*[_type == "attributeValue" && _id in $ids]{
              _id,
              "attributeId": attribute._ref,
              "attributeTitle": attribute->title,
              "allowMultiple": coalesce(attribute->allowMultiple, false)
            }`,
            {ids},
          )
          const counts = new Map<string, {title: string; n: number}>()
          for (const row of rows) {
            if (row.allowMultiple) continue
            const entry = counts.get(row.attributeId) ?? {title: row.attributeTitle, n: 0}
            entry.n += 1
            counts.set(row.attributeId, entry)
          }
          const clashes = [...counts.values()].filter((c) => c.n > 1).map((c) => c.title)
          return clashes.length
            ? `Only one value allowed for: ${clashes.join(', ')}`
            : true
        }),
    }),
    defineField({
      name: 'images',
      title: 'Product Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Alternative text', type: 'string'})],
        }),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
  ],
  preview: {
    select: {title: 'title', sku: 'sku', inStock: 'inStock', media: 'images.0'},
    prepare({title, sku, inStock, media}) {
      return {
        title,
        subtitle: [sku, inStock === false && 'Out of stock'].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
