export type Guide = {
  heading: string;
  title: string;
  description: string;
  introduction: string;
  keywords: string[];
  sections: [string, string[]][];
  comparison: [string, string, string][];
  faqs: [string, string][];
  sources: [string, string][];
};

export const categoryGuides: Record<string, Guide> = {
  "engine-oils": {
    heading: "Wholesale engine oils for automotive shops",
    title: "Wholesale Engine Oils in Southwestern Ontario",
    description:
      "Compare synthetic, semi-synthetic and diesel engine oils. Browse wholesale brands, viscosity grades and pack sizes for shops across Southwestern Ontario.",
    introduction:
      "Build an engine-oil range around the vehicles your shop actually services. CA Traders supplies wholesale automotive lubricants to mechanics, repair shops and dealerships across Southwestern Ontario. Explore passenger-car motor oils and heavy-duty diesel oils, compare the specifications behind the label, and send us your required products and quantities for a quote.",
    keywords: [
      "wholesale engine oil",
      "synthetic motor oil supplier",
      "bulk automotive lubricants Ontario",
      "diesel engine oil",
    ],
    sections: [
      [
        "What is engine oil?",
        [
          "Engine oil is a formulated lubricant that circulates through an engine. Alongside lubrication, it helps manage heat, cleanliness and contaminants as part of the engine’s lubrication system. Base oils and additive packages work together; a viscosity grade alone does not describe the complete performance of a finished oil.",
          "For a workshop, choosing oil is both a technical and an inventory decision. A familiar brand name can help customers recognise a product, but the actual selection must match the vehicle manufacturer’s requirement. Keep the viscosity, performance standard, approval status and pack size together when recording an item on a purchase order.",
        ],
      ],
      [
        "Synthetic, semi-synthetic and diesel oils",
        [
          "Fully synthetic and semi-synthetic describe broad formulation categories. They are useful starting points for comparing products, but they do not replace the performance claims on the label. Two synthetic oils with the same viscosity may be intended for different engine technologies and emission systems.",
          "Passenger-car motor oil and heavy-duty diesel oil should be purchased against their intended applications. Do not assume that a diesel-labelled product is suitable for every diesel passenger vehicle, or that one oil covers petrol and diesel requirements simply because both engines use the same viscosity. Compare the exact product data sheet with the service specification.",
        ],
      ],
      [
        "Viscosity, specifications and compatibility",
        [
          "A grade such as 0W-20 or 5W-30 describes viscosity behaviour under specified test conditions. It is not a quality ranking. Use the vehicle handbook or service information to identify the required grade rather than selecting a thicker or thinner oil on brand preference alone.",
          "Record any required API, ILSAC, ACEA or manufacturer specification alongside the viscosity. Distinguish a product’s formal approval from a supplier’s suitability recommendation. Where a vehicle requires a named approval, verify that claim on the current product documentation before ordering or substituting. The workshop remains responsible for checking the exact vehicle and engine application.",
        ],
      ],
      [
        "Plan your passenger-car and diesel stock",
        [
          "Start with recent service records: which engine families recur, which specifications are requested, and how much oil each job consumes? Group your purchasing list by the complete requirement, then by brand and pack size. This avoids treating every bottle marked 5W-30 as an interchangeable stock item.",
          "Keep slower-moving specialist grades separate from regular service products. A smaller pack may make sense for an occasional application even when a larger container has a lower unit price. Compare the usable quantity, storage space and expected turnover before requesting a larger format. Ask us to confirm which pack sizes are available for the exact product.",
        ],
      ],
      [
        "Use, handling and service documentation",
        [
          "Follow the vehicle manufacturer’s fill quantity, checking procedure and service interval. An oil change can involve a filter, sealing washer and other consumables, so prepare a job list rather than ordering oil in isolation. The engine-oil catalog can be paired with our filter and shop-supply categories when building a workshop enquiry.",
          "Keep containers labelled and closed, and use clean dispensing equipment dedicated to the appropriate product. Record the product name and specification on the service record so the next technician can identify what was used. Ask for product information if an older label or an ambiguous stock description makes the intended application unclear.",
        ],
      ],
      [
        "Brands, pack sizes and comparing quotations",
        [
          "Our brand list below is drawn from products currently recorded in this category. It can include established lubricant names and specialist alternatives; being listed is not a claim that CA Traders is an authorised distributor or that a particular product is in stock today.",
          "Compare quotes using the same product specification and total quantity. Include the number of containers, volume per container, preferred brand and whether an equivalent may be considered. For equivalency requests, give the original specification first so a lower price does not hide a different application or an unsuitable approval claim.",
        ],
      ],
      [
        "Request wholesale engine-oil pricing",
        [
          "Send the product name or SKU, viscosity, required approvals, pack size and quantity. Include your business name, delivery city and any timing requirement. If you are building a first order, separate essential service items from optional alternatives so we can respond clearly.",
          "CA Traders serves the confirmed cities shown on our service-area pages. Pricing, stock, delivery timing and minimum order requirements are confirmed with your quote. A catalog listing is a starting point for a purchasing conversation rather than a guarantee of immediate supply.",
        ],
      ],
    ],
    comparison: [
      [
        "Fully synthetic",
        "Passenger-car and other applications specified by the product.",
        "Match viscosity and every required performance specification or OEM approval.",
      ],
      [
        "Semi-synthetic",
        "Applications that permit the particular blend and performance level.",
        "Confirm the vehicle requirement; formulation wording alone is insufficient.",
      ],
      [
        "Heavy-duty diesel",
        "Suitable diesel applications identified by the manufacturer.",
        "Check engine, emissions-system and performance requirements; do not generalise by fuel type.",
      ],
    ],
    faqs: [
      [
        "Is every 5W-30 engine oil interchangeable?",
        "No. The viscosity is only one part of the requirement. Match the performance standard and any required manufacturer approval as well as the grade. Send those requirements with your enquiry.",
      ],
      [
        "Do you supply fully synthetic oil wholesale?",
        "The engine-oil catalog includes fully synthetic products. Browse the relevant subcategory and request the exact brand, grade, specification and quantity; current stock and pricing are confirmed by quote.",
      ],
      [
        "Can I order passenger-car and diesel oils together?",
        "Include both on the same enquiry, with a separate line for each product and pack size. Keep the vehicle requirements distinct so any proposed alternatives can be checked accurately.",
      ],
      [
        "Are larger packs always better value for a small shop?",
        "Compare total usable volume, turnover and handling requirements rather than container price alone. A specialist oil that moves slowly may be better purchased in a smaller format. Available formats depend on the product.",
      ],
      [
        "Can you help identify an equivalent oil?",
        "Send the existing product and the vehicle manufacturer’s required specification. We can discuss catalog options, but the exact application and approval claims must be verified before a substitute is used.",
      ],
      [
        "Where do you deliver wholesale engine oil?",
        "CA Traders lists confirmed coverage across Southwestern Ontario, including Windsor, London, Kitchener and surrounding service cities. Share your delivery location so timing, minimums and availability can be confirmed.",
      ],
    ],
    sources: [
      [
        "Mobil: choosing viscosity for your vehicle",
        "https://www.mobil.com/en/lubricants/for-personal-vehicles/our-products/motor-oils/mobil-5w-20-viscosity-oils",
      ],
    ],
  },
  "transmission-fluids": {
    heading: "Wholesale transmission fluids: ATF, CVT and manual",
    title: "Wholesale ATF, CVT & Transmission Fluids in Ontario",
    description:
      "Compare automatic, CVT and manual transmission fluids. Check application requirements and request wholesale pricing from CA Traders in Southwestern Ontario.",
    introduction:
      "The right transmission fluid starts with the transmission specification, not the colour of the bottle. CA Traders helps automotive shops source wholesale automatic transmission fluid, CVT fluid and manual transmission fluid. Use this guide to structure your enquiry and explore catalog options for your workshop’s mix of vehicles.",
    keywords: [
      "wholesale transmission fluid",
      "ATF supplier Ontario",
      "CVT fluid wholesale",
      "manual transmission fluid",
    ],
    sections: [
      [
        "What does transmission fluid do?",
        [
          "Transmission fluids are formulated for the lubrication, hydraulic and friction requirements of particular transmission designs. The balance of these functions varies between conventional automatic, continuously variable and manual transmissions. A product intended for one application is not automatically suitable for another.",
          "For purchasing purposes, identify the transmission type and the required fluid specification before comparing brands. Keep the vehicle year, model, engine and transmission identification with the job information. The same vehicle name can cover different transmission designs, so a model name by itself is not enough to establish suitability.",
        ],
      ],
      [
        "Automatic, CVT and manual fluids compared",
        [
          "Automatic transmission fluid, often shortened to ATF, covers multiple specifications for stepped automatic transmissions. CVT fluids address the requirements of particular continuously variable designs. Manual transmissions may call for dedicated manual transmission fluid, a specified gear lubricant or another fluid identified in service information.",
          "Some products claim coverage for multiple transmission types or specifications. That does not make every multi-vehicle fluid universal. Read the exact product’s application list and any exclusions. A recommendation attached to one product in a brand’s range cannot be transferred to every fluid carrying that brand.",
        ],
      ],
      [
        "Check compatibility before ordering",
        [
          "Use the current vehicle service information and product data sheet together. Record the required specification exactly, including suffixes or revisions. If the manufacturer calls for a particular fluid, confirm a proposed substitute’s documented application rather than relying on a similar-looking label.",
          "Do not use colour, smell or an old container as the only compatibility test. They can help with identification but cannot establish an approval. Where the transmission cannot be identified confidently, resolve the vehicle details before ordering a replacement fluid. We can discuss catalog options once you provide the requirement.",
        ],
      ],
      [
        "Build a transmission-service buying list",
        [
          "Separate your stock list into automatic, CVT and manual applications, then record the exact specification for each line. Link fluid purchases to the workshop’s booked services and recurring vehicle applications. This makes it easier to see which products are routine stock and which should be ordered for a specific job.",
          "Confirm the amount required for the actual procedure, not just the nominal system capacity. A drain-and-fill, component repair and other service operations can require different quantities. Follow the vehicle manufacturer’s method; the catalog is a product-selection tool, not a transmission-service procedure.",
        ],
      ],
      [
        "Brand and pack-size choices",
        [
          "The brands shown on this page come from current transmission-fluid catalog records. Compare like-for-like applications before weighing brand preference. When a customer requests an original-equipment branded fluid, note whether alternatives may be considered rather than silently replacing it with another line.",
          "Ask for the exact available pack size, container count and unit quantity. Keep specialist CVT and manual fluids labelled separately from other lubricants. For occasional applications, a manageable pack can be more practical than holding a large quantity that will not turn over quickly.",
        ],
      ],
      [
        "Use and storage in the workshop",
        [
          "Use clean, clearly identified dispensing equipment and prevent cross-contamination between fluid types. Keep product identification available to the technician so the selected fluid can be checked against the work order before filling. Store containers according to the supplier’s instructions and review the relevant safety information.",
          "Document the product used and the specification checked on the service record. If you need a related additive or cleaning chemical, verify that it is permitted for that transmission and procedure. An additive is not a substitute for the correct base fluid or a diagnosis of a mechanical fault.",
        ],
      ],
      [
        "Get a wholesale transmission-fluid quote",
        [
          "Provide the product name or SKU, required specification, transmission type, quantity and preferred format. Include your business and delivery city. For mixed enquiries, list each fluid separately to avoid merging quantities for products with different applications.",
          "Pricing, availability, delivery timing and minimum order requirements are confirmed when we respond. If you need an alternative, include the original product data or requirement so the response can distinguish a documented option from a product that simply belongs to the same broad category.",
        ],
      ],
    ],
    comparison: [
      [
        "ATF",
        "Specified stepped automatic transmission applications.",
        "Match the required fluid specification and exact application list.",
      ],
      [
        "CVT fluid",
        "Specified continuously variable transmission applications.",
        "Check the transmission design and manufacturer requirement; do not assume ordinary ATF is suitable.",
      ],
      [
        "Manual transmission fluid",
        "Manual gearboxes covered by the product’s documentation.",
        "Use the service specification; do not choose solely by viscosity or the words gear oil.",
      ],
    ],
    faqs: [
      [
        "Can I use standard ATF in a CVT?",
        "Only use a product whose documentation covers the exact CVT requirement. Ordinary ATF should not be assumed suitable. Some multi-vehicle products cover selected ATF and CVT applications; verify the specific claim.",
      ],
      [
        "Does multi-vehicle mean every transmission?",
        "No. A multi-vehicle label must be read with its application list and exclusions. Check the exact transmission specification against the current product documentation.",
      ],
      [
        "Can I choose transmission fluid by colour?",
        "Colour is not a sufficient compatibility check. Identify the transmission and required specification, then compare the product data sheet and any manufacturer approval claims.",
      ],
      [
        "How much transmission fluid should I order?",
        "Use the quantity required for your service procedure and vehicle. Different procedures can use different amounts. Include the pack size and container count on your quote request.",
      ],
      [
        "Do you carry original-equipment branded fluids?",
        "Browse the current catalog for available branded listings. Include the requested brand and specification in your enquiry and state whether alternatives may be considered. We confirm current availability by quote.",
      ],
      [
        "Can I combine ATF and engine oil in one order?",
        "Yes, include the requested products as separate quote lines. Give the specification and quantity for each item, then provide your delivery city so commercial terms can be confirmed.",
      ],
    ],
    sources: [
      [
        "Castrol: TRANSMAX product range and application information",
        "https://www.castrol.com/en_us/united-states/home/products/our-brands/automotive/castrol-transmax.html",
      ],
    ],
  },
  coolants: {
    heading: "Wholesale automotive coolant and antifreeze",
    title: "Wholesale Coolant & Antifreeze in Southwestern Ontario",
    description:
      "Compare ready-to-use coolant and concentrate, OAT and HOAT. Explore wholesale automotive coolant options and request pricing across Southwestern Ontario.",
    introduction:
      "Choose coolant by the vehicle’s required specification and the exact product instructions. CA Traders supplies wholesale automotive coolant and antifreeze for workshops across Southwestern Ontario. Explore ready-to-use and concentrate options, understand the difference between chemistry and colour, and prepare a quote request that makes compatibility checks clear.",
    keywords: [
      "wholesale coolant",
      "antifreeze supplier Ontario",
      "OAT coolant",
      "HOAT coolant",
      "coolant concentrate",
    ],
    sections: [
      [
        "Coolant, antifreeze and the cooling system",
        [
          "Engine coolant is the working fluid in a vehicle’s cooling system. Antifreeze commonly refers to the concentrate used to prepare it, although labels sometimes use both terms. The finished product must provide the protection specified for the system, not simply appear to be the right colour.",
          "When comparing products, separate the formulation from the supplied concentration. A ready-to-use coolant and a concentrate can share a chemistry family while requiring different preparation. Confirm whether a product is intended to be used directly or diluted, and follow the manufacturer’s instructions.",
        ],
      ],
      [
        "Ready-to-use versus concentrate",
        [
          "Ready-to-use products are supplied at the concentration stated on the label. They can simplify a workshop’s preparation and reduce the need to mix separate components. Do not add water automatically; check the product instructions and the vehicle’s required concentration first.",
          "Concentrate needs preparation to the specified ratio with water meeting the product manufacturer’s requirements. Compare quotes by the usable volume at the required concentration, rather than treating a litre of concentrate and a litre of premix as the same purchasing unit. Include mixing and storage arrangements in that decision.",
        ],
      ],
      [
        "OAT, HOAT and conventional coolant",
        [
          "OAT, HOAT and conventional coolant describe broad inhibitor-technology families. They help organise a catalog but do not establish that every product within a family meets the same vehicle specification. Manufacturer requirements and product-specific recommendations remain the basis for selection.",
          "Colour is not an industry-wide compatibility standard. Similar colours can be used for different formulations, and different colours can occur within related product families. If the existing coolant is unknown, identify the service history and required product before deciding how to service the system.",
        ],
      ],
      [
        "Compatibility and mixing questions",
        [
          "Use the vehicle handbook or service information to identify the coolant requirement. Compare it with the exact product data, including approval or suitability wording. Avoid assuming that an advertised extended-life or multi-vehicle product is suitable for every engine and cooling-system component.",
          "Do not combine unknown products on the basis of colour alone. Follow the vehicle and fluid manufacturer’s service guidance when changing chemistry or dealing with an unidentified fill. This page explains purchasing choices; it does not replace the workshop’s service procedure or a diagnosis of cooling-system contamination.",
        ],
      ],
      [
        "Stocking coolant for your workshop",
        [
          "Group your regular coolant requirements by specification, chemistry and supplied concentration. Keep the product name on the shelf label and on the service record so technicians can distinguish an approved application from a merely similar-looking product. Separate concentrate from premix in stock records.",
          "Use recent cooling-system jobs and booked services to decide which lines need regular replenishment. An occasional specialist application may call for a different pack-size decision than a product used every week. Ask about the exact available formats and quantities rather than assuming every coolant is supplied in every container size.",
        ],
      ],
      [
        "Brands and quotation comparisons",
        [
          "Any brand names shown below are drawn from the current coolant catalog, where brand attributes are recorded. If a listing has no brand label, use its title or SKU in your request and ask for the supporting product information. We do not assign a brand based on its colour or infer one from another category.",
          "For a meaningful price comparison, provide the coolant specification, product or brand preference, concentration, pack size and quantity. Say whether an alternative may be considered and whether the existing system fill is known. This gives the quotation a defined technical requirement.",
        ],
      ],
      [
        "Ordering and workshop handling",
        [
          "Store and handle coolant according to its label and safety data sheet, keep containers clearly identified and prevent contamination. Use suitable labelled equipment for mixing and dispensing where applicable. Check the service procedure before filling, bleeding or pressure-testing a cooling system.",
          "Send your business details, delivery city and required quantities to CA Traders. We confirm current stock, pricing, delivery timing and minimum order requirements with your quote. Coolant enquiries can be combined with engine oils, filters and shop supplies as separate lines in the same purchasing list.",
        ],
      ],
    ],
    comparison: [
      [
        "Ready-to-use",
        "Use at the concentration stated on the product label.",
        "Verify vehicle specification and avoid unrequested dilution.",
      ],
      [
        "Concentrate",
        "Prepare the required mixture following product instructions.",
        "Check water requirements, mixing ratio and usable finished volume.",
      ],
      [
        "OAT / HOAT / conventional",
        "Different broad inhibitor-technology families.",
        "Chemistry and colour do not replace an exact vehicle application check.",
      ],
    ],
    faqs: [
      [
        "Can I choose antifreeze by colour?",
        "No. Colour is not a reliable compatibility standard. Check the required vehicle specification and the exact product’s documentation before selecting or mixing coolant.",
      ],
      [
        "Is concentrate cheaper than ready-to-use coolant?",
        "Compare cost per usable litre at the required concentration, plus preparation and handling requirements. Container price alone is not a fair comparison because concentrate and premix are supplied differently.",
      ],
      [
        "Are OAT and HOAT the same?",
        "They are different broad inhibitor-technology families. Neither label establishes universal vehicle compatibility. Use the required specification and current product information to select the correct coolant.",
      ],
      [
        "Should I add water to ready-to-use coolant?",
        "Follow the instructions on that exact product. Ready-to-use products are supplied at a stated concentration; do not dilute them automatically or assume that every ready-to-use product has the same intended application.",
      ],
      [
        "Do you sell coolant in larger quantities?",
        "Request the product, supplied concentration and desired quantity. The catalog shows listed formats, and CA Traders will confirm current pack-size availability and wholesale pricing with your quote.",
      ],
      [
        "What information should a coolant enquiry include?",
        "Include the product or required specification, concentrate or premix preference, quantity, pack size, business details and delivery city. If the existing system fill is unknown, resolve the application before selecting a replacement.",
      ],
    ],
    sources: [
      [
        "Chevron: coolant technology and colour",
        "https://www.chevronlubricants.com/en_us/home/learning/from-chevron/personal-rec-vechicles-and-equipment/coolants-101.html",
      ],
      [
        "Valvoline: coolant compatibility guidance",
        "https://shop.valvolineglobal.com/blog/can-you-mix-coolant",
      ],
    ],
  },
  filters: {
    heading: "Wholesale oil, engine air and cabin filters",
    title: "Wholesale Automotive Filters in Southwestern Ontario",
    description:
      "Source oil filters, engine air filters and cabin air filters for your workshop. Compare applications and request wholesale pricing from CA Traders.",
    introduction:
      "A filter order is most useful when every line can be matched to a vehicle or a verified part number. CA Traders supplies automotive filters to mechanics, repair shops and dealerships across Southwestern Ontario. Browse oil, engine air and cabin air filters, then send your application details and quantities for a wholesale quote.",
    keywords: [
      "wholesale automotive filters",
      "oil filter supplier Ontario",
      "cabin air filters wholesale",
      "engine air filters",
    ],
    sections: [
      [
        "Three filter categories, three different jobs",
        [
          "Oil filters work within an engine’s lubrication system, engine air filters serve its intake air path, and cabin air filters serve the passenger-compartment ventilation system. Their names describe different applications; a maintenance order may include more than one, but they are not interchangeable products.",
          "Start your selection with the exact vehicle and the filter position you need. A cabin filter request should not be treated as an engine air filter request simply because both handle air. Our subcategory links separate the main filter families so you can narrow the search before comparing listings.",
        ],
      ],
      [
        "Oil filters and routine oil services",
        [
          "Oil-filter purchases should be tied to the specific application and the service work booked in your shop. Keep an original-equipment part number or a verified cross-reference with the stock record. A similar external size or a matching thread alone is not enough to confirm an oil filter’s suitability.",
          "When building an oil-service order, identify the correct oil, filter and any required seals or associated consumables as distinct items. Do not infer that every item in a broad category suits the same vehicle. Use the vehicle’s service information and the filter manufacturer’s application guidance for the final check.",
        ],
      ],
      [
        "Engine air and cabin air filters",
        [
          "Engine air filters and cabin air filters can be easy to confuse in a quick stock enquiry. Record the filter type explicitly and include the part number when available. A workshop can use these categories to prepare maintenance enquiries while keeping the customer’s vehicle and the service location clear.",
          "For cabin filters, a product may describe a particular media type or additional treatment. Compare the exact manufacturer’s claims instead of assuming every filter offers the same performance. Where the catalog does not state a feature, ask for product information rather than treating it as included.",
        ],
      ],
      [
        "Fitment and cross-reference checks",
        [
          "Provide the vehicle year, make, model and engine, plus any additional details required by the filter manufacturer. If a part number is available, include it along with the brand. A catalog title identifies a listed product; it is not a complete vehicle-fitment database.",
          "Cross-references are useful starting points, but verify the exact application before substituting. Do not approve a filter using dimensions alone. Where the identification is uncertain, send the existing number and vehicle details with the enquiry so the application can be resolved before an order is finalised.",
        ],
      ],
      [
        "Build a filter range that turns over",
        [
          "Use recent service records to identify recurring part numbers, then separate those from occasional applications. Record the exact SKU rather than grouping different parts under a generic description such as small oil filter. A clear stock list reduces duplicate ordering and makes low-stock checks more useful.",
          "For slower-moving filters, compare the risk of unused stock with the benefit of keeping a part on hand. Ask for available quantities and packaging before setting a reorder level. Products in the catalog may have different supply formats, and a quoted quantity should specify whether it refers to individual filters or another pack unit.",
        ],
      ],
      [
        "Brands and what the catalog can confirm",
        [
          "The brand section on this page uses recorded catalog attributes. Some filter listings may be identified primarily by a part number and may not have a brand attribute. In those cases, request the brand, application information and supporting documentation with your quote rather than assuming a particular supplier.",
          "Compare quotations on the same part or a verified equivalent, with the same unit quantity. If alternatives are acceptable, state that in your enquiry and keep fitment verification separate from price comparison. No brand ranking or universal compatibility is implied by a product’s position in the listing.",
        ],
      ],
      [
        "Installation planning and wholesale enquiries",
        [
          "Follow the vehicle and filter manufacturer’s fitting instructions, including any seals, preparation and service checks required for the exact product. Store filters clean and protected in their packaging until use. Record the installed part number on the job so future service and purchasing records agree.",
          "To request pricing, send a list of part numbers or vehicle applications, quantities, business details and delivery city. Add engine oils and shop supplies as separate quote lines if needed. CA Traders confirms stock, pricing, delivery timing and minimum order requirements before the order is finalised.",
        ],
      ],
    ],
    comparison: [
      [
        "Oil filter",
        "Specified engine lubrication-system service.",
        "Verify the exact part number and application; shape or thread alone is insufficient.",
      ],
      [
        "Engine air filter",
        "Specified engine intake-air service.",
        "Check vehicle, engine and manufacturer application data.",
      ],
      [
        "Cabin air filter",
        "Specified passenger-compartment ventilation service.",
        "Confirm fitment and any media features claimed for that exact product.",
      ],
    ],
    faqs: [
      [
        "Can you identify a filter from my vehicle details?",
        "Send the year, make, model and engine, plus an existing or original-equipment part number if available. The website is a catalog, so fitment should be verified against application data before ordering.",
      ],
      [
        "Are cabin and engine air filters interchangeable?",
        "No. They serve different systems and must be selected for their intended location and vehicle application. Include the filter type on each enquiry line.",
      ],
      [
        "Is a matching filter size enough to confirm fitment?",
        "No. Dimensions alone do not establish suitability. Use the part number and manufacturer application information, and verify any proposed cross-reference for the exact vehicle.",
      ],
      [
        "Can I buy mixed filter part numbers?",
        "Include each part number and quantity as a separate line in your wholesale enquiry. CA Traders will confirm availability, packaging and pricing for the requested mix.",
      ],
      [
        "Which filter brands do you carry?",
        "Recorded brands appear on this page when available. For listings without a brand attribute, include the product title or SKU and ask us to confirm the brand and application information.",
      ],
      [
        "Can filters and motor oil be quoted together?",
        "Yes. Send a combined purchasing list with the precise oil specification and filter part numbers. Keep quantities and pack units explicit, and include your delivery city for confirmation of service terms.",
      ],
    ],
    sources: [
      [
        "MANN-FILTER: filter products and application lookup",
        "https://www.mann-filter.com/en.html",
      ],
    ],
  },
  "additives-chemicals": {
    heading: "Wholesale automotive additives and workshop chemicals",
    title: "Wholesale Automotive Additives & Chemicals in Ontario",
    description:
      "Explore fuel-system cleaners, engine flushes, oil additives and workshop chemicals. Compare intended uses and request wholesale pricing from CA Traders.",
    introduction:
      "Automotive additives and chemicals should be selected for a defined task, with the application and instructions checked before use. CA Traders supplies wholesale products for automotive workshops across Southwestern Ontario. Explore fuel-system cleaners, engine flushes, oil additives and related chemicals without treating different treatments as interchangeable.",
    keywords: [
      "wholesale automotive additives",
      "fuel injector cleaner wholesale",
      "engine flush supplier",
      "workshop chemicals Ontario",
    ],
    sections: [
      [
        "What belongs in additives and chemicals?",
        [
          "This category brings together products with different purposes: fuel-system cleaners, treatments used before an oil change, oil additives, power steering fluids and other workshop chemicals. Their shared category is a purchasing convenience rather than an indication that they work in the same system.",
          "Choose a product by the job it is intended to perform. Identify the vehicle system, the required product type and any manufacturer restrictions before comparing brands. A treatment should not replace the correct lubricant, the vehicle’s maintenance requirements or a diagnosis when a fault is present.",
        ],
      ],
      [
        "Fuel cleaners, flushes and oil additives compared",
        [
          "Fuel-system cleaners are intended for the applications and fuel types stated on the exact product. Engine flushes and oil additives are different product families with their own instructions. A product designed for a pre-change procedure must not be assumed suitable to remain in the system after that procedure.",
          "Use the product label and current technical documentation to establish its intended use, quantity and sequence. This guide deliberately does not prescribe a universal treatment amount or duration. Instructions can differ even between products from the same brand, and the workshop must check the exact item selected.",
        ],
      ],
      [
        "Compatibility and vehicle requirements",
        [
          "Check petrol or diesel suitability where applicable, along with any restrictions for the specific vehicle system. If a product makes a compatibility claim for a particular technology, read that claim in context rather than assuming it applies to every engine, transmission or fuel system.",
          "Power steering fluid also needs an application check. Do not choose a fluid solely because the container says power steering, or assume a chemical treatment is appropriate for a system using a different specified fluid. Provide the required specification when requesting a quote or an alternative.",
        ],
      ],
      [
        "Match the product to the service task",
        [
          "Create separate enquiry lines for routine service chemicals and customer-specific treatments. Identify whether a product will be used for an oil-change procedure, a fuel-system task or another workshop operation. This helps keep a product’s purpose visible when the quote is handed from purchasing staff to technicians.",
          "For an unfamiliar treatment, ask for technical information before ordering. Avoid combining multiple treatments unless the relevant manufacturers permit it. Keep the selected product with the job instructions so technicians do not rely on a generic description from an old purchase order.",
        ],
      ],
      [
        "Brands, product claims and sensible comparisons",
        [
          "Brands recorded on current category products are listed below. They can include specialist additive suppliers and lubricant brands, but the presence of a brand does not mean every product in its range is stocked. Request the exact product title or SKU and check the label before comparing alternatives.",
          "Compare intended application, quantity treated, packaging and instructions rather than bottle size alone. A smaller bottle and a larger bottle may be intended for different treatment quantities or different tasks. Claims about performance should come from the exact product documentation, not an assumption that all additives offer the same benefit.",
        ],
      ],
      [
        "Workshop handling and inventory",
        [
          "Keep original labels available and review the safety data sheet for each chemical used in the workshop. Storage, dispensing and protective-equipment choices depend on the exact product and task. Do not transfer chemicals into unlabelled containers or use one product’s handling guidance for an unrelated item.",
          "Track slower-moving specialist products separately from regular consumables. When ordering, use a clear product name and pack unit so a case quantity cannot be confused with an individual bottle. Review the label and supplier information if a product has been sitting in stock and its intended application is unclear.",
        ],
      ],
      [
        "Request an additive or chemical quotation",
        [
          "Send the product title or SKU, intended task, required quantity and preferred pack format. If you want an alternative, identify the original product and the requirement that must be preserved. Add your business name, delivery city and any requested timing to the enquiry.",
          "We confirm current pricing, product availability, delivery timing and minimum order requirements by quote. Add related engine oils, filters and shop supplies as distinct lines when preparing a complete workshop order. Any product substitution remains subject to the exact application and manufacturer’s instructions.",
        ],
      ],
    ],
    comparison: [
      [
        "Fuel-system cleaner",
        "The fuel type and system described on the product.",
        "Check intended application, treatment quantity and vehicle restrictions.",
      ],
      [
        "Engine flush",
        "The pre-service procedure identified in its instructions.",
        "Follow the exact product method; do not assume it stays in the engine.",
      ],
      [
        "Oil additive / stabiliser",
        "Only the lubricant applications stated by the product.",
        "Verify vehicle suitability and avoid using treatments as a substitute for diagnosis.",
      ],
      [
        "Power steering fluid",
        "Steering systems requiring the stated fluid specification.",
        "Match the vehicle requirement rather than a generic category label.",
      ],
    ],
    faqs: [
      [
        "Are engine flush and oil additive the same?",
        "No. They can have different purposes and usage instructions. Check the exact product documentation, including whether it is intended for a pre-change procedure or another defined application.",
      ],
      [
        "Can any fuel cleaner be used in diesel and petrol vehicles?",
        "Do not assume so. Verify the fuel type and application stated on the exact product. Some products cover multiple applications and others do not.",
      ],
      [
        "Can additives fix a mechanical problem?",
        "A product’s stated purpose should not replace diagnosis of a fault. Select treatments only for their documented application and follow the vehicle and product manufacturer’s guidance.",
      ],
      [
        "How do I compare treatment quantities?",
        "Use the manufacturer’s stated quantity and application, not only the bottle volume. Include the intended task and product size in your enquiry so different treatments are not compared as though they are identical.",
      ],
      [
        "Can I request product safety information?",
        "Ask for the safety data sheet and technical information for the exact product. Storage, handling and protective equipment should be based on that information and your workshop’s task assessment.",
      ],
      [
        "Do you supply workshop chemicals in mixed orders?",
        "Send each chemical, quantity and pack format as a separate quote line. CA Traders confirms current availability, pricing, delivery timing and minimum order requirements for your business location.",
      ],
    ],
    sources: [
      [
        "LIQUI MOLY: Pro-Line Engine Flush product instructions",
        "https://www.liqui-moly.com/en/ca/pro-line-engine-flush-p000065.html",
      ],
    ],
  },
  "shop-supplies": {
    heading: "Wholesale shop supplies for automotive workshops",
    title: "Wholesale Automotive Shop Supplies in Ontario",
    description:
      "Source gloves, hand soap, bags, rags, wipes and oil-change stickers. Build a practical wholesale shop-supply order with CA Traders in Southwestern Ontario.",
    introduction:
      "A workshop needs more than fluids and parts to keep service work organised. CA Traders supplies wholesale shop consumables for automotive businesses across Southwestern Ontario. Explore gloves, hand soap, garbage bags, rags, wipes and oil-change stickers, then build a purchasing list with the sizes, quantities and pack units your team needs.",
    keywords: [
      "wholesale shop supplies",
      "automotive workshop consumables",
      "mechanic gloves wholesale",
      "garage supplies Ontario",
    ],
    sections: [
      [
        "What are automotive shop supplies?",
        [
          "Shop supplies are the consumables used around service work rather than fitted as a vehicle-specific component. This category includes gloves, hand-cleaning products, bags, wiping products and service stickers. They support different tasks, so the right purchase starts with how and where a product will be used.",
          "For a purchasing list, record more than the generic item name. A glove order needs a size and pack unit; a bag order needs dimensions and quantity; a wiping-product enquiry may need material and format. Clear descriptions make it easier to compare quotes and reduce avoidable substitutions.",
        ],
      ],
      [
        "Gloves: fit, task and product limitations",
        [
          "Choose gloves for the task and the exact materials being handled. Material type, thickness, fit and the manufacturer’s resistance data matter when chemicals are involved. No general product label should be treated as protection against every chemical or every exposure condition.",
          "For workshop stock, record the size mix your team uses rather than ordering a single size by default. Review the product documentation and relevant chemical safety data before selecting protective equipment. A glove that is practical for one handling task may not be appropriate for another.",
        ],
      ],
      [
        "Wipes, rags and hand-cleaning products",
        [
          "Wiping products differ in format, absorbency and intended use. Identify whether the task is general cleanup, handling a small spill or preparing a particular surface, then check that the selected product is suitable. Do not assume every rag or paper product is appropriate for every workshop surface.",
          "Hand soap is a separate purchasing line from surface-cleaning chemicals. Confirm the exact product, container size and any dispenser requirements before ordering. Keep labels and supplier instructions available so staff can use the intended product rather than substituting an unrelated workshop chemical.",
        ],
      ],
      [
        "Bags and service reminders",
        [
          "For garbage bags, provide dimensions, quantity and intended use rather than a colour alone. General waste bags should not be assumed suitable for hazardous waste or all contaminated materials. Use the workshop’s applicable waste-handling procedures and the product’s stated purpose.",
          "Oil-change stickers help record service information, but they do not determine a vehicle’s maintenance schedule. Use the vehicle manufacturer’s requirements and the actual service record when entering dates or distance information. Include the preferred sticker format and quantity with the rest of the consumable order.",
        ],
      ],
      [
        "Plan replenishment around your workshop",
        [
          "Review how supplies are consumed across bays, wash areas and shared storage. Separate everyday items from occasional purchases so a low stock level for a routine item is easy to notice. Keep the item description, preferred format and pack quantity consistent across repeat enquiries.",
          "A simple count of boxes or cases is not enough if different products contain different numbers of items. Record the quantity per pack and the total requested amount. For gloves, track sizes separately; for wipes and bags, keep format and dimensions visible on the shelf label and purchase list.",
        ],
      ],
      [
        "Brands and value comparisons",
        [
          "The brand list below reflects attributes recorded on current shop-supply products. Where a listing lacks a brand attribute, quote its product title or SKU and ask for confirmation. The category includes products with different functions, so there is no single brand ranking that applies to every item.",
          "Compare quotations on usable quantity and the required product characteristics, not only the price of a container. Specify which properties are essential and which alternatives are acceptable. For example, a different pack count may be workable if the size, task suitability and total quantity still meet your requirement.",
        ],
      ],
      [
        "Put together a wholesale shop-supply order",
        [
          "Send separate lines for gloves by size, hand soap by container, bags by dimensions, and wiping products or stickers by format. Include your business name, delivery city and requested quantities. Add oils, filters or workshop chemicals to the same enquiry as separately identified items.",
          "CA Traders confirms current stock, pack formats, pricing, delivery timing and minimum order requirements when preparing your quote. Keep the confirmed item descriptions for your next reorder so changes in packaging or product choice are easy to identify rather than being carried forward unnoticed.",
        ],
      ],
    ],
    comparison: [
      [
        "Gloves",
        "Tasks suited to the exact glove and its documented limitations.",
        "Check size, material, resistance information and pack count.",
      ],
      [
        "Rags, wipes and paper",
        "Cleanup and wiping tasks covered by the product.",
        "Compare format, material, intended use and quantity per pack.",
      ],
      [
        "Hand soap",
        "Hand cleaning according to product instructions.",
        "Check container size, dispenser needs and exact product information.",
      ],
      [
        "Bags and stickers",
        "Waste collection or recording service reminders, respectively.",
        "Specify dimensions or format; do not infer waste suitability or service intervals.",
      ],
    ],
    faqs: [
      [
        "Do you sell gloves in different sizes?",
        "Browse current glove listings and include the sizes and quantities you need in your enquiry. Available sizes and pack formats are confirmed with your wholesale quote.",
      ],
      [
        "Are nitrile gloves suitable for every chemical?",
        "No. Check the exact glove manufacturer’s resistance data, the chemical safety information and the task conditions. Material name alone does not establish protection for every exposure.",
      ],
      [
        "How should I compare wipe and rag prices?",
        "Compare the format, intended use, material and usable quantity. A pack with a different count or size may not be directly comparable to another product based on package price alone.",
      ],
      [
        "Can I order shop supplies with lubricants?",
        "Yes. List the consumables and lubricants separately, with clear pack units and quantities. Include your delivery location so availability and commercial terms can be confirmed together.",
      ],
      [
        "Do oil-change stickers set the service interval?",
        "No. They record information selected for the service. Follow the vehicle manufacturer’s maintenance requirements and the actual service record rather than a generic interval printed or written on a sticker.",
      ],
      [
        "What are your minimum order and delivery terms?",
        "They are confirmed by quote for your products, quantities and location. Send your business details and delivery city; do not assume a fixed minimum or delivery schedule from a catalog listing.",
      ],
    ],
    sources: [
      [
        "Ansell: chemical-protective glove selection",
        "https://www.ansell.com/int/en/faq/what-type-of-gloves-protects-your-hands-from-hazardous-chemicals",
      ],
    ],
  },
};

