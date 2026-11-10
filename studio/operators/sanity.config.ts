import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {mcpOperator} from '../schemaTypes/documents/mcp-operator'

// Deploy as a separate, access-controlled Studio whose only dataset is private.
export default defineConfig({
  name: 'mcp-operators',
  title: 'CA Traders MCP Operators',
  projectId: process.env.SANITY_STUDIO_OPERATOR_PROJECT_ID || '',
  dataset: process.env.SANITY_STUDIO_OPERATOR_DATASET || 'mcp-operators',
  plugins: [structureTool()],
  schema: {types: [mcpOperator], templates: []},
  document: {
    actions: (previous) => previous.filter((action) => action.action !== 'duplicate'),
    newDocumentOptions: () => [],
  },
})
