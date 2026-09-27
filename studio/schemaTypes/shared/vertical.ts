import {defineField} from 'sanity'

export const VERTICALS = [
  {title: 'Automotive', value: 'automotive'},
  {title: 'Baby Products', value: 'baby'},
  {title: 'Home Needs', value: 'home'},
]

export const verticalField = defineField({
  name: 'vertical',
  title: 'Vertical Taxonomy',
  type: 'string',
  options: {list: VERTICALS},
  initialValue: 'automotive',
  validation: (rule) => rule.required(),
})
