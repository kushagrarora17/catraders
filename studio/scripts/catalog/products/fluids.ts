import type {ProductInput} from '../types'

const coolantNote =
  'Colour is only a typical indicator of coolant chemistry; always match the coolant to the vehicle manufacturer requirement before topping up or mixing.'

export const products: ProductInput[] = [
  // ---- Coolant: 50/50 premix, 6 pack (colour -> technology is "typical" only) ----
  // source: https://www.prestoneuk.com/blog/different-coolant-types-explained/
  {
    title: 'Red Coolant 50/50 Premix - 6 Pack',
    category: 'rtu-oat-long-life',
    attrs: {'pack-size': '6 Pack', colour: 'Red', 'coolant-technology': 'OAT'},
    description: `Ready-to-use red antifreeze/coolant premixed 50/50 with water. Red coolant is typically an organic acid technology (OAT) type. ${coolantNote}`,
  },
  {
    title: 'Green Coolant 50/50 Premix - 6 Pack',
    category: 'rtu-conventional',
    attrs: {'pack-size': '6 Pack', colour: 'Green', 'coolant-technology': 'IAT'},
    description: `Ready-to-use green antifreeze/coolant premixed 50/50 with water. Green coolant is typically a conventional inorganic additive technology (IAT) type. ${coolantNote}`,
  },
  {
    title: 'Yellow Coolant 50/50 Premix - 6 Pack',
    category: 'rtu-hoat',
    attrs: {'pack-size': '6 Pack', colour: 'Yellow', 'coolant-technology': 'HOAT'},
    description: `Ready-to-use yellow antifreeze/coolant premixed 50/50 with water. Yellow coolant is typically a hybrid organic acid technology (HOAT) type. ${coolantNote}`,
  },
  {
    title: 'Pink Coolant 50/50 Premix - 6 Pack',
    category: 'rtu-hoat',
    attrs: {'pack-size': '6 Pack', colour: 'Pink', 'coolant-technology': 'HOAT'},
    description: `Ready-to-use pink antifreeze/coolant premixed 50/50 with water. Pink coolant is typically a hybrid (often phosphated) organic acid technology type used in many Asian vehicles. ${coolantNote}`,
  },
  {
    title: 'Blue Coolant 50/50 Premix - 6 Pack',
    category: 'rtu-hoat',
    attrs: {'pack-size': '6 Pack', colour: 'Blue', 'coolant-technology': 'HOAT'},
    description: `Ready-to-use blue antifreeze/coolant premixed 50/50 with water. Blue coolant is typically a hybrid (often phosphated) organic acid technology type used in many Asian vehicles. ${coolantNote}`,
  },
  {
    title: 'Orange Coolant 50/50 Premix - 6 Pack',
    category: 'rtu-oat-long-life',
    attrs: {'pack-size': '6 Pack', colour: 'Orange', 'coolant-technology': 'OAT'},
    description: `Ready-to-use orange antifreeze/coolant premixed 50/50 with water. Orange coolant is typically an extended-life organic acid technology (OAT, Dexcool-type) formula. ${coolantNote}`,
  },

  // ---- Coolant: concentrate, 6 pack ----
  {
    title: 'Orange Coolant Concentrate - 6 Pack',
    category: 'concentrate-oat',
    attrs: {'pack-size': '6 Pack', colour: 'Orange', 'coolant-technology': 'OAT'},
    description: `Orange antifreeze/coolant concentrate to be diluted with water before use. Orange coolant is typically an extended-life organic acid technology (OAT, Dexcool-type) formula. ${coolantNote}`,
  },
  {
    title: 'Red Coolant Concentrate - 6 Pack',
    category: 'concentrate-oat',
    attrs: {'pack-size': '6 Pack', colour: 'Red', 'coolant-technology': 'OAT'},
    description: `Red antifreeze/coolant concentrate to be diluted with water before use. Red coolant is typically an organic acid technology (OAT) type. ${coolantNote}`,
  },
  {
    title: 'Green Coolant Concentrate - 6 Pack',
    category: 'concentrate-conventional',
    attrs: {'pack-size': '6 Pack', colour: 'Green', 'coolant-technology': 'IAT'},
    description: `Green antifreeze/coolant concentrate to be diluted with water before use. Green coolant is typically a conventional inorganic additive technology (IAT) type. ${coolantNote}`,
  },
  {
    title: 'Yellow Coolant Concentrate - 6 Pack',
    category: 'concentrate-hoat',
    attrs: {'pack-size': '6 Pack', colour: 'Yellow', 'coolant-technology': 'HOAT'},
    description: `Yellow antifreeze/coolant concentrate to be diluted with water before use. Yellow coolant is typically a hybrid organic acid technology (HOAT) type. ${coolantNote}`,
  },

  // ---- ATF / CVT / manual transmission fluids ----
  // source: https://www.mobil.com/en/lubricants/for-personal-vehicles/our-products/products/mobil-atf-dm
  {
    title: 'Toyota ATF WS Automatic Transmission Fluid - 6 x 1 L',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Toyota', 'pack-size': '6 x 1 L', specification: ['Toyota WS']},
    description: 'Toyota genuine World Standard (WS) automatic transmission fluid for Toyota automatic transmissions that call for ATF WS.',
  },
  {
    title: 'Castrol Transmax CVT Fluid - 3 x 4.73 L',
    category: 'cvt-fluid',
    attrs: {brand: 'Castrol', 'pack-size': '3 x 4.73 L'},
    description: 'Castrol Transmax fluid for continuously variable transmissions (CVT). Check the vehicle manual for the exact CVT fluid specification required.',
  },
  {
    title: 'Castrol Transmax CVT Fluid - 6 x 1 L',
    category: 'cvt-fluid',
    attrs: {brand: 'Castrol', 'pack-size': '6 x 1 L'},
    description: 'Castrol Transmax fluid for continuously variable transmissions (CVT). Check the vehicle manual for the exact CVT fluid specification required.',
  },
  {
    title: 'Castrol Dexron VI Automatic Transmission Fluid - 6 x 1 L',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Castrol', 'pack-size': '6 x 1 L', specification: ['Dexron VI']},
    description: 'Castrol automatic transmission fluid for transmissions requiring GM Dexron VI.',
  },
  {
    title: 'Honda Genuine ATF DW-1 Automatic Transmission Fluid - 12 Pack',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Honda', 'pack-size': '12 Pack', specification: ['Honda DW-1']},
    description: 'Honda genuine DW-1 automatic transmission fluid for conventional Honda automatic transmissions. Not for use in CVTs.',
  },
  {
    title: 'Honda Genuine HCF-2 CVT Fluid - 12 Pack',
    category: 'cvt-fluid',
    attrs: {brand: 'Honda', 'pack-size': '12 Pack', specification: ['Honda HCF-2']},
    description: 'Honda genuine HCF-2 fluid for Honda vehicles with a second-generation CVT. Use only where the transmission calls for HCF-2.',
  },
  {
    title: 'Mobil 1 Synthetic LV ATF HP - 6 x 1 L',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Mobil', 'pack-size': '6 x 1 L', 'oil-type': 'Full Synthetic', specification: ['Dexron HP']},
    description: 'Synthetic low-viscosity automatic transmission fluid licensed by GM against the Dexron HP specification. Listed as "Mobil LV HP".',
  },
  {
    title: 'Mobil LV ATF - 6 x 1 L',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Mobil', 'pack-size': '6 x 1 L'},
    description: 'Mobil low-viscosity (LV) automatic transmission fluid. Check the label and vehicle manual for the approvals required.',
  },
  {
    title: 'Mobil ATF D/M Automatic Transmission Fluid',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Mobil', specification: ['Dexron IIIH', 'Mercon', 'Allison C-4']},
    description: 'Mobil ATF D/M for applications requiring Dexron IIIH, Mercon or Allison C-4. Not recommended for Dexron VI, Mercon V or Mercon LV applications.',
  },
  {
    title: 'ATF Multi-Vehicle Automatic Transmission Fluid - 6 x 1 L',
    category: 'automatic-transmission-fluid',
    attrs: {'pack-size': '6 x 1 L'},
    description: 'Multi-vehicle automatic transmission fluid for a range of North American, European and Asian applications. Check the label for the approvals covered. Listed as "ATF Multi".',
  },
  {
    title: 'ATF Multi-Vehicle Automatic Transmission Fluid - 3 x 4.73 L',
    category: 'automatic-transmission-fluid',
    attrs: {'pack-size': '3 x 4.73 L'},
    description: 'Multi-vehicle automatic transmission fluid for a range of North American, European and Asian applications. Check the label for the approvals covered. Listed as "ATF Multi".',
  },
  {
    title: 'Dexron VI Automatic Transmission Fluid - 3 x 4.73 L',
    category: 'automatic-transmission-fluid',
    attrs: {'pack-size': '3 x 4.73 L', specification: ['Dexron VI']},
    description: 'Automatic transmission fluid for transmissions requiring GM Dexron VI. Listed as "Dex VI".',
  },
  // source: https://www.exxonmobil.com/en/apps/pds/mobil/passenger-vehicle-lube/2019/09/29/16/06/iocamobil-atf-3309
  {
    title: 'Mobil ATF 3309 Automatic Transmission Fluid - 6 x 1 L',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Mobil', 'pack-size': '6 x 1 L', 'oil-type': 'Full Synthetic', specification: ['JWS 3309', 'GM 9986195', 'Toyota T-IV']},
    description: 'Mobil ATF 3309 is a synthetic fluid for slip-controlled lock-up automatic transmissions, including applications calling for JWS 3309 or Toyota T-IV. Listed as "3309".',
  },
  {
    title: 'Mobil ATF 3309 Automatic Transmission Fluid - 3 x 4.73 L',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Mobil', 'pack-size': '3 x 4.73 L', 'oil-type': 'Full Synthetic', specification: ['JWS 3309', 'GM 9986195', 'Toyota T-IV']},
    description: 'Mobil ATF 3309 is a synthetic fluid for slip-controlled lock-up automatic transmissions, including applications calling for JWS 3309 or Toyota T-IV. Listed as "3309".',
  },
  {
    title: 'ATF+4 Automatic Transmission Fluid - 6 x 1 L',
    category: 'automatic-transmission-fluid',
    attrs: {'pack-size': '6 x 1 L', specification: ['ATF+4']},
    description: 'Automatic transmission fluid for Chrysler/Stellantis transmissions that specify ATF+4.',
  },
  {
    title: 'ATF+4 Automatic Transmission Fluid - 3 x 4.73 L',
    category: 'automatic-transmission-fluid',
    attrs: {'pack-size': '3 x 4.73 L', specification: ['ATF+4']},
    description: 'Automatic transmission fluid for Chrysler/Stellantis transmissions that specify ATF+4.',
  },
  // source: https://honda.oempartsonline.ca/parts/honda-mtf-1-litre-87989031c
  {
    title: 'Honda Genuine Manual Transmission Fluid (MTF)',
    category: 'manual-transmission-fluid',
    attrs: {brand: 'Honda'},
    description: 'Honda genuine manual transmission fluid (MTF) for Honda manual gearboxes. Listed as "Honda ATF Manual".',
  },
  {
    title: 'Ford Mercon LV Automatic Transmission Fluid - 6 L',
    category: 'automatic-transmission-fluid',
    attrs: {brand: 'Ford', 'pack-size': '6 L', specification: ['Mercon LV']},
    description: 'Ford automatic transmission fluid for transmissions requiring Mercon LV.',
  },

  // ---- Brake fluid ----
  {
    title: 'DOT 4 Brake Fluid - 500 mL',
    category: 'brake-fluid',
    attrs: {'pack-size': '500 mL', specification: ['DOT 4']},
    description: 'DOT 4 brake fluid for hydraulic brake and clutch systems that specify DOT 4.',
  },
  {
    title: 'DOT 4 Brake Fluid - 1 L',
    category: 'brake-fluid',
    attrs: {'pack-size': '1 L', specification: ['DOT 4']},
    description: 'DOT 4 brake fluid for hydraulic brake and clutch systems that specify DOT 4.',
  },
  {
    title: 'DOT 3 Brake Fluid - 4 x 1 L',
    category: 'brake-fluid',
    attrs: {'pack-size': '4 x 1 L', specification: ['DOT 3']},
    description: 'DOT 3 brake fluid for hydraulic brake and clutch systems that specify DOT 3.',
  },
  {
    title: 'DOT 3 Brake Fluid - 4 x 3.78 L',
    category: 'brake-fluid',
    attrs: {'pack-size': '4 x 3.78 L', specification: ['DOT 3']},
    description: 'DOT 3 brake fluid for hydraulic brake and clutch systems that specify DOT 3.',
  },

  // ---- Power steering ----
  // source: http://www.revqlp.com/content/rev-power-steering-fluid
  {
    title: 'Rev Power Steering Fluid - 4 x 3.78 L',
    category: 'power-steering-fluid',
    attrs: {brand: 'Rev', 'pack-size': '4 x 3.78 L'},
    description: 'Rev power steering fluid, a conditioner and stabilizer formulated to mix with factory power steering fluids.',
  },
  {
    title: 'Eagle Power Steering Fluid - 5 L',
    category: 'power-steering-fluid',
    attrs: {brand: 'Eagle', 'pack-size': '5 L'},
    description: 'Power steering fluid in a 5 L container. Check the vehicle manual for the fluid type required.',
  },
  // source: https://lucasoil.ca/product/power-steering-fluid/
  {
    title: 'Lucas Oil Power Steering Fluid - 6 x 946 mL',
    sku: '20824',
    category: 'power-steering-fluid',
    attrs: {brand: 'Lucas Oil', 'pack-size': '6 x 946 mL'},
    description: 'Lucas Oil power steering fluid in a case of six 946 mL (1 US quart) bottles. Listed as "6x1L".',
  },
  {
    title: 'Lucas Oil Power Steering Fluid - 12 x 355 mL',
    sku: '20823',
    category: 'power-steering-fluid',
    attrs: {brand: 'Lucas Oil', 'pack-size': '12 x 355 mL'},
    description: 'Lucas Oil power steering fluid in a case of twelve 355 mL bottles.',
  },

  // ---- Oil stabilizer ----
  {
    title: 'Star Fire Anti-Slip Oil Stabilizer - 12 Pack',
    category: 'oil-stabilizer-additives',
    attrs: {brand: 'Star Fire', 'pack-size': '12 Pack'},
    description: 'Star Fire oil stabilizer / anti-slip oil additive supplied as a 12 pack.',
  },
  // source: https://lucasoil.ca/product/heavy-duty-oil-stabilizer/
  {
    title: 'Lucas Oil Heavy Duty Oil Stabilizer - 3.78 L',
    sku: '20002',
    category: 'oil-stabilizer-additives',
    attrs: {brand: 'Lucas Oil', 'pack-size': '3.78 L'},
    description: 'Petroleum-based oil additive that thickens oil, helps reduce oil consumption and quiets noisy engines and gearboxes. Gallon size.',
  },
  {
    title: 'Lucas Oil Heavy Duty Oil Stabilizer - 12 x 946 mL',
    sku: '20001',
    category: 'oil-stabilizer-additives',
    attrs: {brand: 'Lucas Oil', 'pack-size': '12 x 946 mL'},
    description: 'Petroleum-based oil additive that thickens oil, helps reduce oil consumption and quiets noisy engines and gearboxes. Case of twelve 946 mL bottles.',
  },

  // ---- Gear oil ----
  // source: https://www.lucasoil.com/product/sae-75w-90-synthetic-gear-oil/
  {
    title: 'Lucas Oil Synthetic Gear Oil 75W-90 - 12 Pack',
    sku: '10047',
    category: 'gear-oil',
    attrs: {brand: 'Lucas Oil', viscosity: '75W-90', 'oil-type': 'Full Synthetic', 'pack-size': '12 Pack'},
    description: 'Lucas synthetic SAE 75W-90 transmission and differential gear oil. Case of twelve 946 mL (1 US quart) bottles.',
  },
  {
    title: 'Lucas Oil Gear Oil 75W-140 - 12 Pack',
    category: 'gear-oil',
    attrs: {brand: 'Lucas Oil', viscosity: '75W-140', 'pack-size': '12 Pack'},
    description: 'Lucas Oil SAE 75W-140 gear oil for heavy-duty differentials and transmissions, 12 pack.',
  },
  // source: https://starfire.com/products/gear-lubricants/
  {
    title: 'Star Fire Full Synthetic Gear Lubricant 75W-90 - Pail 18.9 L',
    category: 'gear-oil',
    attrs: {brand: 'Star Fire', viscosity: '75W-90', 'oil-type': 'Full Synthetic', 'pack-size': 'Pail 18.9 L', specification: ['API GL-5', 'API MT-1']},
    description: 'Star Fire full synthetic 75W-90 gear lubricant suited to API GL-5 and MT-1 applications and limited-slip differentials. 5 gallon (18.9 L) pail.',
  },
  {
    title: 'Mobil Gear Oil 75W-90 - 12 Pack',
    category: 'gear-oil',
    attrs: {brand: 'Mobil', viscosity: '75W-90', 'pack-size': '12 Pack'},
    description: 'Mobil SAE 75W-90 gear oil for manual transmissions and differentials. Check the label for the API service level.',
  },
  {
    title: 'Muffler Cement - Box of 12',
    category: 'shop-chemicals',
    attrs: {'pack-size': 'Box of 12'},
    description: 'Muffler cement paste for sealing exhaust pipe and muffler joints and small exhaust leaks. Box of 12.',
  },

  // ---- Engine flush ----
  // source: https://partsource.ca/products/638-kleen-flo-engine-flush-350-ml
  {
    title: 'Kleen-Flo Engine Flush - 12 Pack',
    category: 'engine-flush',
    attrs: {brand: 'Kleen-Flo', 'pack-size': '12 Pack'},
    description: 'Engine flush added to the crankcase before an oil change to help remove varnish and sludge. Case of twelve 350 mL bottles.',
  },
  // source: https://www.liqui-moly.com/en/engine-flush-plus-p003601.html
  {
    title: 'Liqui Moly Engine Flush - 6 Pack',
    category: 'engine-flush',
    attrs: {brand: 'Liqui Moly', 'pack-size': '6 Pack'},
    description: 'Liqui Moly engine flush added to warm engine oil before an oil change to clear deposits from the engine interior. Not for motorcycles with wet clutches.',
  },
  {
    title: 'Rim Sealant - 6 Pack',
    category: 'shop-chemicals',
    attrs: {'pack-size': '6 Pack'},
    description: 'Rim / tire bead sealant used when mounting tires to help seal the bead to the wheel rim. 6 pack.',
  },

  // ---- Grease ----
  {
    title: 'Copper Anti-Seize Compound - Box of 15',
    category: 'grease',
    attrs: {'pack-size': 'Box of 15'},
    description: 'Copper anti-seize compound applied to threaded fasteners, exhaust and brake hardware to prevent seizing and galling. Box of 15.',
  },
  {
    title: 'Kleen-Flo Dielectric Grease',
    category: 'grease',
    attrs: {brand: 'Kleen-Flo'},
    description: 'Dielectric grease for sealing and protecting electrical connectors and bulb sockets from moisture and corrosion.',
  },
  // source: https://www.mobil.com/lubricants/-/media/project/wep/mobil/mobil-row-us-1/pdf/mobil-grease-selection-guide.pdf
  {
    title: 'Mobil Mobilux EP 2 Multi-Purpose Grease',
    category: 'grease',
    attrs: {brand: 'Mobil'},
    description: 'Lithium-based NLGI 2 extreme-pressure grease for general-purpose bearing and chassis lubrication.',
  },
  {
    title: 'Mobil Mobilgrease XHP 221 Lithium Complex Grease',
    category: 'grease',
    attrs: {brand: 'Mobil'},
    description: 'NLGI 1 lithium complex grease with a mineral base oil (ISO VG 220) and good water resistance for industrial and chassis use.',
  },
  {
    title: 'Mobil Mobilgrease XHP 222 Lithium Complex Grease',
    category: 'grease',
    attrs: {brand: 'Mobil'},
    description: 'NLGI 2 lithium complex grease with a mineral base oil (ISO VG 220), intended for a wide range of applications and severe operating conditions.',
  },
  {
    title: 'Mobil Mobilgrease XHP 462 Lithium Complex Grease',
    category: 'grease',
    attrs: {brand: 'Mobil'},
    description: 'NLGI 2 lithium complex grease with a heavier ISO VG 460 mineral base oil for higher loads and slower speeds.',
  },
  // source: https://www.mobil.com/en/lubricants/for-personal-vehicles/our-products/products/mobil-1-synthetic-grease
  {
    title: 'Mobil 1 Synthetic Grease',
    category: 'grease',
    attrs: {brand: 'Mobil', 'oil-type': 'Full Synthetic'},
    description: 'NLGI 2 lithium complex synthetic grease meeting NLGI GC-LB, for automotive use across a wide temperature range.',
  },

  // ---- Fuel injector cleaner / additives ----
  {
    title: 'Fuel Injector Cleaner',
    category: 'fuel-injector-cleaner',
    description: 'Fuel additive added to the fuel tank to help clean injectors and remove fuel system deposits.',
  },
  {
    title: 'HM Fuel Injector Cleaner',
    category: 'fuel-injector-cleaner',
    description: 'Fuel additive added to the fuel tank to help clean injectors and remove fuel system deposits. Listed as "HM".',
  },
  // source: https://www.walmart.com/ip/Liqui-Moly-2007-Jectron-Gasoline-Fuel-Injection-Cleaner-300-ml/105771875
  {
    title: 'Liqui Moly Jectron Fuel Injection Cleaner',
    sku: '2007',
    category: 'fuel-injector-cleaner',
    attrs: {brand: 'Liqui Moly'},
    description: 'Gasoline fuel additive that cleans deposits from injector nozzles, intake valves and the combustion chamber. A 300 mL can treats up to about 75 L of fuel.',
  },
  // source: https://www.napacanada.com/en/p/LMYLM2009
  {
    title: 'Liqui Moly MoS2 Anti-Friction Engine Treatment - Box of 12',
    sku: '2009',
    category: 'oil-stabilizer-additives',
    attrs: {brand: 'Liqui Moly', 'pack-size': 'Box of 12'},
    description: 'Molybdenum disulfide oil additive for 4-stroke petrol and diesel engines to reduce friction and wear. Not suitable for wet clutches.',
  },
]
