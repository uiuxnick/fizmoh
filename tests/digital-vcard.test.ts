import { describe, expect, test } from "bun:test"
import { Prisma } from "@prisma/client"
import { slugify, validateSlug, isReservedSlug } from "../src/lib/digital-vcard/slug"
import { generateVcfString, type VCardContactInput } from "../src/lib/digital-vcard/vcf"
import { getBusinessStatus, formatDayHours, type DaySchedule } from "../src/lib/digital-vcard/business-hours"
import { MODULE_REGISTRY } from "../src/lib/module-registry"
import { DEFAULT_ADDONS } from "../src/lib/addon-catalog"

describe("Digital Business Card Addon — Tenant Isolation & Schema Contract", () => {
  const vCardModels = [
    "BusinessVCard",
    "BusinessVCardItem",
    "BusinessVCardGalleryItem",
    "BusinessVCardAnalyticsEvent",
    "BusinessVCardLead",
  ]

  for (const modelName of vCardModels) {
    test(`${modelName} model declares tenantId: String for automatic multi-tenant scoping`, () => {
      const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName)
      expect(model).toBeDefined()
      const tenantIdField = model?.fields.find((f) => f.name === "tenantId")
      expect(tenantIdField).toBeDefined()
      expect(tenantIdField?.type).toBe("String")
      expect(tenantIdField?.isRequired).toBe(true)
    })
  }

  test("BusinessVCard has index on tenantId and slug", () => {
    const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "BusinessVCard")
    expect(model).toBeDefined()
    const slugField = model?.fields.find((f) => f.name === "slug")
    expect(slugField?.isUnique).toBe(true)
  })
})

describe("Digital Business Card — Slug Validation & Sanitization", () => {
  test("slugify sanitizes input strings into clean URL paths", () => {
    expect(slugify("Al-Bustan Luxury Tours LLC")).toBe("al-bustan-luxury-tours-llc")
    expect(slugify("Café & Restaurant 2026!")).toBe("cafe-restaurant-2026")
    expect(slugify("   multiple   ___ spaces --- ")).toBe("multiple-spaces")
  })

  test("validateSlug enforces character rules and length limits", () => {
    expect(validateSlug("ab").valid).toBe(false) // too short
    expect(validateSlug("valid-slug-123").valid).toBe(true)
    expect(validateSlug("Invalid_Slug").valid).toBe(false)
  })

  test("isReservedSlug blocks platform-critical routing paths", () => {
    expect(isReservedSlug("admin")).toBe(true)
    expect(isReservedSlug("api")).toBe(true)
    expect(isReservedSlug("dashboard")).toBe(true)
    expect(isReservedSlug("vcard")).toBe(true)
    expect(isReservedSlug("fizmoh-agency")).toBe(false)
  })
})

describe("Digital Business Card — RFC 6350 vCard Generator", () => {
  test("generates standard vCard 3.0 string with CRLF endings", () => {
    const contact: VCardContactInput = {
      fullName: "Salim Al-Harthy",
      organization: "Muscat Marine Adventures",
      title: "Operations Director",
      mobile: "+96891234567",
      whatsapp: "+96891234567",
      email: "salim@muscatmarine.om",
      cardUrl: "https://app.fizmoh.cloud/card/muscat-marine",
      city: "Muscat",
      country: "Oman",
    }

    const vcf = generateVcfString(contact)

    expect(vcf.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true)
    expect(vcf.includes("FN:Salim Al-Harthy\r\n")).toBe(true)
    expect(vcf.includes("ORG:Muscat Marine Adventures\r\n")).toBe(true)
    expect(vcf.includes("TITLE:Operations Director\r\n")).toBe(true)
    expect(vcf.includes("TEL;TYPE=CELL,VOICE,pref:+96891234567\r\n")).toBe(true)
    expect(vcf.includes("EMAIL;TYPE=INTERNET,WORK,pref:salim@muscatmarine.om\r\n")).toBe(true)
    expect(vcf.includes("ADR;TYPE=WORK:;;;Muscat;;;Oman\r\n")).toBe(true)
    expect(vcf.endsWith("END:VCARD\r\n")).toBe(true)
  })

  test("properly escapes semicolons, commas, and newlines in text fields", () => {
    const contact: VCardContactInput = {
      organization: "Acme, Inc; Global",
      note: "Line 1\nLine 2, with comma; and semicolon",
    }

    const vcf = generateVcfString(contact)
    expect(vcf.includes("Acme\\, Inc\\; Global")).toBe(true)
    expect(vcf.includes("Line 1\\nLine 2\\, with comma\\; and semicolon")).toBe(true)
  })
})

