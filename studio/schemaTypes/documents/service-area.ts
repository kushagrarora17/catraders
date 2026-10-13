import {defineField, defineType} from 'sanity'
import {verticalField} from '../shared/vertical'

export const serviceArea = defineType({
  name: 'serviceArea',
  title: 'Service area',
  type: 'document',
  fields: [
    defineField({
      name: 'region',
      title: 'Region',
      type: 'string',
      description: 'Shown in the heading: "Serving <region>".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'cities',
      title: 'Cities',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Shown in this order, each followed by ", ON".',
      validation: (rule) => rule.required().min(1).unique(),
    }),
    verticalField,
  ],
  preview: {
    select: {title: 'region'},
    prepare: ({title}) => ({title: title ?? 'Service area'}),
  },
})