const cityNotes: Record<
  string,
  {
    focus: string;
    introduction: string;
    sections: [string, string[]][];
    question: string;
    answer: string;
  }
> = {
  Windsor: {
    focus: "Build a specification-led lubricant order",
    introduction:
      "For a Windsor workshop ordering several lubricant grades, a clear specification list is more useful than a broad request for motor oil. CA Traders includes Windsor in its confirmed Southwestern Ontario service area. Use this page to plan a mixed wholesale enquiry and keep the application behind each product visible.",
    sections: [
      [
        "Start with the vehicles booked into your bays",
        [
          "Review the oil services already booked and list each required viscosity with its full performance specification. Keep products for different engine requirements on separate lines, even when they share the same grade. The result is a practical buying list that can be checked against vehicle service information.",
          "For your Windsor business, include both regular service products and occasional specialist requirements, but mark which items are essential for an upcoming job. This gives the quotation a clear priority without assuming that every item will be available immediately.",
        ],
      ],
      [
        "Compare a mixed basket on equal terms",
        [
          "A useful comparison matches the exact product or a documented equivalent, the pack format and the total volume. Do not compare a container price without checking how much product it contains. If an alternative is acceptable, identify the specification that must be preserved.",
          "Add oil filters by verified part number and shop supplies by pack quantity. Keeping those lines separate prevents a low price on one product from obscuring a mismatch elsewhere in the order. Retain the confirmed quote as the reference for receiving and future reorders.",
        ],
      ],
    ],
    question: "What should a Windsor lubricant quote include?",
    answer:
      "List viscosity, required approvals or specifications, preferred brand, pack size and quantity for each oil. Add your business and delivery address, and flag any job-specific timing requirement. Current stock and terms are confirmed in the response.",
  },
  LaSalle: {
    focus: "Set up a manageable first wholesale order",
    introduction:
      "A first wholesale purchase does not need to cover every possible service job. For a LaSalle automotive business, start with the products you can identify and expect to use. LaSalle is in CA Traders’ confirmed service area; this guide helps turn an initial enquiry into a clear purchasing list.",
    sections: [
      [
        "Choose an opening range from actual demand",
        [
          "Use completed work orders and the next set of booked jobs to identify recurring oil specifications, filter part numbers and everyday consumables. Avoid selecting a wide range solely because the products appear together in the catalog. Regular demand is a better basis for an opening list than a generic stock recommendation.",
          "Separate the first order into core lines and optional additions. For each, record the full description and expected quantity. This lets you discuss a realistic range without assuming that a particular order value or pack size is required.",
        ],
      ],
      [
        "Make pack units visible from the start",
        [
          "An individual bottle, a multipack and a case are different purchasing units. State the number of containers and their size for lubricants, the part count for filters, and the box count for supplies. Ask for clarification if a catalog title does not make packaging clear.",
          "Include your LaSalle receiving address and contact details in the enquiry. A confirmed location lets us discuss delivery arrangements for the actual business rather than treating a service-city listing as a fixed delivery promise. Save the final item descriptions to make the second order easier.",
        ],
      ],
    ],
    question: "Can a LaSalle shop request a small opening order?",
    answer:
      "Send the products and quantities you need rather than assuming a fixed minimum. CA Traders will confirm minimum order requirements, available formats, pricing and delivery arrangements for the requested basket.",
  },
  Tecumseh: {
    focus: "Organise routine filter replenishment",
    introduction:
      "For Tecumseh shops preparing repeat filter orders, the most valuable stock record is an accurate part-number list. CA Traders serves Tecumseh as part of its confirmed coverage. This guide focuses on keeping oil, engine air and cabin filter enquiries clear while adding related workshop products to the same quote.",
    sections: [
      [
        "Separate the three filter families",
        [
          "Keep oil filters, engine air filters and cabin air filters in separate groups on the purchasing list. Record the part number, brand where known, and quantity for each. A generic request for an air filter can leave the intended vehicle system unclear.",
          "Attach vehicle details to new or uncertain applications before ordering. A filter that looks similar is not necessarily a verified replacement. When requesting a cross-reference, supply the existing number and the vehicle year, model and engine so the intended application is explicit.",
        ],
      ],
      [
        "Use service history to set the next order",
        [
          "Review which part numbers have been used repeatedly and which were needed only for a single job. Give frequent lines their own count, and keep occasional applications on a separate list for confirmation. This is more useful than treating every filter in a category as equal stock.",
          "If your Tecumseh enquiry also includes oil, identify the required specification and quantity separately from the filter. Add gloves or wiping products by size and pack count. A combined quote can still preserve the detail needed for accurate receiving and service preparation.",
        ],
      ],
    ],
    question: "What details help with a Tecumseh filter enquiry?",
    answer:
      "Provide exact part numbers and quantities where possible. For uncertain applications, add vehicle year, make, model and engine, plus the existing filter number. Fitment must be checked against the relevant application information.",
  },
  Amherstburg: {
    focus: "Choose stock formats for occasional applications",
    introduction:
      "An Amherstburg workshop can plan specialist lubricant purchases without treating every product as a high-turnover stock line. Amherstburg is included in CA Traders’ confirmed service area. Use this guide to separate routine requirements from occasional applications and ask the right questions about packaging.",
    sections: [
      [
        "Identify what needs to be on the shelf",
        [
          "Review regular service requirements before choosing a pack format. A lubricant used on several recurring applications may justify a different quantity from an oil required for one booked vehicle. Record the specification first and the preferred volume second.",
          "Do not substitute a more common grade simply to simplify storage. The vehicle requirement still determines the product. If you want to reduce the range held, discuss documented alternatives while keeping any required manufacturer approvals visible on the request.",
        ],
      ],
      [
        "Compare usable quantity rather than package price",
        [
          "A large container can offer a different unit price, but its value depends on expected use and storage arrangements. Ask which formats are available for the exact product, and compare the amount your shop expects to use rather than assuming the largest pack is always best.",
          "Mark occasional items separately in your Amherstburg enquiry and include the job requirement. This makes it easier to distinguish a recurring replenishment line from an application-specific purchase. Delivery timing and current availability must still be confirmed before committing a service booking to a particular supply date.",
        ],
      ],
    ],
    question: "Can I request a smaller format for a specialist oil?",
    answer:
      "Include the exact specification, preferred product and usable quantity needed. Available pack formats vary by product, and CA Traders will confirm options and pricing rather than assume every lubricant comes in every size.",
  },
  Leamington: {
    focus: "Keep passenger-car and diesel requirements distinct",
    introduction:
      "A mixed service list needs clear distinctions between passenger-car and diesel lubricant requirements. CA Traders includes Leamington in its confirmed service area. For businesses ordering across several vehicle types, this guide explains how to keep the intended application visible without making assumptions about compatibility.",
    sections: [
      [
        "Write the complete requirement for each application",
        [
          "Record the vehicle or equipment requirement, viscosity and performance specification for every lubricant line. Passenger-car and heavy-duty diesel products can have different intended applications even when their labels share a familiar grade or brand name.",
          "Use the manufacturer’s service information for the final selection. A fuel type alone does not establish the correct oil, and this automotive catalog should not be treated as a blanket recommendation for all commercial or agricultural equipment. Identify each application before asking for an alternative.",
        ],
      ],
      [
        "Plan a mixed enquiry without merging unlike products",
        [
          "Keep diesel oils, passenger-car oils, transmission fluids and coolant on separate lines. State whether the quantity refers to containers or total litres, and note a preferred format if one is needed for your dispensing setup.",
          "For your Leamington business, include the actual delivery address and receiving contact. If the order covers more than one application, mark essential items and acceptable alternatives explicitly. A clear quotation can then preserve the technical differences instead of reducing the request to a total volume of oil.",
        ],
      ],
    ],
    question: "Can one oil cover every vehicle in a mixed workshop?",
    answer:
      "Do not assume so. Match each application’s viscosity, performance standard and required approval. A product may cover multiple applications only where its current documentation supports those exact requirements.",
  },
  Kingsville: {
    focus: "Replenish everyday workshop consumables",
    introduction:
      "For a Kingsville shop, routine supplies can be easy to overlook beside oils and parts. CA Traders serves Kingsville within its confirmed coverage. This purchasing guide focuses on clear quantities for gloves, wiping products, hand soap, bags and service stickers when preparing a wholesale enquiry.",
    sections: [
      [
        "Count by product, size and pack",
        [
          "Track glove sizes separately rather than recording a single total for all boxes. For wipes and rags, identify the format and quantity per pack. For bags, include dimensions and intended use. These details make a repeat enquiry specific enough to compare with the last order.",
          "Keep the task in mind when choosing a product. A material name is not a complete protective-equipment specification, and general waste bags should not be assumed suitable for every contaminated material. Check the exact product information and your workshop’s handling procedures.",
        ],
      ],
      [
        "Add supplies to a service-product enquiry",
        [
          "Prepare separate lines for oils, filters and consumables even if they will be quoted together. Give each line a clear unit so individual items, boxes and cases cannot be confused. Ask for available packaging before treating a previous container count as a permanent format.",
          "Include your Kingsville business details and receiving address. Review the confirmed quote with the person who checks deliveries so sizes and quantities can be verified on arrival. Keep any agreed substitutions on the receiving list rather than relying on a verbal change.",
        ],
      ],
    ],
    question:
      "Can shop supplies be included in a Kingsville lubricant enquiry?",
    answer:
      "Yes. List each supply by exact product, size or dimensions, pack unit and quantity. Add lubricant specifications separately, then provide your delivery location for confirmation of pricing and service terms.",
  },
  "Chatham-Kent": {
    focus: "Specify the actual receiving location",
    introduction:
      "A service-area name is a starting point, while delivery planning needs the actual receiving address. CA Traders lists Chatham-Kent in its confirmed Southwestern Ontario coverage. This guide helps businesses prepare a precise location-based enquiry alongside the product details needed for a wholesale quote.",
    sections: [
      [
        "Separate billing details from delivery instructions",
        [
          "Include the business name, billing contact and complete receiving address in the enquiry. If these are different locations, label them clearly. Give a contact who can answer questions about receiving rather than assuming the purchasing contact will be available at the delivery point.",
          "Mention any relevant access or receiving-hour constraints as a request to be confirmed. The presence of Chatham-Kent in the service list does not establish a fixed route, a daily visit or a guaranteed delivery window for a particular address.",
        ],
      ],
      [
        "Make the order easy to confirm line by line",
        [
          "For each oil or fluid, provide the exact product or specification and the pack size. For filters, provide part numbers. For workshop supplies, specify sizes and pack counts. Grouping these details in one list reduces the chance that address questions distract from an unresolved product requirement.",
          "If several people contribute to the order, keep one final version with essential items, permitted alternatives and quantities. Request confirmation of stock and timing before assigning the order to a fixed service deadline. Save the agreed delivery information with the final quote.",
        ],
      ],
    ],
    question:
      "Is Chatham-Kent coverage a guarantee for a specific delivery time?",
    answer:
      "No. Coverage confirms that Chatham-Kent is listed as a service area. Send the complete address, products and quantities so delivery timing, availability and any minimum requirements can be confirmed for the actual enquiry.",
  },
  Sarnia: {
    focus: "Prepare a careful coolant enquiry",
    introduction:
      "A coolant order should identify the required specification and supplied concentration before price is compared. CA Traders includes Sarnia in its confirmed service area. This guide helps local automotive businesses distinguish ready-to-use coolant from concentrate and keep application checks attached to the purchase.",
    sections: [
      [
        "Keep chemistry and concentration separate",
        [
          "Write down both the required coolant specification and whether the requested product is concentrate or ready to use. OAT, HOAT and conventional labels describe broad families, while the exact product documentation determines suitability for a vehicle.",
          "Do not identify a replacement by colour alone. If the current system fill is unknown, resolve the service requirement before choosing a product. The same purchasing discipline applies whether you need a single specialist line or several coolant products for workshop stock.",
        ],
      ],
      [
        "Compare the amount that can actually be used",
        [
          "A litre of concentrate and a litre of premix are not the same purchasing unit. Compare the usable volume at the required mixture, following the exact product’s preparation instructions. Add the preferred container size and number of containers to the quote list.",
          "Include the Sarnia receiving address and any timing request, then ask for confirmation before making the product part of a fixed service booking. You can combine coolant with engine oils, filters and shop supplies while keeping the technical requirement for each line distinct.",
        ],
      ],
    ],
    question: "What coolant details should a Sarnia shop send?",
    answer:
      "Provide the product or required vehicle specification, supplied concentration, pack size and quantity. Colour alone is insufficient. Add your business address and requested timing so availability and delivery terms can be confirmed.",
  },
  Strathroy: {
    focus: "Plan replenishment without over-ordering",
    introduction:
      "A regular replenishment list can keep a Strathroy workshop’s purchasing focused on the products it uses. Strathroy is part of CA Traders’ confirmed service area. This guide explains how to prepare a repeat wholesale enquiry using current counts, booked work and clear product descriptions.",
    sections: [
      [
        "Use a stock count with a defined unit",
        [
          "Count each product in its actual pack unit and record the quantity remaining. Different oils can share a viscosity but require different approvals, so keep the complete product name with the count. For filters, count each part number separately rather than adding a category total.",
          "Review the jobs already booked before choosing the next quantity. A low shelf count may be acceptable for an occasional application, while a routine product deserves a separate look. Use your own consumption history instead of an assumed standard stock level for every shop.",
        ],
      ],
      [
        "Keep the repeat list current",
        [
          "When a previous order is copied, check the pack format, item description and any substitution that was agreed at the time. Do not carry an alternative forward as though it were the original request. Note whether it remains acceptable for the current applications.",
          "Send your Strathroy delivery details with the updated list and flag any requirement tied to a booked job. Ask for availability and timing rather than assuming that an earlier delivery arrangement or price still applies to the next order.",
        ],
      ],
    ],
    question: "Can I reuse my last Strathroy quote as a reorder list?",
    answer:
      "Yes, but review the exact products, specifications, pack units and quantities first. Highlight changes and any time-sensitive lines. Pricing, stock and delivery arrangements need confirmation for the new enquiry.",
  },
  London: {
    focus: "Build a complete service basket",
    introduction:
      "A London automotive shop can prepare one clear enquiry for lubricants, filters and everyday supplies while keeping each application distinct. London is a confirmed CA Traders service city. This guide focuses on building a complete workshop basket that is practical to quote, check and receive.",
    sections: [
      [
        "Group by job, then separate the product lines",
        [
          "Start with planned services and identify the oil or fluid, filter part number and associated consumables needed for each. Grouping by job helps reveal missing items, while separate purchase lines preserve the specification and quantity for every product.",
          "For lubricants, list the required approvals as well as viscosity. For filters, provide verified part numbers. For supplies, identify size and packaging. This structure avoids a broad request for an oil-change package that leaves important application details unstated.",
        ],
      ],
      [
        "Compare the same basket across quotations",
        [
          "Keep essential requirements fixed when comparing quotes: product specification, total quantity and pack format. Mark optional items separately so the total price can be understood without hiding changes in what is included.",
          "State the London receiving address and contact, and ask for stock and delivery timing to be confirmed for the full basket. If a line cannot be supplied as requested, evaluate the documented alternative on its own merits rather than allowing a package price to decide technical compatibility.",
        ],
      ],
    ],
    question:
      "Can a London shop request oils, filters and supplies in one quote?",
    answer:
      "Yes. Send one list with separate lines for each exact product, specification or part number and quantity. Include your business and delivery address, and distinguish essential items from optional additions.",
  },
  "St. Thomas": {
    focus: "Identify transmission-fluid applications precisely",
    introduction:
      "Transmission-fluid enquiries benefit from an exact specification rather than a general request for ATF. CA Traders serves St. Thomas within its confirmed coverage. This guide helps automotive businesses keep automatic, CVT and manual transmission requirements distinct when preparing a wholesale order.",
    sections: [
      [
        "Identify the transmission before selecting fluid",
        [
          "Record the vehicle details and transmission identification required by the service information. The same model name can include different transmission designs, and a familiar fluid colour does not establish compatibility. Write the required specification on the purchasing line.",
          "Separate automatic, CVT and manual applications. A multi-vehicle label is only useful when the current product documentation covers the exact requirement. If the identification is uncertain, resolve it before requesting a substitute or preparing the service.",
        ],
      ],
      [
        "Order for the actual procedure",
        [
          "Use the quantity required by the intended service operation, not an assumed universal capacity. Provide the preferred product, specification and available pack format you want quoted. Keep any related treatment or chemical as a separate line subject to its own suitability check.",
          "For your St. Thomas location, send receiving details and any timing requirement with the enquiry. A confirmed quote should identify the product clearly enough that the technician can compare it with the work order before use. Keep that reference with the service record.",
        ],
      ],
    ],
    question:
      "Is a vehicle model enough for a St. Thomas transmission-fluid quote?",
    answer:
      "Provide the required fluid specification and transmission identification as well as vehicle details. A model name alone may cover different designs. Current product documentation must support the exact application.",
  },
  Tillsonburg: {
    focus: "Track pack sizes and units accurately",
    introduction:
      "A quote is easier to compare when every quantity has a clear unit. CA Traders includes Tillsonburg in its confirmed service area. This guide focuses on pack sizes, container counts and usable quantities for workshops combining fluids, filters and consumables in a wholesale enquiry.",
    sections: [
      [
        "Turn a quantity into an unambiguous request",
        [
          "For a lubricant, give the number of containers and the volume per container, or state the total usable volume and ask which formats are available. For filters, use a part count. For gloves and wipes, record the size or format plus the quantity per pack.",
          "Avoid a purchasing line that says only two oil or one box of supplies. Such descriptions can refer to very different amounts. Retain the product specification beside the unit so a packaging clarification does not become an accidental product substitution.",
        ],
      ],
      [
        "Check the confirmed units when receiving",
        [
          "Use the final quote to check the actual number of items and containers received. If packaging differs from an earlier request, confirm the total quantity and the exact product rather than assuming a different box size represents a shortfall or an equivalent order.",
          "Include your Tillsonburg delivery address and a receiving contact in the enquiry. Ask for pricing and availability in the same units used on your list. Keeping one unit convention from enquiry through receiving makes future stock counts and reorders more reliable.",
        ],
      ],
    ],
    question: "Should a Tillsonburg order be listed in litres or containers?",
    answer:
      "Either can be a starting point, but make the intended quantity explicit. If you specify containers, include their volume. If you specify litres, ask for available pack formats and confirm the final container count in the quote.",
  },
  Woodstock: {
    focus: "Separate routine stock from booked-job requirements",
    introduction:
      "A Woodstock workshop’s next enquiry can distinguish everyday replenishment from products reserved for a specific job. Woodstock is a confirmed CA Traders service city. This guide helps buyers keep those priorities visible without assuming that a catalog listing guarantees a service deadline.",
    sections: [
      [
        "Mark the reason for each purchase",
        [
          "Label recurring products as stock replenishment and identify the lines tied to a booked application. For each job-specific item, include the required specification or part number rather than a generic family name. This helps preserve the original need when questions arise about alternatives.",
          "Use current counts and planned work to set quantities. A specialist line should not be ordered simply because it appeared on a previous list, and a routine line should not be merged with it because the containers share a brand name.",
        ],
      ],
      [
        "Confirm timing before relying on a product",
        [
          "Include any requested date as a requirement to discuss, not as an assumption about delivery. Ask for current stock and confirmed arrangements before promising a service completion date that depends on a particular supply item.",
          "Provide your Woodstock receiving address and contact, and keep any essential products separate from optional additions. If an alternative is proposed, check the application and quantity first. Record the final decision on the purchasing list used by both the buyer and the technician.",
        ],
      ],
    ],
    question: "Does a Woodstock catalog enquiry reserve stock?",
    answer:
      "A catalog listing or enquiry does not itself guarantee stock or a delivery date. Request confirmation for the exact product, quantity and receiving location before relying on the supply for a booked job.",
  },
  Ingersoll: {
    focus: "Keep approved substitutions clear",
    introduction:
      "An alternative product should preserve the requirement behind the original enquiry. CA Traders serves Ingersoll as part of its confirmed coverage. This guide helps workshops distinguish a lower-priced option from a technically suitable substitute and document the decision clearly.",
    sections: [
      [
        "State what must remain the same",
        [
          "For an oil or fluid, give the required specification, viscosity where relevant and any mandatory approval. For filters, identify the verified application or part number. A brand change may be possible for some enquiries, but it must not silently change those essential requirements.",
          "Keep approval wording separate from a general suitability claim. If your service information requires a named approval, ask for the current documentation supporting it. Do not assume that two products with similar titles are equivalent because they appear in the same catalog category.",
        ],
      ],
      [
        "Record the decision with the order",
        [
          "Mark whether alternatives may be considered on each quote line. When an option is accepted, retain its exact product name and quantity with the original requirement. This gives receiving staff and technicians a clear reference rather than leaving them to reconstruct a conversation.",
          "For your Ingersoll business, send the actual receiving details and ask for current pricing and availability of the chosen product. On a later reorder, review whether the same substitution remains appropriate for the current vehicles instead of carrying the decision forward automatically.",
        ],
      ],
    ],
    question: "Can an Ingersoll buyer request alternative brands?",
    answer:
      "Yes. Identify the original product and the specification, approval or verified fitment that must be preserved. Alternatives need an application check and explicit confirmation before being treated as the same purchase.",
  },
  Stratford: {
    focus: "Check the product information behind a listing",
    introduction:
      "A short catalog title is useful for finding a product, but it may not contain everything needed to approve its use. Stratford is in CA Traders’ confirmed service area. This guide helps workshops prepare enquiries where technical documentation and product identification matter as much as price.",
    sections: [
      [
        "Identify missing information before ordering",
        [
          "Review the listing for the exact product, SKU, pack format and recorded attributes. If an approval, concentration or application detail is missing, ask for clarification. Do not interpret an omitted claim as though it were included, or infer a brand from a nearby product.",
          "For additives and chemicals, identify the task and request the exact product instructions when needed. For oils and fluids, keep the vehicle requirement beside the listing so the final comparison is specific. A familiar product family is not a substitute for the current data sheet.",
        ],
      ],
      [
        "Keep technical and commercial questions together",
        [
          "Send one enquiry that separates product questions from quantity and delivery details. Include any relevant product reference and describe the missing fact you need confirmed. This is more useful than asking whether a broad category is good for a particular vehicle.",
          "Provide your Stratford receiving address and contact, then review the confirmed product information before accepting an alternative. Retain the final description with your service or stock record so later buyers can see which claim was checked and which product was actually ordered.",
        ],
      ],
    ],
    question:
      "Can a Stratford shop ask for product documentation before ordering?",
    answer:
      "Yes. Identify the exact product or SKU and the specification, application or handling detail you need checked. Request current technical or safety information rather than relying only on a short catalog title.",
  },
  Kitchener: {
    focus: "Standardise a multi-person workshop order",
    introduction:
      "When several people contribute to purchasing, one clear list can prevent duplicate and conflicting requests. Kitchener is a confirmed CA Traders service city. This guide helps automotive businesses combine technician requirements into a quote that preserves the details needed for product selection.",
    sections: [
      [
        "Collect requirements in a consistent format",
        [
          "Ask each contributor for the exact product or application, required specification, quantity and pack preference. For filters, include the part number; for supplies, include size and pack count. A consistent format makes it easier to identify genuine duplicates without merging different requirements.",
          "Keep the person responsible for an uncertain application available to answer questions. A broad note such as usual oil can be unclear to a buyer who did not prepare the service job. Replace it with a product or complete specification before sending the final list.",
        ],
      ],
      [
        "Use one final version for quote and receiving",
        [
          "Combine confirmed lines into one list and distinguish essential items from optional additions. Record acceptable alternatives explicitly. If a product changes during the quotation discussion, update the final version rather than letting different team members hold different instructions.",
          "For your Kitchener business, include the actual receiving location and contact even if billing is handled elsewhere. Ask for stock, pricing and delivery terms to be confirmed against that final basket. The same record can then guide receiving checks and future reorders.",
        ],
      ],
    ],
    question:
      "How should a Kitchener shop combine several technicians’ requests?",
    answer:
      "Use one final list with exact products, specifications or part numbers, pack units and quantities. Resolve duplicates and uncertain applications, mark essential items, and include a receiving contact who can confirm the order details.",
  },
  Waterloo: {
    focus: "Keep maintenance records useful for reordering",
    introduction:
      "The product recorded on a service job can become a useful reference for the next purchase. Waterloo is included in CA Traders’ confirmed coverage. This guide focuses on accurate descriptions for repeat lubricant and filter enquiries rather than relying on memory or a generic workshop shorthand.",
    sections: [
      [
        "Record the product that was actually used",
        [
          "Keep the exact lubricant name and specification with the service record, and record filter part numbers where applicable. If an alternative was approved, note the actual product rather than leaving the original request unchanged. This makes later purchasing information more reliable.",
          "For a new enquiry, still check the current vehicle requirement and product documentation. An old record helps identify a previous choice, but it does not establish that a different vehicle or a revised product has the same application.",
        ],
      ],
      [
        "Build a repeat list with clear exceptions",
        [
          "Separate frequently used products from specialist lines and review the quantity needed for upcoming work. Keep changes to brand preference, pack size or specification visible. A reorder should be an updated requirement, not an unchecked copy of a historical invoice.",
          "Send your Waterloo receiving address and contact with the list. Confirm current stock and commercial terms for the new order, including any request tied to a booked service. Retain the final quote alongside the updated stock record so the next buyer can trace the agreed product and unit.",
        ],
      ],
    ],
    question:
      "Can a previous Waterloo service record identify a reorder product?",
    answer:
      "It can help if it records the exact product and specification or filter part number. Check the current application and documentation before ordering, especially where an alternative was used or the new vehicle differs.",
  },
  Cambridge: {
    focus: "Match the quote to the receiving check",
    introduction:
      "A detailed enquiry should remain useful when the products arrive. CA Traders lists Cambridge in its confirmed service area. This guide helps automotive businesses prepare a wholesale quote with enough product and packaging detail for a straightforward receiving check.",
    sections: [
      [
        "Give each line a checkable identity",
        [
          "Use an exact product name or SKU, specification where required, pack size and quantity. For filters, keep the part number prominent. For supplies, include the relevant size or dimensions. Avoid descriptions that only the person who placed the enquiry understands.",
          "If a brand alternative may be considered, retain the technical requirement beside that permission. This keeps an acceptable commercial change separate from an unverified application change and gives receiving staff a clear reference when checking labels.",
        ],
      ],
      [
        "Confirm differences before products are put into stock",
        [
          "Use the final quotation to compare the product received with the agreed description and total quantity. A change in container count may reflect a different pack size, so check both rather than assuming the quantities match. Keep any accepted substitution visible on the receiving list.",
          "Provide the Cambridge delivery address, receiving contact and any access requirements in the enquiry. Ask for timing and availability to be confirmed for that location. A service-city page identifies coverage; it does not replace the order-specific discussion needed for delivery arrangements.",
        ],
      ],
    ],
    question: "What should a Cambridge receiving team check against the quote?",
    answer:
      "Check the exact product, required specification or part number, container size, pack count and total quantity. Keep approved substitutions on the final list so labels can be compared with the actual agreement.",
  },
  Guelph: {
    focus: "Keep specialist products separate from general stock",
    introduction:
      "A specialist fluid or chemical needs a more precise request than a general replenishment item. Guelph is in CA Traders’ confirmed service area. This guide helps workshops prepare an enquiry that keeps application-specific products identifiable alongside everyday oils, filters and supplies.",
    sections: [
      [
        "Define the specialist requirement first",
        [
          "Start with the vehicle specification or the exact service task, then identify the proposed product. A less common oil approval, a specific transmission fluid or a particular chemical treatment should have its own line with the relevant technical requirement.",
          "Do not widen a product’s application to simplify the basket. If a multi-vehicle option is suggested, compare its documented coverage with the original requirement. For chemicals, read the exact instructions and do not assume every product from a familiar brand has the same usage.",
        ],
      ],
      [
        "Order routine and specialist lines together clearly",
        [
          "Group the basket for convenience but keep specifications, pack units and quantities separate. Mark the specialist items that must be confirmed before a job is scheduled, and identify where alternatives may be considered. This avoids treating an unresolved application as a normal stock replenishment.",
          "Send your Guelph receiving details and any requested timing with the list. Review product information, current availability and commercial terms together before finalising the order. Keep the confirmed specialist product on the service record so a future enquiry starts from an accurate reference.",
        ],
      ],
    ],
    question:
      "Can a Guelph workshop request a specialist product with its routine order?",
    answer:
      "Yes. List it separately with the exact specification or intended task, quantity and preferred format. Flag any application question or deadline so it can be resolved before the product is relied on for a service job.",
  },
};

