import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant, PLATFORM } from "@/lib/tenant"

const DEFAULT_PRODUCTS = [
  {
    id: "p1",
    title: "Thermal Break Aluminium Windows & Doors",
    subtitle: "High-Performance Sliding, Pivot & Folding Systems",
    desc: "Specially engineered with reinforced polyamide insulating bars to prevent thermal bridging in Oman's extreme summer climate. Available in minimal slim profiles, lift & slide, and bi-folding patio doors.",
    specs: ["Qualicoat Class 2 Architectural Powder Coating", "Multi-point perimeter locking", "Acoustic insulation up to 42 dB", "Air & water tightness tested"],
    profiles: "Technal, Schuco, Gutmann & Premium Omani Extrusions",
    badge: "Best Seller",
  },
  {
    id: "p2",
    title: "Double & Triple Glazed Structural Glass",
    subtitle: "Solar Control, Acoustic & Safety Glazing",
    desc: "Automated fabrication of Insulated Glass Units (IGU) utilizing high-efficiency Low-E coatings, Argon gas filling, and warm-edge spacers for minimal solar heat gain (SHGC) and ultra-low U-values.",
    specs: ["U-Value below 1.3 W/m²K", "Tempered & laminated safety glass", "Spider glass & structural point-fixed fittings", "Ceramic frit sun-shading options"],
    profiles: "Saint-Gobain, Guardian & AGC certified",
    badge: "Energy Saving",
  },
  {
    id: "p3",
    title: "Curtain Wall & Facade Systems",
    subtitle: "Commercial Envelopes & Luxury Villa Facades",
    desc: "Stick-built and unitized architectural facade systems engineered to withstand Gulf wind load dynamics, thermal expansion, and seismic requirements with seamless aesthetic glass views.",
    specs: ["Capped and semi-unitized curtain wall", "Thermal pressure plate assembly", "Integrated facade LED channels & louvers", "Full perimeter EPDM weather seals"],
    profiles: "Custom architectural profiles up to 6m spans",
    badge: "Commercial & Luxury",
  },
  {
    id: "p4",
    title: "Motorized Louvers, Pergolas & Skylights",
    subtitle: "Architectural Outdoor Living & Shading Systems",
    desc: "Heavy-duty extruded aluminium pergolas featuring motorized rotating louvers, integrated rain drainage gutters, LED lighting strips, and automated weather sensor integration.",
    specs: ["100% waterproof interlocking louvers", "Concealed structural drainage", "Somfy motorized automation", "Wind resistant up to 120 km/h"],
    profiles: "Heavy structural T6 aluminium alloys",
    badge: "Outdoor Living",
  },
  {
    id: "p5",
    title: "Glass Balustrades & Frameless Partitions",
    subtitle: "Interior Partitions, Balconies & Shower Enclosures",
    desc: "Modern minimalist glass balustrades featuring concealed bottom shoe channels, stainless steel handrails, and customized acoustic interior office partitions.",
    specs: ["12mm to 21.52mm SentryGlas laminated glass", "Tested to 1.5 kN/m line load compliance", "Zero obstructive vertical posts", "Anti-fingerprint nano coatings"],
    profiles: "Anodized Architectural Aluminium Shoes",
    badge: "Minimalist",
  },
]

const DEFAULT_LOCATIONS = [
  {
    id: "loc1",
    name: "Main Manufacturing Facility & Plant",
    type: "Factory",
    address: "Rusayl Industrial City, Muscat Governorate, Oman 🇴🇲",
    desc: "Advanced industrial manufacturing unit equipped with CNC automated cutting centers, double-glazing line, structural silicone sealant application, and automated crimping for thermal break profiles.",
    capabilities: "1,500+ sqm monthly output · Qualicoat Class 2 · ISO 9001 certified",
    hours: "Saturday – Thursday, 7:30 AM – 5:30 PM",
    mapUrl: "https://maps.google.com/?q=Rusayl+Industrial+City+Muscat",
    phone: "+968 2444 6000",
  },
  {
    id: "loc2",
    name: "Architectural Experience Showroom",
    type: "Showroom",
    address: "Sultan Qaboos Highway, Al Ghubrah / Azaiba, Muscat 🇴🇲",
    desc: "Full-scale working display centre where architects, interior designers, villa owners, and contractors can test actual full-height sliding systems, minimalist pivot entrance doors, automated pergolas, and acoustic glazing.",
    capabilities: "15+ live full-size mockups · Senior Architectural Estimation Engineers on-site",
    hours: "Saturday – Thursday, 8:30 AM – 1:00 PM & 4:30 PM – 8:30 PM",
    mapUrl: "https://maps.google.com/?q=Muscat+Oman",
    phone: "+968 2450 1234",
  },
]

