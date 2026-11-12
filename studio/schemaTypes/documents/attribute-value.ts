import {defineField, defineType, type SlugValidationContext} from 'sanity'
import {apiVersion} from '../../env'

function publishedId(document: SlugValidationContext['document']) {
  return document?._id.replace(/^drafts\./, '')
}

function referenceId(value: unknown) {
  return (value as {_ref?: string} | undefined)?._ref
}

// Slugs only need to be unique within their attribute ("4-l" can exist for several).
async function isUniqueWithinAttribute(slug: string, context: SlugValidationContext) {
  const {document, getClient} = context
  const id = publishedId(document)
  const attributeRef = referenceId(document?.attribute)
  if (!id || !attributeRef) return true
  const count = await getClient({apiVersion}).fetch<number>(
    'count(*[_type == "attributeValue" && attribute._ref == $attributeRef && slug.current == $slug && !(_id in [$id, "drafts." + $id])])',
    {attributeRef, slug, id},
  )
  return count === 0
}

export const attributeValue = defineType({
  name: 'attributeValue',
  title: 'Attribute Value',
  type: 'document',
  fields: [
    defineField({
      name: 'attribute',
      title: 'Attribute',
      type: 'reference',
      to: [{type: 'attribute'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'e.g. 5W-30, 4 L, API SP',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'label', maxLength: 48, isUnique: isUniqueWithinAttribute},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers are listed first.',
    }),
  ],
  preview: {
    select: {title: 'label', attribute: 'attribute.title'},
    prepare({title, attribute}) {
      return {title, subtitle: attribute}
    },
  },
})
