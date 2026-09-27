import type {StructureResolver} from 'sanity/structure'

const LEVELS = [1, 2, 3] as const

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Catalog')
    .items([
      S.documentTypeListItem('product').title('Products'),
      S.listItem()
        .id('out-of-stock')
        .title('Out-of-stock products')
        .child(
          S.documentList()
            .title('Out-of-stock products')
            .schemaType('product')
            .filter('_type == "product" && inStock == false'),
        ),
      S.divider(),
      S.listItem()
        .id('categories')
        .title('Categories')
        .child(
          S.list()
            .title('Categories')
            .items([
              ...LEVELS.map((level) =>
                S.listItem()
                  .id(`categories-l${level}`)
                  .title(`L${level} categories`)
                  .child(
                    S.documentList()
                      .title(`L${level} categories`)
                      .schemaType('category')
                      .filter('_type == "category" && level == $level')
                      .params({level})
                      .defaultOrdering([{field: 'sortOrder', direction: 'asc'}])
                      .initialValueTemplates([
                        S.initialValueTemplateItem('category-by-level', {level}),
                      ]),
                  ),
              ),
              S.divider(),
              S.documentTypeListItem('category').title('All categories'),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem('attribute').title('Attributes'),
      S.listItem()
        .id('values-by-attribute')
        .title('Values by attribute')
        .child(
          S.documentTypeList('attribute')
            .title('Pick an attribute')
            .child((attributeId) =>
              S.documentList()
                .title('Values')
                .schemaType('attributeValue')
                .filter('_type == "attributeValue" && attribute._ref == $attributeId')
                .params({attributeId})
                .defaultOrdering([{field: 'sortOrder', direction: 'asc'}])
                .initialValueTemplates([
                  S.initialValueTemplateItem('attributeValue-by-attribute', {attributeId}),
                ]),
            ),
        ),
      S.documentTypeListItem('attributeValue').title('All attribute values'),
    ])
