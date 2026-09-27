import {defineField, defineType} from 'sanity'
import {apiVersion} from '../../env'
import {verticalField} from '../shared/vertical'

export const category = defineType({
  name: 'category',
  title: 'Category',
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
            parentLevel: ((document?.level as number | undefined) ?? 1) - 1,
          },
        }),
      },
      validation: (rule) =>
        rule.custom(async (value, context) => {
          const level = context.document?.level as number | undefined
          if (level === 1) return value ? 'L1 categories cannot have a parent' : true
          if (!value?._ref) return 'L2 and L3 categories need a parent'
          const parentLevel = await context
            .getClient({apiVersion})
            .fetch<number | null>('*[_id in [$id, "drafts." + $id]][0].level', {id: value._ref})
          if (level && parentLevel !== level - 1) {
            return `An L${level} category needs an L${level - 1} parent`
          }
          return true
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