describe("Digital Business Card — Business Hours & Live Status", () => {
  const schedule: DaySchedule[] = [
    { day: 0, isOpen: true, open1: "08:00", close1: "17:00" },
    { day: 5, isOpen: false }, // Friday closed
  ]

  test("formatDayHours produces readable shift format", () => {
    expect(formatDayHours({ day: 0, isOpen: true, open1: "09:00", close1: "13:00", open2: "16:00", close2: "21:00" }))
      .toBe("9:00 AM - 1:00 PM & 4:00 PM - 9:00 PM")
    expect(formatDayHours({ day: 5, isOpen: false })).toBe("Closed")
  })

  test("getBusinessStatus identifies holiday closures", () => {
    const status = getBusinessStatus(schedule, "Asia/Muscat", "National Day Holiday", true)
    expect(status.isOpenNow).toBe(false)
    expect(status.statusVariant).toBe("holiday")
    expect(status.statusLabel).toBe("Closed (National Day Holiday)")
  })
})

describe("Digital Business Card — Module & Addon Registration", () => {
  test("DIGITAL_VCARD is registered in MODULE_REGISTRY", () => {
    const mod = MODULE_REGISTRY.find((m) => m.key === "DIGITAL_VCARD")
    expect(mod).toBeDefined()
    expect(mod?.group).toBe("Growth")
    expect(mod?.alwaysIncluded).toBe(true)
  })

  test("digital-vcard is registered in DEFAULT_ADDONS catalog", () => {
    const addon = DEFAULT_ADDONS.find((a) => a.slug === "digital-vcard")
    expect(addon).toBeDefined()
    expect(addon?.module).toBe("DIGITAL_VCARD")
    expect(addon?.priceMonthly).toBe(12)
    expect(addon?.priceYearly).toBe(120)
  })
})

describe("Digital Business Card — 10 Visual Templates System", () => {
  const expectedTemplates = [
    "modern",
    "executive",
    "emerald",
    "sunset",
    "ocean",
    "cyber",
    "boutique",
    "frost",
    "artisan",
    "brutalist",
  ]

  for (const tplId of expectedTemplates) {
    test(`Template "${tplId}" is configured with visual classes and preview swatches`, () => {
      const { VCARD_TEMPLATES } = require("../src/lib/digital-vcard/templates")
      const tpl = VCARD_TEMPLATES[tplId]
      expect(tpl).toBeDefined()
      expect(tpl.name.length).toBeGreaterThan(0)
      expect(tpl.previewColors.length).toBeGreaterThanOrEqual(2)
      expect(tpl.wrapperClass).toBeDefined()
      expect(tpl.cardClass).toBeDefined()
    })
  }

  test("getVCardTemplate returns fallback modern template for unknown template IDs", () => {
    const { getVCardTemplate } = require("../src/lib/digital-vcard/templates")
    expect(getVCardTemplate("non_existent_id").id).toBe("modern")
    expect(getVCardTemplate(null).id).toBe("modern")
    expect(getVCardTemplate("CYBER").id).toBe("cyber")
  })
})

describe("Digital Business Card — Validation & Extended Schema", () => {
  test("vCardUpdateSchema validates custom links, cover video, layout and button styles", () => {
    const { vCardUpdateSchema } = require("../src/lib/digital-vcard/validation")
    const validData = {
      title: "Muscat Luxury Tours",
      cardTemplate: "sunset",
      buttonStyle: "neo3d",
      coverType: "VIDEO",
      coverVideoUrl: "https://cdn.fizmoh.cloud/videos/safari.mp4",
      serviceLayout: "SLIDER",
      customLinks: [
        {
          id: "link-1",
          label: "Book Desert Camp",
          url: "https://booking.example.com",
          icon: "hotel",
          highlight: true,
        },
      ],
    }

    const result = vCardUpdateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  test("vCardUpdateSchema rejects invalid coverType or buttonStyle", () => {
    const { vCardUpdateSchema } = require("../src/lib/digital-vcard/validation")
    expect(vCardUpdateSchema.safeParse({ coverType: "AUDIO" }).success).toBe(false)
    expect(vCardUpdateSchema.safeParse({ buttonStyle: "unknown_shape" }).success).toBe(false)
  })

  test("vCardUpdateSchema accepts uploaded media paths (/api/media/...) and mediaConfig settings", () => {
    const { vCardUpdateSchema } = require("../src/lib/digital-vcard/validation")
    const uploadedMediaData = {
      title: "Nick Solutions",
      logoUrl: "/api/media/92e2a3ca-dce4-4780-aaae-ab4b81e8b5f6.png",
      bannerUrl: "/api/media/cover-banner-123.jpg",
      mediaConfig: {
        coverHeight: "tall",
        coverCustomHeight: 280,
        coverPosition: "center",
        coverFit: "cover",
        coverOverlay: 30,
        logoSize: "large",
        logoShape: "rounded",
        logoFit: "contain",
        logoBorder: "white",
        logoPosition: "center",
      },
    }
    const result = vCardUpdateSchema.safeParse(uploadedMediaData)
    expect(result.success).toBe(true)
  })
})

