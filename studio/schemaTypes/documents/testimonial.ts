import {defineField, defineType} from 'sanity'
import {verticalField} from '../shared/vertical'

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Review',
  type: 'document',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().max(500),
    }),
    defineField({
      name: 'name',
      title: 'Reviewer name',
      type: 'string',
      description: 'First name and last initial, e.g. "Ranjit K."',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role and business',
      type: 'string',
      description: 'e.g. "Owner — Windsor Auto Service"',
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      options: {list: [5, 4, 3, 2, 1], layout: 'radio', direction: 'horizontal'},
      initialValue: 5,
      validation: (rule) => rule.required().integer().min(1).max(5),
    }),
    verticalField,
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers are listed first.',
    }),
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'sortOrder',
      by: [{field: 'sortOrder', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'name', role: 'role', city: 'city'},
    prepare({title, role, city}) {
      return {title, subtitle: [role, city].filter(Boolean).join(' · ')}
    },
  },
})
