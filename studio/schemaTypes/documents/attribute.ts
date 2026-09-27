import {defineField, defineType} from 'sanity'
import {verticalField} from '../shared/vertical'

// Attribute slugs become catalog filter query-string keys (e.g. ?viscosity=5w-30),
// so they must not collide with the catalog's own parameters.
const RESERVED_SLUGS = ['q', 'category', 'available', 'page', 'sort']

export const attribute = defineType({
  name: 'attribute',
  title: 'Attribute',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'e.g. Viscosity Grade, Pack Size, Specification',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Used as the filter key in catalog URLs.',
      options: {source: 'title', maxLength: 48},
      validation: (rule) =>
        rule.required().custom((value) =>
          value?.current && RESERVED_SLUGS.includes(value.current)
            ? `"${value.current}" is reserved; choose another slug`
            : true,
        ),
    }),
    verticalField,
    defineField({
      name: 'filterable',
      title: 'Show as catalog filter',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'allowMultiple',
      title: 'Allow multiple values per product',
      type: 'boolean',
      description: 'Enable for attributes like specifications/approvals where a product meets several.',
      initialValue: false,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers are listed first.',
    }),
  ],
  preview: {
    select: {title: 'title', slug: 'slug.current', allowMultiple: 'allowMultiple'},
    prepare({title, slug, allowMultiple}) {
      return {title, subtitle: [slug, allowMultiple && 'multi-value'].filter(Boolean).join(' · ')}
    },
  },
})
