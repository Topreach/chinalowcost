# ChinaLowCost broad catalog and product experience

Design update · 15 October 2026

## Scope

The prototype now has 32 expandable departments and 33 illustrative product listings. This is a broad category framework for Chinese goods sold through ChinaLowCost’s Nigerian supplier network, not a claim to list every product manufactured in China. Each department contains subcategories; the directory is designed to grow as staff onboard goods. Suppliers still have no logins.

The taxonomy was informed by the breadth of [Made-in-China.com’s official product directory](https://www.made-in-china.com/prod/catlist/), including automotive parts, industrial equipment and transportation. ChinaLowCost’s labels, samples and workflows are original design content. Prices, drawings, specifications, grades and stock information in this package are demonstration data rather than actual supplier offers.

## Departments

| Department | Example product groups |
|---|---|
| Vehicles | Cars, SUVs, vans, buses, trucks, EVs |
| Auto parts & accessories | Tyres, brakes, engine parts, filters, car electronics |
| Motorcycles & mobility | Motorcycles, scooters, bicycles, parts |
| Electronics | Audio, small electronics, cameras, wearables |
| Phones & accessories | Smartphones, chargers, cases, power banks |
| Computers & networking | Laptops, desktops, components, networking |
| Home appliances | Refrigeration, laundry, cooking, air treatment |
| Home & living | Decor, storage, home lighting, bedding |
| Everyday essentials | Drinkware, cleaning, consumables |
| Furniture | Living room, bedroom, office, outdoor |
| Lights & lighting | LED, outdoor, decorative, commercial |
| Kitchen & dining | Cookware, tableware, utensils, storage |
| Fashion & textiles | Clothing, uniforms, fabrics, workwear |
| Shoes & bags | Footwear, handbags, backpacks, luggage |
| Beauty & hair | Hair products, tools, cosmetics, salon accessories |
| Jewellery & watches | Watches, jewellery, accessories, packaging |
| Baby & kids | Pushchairs, baby care, clothing, nursery |
| Toys & games | Educational toys, blocks, games, outdoor toys |
| Sports & outdoors | Fitness, sports, camping, recreation |
| Tools & hardware | Power tools, hand tools, fasteners, storage |
| Machinery & industrial | Machinery, compressors, pumps, material handling |
| Solar & electrical | Panels, inverters, batteries, cables |
| Building materials | Tiles, doors, windows, plumbing, fittings |
| Agriculture & food | Farm tools, irrigation, food packaging, shelf-stable food |
| Packaging & printing | Cartons, bags, labels, printing supplies |
| Office & school | Stationery, school supplies, office equipment |
| Security & safety | CCTV, access control, protection, signage |
| Medical & laboratory | Laboratory instruments, clinical equipment, consumables |
| Chemicals & raw materials | Industrial materials, polymers, inputs, samples |
| Pet supplies | Carriers, grooming, feeding, accessories |
| Commercial equipment | Shop fittings, refrigeration, restaurant equipment |
| Marine & transport | Boats, marine parts, transport equipment |

These are navigation departments. Their presence does not establish a product’s availability or approval for sale. Staff must complete the appropriate supplier, product-documentation and publication reviews before real listings go live.

## Product discovery

The storefront includes department tiles and a complete category directory. Category and search pages have filters for department, product type, design/style, min/max unit price, supplier-declared grade, condition and review evidence. Sorting supports featured order, price ascending/descending and product name.

Vehicle categories additionally expose body type and powertrain. Auto parts expose compatibility type. Only one vehicle and one auto-part sample are included, so many combinations correctly return an empty state. A sourcing action remains available when no sample matches.

Wholesale listing prices show the quantity needed for the lowest displayed price. Price filtering uses that displayed volume-tier price in wholesale mode and the retail price in retail mode. Actual unit price is recalculated at the chosen quantity. MOQ, pack and volume thresholds are SKU-specific; for example the tyre sample uses MOQ 4, pack 4, and a volume tier from 20 units.

## Product detail

- A three-image gallery with active thumbnails and image expansion: product view, dimensions/details, and packaging/alternate view. These are distinct SVG illustrations embedded locally, not photographs of actual supplier goods.
- Visible product category, type, SKU, condition, declared grade, price basis, quantity tiers, MOQ and pack multiple.
- Overview, Specifications, Quality & condition, and Delivery tabs.
- Category-specific specification rows. Vehicle samples include body type, powertrain, transmission and document status; tyre samples include size and fitment checks; electrical products include voltage/rating confirmation.
- Separate quality declaration, condition, review evidence, certification status and warranty terms. A “Premium” label never implies independently verified quality.
- Destination-aware delivery detail. Vehicles, oversized items and specialist equipment require individual transportation quotations rather than default parcel fees.

## Buying versus sourcing

Ordinary sample goods can move through calculator → quotation → cart → review → simulated payment. Quote-only goods use a tailored request with product ID, quantity and destination. A goods-only estimate PDF can be generated, but transport remains unquoted and ordinary cart/payment is blocked for these items. The prototype does not sell actual vehicles or collect funds.

## Editable production data additions

| Entity | Fields / purpose |
|---|---|
| Category / CategoryVersion | Parent, display name, slug, ordering, icon, active status, reviewer |
| AttributeDefinition | Category scope, stable key, label, type, unit, required/filterable/searchable flags, permitted values |
| ProductAttribute | Product/version, typed value, source, evidence, verification actor/time |
| Variant / VariantOption | Color, design, size, material, SKU, prices, MOQ, pack, dimensional data |
| ProductMedia | Ordered images, alt text, angle/purpose, selected variant, rights evidence, publication state |
| QualityDeclaration | Grade scheme/version, declared grade, supplier/source, review evidence; distinct from certification |
| InspectionReport | Scope, method, outcome, defects, evidence, reviewer; never fabricated from appearance |
| VehicleSpecification | Body, make/model, model year, powertrain, transmission, condition, mileage where relevant, document/inspection status |
| AutoPartFitment | Manufacturer part number, compatible make/model/year/engine/trim, evidence and explicit exclusions |
| ProductCondition | New/refurbished/used, condition description, measured defects and supporting media |

For production, use stable IDs and typed attribute schemas rather than free-form labels. Build filters from available category attributes, normalize units and distinguish unknown values from false/no. Grade definitions need approved evidence requirements; reviews must not imply endorsement. Vehicle-specific fitment must be verified against documentation rather than inferred from photos.

Staff should create and edit these fields in catalog drafts, with independent approval before publication. Category changes affecting required fields or filters must be versioned. The current prototype’s admin product editor remains a draft workflow; expanded metadata is editable in catalog.js, and the schema above defines the subsequent production editor work.

## Preview instructions

Refresh Screen-Blueprint.html. Open Discover → All categories, then Vehicles or Auto parts & accessories. Open a product, change gallery thumbnails and inspect each information tab. Use Categories to test price, design, grade and condition filters. Search “tyre,” “solar,” “car,” or “laptop.” All categories have a sample listing; subcategories without sample products offer a sourcing fallback.