const DEFAULT_FAQS = [
  {
    id: "faq1",
    q: "Why are Thermal Break aluminium profiles necessary in Oman?",
    a: "Standard aluminium is an excellent thermal conductor. In Oman where ambient summer temperatures exceed 45°C, standard frames conduct heat into your villa, forcing air conditioning to work continuously and causing frame condensation. Thermal break profiles include a structural polyamide barrier that blocks heat transmission, reducing indoor cooling costs by up to 35%.",
    category: "Technical",
  },
  {
    id: "faq2",
    q: "What is the warranty on EMADI powder coating in coastal areas?",
    a: "We apply Qualicoat Class 2 Architectural Grade powder coatings with high UV and salt-spray resistance. Our coatings carry a 15 to 20-year warranty against fading, chalking, and coastal corrosion in Oman's seaside climate.",
    category: "Warranty",
  },
  {
    id: "faq3",
    q: "What is the standard fabrication and installation timeline?",
    a: "For residential villas, manufacturing requires 3 to 4 weeks following final approved site measurements and shop drawings. Installation is executed by our certified teams in coordination with your main civil contractor.",
    category: "Operations",
  },
  {
    id: "faq4",
    q: "Can clients provide their own architectural CAD or PDF drawings for estimation?",
    a: "Yes! Clients can send architectural elevations, window & door schedules, and AutoCAD or PDF files directly via our WhatsApp chatbot or through our estimation engineering desk for an itemized quotation within 24 to 48 hours.",
    category: "Quotations",
  },
  {
    id: "faq5",
    q: "Do you supply minimal slim-frame sliding glass doors?",
    a: "Yes. Our minimal sliding systems feature an ultra-slim central interlock profile of just 20mm to 25mm, recessed bottom threshold tracks flush with your interior flooring, and panoramic floor-to-ceiling glass up to 4 meters high.",
    category: "Products",
  },
]

const DEFAULT_PROFILE = {
  companyName: "EMADI Architectural Systems",
  tagline: "Aluminium, Structural Glass & Architectural Systems in Oman",
  crNumber: "CR-1284902",
  vatNumber: "OM1100234567",
  address: "Rusayl Industrial Estate & Al Khuwair Showroom, Muscat, Sultanate of Oman",
  phone: "+968 9123 4567",
  email: "projects@emadi.om",
  website: "https://emadi.om",
  currency: "OMR",
  terms: "1. Quotation validity: 30 days from date of issuance.\n2. Payment terms: 50% advance on confirmation, 40% on delivery of materials to site, 10% on completion of installation.\n3. Warranty: 15-20 years on Qualicoat Class 2 architectural powder coating; 5 years against hermetic seal failure in IGU double glazed units.\n4. Delivery: 3 to 4 weeks from approved shop drawings and site clearance.",
}

export const GET = withErrors(withModule("CORPORATE", async () => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || PLATFORM

  const [productsRow, locationsRow, faqsRow, profileRow] = await Promise.all([
    db.systemSetting.findFirst({ where: { tenantId, key: "corporate_products" } }),
    db.systemSetting.findFirst({ where: { tenantId, key: "corporate_locations" } }),
    db.systemSetting.findFirst({ where: { tenantId, key: "corporate_faqs" } }),
    db.systemSetting.findFirst({ where: { tenantId, key: "corporate_profile" } }),
  ])

  let products = DEFAULT_PRODUCTS
  if (productsRow?.value) {
    try {
      products = JSON.parse(productsRow.value)
    } catch {}
  }

  let locations = DEFAULT_LOCATIONS
  if (locationsRow?.value) {
    try {
      locations = JSON.parse(locationsRow.value)
    } catch {}
  }

  let faqs = DEFAULT_FAQS
  if (faqsRow?.value) {
    try {
      faqs = JSON.parse(faqsRow.value)
    } catch {}
  }

  let profile = DEFAULT_PROFILE
  if (profileRow?.value) {
    try {
      profile = { ...DEFAULT_PROFILE, ...JSON.parse(profileRow.value) }
    } catch {}
  }

  return NextResponse.json({ products, locations, faqs, profile })
}))

export const PUT = withErrors(withModule("CORPORATE", async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || PLATFORM
  const body = await request.json()

  const { products, locations, faqs, profile } = body

  const upsertSetting = async (key: string, data: any) => {
    if (data === undefined) return
    const val = typeof data === "string" ? data : JSON.stringify(data)
    const existing = await db.systemSetting.findFirst({ where: { tenantId, key } })
    if (existing) {
      await db.systemSetting.update({
        where: { id: existing.id },
        data: { value: val, type: "JSON" },
      })
    } else {
      await db.systemSetting.create({
        data: {
          tenantId,
          key,
          value: val,
          type: "JSON",
        },
      })
    }
  }

  await Promise.all([
    upsertSetting("corporate_products", products),
    upsertSetting("corporate_locations", locations),
    upsertSetting("corporate_faqs", faqs),
    upsertSetting("corporate_profile", profile),
  ])

  return NextResponse.json({ success: true })
}))
