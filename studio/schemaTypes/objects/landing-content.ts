import {defineArrayMember, defineField, defineType} from 'sanity'

export const seo = defineType({
  name: 'seo', title: 'Search appearance', type: 'object',
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.max(100)}),
    defineField({name: 'description', type: 'text', rows: 3, validation: (rule) => rule.max(300)}),
  ],
})

export const landingContent = defineType({
  name: 'landingContent', title: 'Landing page content', type: 'object',
  fields: [
    defineField({name: 'heading', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'seo', type: 'seo', validation: (rule) => rule.required()}),
    defineField({name: 'introduction', type: 'text', rows: 5, validation: (rule) => rule.required()}),
    defineField({name: 'keywords', title: 'Editorial search terms', type: 'array', of: [defineArrayMember({type: 'string'})], description: 'Use naturally in copy; these are not emitted as meta keywords.'}),
    defineField({name: 'sections', type: 'array', validation: (rule) => rule.required().min(3), of: [defineArrayMember({
      name: 'editorialSection', type: 'object', fields: [
        defineField({name: 'heading', type: 'string', validation: (rule) => rule.required()}),
        defineField({name: 'body', type: 'array', of: [defineArrayMember({type: 'block', styles: [{title: 'Normal', value: 'normal'}], lists: [{title: 'Bullet', value: 'bullet'}], marks: {decorators: [{title: 'Strong', value: 'strong'}], annotations: []}})], validation: (rule) => rule.required().min(1)}),
      ],
    })]}),
    defineField({name: 'comparison', type: 'array', of: [defineArrayMember({name: 'comparisonRow', type: 'object', fields: [
      defineField({name: 'option', type: 'string', validation: (rule) => rule.required()}),
      defineField({name: 'usage', type: 'text', validation: (rule) => rule.required()}),
      defineField({name: 'selection', type: 'text', validation: (rule) => rule.required()}),
    ]})]}),
    defineField({name: 'faqs', title: 'Frequently asked questions', type: 'array', validation: (rule) => rule.required().min(4), of: [defineArrayMember({name: 'faq', type: 'object', fields: [
      defineField({name: 'question', type: 'string', validation: (rule) => rule.required()}),
      defineField({name: 'answer', type: 'text', rows: 4, validation: (rule) => rule.required()}),
    ]})]}),
    defineField({name: 'sources', title: 'Technical references', type: 'array', of: [defineArrayMember({name: 'source', type: 'object', fields: [
      defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
      defineField({name: 'url', type: 'url', validation: (rule) => rule.required().uri({scheme: ['https']})}),
    ]})]}),
  ],
})
