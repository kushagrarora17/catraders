import {defineField, defineType, type SanityDocument} from 'sanity'
import {verticalField} from '../shared/vertical'
import {apiVersion} from '../../env'

function referenceId(value: unknown) {
  return (value as {_ref?: string} | undefined)?._ref
}

const selectedArea = (document: SanityDocument | undefined) => referenceId(document?.serviceArea)

const confirmedCity = (cities: string[] | null, city: string) => cities?.includes(city)

export const serviceAreaLandingPage = defineType({
  name: 'serviceAreaLandingPage', title: 'City landing page', type: 'document',
  fields: [
    verticalField,
    defineField({name: 'serviceArea', type: 'reference', to: [{type: 'serviceArea'}], options: {filter: 'vertical == "automotive"'}, validation: (rule) => rule.required()}),
    defineField({name: 'city', type: 'string', validation: (rule) => rule.required().custom(async (city, context) => {
      if (!city) return true
      const areaId = selectedArea(context.document)
      if (!areaId) return 'Select the service area first'
      const cities = await context.getClient({apiVersion}).fetch<string[] | null>('*[_type == "serviceArea" && vertical == "automotive" && _id == $id][0].cities', {id: areaId})
      return confirmedCity(cities, city) ? true : 'City must be in the selected service area’s confirmed city list'
    })}),
    defineField({name: 'slug', type: 'slug', options: {source: 'city', maxLength: 96}, validation: (rule) => rule.required()}),
    defineField({name: 'content', type: 'landingContent', validation: (rule) => rule.required()}),
  ],
  preview: {select: {title: 'city', subtitle: 'content.heading'}},
})