export function cityGuide(city: string): Guide {
  const notes = cityNotes[city];
  if (!notes)
    throw new Error(`No authored landing content for service city: ${city}`);
  return {
    heading: `Wholesale automotive supplies in ${city}, Ontario`,
    title: `Wholesale Automotive Supplies in ${city}, ON`,
    description: `Source wholesale engine oils, fluids, filters and shop supplies in ${city}, Ontario. Request pricing, availability and delivery details from CA Traders.`,
    introduction: notes.introduction,
    keywords: [
      `wholesale automotive supplies ${city}`,
      `engine oil supplier ${city}`,
      `workshop supplies ${city}`,
    ],
    sections: [
      ...notes.sections,
      [
        notes.focus,
        [
          "Explore the category guides linked above for definitions, product comparisons, compatibility checks and current catalog options. Engine oils, transmission fluids, coolants, filters, additives and shop supplies are organised separately so the exact purchasing requirement remains visible.",
          "Brand names shown on category pages come from current catalog records where available. A brand listing does not establish stock, an authorised-distributor relationship or suitability for a particular vehicle. Use the exact product information and ask for confirmation where the listing does not answer an application question.",
        ],
      ],
      [
        `Request a quote for your ${city} business`,
        [
          "Send your business name, receiving address, contact information and product list. Give the product name or SKU, required specification or part number, pack size and quantity for each line. Mark any timing request and state whether alternatives may be considered.",
          "CA Traders confirms pricing, current stock, delivery timing and minimum order requirements for the actual enquiry. The service-area listing confirms coverage, not a fixed route, a same-day commitment or a local storefront. Use the contact form, email or phone number on this page to discuss the order before relying on a delivery date.",
        ],
      ],
    ],
    comparison: [
      [
        "Exact product request",
        "You know the SKU or full product name.",
        "Include pack size, quantity and any mandatory application requirement.",
      ],
      [
        "Specification-led enquiry",
        "You need a suitable catalog option for a defined requirement.",
        "Provide the exact vehicle specification or verified part reference before considering alternatives.",
      ],
    ],
    faqs: [
      [notes.question, notes.answer],
      [
        `Does CA Traders serve ${city}?`,
        `${city} is included in our confirmed Southwestern Ontario service-area list. Send the complete business receiving address and requested products so we can confirm the arrangements for your enquiry.`,
      ],
      [
        "Is there a fixed delivery day or minimum order?",
        "Delivery timing and minimum order requirements are confirmed by quote. They can depend on the location, products and quantities, so do not assume a schedule or minimum from a catalog or service-area page.",
      ],
      [
        "Can I request a mixed wholesale order?",
        "Yes. Include lubricants, fluids, verified filter part numbers and shop consumables as separate lines, with clear pack units and quantities. We confirm current availability and pricing for the requested basket.",
      ],
      [
        "How do I check product compatibility?",
        "Use the vehicle manufacturer’s service requirements and the exact product documentation. A brand, viscosity, fluid colour or category label alone does not establish suitability. Include the requirement in your enquiry if you want an alternative considered.",
      ],
    ],
    sources: [],
  };
}
