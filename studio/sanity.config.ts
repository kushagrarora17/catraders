import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {apiVersion, dataset, projectId} from './env'
import {schemaTemplates, schemaTypes} from './schemaTypes'
import {ContentReview} from './components/content-review'
import {structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'CA Traders',
  projectId,
  dataset,
  plugins: [structureTool({structure, defaultDocumentNode: (S, {schemaType}) =>
    S.document().views(schemaType === 'product'
      ? [S.view.form(), S.view.component(ContentReview).id('ai-review').title('AI review')]
      : [S.view.form()]),
  }), visionTool({defaultApiVersion: apiVersion})],
  document: {
    actions: (previous, context) => context.schemaType === 'contentReview' ? [] : previous,
    newDocumentOptions: (previous) => previous.filter(option => option.templateId !== 'contentReview'),
  },
  schema: {
    types: schemaTypes,
    templates: (prev) => [...prev, ...schemaTemplates],
  },
})
