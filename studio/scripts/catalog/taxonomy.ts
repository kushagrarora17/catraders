import type {AttributeDef, CategoryNode} from './types'

// Existing slugs from scripts/seed.ts are kept so re-runs reuse those documents.
// Products must point at a leaf category (level 2 or 3).
export const CATEGORY_TREE: CategoryNode[] = [
  {
    title: 'Engine Oils',
    slug: 'engine-oils',
    children: [
      {
        title: 'Passenger Car Motor Oil',
        slug: 'passenger-car-motor-oil',
        children: [
          {title: 'Fully Synthetic', slug: 'pcmo-fully-synthetic'},
          {title: 'Semi Synthetic', slug: 'pcmo-semi-synthetic'},
        ],
      },
      {
        title: 'Heavy Duty Diesel Oil',
        slug: 'heavy-duty-diesel-oil',
        children: [{title: 'Mineral', slug: 'hddo-mineral'}],
      },
    ],
  },
  {
    title: 'Coolants',
    slug: 'coolants',
    children: [
      {
        title: 'Ready-to-Use Coolant',
        slug: 'ready-to-use-coolant',
        children: [
          {title: 'OAT Long-Life', slug: 'rtu-oat-long-life'},
          {title: 'HOAT', slug: 'rtu-hoat'},
          {title: 'Conventional', slug: 'rtu-conventional'},
        ],
      },
      {
        title: 'Coolant Concentrate',
        slug: 'coolant-concentrate',
        children: [
          {title: 'HOAT', slug: 'concentrate-hoat'},
          {title: 'OAT Long-Life', slug: 'concentrate-oat'},
          {title: 'Conventional', slug: 'concentrate-conventional'},
        ],
      },
    ],
  },
  {
    title: 'Transmission Fluids',
    slug: 'transmission-fluids',
    children: [
      {title: 'Automatic Transmission Fluid', slug: 'automatic-transmission-fluid'},
      {title: 'CVT Fluid', slug: 'cvt-fluid'},
      {title: 'Manual Transmission Fluid', slug: 'manual-transmission-fluid'},
    ],
  },
  {
    title: 'Filters',
    slug: 'filters',
    children: [
      {title: 'Oil Filters', slug: 'oil-filters'},
      {title: 'Cabin Air Filters', slug: 'cabin-air-filters'},
      {title: 'Engine Air Filters', slug: 'engine-air-filters'},
    ],
  },
  {
    title: 'A/C & Refrigerant',
    slug: 'ac-refrigerant',
    children: [
      {title: 'Refrigerant', slug: 'refrigerant'},
      {title: 'A/C Sealant & Stop Leak', slug: 'ac-sealant-stop-leak'},
      {title: 'A/C Hoses & Adapters', slug: 'ac-hoses-adapters'},
    ],
  },
  {
    title: 'Brake & Cleaning',
    slug: 'brake-cleaning',
    children: [
      {title: 'Brake Fluid', slug: 'brake-fluid'},
      {title: 'Brake Cleaner', slug: 'brake-cleaner'},
      {title: 'Penetrating Spray', slug: 'penetrating-spray'},
    ],
  },
  {
    title: 'Additives & Chemicals',
    slug: 'additives-chemicals',
    children: [
      {title: 'Fuel Injector Cleaner', slug: 'fuel-injector-cleaner'},
      {title: 'Engine Flush', slug: 'engine-flush'},
      {title: 'Oil Stabilizer & Additives', slug: 'oil-stabilizer-additives'},
      {title: 'Power Steering Fluid', slug: 'power-steering-fluid'},
      {title: 'Shop Chemicals', slug: 'shop-chemicals'},
    ],
  },
  {
    title: 'Gear Oils & Grease',
    slug: 'gear-oils-grease',
    children: [
      {title: 'Gear Oil', slug: 'gear-oil'},
      {title: 'Grease', slug: 'grease'},
    ],
  },
  {
    title: 'Undercoating',
    slug: 'undercoating',
    children: [{title: 'Undercoating & Rust Protection', slug: 'undercoating-rust-protection'}],
  },
  {
    title: 'Shop Supplies',
    slug: 'shop-supplies',
    children: [
      {title: 'Gloves', slug: 'gloves'},
      {title: 'Hand Soap', slug: 'hand-soap'},
      {title: 'Garbage Bags', slug: 'garbage-bags'},
      {title: 'Rags, Wipes & Paper', slug: 'rags-wipes-paper'},
      {title: 'Oil Change Stickers', slug: 'oil-change-stickers'},
    ],
  },
  {
    title: 'Accessories',
    slug: 'accessories',
    children: [
      {title: 'Wiper Blades', slug: 'wiper-blades'},
      {title: 'Wheel Weights', slug: 'wheel-weights'},
      {title: 'Vents & Grills', slug: 'vents-grills'},
      {title: 'Other Accessories', slug: 'other-accessories'},
    ],
  },
]

export const ATTRIBUTES: AttributeDef[] = [
  {title: 'Brand', slug: 'brand'},
  {title: 'Viscosity Grade', slug: 'viscosity'},
  {title: 'Pack Size', slug: 'pack-size'},
  {title: 'Specification', slug: 'specification', allowMultiple: true},
  {title: 'Oil Type', slug: 'oil-type'},
  {title: 'Coolant Technology', slug: 'coolant-technology'},
  {title: 'Colour', slug: 'colour'},
  {title: 'Size', slug: 'size'},
]
