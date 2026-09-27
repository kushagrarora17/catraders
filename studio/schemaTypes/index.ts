import type {Template} from 'sanity'
import {attribute} from './documents/attribute'
import {attributeValue} from './documents/attribute-value'
import {category} from './documents/category'
import {product} from './documents/product'

export const schemaTypes = [product, category, attribute, attributeValue]

// Used by the desk structure to pre-fill fields when creating from a filtered list.
export const schemaTemplates: Template[] = [
  {
    id: 'category-by-level',
    title: 'Category at level',
    schemaType: 'category',
    parameters: [{name: 'level', type: 'number'}],
    value: ({level}: {level: number}) => ({level}),
  },
  {
    id: 'attributeValue-by-attribute',
    title: 'Value for attribute',
    schemaType: 'attributeValue',
    parameters: [{name: 'attributeId', type: 'string'}],
    value: ({attributeId}: {attributeId: string}) => ({
      attribute: {_type: 'reference', _ref: attributeId},
    }),
  },
]
