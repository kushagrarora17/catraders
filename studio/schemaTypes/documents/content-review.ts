import {defineArrayMember, defineField, defineType} from 'sanity'

export const contentReview = defineType({
  name: 'contentReview', title: 'AI content review', type: 'document', readOnly: true,
  fields: [
    defineField({name: 'vertical', type: 'string'}),
    defineField({name: 'product', type: 'reference', to: [{type: 'product'}], weak: true}),
    ...['status', 'inputHash', 'model', 'promptVersion', 'leaseUntil', 'error'].map(name => defineField({name, type: 'string'})),
    defineField({name: 'reviewedAt', type: 'datetime'}),
    defineField({name: 'sourceUpdatedAt', type: 'datetime'}),
    defineField({name: 'coverage', type: 'text'}),
    defineField({name: 'inputTokens', type: 'number'}),
    defineField({name: 'outputTokens', type: 'number'}),
    defineField({name: 'findings', type: 'array', of: [defineArrayMember({
      name: 'reviewFinding', type: 'object', fields: [
        ...['kind', 'path', 'documentId', 'original', 'suggestion'].map(name => defineField({name, type: 'string'})),
        defineField({name: 'explanation', type: 'text'}),
        defineField({name: 'evidence', type: 'array', of: [defineArrayMember({
          name: 'reviewEvidence', type: 'object', fields: [
            defineField({name: 'url', type: 'url'}), defineField({name: 'quote', type: 'text'}),
          ],
        })]}),
      ], preview: {select: {title: 'explanation', subtitle: 'kind'}},
    })]}),
  ],
  preview: {select: {title: 'product.title', subtitle: 'status'}},
})
