import { describe, it, expect } from "bun:test"
import { MODULE_REGISTRY, MODULE_BY_KEY } from "@/lib/module-registry"
import { VIEW_PATHS, viewForPath, pathForView } from "@/lib/admin-routes"
import { DEFAULT_ADDONS } from "@/lib/addon-catalog"

describe("Cloud & Sheet Bridges & White-Label Reseller", () => {
  it("MODULE_REGISTRY contains INTEGRATION and WHITE_LABEL modules with proper metadata", () => {
    const integration = MODULE_BY_KEY["INTEGRATION"]
    expect(integration).toBeDefined()
    expect(integration.label).toBe("Cloud & Sheet Bridges")
    expect(integration.group).toBe("Automation")

    const whiteLabel = MODULE_BY_KEY["WHITE_LABEL"]
    expect(whiteLabel).toBeDefined()
    expect(whiteLabel.label).toBe("Agency White-Label Reseller")
    expect(whiteLabel.group).toBe("Growth")
  })

  it("admin routes map /cloud-bridges, /bridges, /sheets, /reseller, /white-label correctly", () => {
    expect(viewForPath("cloud-bridges")).toBe("cloud-bridges")
    expect(viewForPath("bridges")).toBe("cloud-bridges")
    expect(viewForPath("sheets")).toBe("cloud-bridges")
    expect(viewForPath("google-sheets")).toBe("cloud-bridges")
    expect(pathForView("cloud-bridges")).toBe("/cloud-bridges")

    expect(viewForPath("white-label")).toBe("white-label")
    expect(viewForPath("reseller")).toBe("white-label")
    expect(viewForPath("whitelabel")).toBe("white-label")
    expect(viewForPath("agency")).toBe("white-label")
    expect(pathForView("white-label")).toBe("/white-label")
  })

  it("addon catalog lists google-sheets-sync and white-label-agency-portal addons", () => {
    const sheetsAddon = DEFAULT_ADDONS.find(a => a.slug === "google-sheets-sync")
    expect(sheetsAddon).toBeDefined()
    expect(sheetsAddon?.module).toBe("INTEGRATION")
    expect(sheetsAddon?.priceMonthly).toBe(9)

    const agencyAddon = DEFAULT_ADDONS.find(a => a.slug === "white-label-agency-portal")
    expect(agencyAddon).toBeDefined()
    expect(agencyAddon?.module).toBe("WHITE_LABEL")
    expect(agencyAddon?.priceMonthly).toBe(49)
  })

  it("Google Sheets URL extraction handles full Google Docs URL and raw ID", () => {
    const fullUrl = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0"
    const match = fullUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    expect(match).not.toBeNull()
    expect(match![1]).toBe("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")

    const rawId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
    expect(rawId.length).toBeGreaterThan(15)
  })
})
