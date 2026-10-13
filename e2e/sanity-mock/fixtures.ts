// Seed content for the mock Sanity API. Shaped like the Studio schema; ids are stable so specs
// can refer to them. A few documents belong to another vertical or are drafts (hidden), which the
// storefront must never show.
export type Doc = { _id: string; _type: string; [field: string]: unknown };

const ref = (id: string, key?: string) => ({ _type: "reference", _ref: id, ...(key ? { _key: key } : {}) });
const slug = (current: string) => ({ _type: "slug", current });
const block = (text: string, key: string) => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${key}s`, text, marks: [] }],
});

const category = (id: string, title: string, level: number, parent?: string, sortOrder?: number): Doc => ({
  _id: id,
  _type: "category",
  vertical: "automotive",
  title,
  slug: slug(id.replace(/^cat-/, "")),
  level,
  ...(parent ? { parent: ref(parent) } : {}),
  ...(sortOrder !== undefined ? { sortOrder } : {}),
});

const attribute = (id: string, title: string, filterable: boolean, sortOrder: number, allowMultiple = false): Doc => ({
  _id: id,
  _type: "attribute",
  vertical: "automotive",
  title,
  slug: slug(id.replace(/^attr-/, "")),
  filterable,
  allowMultiple,
  sortOrder,
});

const value = (id: string, attributeId: string, label: string, valueSlug: string, sortOrder?: number): Doc => ({
  _id: id,
  _type: "attributeValue",
  attribute: ref(attributeId),
  label,
  slug: slug(valueSlug),
  ...(sortOrder !== undefined ? { sortOrder } : {}),
});

const product = (
  id: string,
  fields: { title: string; sku?: string; categoryId: string; values: string[]; inStock?: boolean; extra?: Record<string, unknown> },
): Doc => ({
  _id: id,
  _type: "product",
  vertical: "automotive",
  title: fields.title,
  slug: slug(id.replace(/^(drafts\.)?prod-/, "")),
  ...(fields.sku ? { sku: fields.sku } : {}),
  inStock: fields.inStock ?? true,
  category: ref(fields.categoryId),
  attributeValues: fields.values.map((v, i) => ref(v, `${id}-v${i}`)),
  ...fields.extra,
});

export function seedDocuments(): Doc[] {
  return [
    // Categories: Engine Oil > Passenger Car > Synthetic, plus Coolants > Ready to Use.
    category("cat-engine-oil", "Engine Oil", 1, undefined, 1),
    category("cat-passenger-car", "Passenger Car", 2, "cat-engine-oil", 1),
    category("cat-synthetic", "Synthetic", 3, "cat-passenger-car", 1),
    category("cat-conventional", "Conventional", 3, "cat-passenger-car", 2),
    category("cat-coolants", "Coolants", 1, undefined, 2),
    category("cat-ready-to-use", "Ready to Use", 2, "cat-coolants"),

    attribute("attr-viscosity", "Viscosity Grade", true, 1),
    attribute("attr-pack-size", "Pack Size", true, 2),
    attribute("attr-specification", "Specification", true, 3, true),
    attribute("attr-colour", "Colour", false, 4),

    value("val-5w-30", "attr-viscosity", "5W-30", "5w-30", 1),
    value("val-10w-40", "attr-viscosity", "10W-40", "10w-40", 2),
    value("val-0w-20", "attr-viscosity", "0W-20", "0w-20", 3),
    value("val-1-l", "attr-pack-size", "1 L", "1-l", 1),
    value("val-4-l", "attr-pack-size", "4 L", "4-l", 2),
    value("val-api-sp", "attr-specification", "API SP", "api-sp"),
    value("val-acea-c3", "attr-specification", "ACEA C3", "acea-c3"),
    value("val-green", "attr-colour", "Green", "green"),

    product("prod-castrol-edge-5w30-4l", {
      title: "Castrol EDGE 5W-30 4L",
      sku: "CAS-EDGE-5W30-4L",
      categoryId: "cat-synthetic",
      values: ["val-5w-30", "val-4-l", "val-api-sp", "val-acea-c3"],
      extra: {
        images: [
          {
            _type: "image",
            _key: "img1",
            alt: "Castrol EDGE bottle",
            asset: ref("image-0123456789abcdef0123456789abcdef01234567-800x600-png"),
          },
          { _type: "image", _key: "img2" },
        ],
        description: [block("Full synthetic engine oil for modern petrol engines.", "d1"), block("Sold by the case.", "d2")],
      },
    }),
    product("prod-mobil-1-0w20-1l", {
      title: "Mobil 1 0W-20 1L",
      sku: "MOB-1-0W20-1L",
      categoryId: "cat-synthetic",
      values: ["val-0w-20", "val-1-l", "val-api-sp"],
    }),
    product("prod-valvoline-10w40-4l", {
      title: "Valvoline 10W-40 4L",
      sku: "VAL-10W40-4L",
      categoryId: "cat-conventional",
      values: ["val-10w-40", "val-4-l"],
      inStock: false,
    }),
    product("prod-prestone-coolant-4l", {
      title: "Prestone Coolant 50/50 4L",
      categoryId: "cat-ready-to-use",
      values: ["val-4-l", "val-green"],
    }),
    // Hidden (unpublished) product: only reachable through the MCP tools.
    product("drafts.prod-liqui-moly-5w30-1l", {
      title: "Liqui Moly 5W-30 1L",
      sku: "LM-5W30-1L",
      categoryId: "cat-synthetic",
      values: ["val-5w-30", "val-1-l"],
    }),
    // Another vertical: must never appear on the automotive storefront.
    {
      _id: "baby-prod-stroller",
      _type: "product",
      vertical: "baby",
      title: "Stroller",
      slug: slug("stroller"),
      inStock: true,
      category: ref("cat-synthetic"),
    },

    {
      _id: "review-ranjit",
      _type: "testimonial",
      vertical: "automotive",
      quote: "Reliable deliveries every week.",
      name: "Ranjit K.",
      role: "Owner — Windsor Auto Service",
      city: "Windsor",
      rating: 5,
      sortOrder: 1,
    },
    {
      _id: "review-maria",
      _type: "testimonial",
      vertical: "automotive",
      quote: "Great prices on coolant.",
      name: "Maria L.",
      rating: 4,
      sortOrder: 2,
    },
    {
      _id: "serviceArea",
      _type: "serviceArea",
      vertical: "automotive",
      region: "Southwestern Ontario",
      description: "We deliver wholesale lubricants and fluids along the Windsor–Kitchener corridor.",
      cities: ["Windsor", "London", "Kitchener"],
    },
    {
      _id: "drafts.review-hidden",
      _type: "testimonial",
      vertical: "automotive",
      quote: "Hidden review.",
      name: "Hidden H.",
      rating: 3,
    },
  ];
}
