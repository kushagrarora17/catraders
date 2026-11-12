import {defineField, defineType, type SanityDocument} from 'sanity'
import {apiVersion} from '../../env'
import {titleField, slugField} from '../shared/fields'
import {verticalField} from '../shared/vertical'

const categoryLevel = (document: SanityDocument | undefined) => document?.level as number | undefined

const parentLevel = (document: SanityDocument | undefined) =>
  ((document?.level as number | undefined) ?? 1) - 1

function checkParentLevel(level: number | undefined, actual: number | null) {
  if (level && actual !== level - 1) return `An L${level} category needs an L${level - 1} parent`
  return true
}

const topLevelParent = (value: unknown) => value ? 'L1 categories cannot have a parent' : true

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    titleField,
    slugField,
    verticalField,
    defineField({name: 'landing', title: 'Category landing page', type: 'landingContent', hidden: ({document}) => document?.level !== 1}),
    defineField({
      name: 'level',
      title: 'Level',
      type: 'number',
      description: 'L1 is a top-level category, L2 sits under an L1, L3 sits under an L2.',
      options: {
        list: [
          {title: 'L1', value: 1},
          {title: 'L2', value: 2},
          {title: 'L3', value: 3},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 1,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'parent',
      title: 'Parent category',
      type: 'reference',
      to: [{type: 'category'}],
      hidden: ({document}) => !document?.level || document.level === 1,
      options: {
        filter: ({document}) => ({
          filter: 'vertical == $vertical && level == $parentLevel',
          params: {
            vertical: document?.vertical ?? 'automotive',
            parentLevel: parentLevel(document),
          },
        }),
      },
      validation: (rule) =>
        rule.custom(async (value, context) => {
          const level = categoryLevel(context.document)
          if (level === 1) return topLevelParent(value)
          if (!value?._ref) return 'L2 and L3 categories need a parent'
          const parentLevel = await context
            .getClient({apiVersion})
            .fetch<number | null>('*[_id in [$id, "drafts." + $id]][0].level', {id: value._ref})
          return checkParentLevel(level, parentLevel)
        }),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers are listed first.',
    }),
  ],
  orderings: [
    {
      title: 'Level, then sort order',
      name: 'levelSort',
      by: [
        {field: 'level', direction: 'asc'},
        {field: 'sortOrder', direction: 'asc'},
        {field: 'title', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      level: 'level',
      parent: 'parent.title',
      grandparent: 'parent.parent.title',
    },
    prepare({title, level, parent, grandparent}) {
      const path = [grandparent, parent].filter(Boolean).join(' › ')
      return {title, subtitle: [level && `L${level}`, path].filter(Boolean).join(' · ')}
    },
  },
})
