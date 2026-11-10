// fallow-ignore-file unused-file
// Imported as the schema entry point by studio/operators/sanity.config.ts.
import {defineField, defineType} from 'sanity'

export const mcpOperator = defineType({
  name: 'mcpOperator',
  title: 'MCP operator allowlist entry',
  type: 'document',
  fields: [
    defineField({name: 'email', title: 'Owner-verified operator email', type: 'string', readOnly: true, validation: (Rule) => Rule.required().email()}),
    defineField({name: 'enabled', title: 'Access enabled', type: 'boolean', initialValue: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'microsoftIssuer', title: 'Microsoft issuer (enrollment)', type: 'string'}),
    defineField({name: 'microsoftSubject', title: 'Microsoft subject (enrollment)', type: 'string'}),
    defineField({name: 'googleIssuer', title: 'Google issuer (non-Gmail enrollment)', type: 'string'}),
    defineField({name: 'googleSubject', title: 'Google subject (non-Gmail enrollment)', type: 'string'}),
  ],
  preview: {select: {title: 'email', enabled: 'enabled'}, prepare: ({title, enabled}) => ({title, subtitle: enabled ? 'Enabled' : 'Revoked'})},
})
