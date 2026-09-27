import {defineCliConfig} from 'sanity/cli'
import {dataset, projectId} from './env'

export default defineCliConfig({
  api: {projectId, dataset},
  deployment: {
    autoUpdates: true,
  },
  typegen: {
    // Queries live in the Next.js app at the repo root.
    path: '../src/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../src/sanity/types.ts',
    overloadClientMethods: true,
  },
})
